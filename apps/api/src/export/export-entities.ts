import type { DataExportBundle } from './export.service';

const FEATURE_EXPORT_ENTITIES = [
  'products',
  'customers',
  'orders',
  'warehouse',
  'targets',
] as const;

export type FeatureExportEntity = (typeof FEATURE_EXPORT_ENTITIES)[number];

export function isFeatureExportEntity(
  value: string,
): value is FeatureExportEntity {
  return (FEATURE_EXPORT_ENTITIES as readonly string[]).includes(value);
}

export function parseFeatureExportEntity(raw: string): FeatureExportEntity {
  const value = raw.trim().toLowerCase();
  if (!isFeatureExportEntity(value)) {
    throw new Error(
      `entity must be one of: ${FEATURE_EXPORT_ENTITIES.join(', ')}`,
    );
  }
  return value;
}

const EMPTY_BUNDLE_ARRAYS = {
  profiles: [] as DataExportBundle['profiles'],
  products: [] as DataExportBundle['products'],
  customers: [] as DataExportBundle['customers'],
  orders: [] as DataExportBundle['orders'],
  orderLines: [] as DataExportBundle['orderLines'],
  orderInstallments: [] as DataExportBundle['orderInstallments'],
  warehouseRestocks: [] as DataExportBundle['warehouseRestocks'],
  warehouseSales: [] as DataExportBundle['warehouseSales'],
  revenueTargetPlans: [] as DataExportBundle['revenueTargetPlans'],
  revenueTargetMonths: [] as DataExportBundle['revenueTargetMonths'],
};

/** Keep only tables that belong to a feature-scoped export/import. */
export function filterBundleToEntity(
  bundle: DataExportBundle,
  entity: FeatureExportEntity,
): DataExportBundle {
  switch (entity) {
    case 'products':
      return {
        ...bundle,
        ...EMPTY_BUNDLE_ARRAYS,
        products: bundle.products,
      };
    case 'customers':
      return {
        ...bundle,
        ...EMPTY_BUNDLE_ARRAYS,
        customers: bundle.customers,
      };
    case 'orders':
      return {
        ...bundle,
        ...EMPTY_BUNDLE_ARRAYS,
        // Related catalog/CRM rows so order FKs can merge across apps.
        products: bundle.products,
        customers: bundle.customers,
        orders: bundle.orders,
        orderLines: bundle.orderLines,
        orderInstallments: bundle.orderInstallments,
        warehouseSales: bundle.warehouseSales,
      };
    case 'warehouse':
      return {
        ...bundle,
        ...EMPTY_BUNDLE_ARRAYS,
        products: bundle.products,
        warehouseRestocks: bundle.warehouseRestocks,
        warehouseSales: bundle.warehouseSales,
      };
    case 'targets':
      return {
        ...bundle,
        ...EMPTY_BUNDLE_ARRAYS,
        revenueTargetPlans: bundle.revenueTargetPlans,
        revenueTargetMonths: bundle.revenueTargetMonths,
      };
  }
}

export function entitySheetNames(entity: FeatureExportEntity): string[] {
  switch (entity) {
    case 'products':
      return ['products'];
    case 'customers':
      return ['customers'];
    case 'orders':
      return [
        'products',
        'customers',
        'orders',
        'order_lines',
        'order_installments',
        'warehouse_sales',
      ];
    case 'warehouse':
      return ['products', 'warehouse_restocks', 'warehouse_sales'];
    case 'targets':
      return ['revenue_target_plans', 'revenue_target_months'];
  }
}

export function featureExportFilenamePrefix(entity: FeatureExportEntity): string {
  return `umkm-hub-${entity}`;
}
