import type { DataExportScope } from './export-allowlist';
import type { DataExportBundle, ExportedProfile } from './export.service';
import {
  readCustomerBusinessId,
  readOrderBusinessId,
  readProductBusinessId,
} from './import-field-aliases';

type EntityMergeStats = {
  created: number;
  updated: number;
  skipped: number;
};

export type ImportMergeStats = {
  profiles: EntityMergeStats;
  products: EntityMergeStats;
  customers: EntityMergeStats;
  orders: EntityMergeStats;
  orderLines: EntityMergeStats;
  orderInstallments: EntityMergeStats;
  warehouseRestocks: EntityMergeStats;
  warehouseSales: EntityMergeStats;
  revenueTargetPlans: EntityMergeStats;
  revenueTargetMonths: EntityMergeStats;
};

export function emptyMergeStats(): ImportMergeStats {
  const zero = (): EntityMergeStats => ({
    created: 0,
    updated: 0,
    skipped: 0,
  });
  return {
    profiles: zero(),
    products: zero(),
    customers: zero(),
    orders: zero(),
    orderLines: zero(),
    orderInstallments: zero(),
    warehouseRestocks: zero(),
    warehouseSales: zero(),
    revenueTargetPlans: zero(),
    revenueTargetMonths: zero(),
  };
}

function rowUpdatedAtMs(row: Record<string, unknown>): number | null {
  const raw = row.updatedAt;
  if (raw === null || raw === undefined) return null;
  const t = Date.parse(String(raw));
  return Number.isFinite(t) ? t : null;
}

function pickNewerRow<T extends Record<string, unknown>>(
  a: T,
  aIndex: number,
  b: T,
  bIndex: number,
): T {
  const ta = rowUpdatedAtMs(a);
  const tb = rowUpdatedAtMs(b);
  if (ta !== null && tb !== null && ta !== tb) {
    return tb > ta ? b : a;
  }
  return bIndex >= aIndex ? b : a;
}

/**
 * Collapse duplicate rows in an import file. Last row wins per id; when natural
 * keys collide across different ids, keep the newest row (by updatedAt, else file order).
 */
export function dedupeLastWins<T extends Record<string, unknown>>(
  rows: T[],
  naturalKeys?: (row: T) => string[],
): T[] {
  type Slot = { row: T; index: number };
  const idWinner = new Map<string, Slot>();
  const naturalWinner = new Map<string, Slot>();

  const setWinner = (map: Map<string, Slot>, key: string, row: T, index: number) => {
    const prev = map.get(key);
    if (!prev) {
      map.set(key, { row, index });
      return;
    }
    const winner = pickNewerRow(prev.row, prev.index, row, index);
    const winnerIndex = winner === row ? index : prev.index;
    map.set(key, { row: winner, index: winnerIndex });
  };

  rows.forEach((row, index) => {
    const id = String(row.id ?? '').trim();
    if (!id) return;
    setWinner(idWinner, id, row, index);
    for (const nat of naturalKeys?.(row) ?? []) {
      if (nat) setWinner(naturalWinner, nat, row, index);
    }
  });

  const supersededIds = new Set<string>();
  for (const [nat, { row: winRow }] of naturalWinner) {
    const winId = String(winRow.id ?? '').trim();
    for (const [id, { row }] of idWinner) {
      if (id === winId) continue;
      const keys = naturalKeys?.(row) ?? [];
      if (keys.includes(nat)) supersededIds.add(id);
    }
  }

  const kept = new Map<string, T>();
  for (const [id, { row }] of idWinner) {
    if (!supersededIds.has(id)) kept.set(id, row);
  }
  for (const { row } of naturalWinner.values()) {
    const id = String(row.id ?? '').trim();
    if (id) kept.set(id, row);
  }

  return [...kept.values()];
}

function tenantBusinessKeys(
  row: Record<string, unknown>,
  readBusinessId: (row: Record<string, unknown>) => string,
): string[] {
  const profileId = String(row.profileId ?? '').trim();
  const businessId = readBusinessId(row);
  return profileId && businessId ? [`${profileId}::${businessId}`] : [];
}

function orderLineNaturalKeys(row: Record<string, unknown>): string[] {
  const orderId = String(row.orderId ?? '').trim();
  const productId = String(row.productId ?? '').trim();
  const sortOrder = String(row.sortOrder ?? '').trim();
  return orderId && productId && sortOrder !== ''
    ? [`${orderId}::${productId}::${sortOrder}`]
    : [];
}

function installmentNaturalKeys(row: Record<string, unknown>): string[] {
  const orderId = String(row.orderId ?? '').trim();
  const date = String(row.installmentDate ?? '').trim().slice(0, 10);
  const amount = String(row.amount ?? '').trim();
  return orderId && date && amount ? [`${orderId}::${date}::${amount}`] : [];
}

function restockNaturalKeys(row: Record<string, unknown>): string[] {
  const profileId = String(row.profileId ?? '').trim();
  const productId = String(row.productId ?? '').trim();
  const date = String(row.restockDate ?? '').trim().slice(0, 10);
  const qty = String(row.qtyAdded ?? '').trim();
  const before = String(row.stockBefore ?? '').trim();
  const after = String(row.stockAfter ?? '').trim();
  return profileId && productId && date && qty && before && after
    ? [`${profileId}::${productId}::${date}::${qty}::${before}::${after}`]
    : [];
}

function saleNaturalKeys(row: Record<string, unknown>): string[] {
  const orderLineId = String(row.orderLineId ?? '').trim();
  return orderLineId ? [`line:${orderLineId}`] : [];
}

/** Keep the last / newest row per primary and natural key within the import file. */
export function dedupeImportBundle(bundle: DataExportBundle): DataExportBundle {
  const dedupeProfiles = (rows: ExportedProfile[]): ExportedProfile[] =>
    dedupeLastWins(rows, (row) => {
      const keys: string[] = [];
      const name = row.profileName.trim().toLowerCase();
      const email = row.email.trim().toLowerCase();
      if (name) keys.push(`name:${name}`);
      if (email) keys.push(`email:${email}`);
      return keys;
    });

  return {
    ...bundle,
    profiles: dedupeProfiles(bundle.profiles),
    products: dedupeLastWins(bundle.products, (row) =>
      tenantBusinessKeys(row, readProductBusinessId),
    ),
    customers: dedupeLastWins(bundle.customers, (row) =>
      tenantBusinessKeys(row, readCustomerBusinessId),
    ),
    orders: dedupeLastWins(bundle.orders, (row) =>
      tenantBusinessKeys(row, readOrderBusinessId),
    ),
    orderLines: dedupeLastWins(bundle.orderLines, orderLineNaturalKeys),
    orderInstallments: dedupeLastWins(
      bundle.orderInstallments,
      installmentNaturalKeys,
    ),
    warehouseRestocks: dedupeLastWins(
      bundle.warehouseRestocks,
      restockNaturalKeys,
    ),
    warehouseSales: dedupeLastWins(bundle.warehouseSales ?? [], saleNaturalKeys),
    revenueTargetPlans: dedupeLastWins(bundle.revenueTargetPlans, (row) => {
      const profileId = String(row.profileId ?? '').trim();
      const year = String(row.year ?? '').trim();
      return profileId && year ? [`${profileId}::${year}`] : [];
    }),
    revenueTargetMonths: dedupeLastWins(bundle.revenueTargetMonths, (row) => {
      const planId = String(row.planId ?? '').trim();
      const month = String(row.month ?? '').trim();
      return planId && month ? [`${planId}::${month}`] : [];
    }),
  };
}

/** Restrict or remap rows to the authenticated import scope. */
export function filterBundleForScope(
  bundle: DataExportBundle,
  user: { profileId: string; profileName: string },
  scope: DataExportScope,
): DataExportBundle {
  if (scope === 'all-profiles') {
    return {
      ...bundle,
      warehouseSales: bundle.warehouseSales ?? [],
    };
  }

  const sourceProfileIds = new Set<string>();
  for (const profile of bundle.profiles) {
    if (
      profile.id === user.profileId ||
      profile.profileName.trim().toLowerCase() ===
        user.profileName.trim().toLowerCase()
    ) {
      sourceProfileIds.add(profile.id);
    }
  }

  if (bundle.profiles.length === 1) {
    sourceProfileIds.add(bundle.profiles[0]!.id);
  }

  if (sourceProfileIds.size === 0 && bundle.profiles.length === 0) {
    sourceProfileIds.add(user.profileId);
  }

  const profileIdRemap = new Map<string, string>();
  for (const sourceId of sourceProfileIds) {
    profileIdRemap.set(sourceId, user.profileId);
  }

  const remapProfileId = (value: unknown): unknown => {
    const id = String(value ?? '').trim();
    if (!id) return value;
    return profileIdRemap.get(id) ?? (sourceProfileIds.has(id) ? user.profileId : id);
  };

  const keepTenantRow = (row: Record<string, unknown>) => {
    const pid = String(row.profileId ?? '').trim();
    return !pid || sourceProfileIds.has(pid) || profileIdRemap.has(pid);
  };

  const profiles =
    bundle.profiles.length === 0
      ? []
      : bundle.profiles
          .filter((p) => sourceProfileIds.has(p.id))
          .map((p) =>
            p.id === user.profileId
              ? p
              : { ...p, id: user.profileId, profileName: user.profileName },
          );

  const remapRowProfileId = (row: Record<string, unknown>) => ({
    ...row,
    profileId: remapProfileId(row.profileId),
  });

  return {
    ...bundle,
    scope: 'own-profile',
    profiles,
    products: bundle.products
      .filter(keepTenantRow)
      .map(remapRowProfileId),
    customers: bundle.customers
      .filter(keepTenantRow)
      .map(remapRowProfileId),
    orders: bundle.orders.filter(keepTenantRow).map(remapRowProfileId),
    orderLines: bundle.orderLines,
    orderInstallments: bundle.orderInstallments,
    warehouseRestocks: bundle.warehouseRestocks
      .filter(keepTenantRow)
      .map(remapRowProfileId),
    warehouseSales: (bundle.warehouseSales ?? [])
      .filter(keepTenantRow)
      .map(remapRowProfileId),
    revenueTargetPlans: bundle.revenueTargetPlans
      .filter(keepTenantRow)
      .map(remapRowProfileId),
    revenueTargetMonths: bundle.revenueTargetMonths,
  };
}
