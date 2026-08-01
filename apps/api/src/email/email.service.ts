import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(this.config.get<string>('RESEND_API_KEY')?.trim());
  }

  /**
   * Send via Resend when configured; otherwise log (dev/sandbox).
   * Never logs the full HTML body in production.
   */
  async send(input: SendEmailInput): Promise<{ delivered: boolean; mode: 'resend' | 'log' }> {
    const apiKey = this.config.get<string>('RESEND_API_KEY')?.trim();
    const from =
      this.config.get<string>('EMAIL_FROM')?.trim() ||
      'UMKM Hub <onboarding@resend.dev>';

    if (!apiKey) {
      this.logger.warn(
        `Email (dev log) to=${input.to} subject="${input.subject}"\n${input.text}`,
      );
      return { delivered: false, mode: 'log' };
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        text: input.text,
        html: input.html ?? undefined,
      }),
      signal: AbortSignal.timeout(8_000),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      this.logger.error(
        `Resend failed HTTP ${res.status}${detail ? `: ${detail.slice(0, 200)}` : ''}`,
      );
      throw new Error('Failed to send verification email');
    }

    this.logger.log(`Verification email queued via Resend to=${input.to}`);
    return { delivered: true, mode: 'resend' };
  }
}
