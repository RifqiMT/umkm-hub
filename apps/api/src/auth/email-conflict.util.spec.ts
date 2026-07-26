import {
  emailTakenMessage,
  normalizeEmail,
  validateEmailFormat,
} from './email-conflict.util';

describe('email conflict helpers', () => {
  it('normalizes email to trimmed lowercase', () => {
    expect(normalizeEmail('  A@Example.COM ')).toBe('a@example.com');
  });

  it('describes a taken email', () => {
    expect(emailTakenMessage('A@Example.com')).toBe(
      'The email "a@example.com" is already in use. Sign in with that account or choose a different address.',
    );
  });

  it('rejects empty email as required', () => {
    expect(validateEmailFormat('')?.reason).toBe('empty');
    expect(validateEmailFormat('')?.available).toBe(false);
    expect(validateEmailFormat('')?.valid).toBe(false);
  });

  it('rejects invalid email format', () => {
    expect(validateEmailFormat('not-an-email')?.reason).toBe('invalid');
  });

  it('accepts a well-formed email (null = format ok)', () => {
    expect(validateEmailFormat('owner@shop.id')).toBeNull();
  });
});
