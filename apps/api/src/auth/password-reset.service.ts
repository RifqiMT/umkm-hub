import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import {
  isEmailLoginIdentifier,
  normalizeLoginIdentifier,
} from './login-identifier.util';
import {
  createPasswordResetToken,
  hashPasswordResetToken,
  PASSWORD_RESET_COOLDOWN_MS,
  passwordResetExpiry,
} from './password-reset.util';

const BCRYPT_ROUNDS = 12;

const GENERIC_RESET_MESSAGE =
  'If an account exists with that username or email, we sent a password reset link to the email on file.';

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly email: EmailService,
  ) {}

  private tokenSecret(): string {
    return (
      this.config.get<string>('PASSWORD_RESET_SECRET') ||
      this.config.get<string>('JWT_ACCESS_SECRET') ||
      'umkm-password-reset-dev-only'
    );
  }

  private appPublicUrl(): string {
    return (
      this.config.get<string>('APP_PUBLIC_URL')?.replace(/\/$/, '') ||
      'http://localhost:3000'
    );
  }

  async requestReset(login: string) {
    const raw = login?.trim();
    if (!raw) {
      return this.genericSuccess(null);
    }

    const identifier = normalizeLoginIdentifier(raw);
    const profile = isEmailLoginIdentifier(identifier)
      ? await this.prisma.profile.findFirst({
          where: { email: { equals: identifier, mode: 'insensitive' } },
          select: { id: true, email: true, profileName: true },
        })
      : await this.prisma.profile.findFirst({
          where: {
            profileName: { equals: identifier, mode: 'insensitive' },
          },
          select: { id: true, email: true, profileName: true },
        });

    if (!profile?.email) {
      return this.genericSuccess(null);
    }

    const latest = await this.prisma.passwordResetToken.findFirst({
      where: { profileId: profile.id, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (
      latest &&
      Date.now() - latest.createdAt.getTime() < PASSWORD_RESET_COOLDOWN_MS
    ) {
      return this.genericSuccess(null);
    }

    await this.prisma.passwordResetToken.updateMany({
      where: { profileId: profile.id, consumedAt: null },
      data: { consumedAt: new Date() },
    });

    const rawToken = createPasswordResetToken();
    const tokenHash = hashPasswordResetToken(rawToken, this.tokenSecret());
    const expiresAt = passwordResetExpiry();

    await this.prisma.passwordResetToken.create({
      data: {
        profileId: profile.id,
        email: profile.email,
        tokenHash,
        expiresAt,
      },
    });

    const resetUrl = `${this.appPublicUrl()}/reset-password?token=${encodeURIComponent(rawToken)}`;
    const subject = 'Reset your UMKM Hub password';
    const text = [
      `Hi ${profile.profileName},`,
      '',
      'Use this link to choose a new password for your UMKM Hub account:',
      resetUrl,
      '',
      'This link expires in 24 hours. If you did not request it, you can ignore this email.',
    ].join('\n');
    const html = `
      <p>Hi <strong>${escapeHtml(profile.profileName)}</strong>,</p>
      <p>Use this link to choose a new password for your UMKM Hub account:</p>
      <p><a href="${resetUrl}">Reset password</a></p>
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
    const devResetUrl =
      !isProd && sendResult.mode === 'log' ? resetUrl : null;

    this.logger.log(
      `Password reset issued for profile=${profile.id} mode=${sendResult.mode}`,
    );

    return this.genericSuccess(devResetUrl);
  }

  async resetPassword(rawToken: string, newPassword: string) {
    const token = rawToken?.trim();
    if (!token || token.length < 20) {
      throw new BadRequestException('Invalid or expired password reset link.');
    }

    const tokenHash = hashPasswordResetToken(token, this.tokenSecret());
    const row = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (!row || row.consumedAt) {
      throw new BadRequestException('Invalid or expired password reset link.');
    }

    if (row.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Invalid or expired password reset link.');
    }

    const profile = await this.prisma.profile.findUnique({
      where: { id: row.profileId },
      select: { id: true, email: true },
    });

    if (!profile?.email || profile.email !== row.email) {
      throw new BadRequestException(
        'This reset link no longer matches the email on the account. Request a new one.',
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    const now = new Date();

    const claimed = await this.prisma.passwordResetToken.updateMany({
      where: { id: row.id, consumedAt: null },
      data: { consumedAt: now },
    });

    if (claimed.count === 0) {
      throw new BadRequestException('Invalid or expired password reset link.');
    }

    await this.prisma.$transaction([
      this.prisma.passwordResetToken.updateMany({
        where: { profileId: row.profileId, consumedAt: null },
        data: { consumedAt: now },
      }),
      this.prisma.profile.update({
        where: { id: row.profileId },
        data: { passwordHash },
      }),
    ]);

    this.logger.log(`Password reset completed for profile=${row.profileId}`);
    return {
      reset: true,
      message: 'Password updated successfully. You can sign in with your new password.',
    };
  }

  private genericSuccess(devResetUrl: string | null) {
    return {
      sent: true,
      message: GENERIC_RESET_MESSAGE,
      devResetUrl,
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
