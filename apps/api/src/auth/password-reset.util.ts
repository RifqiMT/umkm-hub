import { createHash, createHmac, randomBytes } from 'crypto';

export const PASSWORD_RESET_TTL_MS = 24 * 60 * 60 * 1000;
export const PASSWORD_RESET_COOLDOWN_MS = 60_000;

function passwordResetHmacKey(secret: string): Buffer {
  return createHash('sha256')
    .update(`umkm-password-reset:v1:${secret}`)
    .digest();
}

/** Opaque URL-safe token (raw). Store only its HMAC digest. */
export function createPasswordResetToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashPasswordResetToken(token: string, secret: string): string {
  return createHmac('sha256', passwordResetHmacKey(secret))
    .update(token.trim())
    .digest('hex');
}

export function passwordResetExpiry(from = new Date()): Date {
  return new Date(from.getTime() + PASSWORD_RESET_TTL_MS);
}
