import {
  isEmailLoginIdentifier,
  normalizeLoginIdentifier,
} from './login-identifier.util';

describe('login-identifier.util', () => {
  it('detects email identifiers', () => {
    expect(isEmailLoginIdentifier('sari@example.com')).toBe(true);
    expect(isEmailLoginIdentifier('  Sari@Example.COM ')).toBe(true);
    expect(isEmailLoginIdentifier('sari_umkm')).toBe(false);
    expect(isEmailLoginIdentifier('not-an-email')).toBe(false);
  });

  it('lowercases emails and preserves usernames', () => {
    expect(normalizeLoginIdentifier('  Sari@Example.COM ')).toBe(
      'sari@example.com',
    );
    expect(normalizeLoginIdentifier('  Sari_UMKM ')).toBe('Sari_UMKM');
  });
});
