import {
  isCrossTenantExportAllowed,
  parseCrossTenantExportAllowlist,
  resolveDataExportScope,
} from './export-allowlist';

describe('export-allowlist', () => {
  it('defaults to rifqi_tjahyono when env is empty', () => {
    expect(parseCrossTenantExportAllowlist(undefined)).toEqual(
      new Set(['rifqi_tjahyono']),
    );
    expect(parseCrossTenantExportAllowlist('')).toEqual(
      new Set(['rifqi_tjahyono']),
    );
    expect(parseCrossTenantExportAllowlist('  ')).toEqual(
      new Set(['rifqi_tjahyono']),
    );
  });

  it('parses comma-separated names case-insensitively', () => {
    expect(parseCrossTenantExportAllowlist('Alice, Bob ')).toEqual(
      new Set(['alice', 'bob']),
    );
  });

  it('grants cross-tenant scope only to listed profile names', () => {
    expect(isCrossTenantExportAllowed('rifqi_tjahyono')).toBe(true);
    expect(isCrossTenantExportAllowed('Rifqi_Tjahyono')).toBe(true);
    expect(isCrossTenantExportAllowed('other_user')).toBe(false);
    expect(
      isCrossTenantExportAllowed('other_user', 'other_user,admin'),
    ).toBe(true);
  });

  it('resolves own-profile for everyone else', () => {
    expect(resolveDataExportScope('rifqi_tjahyono')).toBe('all-profiles');
    expect(resolveDataExportScope('someone_else')).toBe('own-profile');
  });
});
