import { rowsToUnifiedCsv } from './export-csv';
import { parseCsv, unifiedCsvToBundle } from './import-csv';
import {
  dedupeImportBundle,
  dedupeLastWins,
  filterBundleForScope,
} from './import-dedupe';

describe('import-csv', () => {
  it('parses quoted CSV cells', () => {
    const rows = parseCsv('a,b\n1,"x,y"\n');
    expect(rows).toEqual([
      ['a', 'b'],
      ['1', 'x,y'],
    ]);
  });

  it('rebuilds a bundle from unified CSV export', () => {
    const csv = rowsToUnifiedCsv([
      {
        name: 'profiles',
        rows: [{ id: 'p1', profileName: 'alice', email: 'a@example.com' }],
      },
      {
        name: 'products',
        rows: [{ id: 'pr1', profileId: 'p1', name: 'Coffee', productId: 'CB_1_' }],
      },
    ]);
    const bundle = unifiedCsvToBundle(csv);
    expect(bundle.profiles).toHaveLength(1);
    expect(bundle.products).toHaveLength(1);
    expect(bundle.products[0]?.profileId).toBe('p1');
  });
});

describe('import-dedupe', () => {
  const baseBundle = {
    exportedAt: '2026-07-31T00:00:00.000Z',
    exporterProfileId: 'p1',
    exporterProfileName: 'alice',
    scope: 'own-profile' as const,
    notes: [],
    profiles: [
      {
        id: 'p1',
        profileName: 'alice',
        firstName: null,
        lastName: null,
        email: 'a@example.com',
        emailVerifiedAt: null,
        accountVerifiedAt: null,
        locationCity: null,
        locationCountry: null,
        locationSet: false,
        locationNeedsReentry: false,
        locationSource: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ],
    products: [
      { id: 'pr1', profileId: 'p1', productId: 'S1', name: 'A' },
      { id: 'pr1', profileId: 'p1', productId: 'S1', name: 'B' },
    ],
    customers: [],
    orders: [],
    orderLines: [],
    orderInstallments: [],
    warehouseRestocks: [],
    warehouseSales: [],
    revenueTargetPlans: [],
    revenueTargetMonths: [],
  };

  it('collapses duplicate ids within the import file', () => {
    const deduped = dedupeImportBundle(baseBundle);
    expect(deduped.products).toHaveLength(1);
    expect(deduped.products[0]?.name).toBe('B');
  });

  it('keeps the newest row when different ids share a business key', () => {
    const deduped = dedupeImportBundle({
      ...baseBundle,
      products: [
        {
          id: 'pr-old',
          profileId: 'p1',
          productId: 'S1',
          name: 'Old',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'pr-new',
          profileId: 'p1',
          productId: 'S1',
          name: 'New',
          updatedAt: '2026-06-01T00:00:00.000Z',
        },
      ],
    });
    expect(deduped.products).toHaveLength(1);
    expect(deduped.products[0]?.name).toBe('New');
    expect(deduped.products[0]?.id).toBe('pr-new');
  });

  it('prefers last file row when updatedAt is missing', () => {
    const rows = dedupeLastWins([
      { id: 'a', productId: 'X', name: 'first' },
      { id: 'b', productId: 'X', name: 'second' },
    ], (row) => {
      const productId = String(row.productId ?? '').trim();
      return productId ? [`p1::${productId}`] : [];
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.name).toBe('second');
  });

  it('remaps own-profile imports to the authenticated profile', () => {
    const filtered = filterBundleForScope(baseBundle, {
      profileId: 'p-live',
      profileName: 'alice',
    }, 'own-profile');
    expect(filtered.profiles[0]?.id).toBe('p-live');
    expect(filtered.products[0]?.profileId).toBe('p-live');
  });

  it('collapses warehouse sales that share the same orderLineId', () => {
    const deduped = dedupeImportBundle({
      ...baseBundle,
      warehouseSales: [
        {
          id: 'sale-old',
          orderLineId: 'line-1',
          qtySold: '2',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'sale-new',
          orderLineId: 'line-1',
          qtySold: '5',
          updatedAt: '2026-06-01T00:00:00.000Z',
        },
      ],
    });
    expect(deduped.warehouseSales).toHaveLength(1);
    expect(deduped.warehouseSales[0]?.id).toBe('sale-new');
    expect(deduped.warehouseSales[0]?.qtySold).toBe('5');
  });

  it('collapses order lines that share orderId+productId+sortOrder', () => {
    const deduped = dedupeImportBundle({
      ...baseBundle,
      orderLines: [
        {
          id: 'line-a',
          orderId: 'ord1',
          productId: 'pr1',
          sortOrder: 0,
          lineTotal: '10',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'line-b',
          orderId: 'ord1',
          productId: 'pr1',
          sortOrder: 0,
          lineTotal: '20',
          updatedAt: '2026-06-01T00:00:00.000Z',
        },
      ],
    });
    expect(deduped.orderLines).toHaveLength(1);
    expect(deduped.orderLines[0]?.id).toBe('line-b');
  });
});
