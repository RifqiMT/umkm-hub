import { ForbiddenException } from '@nestjs/common';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import {
  resolveDataExportScope,
  type DataExportScope,
} from './export-allowlist';

type ExporterContext = {
  profileId: string;
  profileName: string;
  scope: DataExportScope;
  crossTenant: boolean;
};

type ProfileReader = {
  profile: {
    findUnique(args: {
      where: { id: string };
      select: { profileName: true };
    }): Promise<{ profileName: string } | null>;
  };
};

/** Resolve export/import scope from the canonical DB profile name (not JWT). */
export async function resolveExporterContext(
  prisma: ProfileReader,
  user: AuthUser,
  allowlistRaw?: string | null,
): Promise<ExporterContext> {
  const row = await prisma.profile.findUnique({
    where: { id: user.profileId },
    select: { profileName: true },
  });
  if (!row) {
    throw new ForbiddenException('Profile not found');
  }
  const scope = resolveDataExportScope(row.profileName, allowlistRaw);
  return {
    profileId: user.profileId,
    profileName: row.profileName,
    scope,
    crossTenant: scope === 'all-profiles',
  };
}
