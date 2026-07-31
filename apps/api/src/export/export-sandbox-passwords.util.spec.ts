import {
  parseSandboxExportPasswords,
  resolveSandboxExportPassword,
  resolveSandboxPlaintextPassword,
} from './export-sandbox-passwords.util';
import * as bcrypt from 'bcrypt';

describe('export-sandbox-passwords.util', () => {
  it('includes default sandbox passwords', () => {
    const map = parseSandboxExportPasswords(undefined);
    expect(map.get('rifqi_tjahyono')).toBe('12041994');
    expect(map.get('demo')).toBe('demopass1');
  });

  it('returns configured password for privileged export without hash verification', () => {
    const map = parseSandboxExportPasswords(undefined);
    expect(resolveSandboxExportPassword('rifqi_tjahyono', map)).toBe(
      '12041994',
    );
  });

  it('returns plaintext only when bcrypt hash matches', () => {
    const hash = bcrypt.hashSync('demopass1', 4);
    const map = parseSandboxExportPasswords(undefined);
    expect(resolveSandboxPlaintextPassword('demo', hash, map)).toBe('demopass1');
    expect(
      resolveSandboxPlaintextPassword('rifqi_tjahyono', hash, map),
    ).toBeNull();
  });
});
