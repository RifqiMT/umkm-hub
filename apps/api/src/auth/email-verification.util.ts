import { createHash, createHmac, randomBytes } from 'crypto';

export const EMAIL_VERIFY_TTL_MS = 24 * 60 * 60 * 1000;
export const EMAIL_VERIFY_RESEND_COOLDOWN_MS = 60_000;

function verificationHmacKey(secret: string): Buffer {
  return createHash('sha256')
    .update(`umkm-email-verify:v1:${secret}`)
    .digest();
}

/** Opaque URL-safe token (raw). Store only its HMAC digest. */
export function createVerificationToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashVerificationToken(token: string, secret: string): string {
  return createHmac('sha256', verificationHmacKey(secret))
    .update(token.trim())
    .digest('hex');
}

export function verificationExpiry(from = new Date()): Date {
  return new Date(from.getTime() + EMAIL_VERIFY_TTL_MS);
}
