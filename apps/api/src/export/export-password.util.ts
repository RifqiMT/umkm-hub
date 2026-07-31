import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'crypto';
import * as bcrypt from 'bcrypt';

const SEAL_PREFIX = 'pwd1:';

function exportPasswordKey(secret: string): Buffer {
  return createHash('sha256')
    .update(`umkm-export-password:v1:${secret}`)
    .digest();
}

/** Seal bcrypt password hash for own-profile export files. */
export function sealExportPasswordHash(
  passwordHash: string,
  secret: string,
): string {
  const key = exportPasswordKey(secret);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([
    cipher.update(passwordHash, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return (
    SEAL_PREFIX + Buffer.concat([iv, tag, enc]).toString('base64url')
  );
}

export function isSealedExportPasswordHash(
  value: string | null | undefined,
): boolean {
  return typeof value === 'string' && value.startsWith(SEAL_PREFIX);
}

/** Open sealed export password or pass through plaintext bcrypt hash. */
export function openExportPasswordHash(
  value: string | null | undefined,
  secret: string,
): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!isSealedExportPasswordHash(trimmed)) return trimmed;

  const raw = Buffer.from(trimmed.slice(SEAL_PREFIX.length), 'base64url');
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const data = raw.subarray(28);
  const key = exportPasswordKey(secret);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(data), decipher.final()]);
  return plain.toString('utf8');
}

/** Open sealed export password, pass through bcrypt hash, or hash a plaintext `password` cell. */
export async function resolveImportPasswordHash(
  row: {
    passwordHash?: string | null;
    password?: string | null;
    passwordPlaintext?: string | null;
  },
  secret: string,
  bcryptRounds = 12,
): Promise<string | null> {
  const fromHash = openExportPasswordHash(row.passwordHash ?? null, secret);
  if (fromHash) return fromHash;

  const plain = [row.password, row.passwordPlaintext]
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .find(Boolean);
  if (!plain) return null;
  return bcrypt.hash(plain, bcryptRounds);
}
