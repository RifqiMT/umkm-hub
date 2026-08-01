import { parseFirebaseServiceAccountJson } from './firebase-service-account.util';

describe('parseFirebaseServiceAccountJson', () => {
  const sample = '{"type":"service_account","project_id":"umkm-hub-2b955"}';

  it('parses plain JSON', () => {
    expect(parseFirebaseServiceAccountJson(sample).project_id).toBe(
      'umkm-hub-2b955',
    );
  });

  it('parses JSON wrapped in single quotes', () => {
    expect(parseFirebaseServiceAccountJson(`'${sample}'`).project_id).toBe(
      'umkm-hub-2b955',
    );
  });

  it('throws on empty string', () => {
    expect(() => parseFirebaseServiceAccountJson('   ')).toThrow(/Empty/);
  });
});
