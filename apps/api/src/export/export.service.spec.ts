import { ConfigService } from '@nestjs/config';
import { ExportService } from './export.service';
import { isSealedExportPasswordHash } from './export-password.util';
import { sealLocationValue } from '../profiles/location-privacy.util';

describe('ExportService', () => {
  const secret = 'test-export-location-secret';
  const sampleHash = '$2b$12$sample.bcrypt.hash.for.tests';

  function makeService(
    prisma: Record<string, unknown>,
    env: Record<string, string | undefined> = {},
  ) {
    const config = {
      get: (key: string) => {
        if (key in env) return env[key];
        if (key === 'PROFILE_LOCATION_SECRET') return secret;
        if (key === 'DATA_EXPORT_PROFILE_NAMES') return undefined;
        return undefined;
      },
    } as unknown as ConfigService;
    return new ExportService(prisma as never, config);
  }

  function emptyPrisma(overrides: Record<string, unknown> = {}) {
    const baseProfile = {
      findUnique: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
    };
    const profileOverride = overrides.profile as Record<string, unknown> | undefined;
    return {
      profile: { ...baseProfile, ...profileOverride },
      product: { findMany: jest.fn().mockResolvedValue([]) },
      customer: { findMany: jest.fn().mockResolvedValue([]) },
      order: { findMany: jest.fn().mockResolvedValue([]) },
      orderLine: { findMany: jest.fn().mockResolvedValue([]) },
      orderInstallment: { findMany: jest.fn().mockResolvedValue([]) },
      warehouseRestock: { findMany: jest.fn().mockResolvedValue([]) },
      revenueTargetPlan: { findMany: jest.fn().mockResolvedValue([]) },
      revenueTargetMonth: { findMany: jest.fn().mockResolvedValue([]) },
      ...overrides,
      profile: { ...baseProfile, ...profileOverride },
    };
  }

  it('eligibility is always allowed with scope by allowlist', async () => {
    const service = makeService(
      emptyPrisma({
        profile: {
          findUnique: jest
            .fn()
            .mockResolvedValueOnce({ profileName: 'rifqi_tjahyono' })
            .mockResolvedValueOnce({ profileName: 'someone_else' }),
        },
      }),
    );
    await expect(
      service.getEligibility({
        profileId: 'prof-1',
        profileName: 'rifqi_tjahyono',
      }),
    ).resolves.toEqual({
      allowed: true,
      scope: 'all-profiles',
    });
    await expect(
      service.getEligibility({
        profileId: 'p-other',
        profileName: 'someone_else',
      }),
    ).resolves.toEqual({
      allowed: true,
      scope: 'own-profile',
    });
  });

  it('scopes regular users to their own profileId', async () => {
    const prisma = emptyPrisma({
      profile: {
        findUnique: jest.fn().mockResolvedValue({ profileName: 'alice' }),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'p-own',
            profileName: 'alice',
            firstName: null,
            lastName: null,
            email: 'alice@example.com',
            emailVerifiedAt: null,
            accountVerifiedAt: null,
            locationCity: null,
            locationCountry: null,
            locationSource: null,
            passwordHash: sampleHash,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedAt: new Date('2026-01-02T00:00:00.000Z'),
          },
        ]),
      },
    });

    const service = makeService(prisma);
    const dump = await service.buildDump({
      profileId: 'p-own',
      profileName: 'alice',
    });

    expect(dump.scope).toBe('own-profile');
    expect(dump.profiles).toHaveLength(1);
    expect(dump.profiles[0]!.passwordHash).toBeDefined();
    expect(isSealedExportPasswordHash(dump.profiles[0]!.passwordHash)).toBe(
      true,
    );
    expect(prisma.profile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'p-own' } }),
    );
    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { profileId: 'p-own' } }),
    );
    expect(prisma.orderLine.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { order: { profileId: 'p-own' } },
      }),
    );
  });

  it('dumps all tenants for allowlisted user with decrypted location', async () => {
    const sealedCity = sealLocationValue('Jakarta', secret);
    const sealedCountry = sealLocationValue('Indonesia', secret);

    const prisma = emptyPrisma({
      profile: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ profileName: 'rifqi_tjahyono' }),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'prof-1',
            profileName: 'rifqi_tjahyono',
            firstName: 'Rifqi',
            lastName: 'Tjahyono',
            email: 'rifqi@example.com',
            emailVerifiedAt: null,
            accountVerifiedAt: null,
            locationCity: sealedCity,
            locationCountry: sealedCountry,
            locationSource: 'MANUAL',
            passwordHash: sampleHash,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedAt: new Date('2026-01-02T00:00:00.000Z'),
          },
        ]),
      },
    });

    const service = makeService(prisma);
    const dump = await service.buildDump({
      profileId: 'prof-1',
      profileName: 'rifqi_tjahyono',
    });

    expect(dump.scope).toBe('all-profiles');
    expect(dump.profiles[0]!.locationCity).toBe('Jakarta');
    expect(dump.profiles[0]!.locationCountry).toBe('Indonesia');
    expect(dump.profiles[0]!.password).toBe('12041994');
    expect(dump.profiles[0]).not.toHaveProperty('passwordHash');
    expect(JSON.stringify(dump.profiles)).not.toContain(sealedCity);
    expect(prisma.profile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: undefined }),
    );
  });

  it('uses DB profile name for allowlist when JWT profileName is stale', async () => {
    const prisma = emptyPrisma({
      profile: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ profileName: 'rifqi_tjahyono' }),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'prof-1',
            profileName: 'rifqi_tjahyono',
            firstName: null,
            lastName: null,
            email: 'rifqi@example.com',
            emailVerifiedAt: null,
            accountVerifiedAt: null,
            locationCity: null,
            locationCountry: null,
            locationSource: null,
            passwordHash: sampleHash,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedAt: new Date('2026-01-02T00:00:00.000Z'),
          },
        ]),
      },
    });

    const service = makeService(prisma);
    const dump = await service.buildDump({
      profileId: 'prof-1',
      profileName: 'stale_jwt_name',
    });

    expect(dump.scope).toBe('all-profiles');
    expect(dump.profiles[0]!.password).toBe('12041994');
    expect(dump.profiles[0]).not.toHaveProperty('passwordHash');
  });

  it('builds csv zip with profiles sheet', async () => {
    const prisma = emptyPrisma({
      profile: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ profileName: 'rifqi_tjahyono' }),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'prof-1',
            profileName: 'rifqi_tjahyono',
            firstName: null,
            lastName: null,
            email: 'rifqi@example.com',
            emailVerifiedAt: null,
            accountVerifiedAt: null,
            locationCity: null,
            locationCountry: null,
            locationSource: null,
            passwordHash: sampleHash,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedAt: new Date('2026-01-02T00:00:00.000Z'),
          },
        ]),
      },
    });

    const service = makeService(prisma);
    const file = await service.buildCsvZip({
      profileId: 'prof-1',
      profileName: 'rifqi_tjahyono',
    });
    expect(file.filename).toMatch(/export-all-.*\.zip$/);
    expect(file.body.includes(Buffer.from('profiles.csv'))).toBe(true);
  });

  it('builds a unified csv file', async () => {
    const prisma = emptyPrisma({
      profile: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ profileName: 'rifqi_tjahyono' }),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'prof-1',
            profileName: 'rifqi_tjahyono',
            firstName: null,
            lastName: null,
            email: 'rifqi@example.com',
            emailVerifiedAt: null,
            accountVerifiedAt: null,
            locationCity: null,
            locationCountry: null,
            locationSource: null,
            passwordHash: sampleHash,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedAt: new Date('2026-01-02T00:00:00.000Z'),
          },
        ]),
      },
    });

    const service = makeService(prisma);
    const file = await service.buildUnifiedCsv({
      profileId: 'prof-1',
      profileName: 'rifqi_tjahyono',
    });
    expect(file.filename).toMatch(/unified-.*\.csv$/);
    expect(file.contentType).toContain('text/csv');
    const text = file.body.toString('utf8');
    expect(text).toContain('table,');
    expect(text).toContain('profiles,');
    expect(text).toContain('rifqi_tjahyono');
  });
});
