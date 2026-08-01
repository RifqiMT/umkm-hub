import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FirebaseAdminService, VerifiedFirebaseUser } from './firebase-admin.service';
import { AuthService } from './auth.service';
import { normalizeEmail, validateEmailFormat } from './email-conflict.util';
import { validateProfileNameFormat } from './profile-name-conflict.util';
import { REGISTRATION_CONFLICT_MESSAGE } from './registration-conflict.util';
import type { AuthUser } from '../common/decorators/current-user.decorator';

function isPrismaUniqueViolation(err: unknown): boolean {
  return (
    !!err &&
    typeof err === 'object' &&
    'code' in err &&
    (err as { code?: string }).code === 'P2002'
  );
}

@Injectable()
export class FirebaseAuthService {
  private readonly logger = new Logger(FirebaseAuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly firebaseAdmin: FirebaseAdminService,
    private readonly authService: AuthService,
  ) {}

  async resolveProfile(firebaseUser: VerifiedFirebaseUser): Promise<AuthUser | null> {
    const byUid = await this.prisma.profile.findUnique({
      where: { firebaseUid: firebaseUser.uid },
      select: { id: true, profileName: true },
    });
    if (byUid) {
      await this.syncEmailVerification(byUid.id, firebaseUser);
      return { profileId: byUid.id, profileName: byUid.profileName };
    }

    const email = firebaseUser.email?.trim().toLowerCase();
    if (!email) return null;

    const byEmail = await this.prisma.profile.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: { id: true, profileName: true, firebaseUid: true },
    });
    if (!byEmail) return null;

    if (!byEmail.firebaseUid) {
      await this.prisma.profile.update({
        where: { id: byEmail.id },
        data: { firebaseUid: firebaseUser.uid },
      });
      this.logger.log(`Linked Firebase UID to profile ${byEmail.id}`);
    }

    await this.syncEmailVerification(byEmail.id, firebaseUser);
    return { profileId: byEmail.id, profileName: byEmail.profileName };
  }

  /** Exchange a Firebase ID token for API JWT tokens (mobile / legacy clients). */
  async exchangeSession(idToken: string) {
    const firebaseUser = await this.verifyToken(idToken);
    const profile = await this.resolveProfile(firebaseUser);
    if (!profile) {
      throw new UnauthorizedException(
        'No workspace profile linked to this account. Complete registration first.',
      );
    }
    return this.authService.issueTokensForProfile(
      profile.profileId,
      profile.profileName,
    );
  }

  /** Create a Profile after Firebase sign-up (username chosen on our form). */
  async registerProfile(idToken: string, profileNameRaw: string) {
    const firebaseUser = await this.verifyToken(idToken);
    const profileName = profileNameRaw.trim();
    const email = firebaseUser.email?.trim().toLowerCase();

    if (!email) {
      throw new BadRequestException(
        'Firebase account must have an email address.',
      );
    }

    const formatError = validateEmailFormat(email);
    if (formatError) {
      throw new BadRequestException(formatError.message);
    }

    const nameFormat = validateProfileNameFormat(profileName);
    if (nameFormat) {
      throw new BadRequestException(nameFormat.message);
    }

    const existingUid = await this.prisma.profile.findUnique({
      where: { firebaseUid: firebaseUser.uid },
      select: { id: true, profileName: true },
    });
    if (existingUid) {
      return this.authService.issueTokensForProfile(
        existingUid.id,
        existingUid.profileName,
      );
    }

    const [existingName, existingEmail] = await Promise.all([
      this.prisma.profile.findFirst({
        where: { profileName: { equals: profileName, mode: 'insensitive' } },
        select: { id: true },
      }),
      this.prisma.profile.findFirst({
        where: { email: { equals: email, mode: 'insensitive' } },
        select: { id: true, firebaseUid: true },
      }),
    ]);

    if (existingName) {
      throw new ConflictException(REGISTRATION_CONFLICT_MESSAGE);
    }

    if (existingEmail) {
      if (!existingEmail.firebaseUid) {
        const linked = await this.prisma.profile.update({
          where: { id: existingEmail.id },
          data: { firebaseUid: firebaseUser.uid },
          select: { id: true, profileName: true },
        });
        await this.syncEmailVerification(linked.id, firebaseUser);
        return this.authService.issueTokensForProfile(
          linked.id,
          linked.profileName,
        );
      }
      throw new ConflictException(REGISTRATION_CONFLICT_MESSAGE);
    }

    const now = firebaseUser.emailVerified ? new Date() : null;
    try {
      const profile = await this.prisma.profile.create({
        data: {
          profileName,
          email: normalizeEmail(email),
          firebaseUid: firebaseUser.uid,
          emailVerifiedAt: now,
          accountVerifiedAt: now,
        },
      });
      this.logger.log(`Firebase profile registered: ${profile.id}`);
      return this.authService.issueTokensForProfile(
        profile.id,
        profile.profileName,
      );
    } catch (err) {
      if (isPrismaUniqueViolation(err)) {
        throw new ConflictException(REGISTRATION_CONFLICT_MESSAGE);
      }
      throw err;
    }
  }

  /** Sync Firebase emailVerified claim into Profile timestamps. */
  async syncEmailVerification(
    profileId: string,
    firebaseUser: VerifiedFirebaseUser,
  ) {
    if (!firebaseUser.emailVerified) return;
    await this.prisma.profile.updateMany({
      where: {
        id: profileId,
        OR: [{ emailVerifiedAt: null }, { accountVerifiedAt: null }],
      },
      data: {
        emailVerifiedAt: new Date(),
        accountVerifiedAt: new Date(),
      },
    });
  }

  private async verifyToken(idToken: string): Promise<VerifiedFirebaseUser> {
    if (!this.firebaseAdmin.enabled) {
      throw new BadRequestException('Firebase authentication is not configured');
    }
    try {
      return await this.firebaseAdmin.verifyIdToken(idToken);
    } catch {
      throw new UnauthorizedException('Invalid or expired Firebase token');
    }
  }
}
