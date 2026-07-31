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
import {
  COST_SET_KEYS,
  PRODUCT_UNIT_KEYS,
  STOCK_STATUS_KEYS,
} from '../products/product-statistics';

const RESTOCK_UNIT_KEYS = [
  ProductUnit.PCS,
  ProductUnit.GRAM,
  ProductUnit.LITER,
] as const;

type WarehouseStatisticsInput = {
  productCount: number;
  restockCount: number;
  unit: CountBucketInput[];
  stockStatus: CountBucketInput[];
  costSet: CountBucketInput[];
  restockUnit: CountBucketInput[];
  restockNotes: WithWithoutInput;
};

export type WarehouseStatistics = {
  unit: StatBucket[];
  stockStatus: StatBucket[];
  costSet: StatBucket[];
  restockUnit: StatBucket[];
  restockNotes: WithWithoutStats;
};

export function buildWarehouseStatisticsFromCounts(input: {
  productCount: number;
  restockCount: number;
  inStockCount: number;
  withCostCount: number;
  unitRows: CountBucketInput[];
  restockUnitRows: CountBucketInput[];
  restockNotesWithCount: number;
}): WarehouseStatistics {
  const productTotal = Math.max(0, input.productCount);
  const restockTotal = Math.max(0, input.restockCount);
  return buildWarehouseStatistics({
    productCount: productTotal,
    restockCount: restockTotal,
    unit: input.unitRows,
    stockStatus: syntheticPairBuckets(
      'in_stock',
      input.inStockCount,
      'out_of_stock',
      productTotal - input.inStockCount,
    ),
    costSet: syntheticPairBuckets(
      'set',
      input.withCostCount,
      'unset',
      productTotal - input.withCostCount,
    ),
    restockUnit: input.restockUnitRows,
    restockNotes: {
      withCount: input.restockNotesWithCount,
      withoutCount: restockTotal - input.restockNotesWithCount,
    },
  });
}

function buildWarehouseStatistics(
  input: WarehouseStatisticsInput,
): WarehouseStatistics {
  const productTotal = Math.max(0, input.productCount);
  const restockTotal = Math.max(0, input.restockCount);
  return {
    unit: toStatBuckets(
      normalizeEnumBuckets(PRODUCT_UNIT_KEYS, input.unit),
      productTotal,
    ),
    stockStatus: toStatBuckets(
      normalizeEnumBuckets(STOCK_STATUS_KEYS, input.stockStatus),
      productTotal,
    ),
    costSet: toStatBuckets(
      normalizeEnumBuckets(COST_SET_KEYS, input.costSet),
      productTotal,
    ),
    restockUnit: toStatBuckets(
      normalizeEnumBuckets(RESTOCK_UNIT_KEYS, input.restockUnit),
      restockTotal,
    ),
    restockNotes: toWithWithoutStats(input.restockNotes, restockTotal),
  };
}

export function emptyWarehouseStatistics(): WarehouseStatistics {
  return buildWarehouseStatistics({
    productCount: 0,
    restockCount: 0,
    unit: [],
    stockStatus: syntheticPairBuckets('in_stock', 0, 'out_of_stock', 0),
    costSet: syntheticPairBuckets('set', 0, 'unset', 0),
    restockUnit: [],
    restockNotes: { withCount: 0, withoutCount: 0 },
  });
}
