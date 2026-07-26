import {
  hashIpValue,
  isHashedIpValue,
  isSealedLocationValue,
  openLocationValue,
  sealLocationValue,
  toStoredIpHash,
  toStoredLocationSeal,
} from './location-privacy.util';

describe('location-privacy.util', () => {
  const secret = 'test-location-secret';

  it('seals and opens city/country values', () => {
    const sealed = sealLocationValue('Jakarta', secret);
    expect(isSealedLocationValue(sealed)).toBe(true);
    expect(sealed).not.toContain('Jakarta');
    expect(openLocationValue(sealed, secret)).toBe('Jakarta');
  });

  it('never writes plaintext through toStoredLocationSeal', () => {
    const stored = toStoredLocationSeal('Indonesia', secret);
    expect(stored).toMatch(/^loc1:/);
    expect(stored).not.toContain('Indonesia');
    expect(toStoredLocationSeal('', secret)).toBeNull();
  });

  it('hashes IP one-way', () => {
    const a = hashIpValue('203.0.113.10', secret);
    const b = hashIpValue('203.0.113.10', secret);
    expect(a).toBe(b);
    expect(isHashedIpValue(a)).toBe(true);
    expect(a).not.toContain('203');
    expect(toStoredIpHash('8.8.8.8', secret)).toMatch(/^h1:/);
  });

  it('returns null for irreversible legacy HMAC city/country', () => {
    const legacy = hashIpValue('Jakarta', secret);
    expect(openLocationValue(legacy, secret)).toBeNull();
  });

  it('passes through legacy plaintext for migration', () => {
    expect(openLocationValue('Bandung', secret)).toBe('Bandung');
  });
});
