import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
} from 'crypto';

const SEAL_PREFIX = 'loc1:';
const HASH_PREFIX = 'h1:';
const HASH_HEX_RE = /^h1:[0-9a-f]{64}$/;

/** Derive a 32-byte key from the app secret. */
function locationCryptoKey(secret: string): Buffer {
  return createHash('sha256')
    .update(`umkm-profile-location:v1:${secret}`)
    .digest();
}

function normalizeLocationPart(value: string): string {
  return value.trim().toLowerCase();
}

/** One-way HMAC-SHA256 for IP digests (never reversible). */
export function hashIpValue(ip: string, secret: string): string {
  const digest = createHmac('sha256', locationCryptoKey(secret))
    .update(normalizeLocationPart(ip))
    .digest('hex');
  return `${HASH_PREFIX}${digest}`;
}

export function isHashedIpValue(value: string | null | undefined): boolean {
  return typeof value === 'string' && HASH_HEX_RE.test(value);
}

export function toStoredIpHash(
  value: string | null | undefined,
  secret: string,
): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (isHashedIpValue(trimmed)) return trimmed;
  return hashIpValue(trimmed, secret);
}

/**
 * Seal city/country for DB storage (AES-256-GCM).
 * Database holds opaque `loc1:…` blobs — not readable plaintext.
 */
export function sealLocationValue(plain: string, secret: string): string {
  const key = locationCryptoKey(secret);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return (
    SEAL_PREFIX + Buffer.concat([iv, tag, enc]).toString('base64url')
  );
}

export function isSealedLocationValue(
  value: string | null | undefined,
): boolean {
  return typeof value === 'string' && value.startsWith(SEAL_PREFIX);
}

export function isLegacyLocationHash(
  value: string | null | undefined,
): boolean {
  return typeof value === 'string' && HASH_HEX_RE.test(value);
}

/**
 * Open a stored city/country value for the authenticated owner.
 * - `loc1:…` → decrypt
 * - legacy plaintext → return as-is (caller should re-seal)
 * - legacy `h1:…` HMAC → null (irreversible; user must re-enter)
 */
export function openLocationValue(
  stored: string | null | undefined,
  secret: string,
): string | null {
  if (stored == null) return null;
  const trimmed = stored.trim();
  if (!trimmed) return null;
  if (isLegacyLocationHash(trimmed)) return null;
  if (!trimmed.startsWith(SEAL_PREFIX)) return trimmed;

  try {
    const raw = Buffer.from(trimmed.slice(SEAL_PREFIX.length), 'base64url');
    if (raw.length < 12 + 16 + 1) return null;
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const enc = raw.subarray(28);
    const decipher = createDecipheriv(
      'aes-256-gcm',
      locationCryptoKey(secret),
      iv,
    );
    decipher.setAuthTag(tag);
    const plain = Buffer.concat([decipher.update(enc), decipher.final()]);
    return plain.toString('utf8');
  } catch {
    return null;
  }
}

/** Prepare city/country for DB write: always seal (or null). */
export function toStoredLocationSeal(
  value: string | null | undefined,
  secret: string,
): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (isSealedLocationValue(trimmed)) return trimmed;
  // Re-seal plaintext or reject writing raw HMAC blobs as "plaintext".
  if (isLegacyLocationHash(trimmed)) return trimmed;
  return sealLocationValue(trimmed, secret);
}

export function hasStoredLocationPart(
  value: string | null | undefined,
): boolean {
  if (value == null) return false;
  return value.trim().length > 0;
}
