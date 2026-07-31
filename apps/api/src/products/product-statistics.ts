import { ProductUnit } from '@prisma/client';
import {
  CountBucketInput,
  normalizeEnumBuckets,
  StatBucket,
  syntheticPairBuckets,
  toStatBuckets,
  toWithWithoutStats,
  WithWithoutInput,
  WithWithoutStats,
} from '../common/statistics-buckets';

export const PRODUCT_UNIT_KEYS = [
  ProductUnit.PCS,
  ProductUnit.GRAM,
  ProductUnit.LITER,
] as const;

export const STOCK_STATUS_KEYS = ['in_stock', 'out_of_stock'] as const;
export const COST_SET_KEYS = ['set', 'unset'] as const;
const PACK_READY_KEYS = ['ready', 'not_ready'] as const;

export type ProductStatisticsInput = {
  productCount: number;
  unit: CountBucketInput[];
  stockStatus: CountBucketInput[];
  costSet: CountBucketInput[];
  packReady: CountBucketInput[];
  details: WithWithoutInput;
};

export type ProductStatistics = {
  unit: StatBucket[];
  stockStatus: StatBucket[];
  costSet: StatBucket[];
  packReady: StatBucket[];
  details: WithWithoutStats;
};

export function buildProductStatisticsFromCounts(input: {
  productCount: number;
  inStockCount: number;
  withCostCount: number;
  packReadyCount: number;
  detailsWithCount: number;
  unitRows: CountBucketInput[];
}): ProductStatistics {
  const total = Math.max(0, input.productCount);
  return buildProductStatistics({
    productCount: total,
    unit: input.unitRows,
    stockStatus: syntheticPairBuckets(
      'in_stock',
      input.inStockCount,
      'out_of_stock',
      total - input.inStockCount,
    ),
    costSet: syntheticPairBuckets(
      'set',
      input.withCostCount,
      'unset',
      total - input.withCostCount,
    ),
    packReady: syntheticPairBuckets(
      'ready',
      input.packReadyCount,
      'not_ready',
      total - input.packReadyCount,
    ),
    details: {
      withCount: input.detailsWithCount,
      withoutCount: total - input.detailsWithCount,
    },
  });
}

export function buildProductStatistics(
  input: ProductStatisticsInput,
): ProductStatistics {
  const total = Math.max(0, input.productCount);
  return {
    unit: toStatBuckets(
      normalizeEnumBuckets(PRODUCT_UNIT_KEYS, input.unit),
      total,
    ),
    stockStatus: toStatBuckets(
      normalizeEnumBuckets(STOCK_STATUS_KEYS, input.stockStatus),
      total,
    ),
    costSet: toStatBuckets(
      normalizeEnumBuckets(COST_SET_KEYS, input.costSet),
      total,
    ),
    packReady: toStatBuckets(
      normalizeEnumBuckets(PACK_READY_KEYS, input.packReady),
      total,
    ),
    details: toWithWithoutStats(input.details, total),
  };
}

export function emptyProductStatistics(): ProductStatistics {
  return buildProductStatistics({
    productCount: 0,
    unit: [],
    stockStatus: syntheticPairBuckets('in_stock', 0, 'out_of_stock', 0),
    costSet: syntheticPairBuckets('set', 0, 'unset', 0),
    packReady: syntheticPairBuckets('ready', 0, 'not_ready', 0),
    details: { withCount: 0, withoutCount: 0 },
  });
}
