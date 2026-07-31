/**
 * Cross-tenant (all profiles) data export is limited to allowlisted profile names.
 * Default: rifqi_tjahyono. Override with DATA_EXPORT_PROFILE_NAMES (comma-separated).
 * Every authenticated user may still export their own profile data.
 */
export function parseCrossTenantExportAllowlist(
  raw: string | undefined | null,
): Set<string> {
  const source =
    raw == null || !String(raw).trim()
      ? 'rifqi_tjahyono'
      : String(raw);
  return new Set(
    source
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isCrossTenantExportAllowed(
  profileName: string,
  allowlistRaw?: string | null,
): boolean {
  const allowlist = parseCrossTenantExportAllowlist(allowlistRaw);
  return allowlist.has(profileName.trim().toLowerCase());
}

export type DataExportScope = 'all-profiles' | 'own-profile';

export function resolveDataExportScope(
  profileName: string,
  allowlistRaw?: string | null,
): DataExportScope {
  return isCrossTenantExportAllowed(profileName, allowlistRaw)
    ? 'all-profiles'
    : 'own-profile';
}
