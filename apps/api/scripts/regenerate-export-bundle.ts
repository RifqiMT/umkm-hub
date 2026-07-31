import { PrismaClient } from '@prisma/client';
import { ExportService } from '../src/export/export.service';
import { rowsToCsv } from '../src/export/export-csv';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

async function main() {
  const profileName = process.argv[2]?.trim() || 'rifqi_tjahyono';
  const outDir = process.argv[3]?.trim();
  if (!outDir) {
    console.error(
      'Usage: npx ts-node --transpile-only scripts/regenerate-export-bundle.ts <profileName> <output-folder>',
    );
    process.exit(1);
  }

  mkdirSync(outDir, { recursive: true });

  const prisma = new PrismaClient();
  const profile = await prisma.profile.findFirst({
    where: { profileName: { equals: profileName, mode: 'insensitive' } },
    select: { id: true, profileName: true },
  });
  if (!profile) {
    console.error(`Profile not found: ${profileName}`);
    process.exit(1);
  }

  const config = {
    get: (key: string) => {
      if (key in process.env) return process.env[key];
      if (key === 'PROFILE_LOCATION_SECRET') return process.env.JWT_ACCESS_SECRET;
      return undefined;
    },
  };

  const service = new ExportService(prisma as never, config as never);
  const user = { profileId: profile.id, profileName: profile.profileName };

  console.log('Building CSV ZIP (large datasets may take a minute)…');
  const zipFile = await service.buildCsvZip(user);
  const zipPath = join(outDir, zipFile.filename);
  writeFileSync(zipPath, zipFile.body);
  console.log(`Wrote ${zipPath}`);

  const dump = await service.buildDump(user);
  const profileHeaders = [
    'id',
    'profileName',
    'firstName',
    'lastName',
    'email',
    'emailVerifiedAt',
    'accountVerifiedAt',
    'locationCity',
    'locationCountry',
    'locationSet',
    'locationNeedsReentry',
    'locationSource',
    'passwordHash',
    'password',
    'createdAt',
    'updatedAt',
  ];
  const profilesPath = join(outDir, 'profiles.csv');
  writeFileSync(
    profilesPath,
    rowsToCsv(
      profileHeaders,
      dump.profiles as unknown as Array<Record<string, unknown>>,
    ),
    'utf8',
  );
  console.log(`Wrote ${profilesPath}`);

  for (const profileRow of dump.profiles) {
    const hash = profileRow.passwordHash ?? '';
    console.log(
      `  ${profileRow.profileName}: hash=${hash.startsWith('$2') ? 'bcrypt' : hash.slice(0, 8)} plaintext=${profileRow.password ?? '(none)'}`,
    );
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
