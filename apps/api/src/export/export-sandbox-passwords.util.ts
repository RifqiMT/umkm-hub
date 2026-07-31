import * as bcrypt from 'bcrypt';

/** Default sandbox login hints (used only when bcrypt hash still matches). */
const DEFAULT_SANDBOX_PASSWORDS: Readonly<Record<string, string>> = {
  rifqi_tjahyono: '12041994',
  demo: 'demopass1',
};

/** Parse `profileName:password` pairs for human-readable privileged exports. */
export function parseSandboxExportPasswords(
  raw: string | undefined | null,
): Map<string, string> {
  const map = new Map<string, string>(
    Object.entries(DEFAULT_SANDBOX_PASSWORDS).map(([name, password]) => [
      name.toLowerCase(),
      password,
    ]),
  );
  const source = raw == null ? '' : String(raw).trim();
  if (!source) return map;

  for (const part of source.split(',')) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const colon = trimmed.indexOf(':');
    if (colon <= 0) continue;
    const name = trimmed.slice(0, colon).trim().toLowerCase();
    const password = trimmed.slice(colon + 1);
    if (!name || !password) continue;
    map.set(name, password);
  }
  return map;
}

/** Human-readable password for privileged (cross-tenant) exports. */
export function resolveSandboxExportPassword(
  profileName: string,
  candidates: Map<string, string>,
): string | null {
  const candidate = candidates.get(profileName.trim().toLowerCase());
  return candidate ?? null;
}

/** Return plaintext password when it still matches the stored bcrypt hash. */
export function resolveSandboxPlaintextPassword(
  profileName: string,
  passwordHash: string,
  candidates: Map<string, string>,
): string | null {
  const candidate = resolveSandboxExportPassword(profileName, candidates);
  if (!candidate || !passwordHash.startsWith('$2')) return null;
  try {
    return bcrypt.compareSync(candidate, passwordHash) ? candidate : null;
  } catch {
    return null;
  }
}
