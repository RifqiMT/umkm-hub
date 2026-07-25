import {
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.profile.findUnique({
      where: { profileName: dto.profileName },
    });
    if (existing) {
      throw new ConflictException('Profile name is already taken');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const profile = await this.prisma.profile.create({
      data: {
        profileName: dto.profileName,
        passwordHash,
      },
    });

    this.logger.log(`Profile registered: ${profile.id}`);
    return this.issueTokens(profile.id, profile.profileName);
  }

  async login(dto: LoginDto) {
    const profile = await this.prisma.profile.findUnique({
      where: { profileName: dto.profileName },
    });
    if (!profile) {
      throw new UnauthorizedException('Invalid profile name or password');
    }

    const valid = await bcrypt.compare(dto.password, profile.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid profile name or password');
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
