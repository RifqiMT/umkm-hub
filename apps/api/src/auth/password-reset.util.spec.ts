import {
  createPasswordResetToken,
  hashPasswordResetToken,
  passwordResetExpiry,
  PASSWORD_RESET_TTL_MS,
} from './password-reset.util';
import { hashVerificationToken } from './email-verification.util';

describe('password-reset.util', () => {
  const secret = 'test-reset-secret';

  it('creates opaque tokens and stable hashes', () => {
    const token = createPasswordResetToken();
    expect(token.length).toBeGreaterThan(20);
    expect(hashPasswordResetToken(token, secret)).toBe(
      hashPasswordResetToken(token, secret),
    );
    expect(hashPasswordResetToken(token, secret)).not.toBe(
      hashPasswordResetToken(`${token}x`, secret),
    );
  });

  it('uses a distinct namespace from email verification', () => {
    const token = createPasswordResetToken();
    expect(hashPasswordResetToken(token, secret)).not.toBe(
      hashVerificationToken(token, secret),
    );
  });

  it('sets a ~24h expiry', () => {
    const from = new Date('2026-07-26T12:00:00.000Z');
    const expires = passwordResetExpiry(from);
    expect(expires.getTime() - from.getTime()).toBe(PASSWORD_RESET_TTL_MS);
  });
});
