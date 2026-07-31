import { ForbiddenException } from '@nestjs/common';
import { resolveExporterContext } from './export-exporter.util';

describe('resolveExporterContext', () => {
  const rifqiId = 'prof-rifqi';

  function prismaWith(profileName: string | null) {
    return {
      profile: {
        findUnique: jest.fn().mockResolvedValue(
          profileName == null ? null : { profileName },
        ),
      },
    };
  }

  it('uses DB profileName for allowlist even when JWT name differs', async () => {
    const ctx = await resolveExporterContext(
      prismaWith('rifqi_tjahyono') as never,
      { profileId: rifqiId, profileName: 'stale_jwt_name' },
    );
    expect(ctx.scope).toBe('all-profiles');
    expect(ctx.crossTenant).toBe(true);
    expect(ctx.profileName).toBe('rifqi_tjahyono');
  });

  it('scopes non-allowlisted DB names to own profile', async () => {
    const ctx = await resolveExporterContext(
      prismaWith('alice') as never,
      { profileId: 'p-alice', profileName: 'rifqi_tjahyono' },
    );
    expect(ctx.scope).toBe('own-profile');
    expect(ctx.crossTenant).toBe(false);
    expect(ctx.profileName).toBe('alice');
  });

  it('throws when profile row is missing', async () => {
    await expect(
      resolveExporterContext(
        prismaWith(null) as never,
        { profileId: 'missing', profileName: 'any' },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
