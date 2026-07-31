import {
  filterBundleToEntity,
  entitySheetNames,
  isFeatureExportEntity,
  parseFeatureExportEntity,
} from './export-entities';
import type { DataExportBundle } from './export.service';

function emptyBundle(overrides: Partial<DataExportBundle> = {}): DataExportBundle {
  return {
    exportedAt: '2026-07-31T00:00:00.000Z',
    exporterProfileId: 'p1',
    exporterProfileName: 'alice',
    scope: 'own-profile',
    notes: [],
    profiles: [{ id: 'p1' } as never],
    products: [{ id: 'prod1' }],
    customers: [{ id: 'cust1' }],
    orders: [{ id: 'ord1' }],
    orderLines: [{ id: 'line1' }],
    orderInstallments: [{ id: 'inst1' }],
    warehouseRestocks: [{ id: 'rest1' }],
    revenueTargetPlans: [{ id: 'plan1' }],
    revenueTargetMonths: [{ id: 'month1' }],
    ...overrides,
  };
}

describe('export-entities', () => {
  it('parses valid entity names', () => {
    expect(parseFeatureExportEntity('products')).toBe('products');
    expect(parseFeatureExportEntity(' ORDERS ')).toBe('orders');
  });

  it('rejects unknown entities', () => {
    expect(() => parseFeatureExportEntity('profiles')).toThrow(/entity must be/);
    expect(isFeatureExportEntity('analytics')).toBe(false);
  });

  it('filterBundleToEntity keeps only relevant tables', () => {
    const bundle = emptyBundle();
    const productsOnly = filterBundleToEntity(bundle, 'products');
    expect(productsOnly.products).toHaveLength(1);
    expect(productsOnly.customers).toHaveLength(0);
    expect(productsOnly.orders).toHaveLength(0);

    const ordersOnly = filterBundleToEntity(bundle, 'orders');
    expect(ordersOnly.orders).toHaveLength(1);
    expect(ordersOnly.orderLines).toHaveLength(1);
    expect(ordersOnly.orderInstallments).toHaveLength(1);
    expect(ordersOnly.products).toHaveLength(0);

    const warehouseOnly = filterBundleToEntity(bundle, 'warehouse');
    expect(warehouseOnly.products).toHaveLength(1);
    expect(warehouseOnly.warehouseRestocks).toHaveLength(1);
    expect(warehouseOnly.customers).toHaveLength(0);

    const targetsOnly = filterBundleToEntity(bundle, 'targets');
    expect(targetsOnly.revenueTargetPlans).toHaveLength(1);
    expect(targetsOnly.revenueTargetMonths).toHaveLength(1);
    expect(targetsOnly.products).toHaveLength(0);
  });

  it('entitySheetNames lists CSV sheet names per feature', () => {
    expect(entitySheetNames('products')).toEqual(['products']);
    expect(entitySheetNames('orders')).toEqual([
      'orders',
      'order_lines',
      'order_installments',
    ]);
    expect(entitySheetNames('targets')).toEqual([
      'revenue_target_plans',
      'revenue_target_months',
    ]);
  });
});
