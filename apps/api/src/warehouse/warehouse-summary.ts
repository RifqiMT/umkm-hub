import {
  ratePercent,
  profitMarginRatePercent,
  toDateOnlyIso,
} from '../common/summary-rates';

type WarehouseInventoryAgg = {
  productCount: number;
  sellValue: number;
  costedSellValue: number;
  costValue: number;
  profitValue: number;
  hasCost: boolean;
  inStockCount: number;
  withCostCount: number;
  restockCount: number;
  qtyRestocked: number;
  earliestRestockDate: Date | string | null;
  latestRestockDate: Date | string | null;
};

export function buildWarehouseSummary(agg: WarehouseInventoryAgg) {
  const count = Math.max(0, agg.productCount);
  return {
    earliestRestockDate: toDateOnlyIso(agg.earliestRestockDate),
    latestRestockDate: toDateOnlyIso(agg.latestRestockDate),
    productCount: count,
    inventorySellValue: Math.max(0, agg.sellValue),
    inventoryCostValue: Math.max(0, agg.costValue),
    inventoryProfitValue: agg.profitValue,
    restockCount: Math.max(0, agg.restockCount),
    qtyRestocked: Math.max(0, agg.qtyRestocked),
    profitMarginRate: profitMarginRatePercent(
      agg.costedSellValue,
      agg.costValue,
      agg.hasCost,
    ),
    costCoverageRate: ratePercent(agg.withCostCount, count),
    inStockRate: ratePercent(agg.inStockCount, count),
    outOfStockRate: ratePercent(count - agg.inStockCount, count),
  };
}
