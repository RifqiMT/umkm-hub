import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import {
  EMAIL_VERIFY_RESEND_COOLDOWN_MS,
  createVerificationToken,
  hashVerificationToken,
  verificationExpiry,
} from './email-verification.util';

@Injectable()
export class EmailVerificationService {
  private readonly logger = new Logger(EmailVerificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly email: EmailService,
  ) {}

  private tokenSecret(): string {
    return (
      this.config.get<string>('EMAIL_VERIFY_SECRET') ||
      this.config.get<string>('JWT_ACCESS_SECRET') ||
      'umkm-email-verify-dev-only'
    );
  }

  private appPublicUrl(): string {
    return (
      this.config.get<string>('APP_PUBLIC_URL')?.replace(/\/$/, '') ||
      'http://localhost:3000'
    );
  }

  async sendVerification(profileId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { id: profileId },
      select: {
        id: true,
        email: true,
        emailVerifiedAt: true,
        profileName: true,
      },
    });
    if (!profile) {
      throw new NotFoundException('Profile not found');
    }
    if (!profile.email) {
      throw new BadRequestException(
        'Add an email address on your profile before verifying.',
      );
    }
    if (profile.emailVerifiedAt) {
      return {
        sent: false,
        alreadyVerified: true,
        message: 'This email is already verified.',
        devVerifyUrl: null as string | null,
      };
    }

    const latest = await this.prisma.emailVerificationToken.findFirst({
      where: { profileId, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (
      latest &&
      Date.now() - latest.createdAt.getTime() < EMAIL_VERIFY_RESEND_COOLDOWN_MS
    ) {
      throw new BadRequestException(
        'Please wait a minute before requesting another verification email.',
      );
    }

    // Invalidate outstanding tokens for this profile.
    await this.prisma.emailVerificationToken.updateMany({
      where: { profileId, consumedAt: null },
      data: { consumedAt: new Date() },
    });

    const rawToken = createVerificationToken();
    const tokenHash = hashVerificationToken(rawToken, this.tokenSecret());
    const expiresAt = verificationExpiry();

    await this.prisma.emailVerificationToken.create({
      data: {
        profileId,
        email: profile.email,
        tokenHash,
        expiresAt,
      },
    });

    const verifyUrl = `${this.appPublicUrl()}/verify-email?token=${encodeURIComponent(rawToken)}`;
    const subject = 'Verify your UMKM Hub email';
    const text = [
      `Hi ${profile.profileName},`,
      '',
      'Confirm this email address for your UMKM Hub account:',
      verifyUrl,
      '',
      'This link expires in 24 hours. If you did not request it, you can ignore this email.',
    ].join('\n');
    const html = `
      <p>Hi <strong>${escapeHtml(profile.profileName)}</strong>,</p>
      <p>Confirm this email address for your UMKM Hub account:</p>
      <p><a href="${verifyUrl}">Verify email address</a></p>
      <p>This link expires in 24 hours. If you did not request it, you can ignore this email.</p>
    `;

    const sendResult = await this.email.send({
      to: profile.email,
      subject,
      text,
      html,
    });

    const isProd =
      (this.config.get<string>('NODE_ENV') || '').toLowerCase() ===
      'production';
    const devVerifyUrl =
      !isProd && sendResult.mode === 'log' ? verifyUrl : null;

    this.logger.log(
      `Verification email issued for profile=${profileId} mode=${sendResult.mode}`,
    );

    return {
      sent: true,
      alreadyVerified: false,
      message: sendResult.delivered
        ? 'Verification email sent. Check your inbox.'
        : 'Verification email logged for development (no RESEND_API_KEY). Use the link below or server logs.',
      devVerifyUrl,
    };
  }

  async verifyToken(rawToken: string) {
    const token = rawToken?.trim();
    if (!token || token.length < 20) {
      throw new BadRequestException('Invalid or expired verification link.');
    }

    const tokenHash = hashVerificationToken(token, this.tokenSecret());
    const row = await this.prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
    });

    if (!row) {
      throw new BadRequestException('Invalid or expired verification link.');
    }

    const profile = await this.prisma.profile.findUnique({
      where: { id: row.profileId },
      select: {
        id: true,
        email: true,
        emailVerifiedAt: true,
        accountVerifiedAt: true,
      },
    });

    // Idempotent: React Strict Mode / double-clicks may hit verify twice.
    if (row.consumedAt) {
      if (
        profile?.email &&
        profile.email === row.email &&
        profile.emailVerifiedAt
      ) {
        return {
          verified: true,
          email: row.email,
          message: 'Email and account are already verified.',
          alreadyVerified: true,
        };
      }
      throw new BadRequestException('Invalid or expired verification link.');
    }

    if (row.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Invalid or expired verification link.');
    }

    if (!profile?.email || profile.email !== row.email) {
      throw new BadRequestException(
        'This verification link no longer matches the email on the account. Request a new one.',
      );
    }

    const now = new Date();
    const claimed = await this.prisma.emailVerificationToken.updateMany({
      where: { id: row.id, consumedAt: null },
      data: { consumedAt: now },
    });

    // Lost the race to a parallel verify (e.g. Strict Mode) — treat as success if verified.
    if (claimed.count === 0) {
      const again = await this.prisma.profile.findUnique({
        where: { id: row.profileId },
        select: { email: true, emailVerifiedAt: true },
      });
      if (
        again?.email &&
        again.email === row.email &&
        again.emailVerifiedAt
      ) {
        return {
          verified: true,
          email: row.email,
          message: 'Email and account are already verified.',
          alreadyVerified: true,
        };
      }
      throw new BadRequestException('Invalid or expired verification link.');
    }

    await this.prisma.$transaction([
      this.prisma.emailVerificationToken.updateMany({
        where: { profileId: row.profileId, consumedAt: null },
        data: { consumedAt: now },
      }),
      this.prisma.profile.update({
        where: { id: row.profileId },
        data: {
          emailVerifiedAt: now,
          accountVerifiedAt: now,
        },
      }),
    ]);

    this.logger.log(`Email/account verified for profile=${row.profileId}`);
    return {
      verified: true,
      email: row.email,
      message: 'Email and account verified successfully.',
      alreadyVerified: false,
    };
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
