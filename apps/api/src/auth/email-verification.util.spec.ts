import {
  createVerificationToken,
  hashVerificationToken,
  verificationExpiry,
  EMAIL_VERIFY_TTL_MS,
} from './email-verification.util';

describe('email-verification.util', () => {
  const secret = 'test-verify-secret';

  it('creates opaque tokens and stable hashes', () => {
    const token = createVerificationToken();
    expect(token.length).toBeGreaterThan(20);
    expect(hashVerificationToken(token, secret)).toBe(
      hashVerificationToken(token, secret),
    );
    expect(hashVerificationToken(token, secret)).not.toBe(
      hashVerificationToken(`${token}x`, secret),
    );
  });

  it('sets a ~24h expiry', () => {
    const from = new Date('2026-07-26T12:00:00.000Z');
    const expires = verificationExpiry(from);
    expect(expires.getTime() - from.getTime()).toBe(EMAIL_VERIFY_TTL_MS);
  });
});
