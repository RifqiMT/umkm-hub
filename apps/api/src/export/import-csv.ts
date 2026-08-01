import type { DataExportBundle } from './export.service';

/** Parse RFC 4180-ish CSV (handles quoted fields). */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < src.length; i++) {
    const ch = src[i]!;
    const next = src[i + 1];

    if (inQuotes) {
      if (ch === '"') {
        if (next === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ',') {
      row.push(cell);
      cell = '';
      continue;
    }
    if (ch === '\r' && next === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      i++;
      continue;
    }
    if (ch === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      continue;
    }
    cell += ch;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

const TABLE_TO_BUNDLE_KEY: Record<
  string,
  keyof Pick<
    DataExportBundle,
    | 'profiles'
    | 'products'
    | 'customers'
    | 'orders'
    | 'orderLines'
    | 'orderInstallments'
    | 'warehouseRestocks'
    | 'warehouseSales'
    | 'revenueTargetPlans'
    | 'revenueTargetMonths'
  >
> = {
  profiles: 'profiles',
  products: 'products',
  customers: 'customers',
  orders: 'orders',
  order_lines: 'orderLines',
  order_installments: 'orderInstallments',
  warehouse_restocks: 'warehouseRestocks',
  warehouse_sales: 'warehouseSales',
  revenue_target_plans: 'revenueTargetPlans',
  revenue_target_months: 'revenueTargetMonths',
};

function rowHasData(row: Record<string, unknown>): boolean {
  return Object.entries(row).some(
    ([key, value]) =>
      key !== 'table' &&
      value !== null &&
      value !== undefined &&
      String(value).trim() !== '',
  );
}

/** Rebuild a DataExportBundle from unified CSV export format. */
export function unifiedCsvToBundle(csvText: string): DataExportBundle {
  const grid = parseCsv(csvText);
  if (grid.length < 2) {
    throw new Error('Unified CSV must include a header row and at least one data row');
  }

  const headers = grid[0]!.map((h) => h.trim());
  const tableIdx = headers.indexOf('table');
  if (tableIdx < 0) {
    throw new Error('Unified CSV must include a leading "table" column');
  }

  const buckets: Record<string, Array<Record<string, unknown>>> = {};
  for (const cells of grid.slice(1)) {
    const wide: Record<string, unknown> = {};
    headers.forEach((header, idx) => {
      const raw = cells[idx] ?? '';
      wide[header] = raw === '' ? undefined : raw;
    });
    const table = String(wide.table ?? '').trim();
    if (!table) continue;
    if (!rowHasData(wide)) continue;
    if (!buckets[table]) buckets[table] = [];
    buckets[table].push(wide);
  }

  const bundle: DataExportBundle = {
    exportedAt: new Date().toISOString(),
    exporterProfileId: '',
    exporterProfileName: '',
    scope: 'own-profile',
    notes: ['Imported from unified CSV'],
    profiles: [],
    products: [],
    customers: [],
    orders: [],
    orderLines: [],
    orderInstallments: [],
    warehouseRestocks: [],
    warehouseSales: [],
    revenueTargetPlans: [],
    revenueTargetMonths: [],
  };

  for (const [table, rows] of Object.entries(buckets)) {
    const key = TABLE_TO_BUNDLE_KEY[table];
    if (!key) continue;
    if (key === 'profiles') {
      bundle.profiles = rows as DataExportBundle['profiles'];
    } else {
      (bundle[key] as Array<Record<string, unknown>>).push(...rows);
    }
  }

  return bundle;
}
