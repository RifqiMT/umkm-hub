import { ratePercent, profitMarginRatePercent } from '../common/summary-rates';

type ProductInventoryAgg = {
  productCount: number;
  totalStockQty: number;
  sellValue: number;
  /** Sell value of SKUs that have cost — used for margin only. */
  costedSellValue: number;
  costValue: number;
  hasCost: boolean;
  inStockCount: number;
  withCostCount: number;
  packReadyCount: number;
};

export function buildProductSummary(agg: ProductInventoryAgg) {
  const count = Math.max(0, agg.productCount);
  return {
    productCount: count,
    totalStockQty: Math.max(0, agg.totalStockQty),
    inventorySellValue: Math.max(0, agg.sellValue),
    outOfStockRate: ratePercent(count - agg.inStockCount, count),
    inStockRate: ratePercent(agg.inStockCount, count),
    costCoverageRate: ratePercent(agg.withCostCount, count),
    profitMarginRate: profitMarginRatePercent(
      agg.costedSellValue,
      agg.costValue,
      agg.hasCost,
    ),
    packReadyRate: ratePercent(agg.packReadyCount, count),
  };
}
