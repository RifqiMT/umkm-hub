import {
  openExportPasswordHash,
  resolveImportPasswordHash,
  sealExportPasswordHash,
} from './export-password.util';

describe('export-password.util', () => {
  const secret = 'test-export-password-secret';

  it('seals and opens a bcrypt hash for own-profile exports', () => {
    const hash = '$2b$12$abcdefghijklmnopqrstuv';
    const sealed = sealExportPasswordHash(hash, secret);
    expect(sealed.startsWith('pwd1:')).toBe(true);
    expect(openExportPasswordHash(sealed, secret)).toBe(hash);
  });

  it('passes through plaintext bcrypt hashes for privileged exports', () => {
    const hash = '$2b$12$plaintextoperatorcopy';
    expect(openExportPasswordHash(hash, secret)).toBe(hash);
  });

  it('hashes a human-readable password column on import', async () => {
    const hash = await resolveImportPasswordHash(
      { password: 'demopass1' },
      secret,
      4,
    );
    expect(hash).toMatch(/^\$2[aby]\$/);
  });
});
