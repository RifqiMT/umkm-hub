import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import {
  LoginDto,
  RegisterAvailabilityDto,
  RegisterDto,
} from './dto/auth.dto';
import {
  isEmailLoginIdentifier,
  normalizeLoginIdentifier,
} from './login-identifier.util';
import { normalizeEmail, validateEmailFormat } from './email-conflict.util';
import { validateProfileNameFormat } from './profile-name-conflict.util';
import { REGISTRATION_CONFLICT_MESSAGE } from './registration-conflict.util';

const BCRYPT_ROUNDS = 12;
const INVALID_LOGIN = 'Invalid username, email, or password';

function isPrismaUniqueViolation(err: unknown): boolean {
  return (
    !!err &&
    typeof err === 'object' &&
    'code' in err &&
    (err as { code?: string }).code === 'P2002'
  );
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Live uniqueness check for create-profile. Requires both fields and never
   * reveals which one collided.
   */
  async checkRegistrationAvailability(dto: RegisterAvailabilityDto) {
    const { profileName, email } = this.parseRegisterIdentity(dto);
    const conflict = await this.hasRegistrationConflict(profileName, email);
    return {
      available: !conflict,
      message: conflict ? REGISTRATION_CONFLICT_MESSAGE : undefined,
    };
  }

  async register(dto: RegisterDto) {
    const { profileName, email } = this.parseRegisterIdentity(dto);

    if (await this.hasRegistrationConflict(profileName, email)) {
      throw new ConflictException(REGISTRATION_CONFLICT_MESSAGE);
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    try {
      const profile = await this.prisma.profile.create({
        data: {
          profileName,
          email,
          passwordHash,
        },
      });

      this.logger.log(`Profile registered: ${profile.id}`);
      return this.issueTokens(profile.id, profile.profileName);
    } catch (err) {
      if (isPrismaUniqueViolation(err)) {
        throw new ConflictException(REGISTRATION_CONFLICT_MESSAGE);
      }
      throw err;
    }
  }

  private parseRegisterIdentity(dto: { profileName: string; email: string }) {
    const profileName = dto.profileName.trim();
    const email = normalizeEmail(dto.email);

    const formatError = validateEmailFormat(email);
    if (formatError) {
      throw new BadRequestException(formatError.message);
    }

    const nameFormat = validateProfileNameFormat(profileName);
    if (nameFormat) {
      throw new BadRequestException(nameFormat.message);
    }

    return { profileName, email };
  }

  /** Always checks username + email together (anti-enumeration). */
  private async hasRegistrationConflict(
    profileName: string,
    email: string,
  ): Promise<boolean> {
    const [existingName, existingEmail] = await Promise.all([
      this.prisma.profile.findFirst({
        where: { profileName: { equals: profileName, mode: 'insensitive' } },
        select: { id: true },
      }),
      this.prisma.profile.findFirst({
        where: { email: { equals: email, mode: 'insensitive' } },
        select: { id: true },
      }),
    ]);
    return Boolean(existingName || existingEmail);
  }

  async login(dto: LoginDto) {
    const raw = (dto.login ?? dto.profileName ?? '').trim();
    if (!raw) {
      throw new BadRequestException('login or profileName is required');
    }

    const identifier = normalizeLoginIdentifier(raw);
    const profile = isEmailLoginIdentifier(identifier)
      ? await this.prisma.profile.findFirst({
          where: {
            email: { equals: identifier, mode: 'insensitive' },
          },
        })
      : await this.prisma.profile.findFirst({
          where: {
            profileName: { equals: identifier, mode: 'insensitive' },
          },
        });

    if (!profile) {
      throw new UnauthorizedException(INVALID_LOGIN);
    }

    const valid = await bcrypt.compare(dto.password, profile.passwordHash);
    if (!valid) {
      throw new UnauthorizedException(INVALID_LOGIN);
    }

    return this.issueTokens(profile.id, profile.profileName);
  }

  async refresh(refreshToken: string) {
    try {
      const payload = await this.jwt.verifyAsync<{
        sub: string;
        profileName: string;
      }>(refreshToken, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });

      const profile = await this.prisma.profile.findUnique({
        where: { id: payload.sub },
      });
      if (!profile) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      return this.issueTokens(profile.id, profile.profileName);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private async issueTokens(profileId: string, profileName: string) {
    const payload = { sub: profileId, profileName };
    const accessExpires =
      this.config.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '15m';
    const refreshExpires =
      this.config.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d';
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: accessExpires as `${number}m` | `${number}d`,
      }),
      this.jwt.signAsync(payload, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: refreshExpires as `${number}m` | `${number}d`,
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      profile: { id: profileId, profileName },
    };
  }
}
