import { averageBasketSize } from '../analytics/basket-series';
import { averageOrderValue } from '../analytics/duration-series';
import { roundMoney } from '../revenue-targets/revenue-target-math';

export type ProductStockSalesSeed = {
  productUuid: string;
  productCode: string;
  name: string;
  unit: string;
  /** On-hand stock from Product.stockQty. */
  currentStocks: number;
  soldStocks: number;
  orderCount: number;
  packsSold: number;
  /** Discount-allocated net revenue. */
  revenue: number;
  /** Discount allocated to this product’s lines. */
  discount: number;
  /** Current catalog unit cost; null when unset. */
  costPerUnit: number | null;
};

export type ProductStockSalesRow = {
  id: string;
  productId: string;
  name: string;
  unit: string;
  /** currentStocks + soldStocks (lifetime-available quantity). */
  totalStocks: number;
  /** Current on-hand stock units. */
  currentStocks: number;
  /** Σ OrderLine.productQty on non-cancelled orders. */
  soldStocks: number;
  /** Pre-discount gross (revenue + discount). */
  grossRevenue: number;
  /** Discount-allocated net revenue (non-cancelled). */
  revenue: number;
  /** Order discount allocated to this product’s lines. */
  discount: number;
  /** Discount as % of gross (revenue + discount). Null when gross is 0. */
  discountPercent: number | null;
  /** Estimated COGS: sold × current catalog costPerUnit. Null if cost unset. */
  cost: number | null;
  /** Cost as % of gross (revenue + discount). Null when cost unset or gross is 0. */
  costPercent: number | null;
  /** Net revenue − COGS. Null if cost unset. */
  profit: number | null;
  /**
   * Profit margin as % of gross (revenue + discount).
   * With Discount % + Cost % + Margin % ≈ 100% when cost is set.
   * Null when cost unset or gross is 0.
   */
  marginPercent: number | null;
  /**
   * Sell-Through Rate (%): sold ÷ (sold + current) × 100.
   * Null when both are 0.
   */
  sellThroughRate: number | null;
  /**
   * Inventory Turnover Ratio: sold ÷ average inventory.
   * Average = (beginning + ending) ÷ 2, with beginning ≈ current + sold.
   * Null when average inventory ≤ 0.
   */
  inventoryTurnover: number | null;
  /**
   * Stock-to-Sales Ratio: current ÷ sold.
   * Null when sold ≤ 0.
   */
  stockToSalesRatio: number | null;
  /** Distinct non-cancelled orders that include this product. */
  orderCount: number;
  /** Mean discount-allocated net revenue per order (Σ allocated ÷ orders). */
  avgOrderValue: number | null;
  /** Mean packs per order (Σ packCount ÷ orders). */
  unitsPerTransaction: number | null;
};

/**
 * One line’s share of post-discount order total.
 * Mirrors `allocateLineRevenue` proportional step (SQL uses the same ratio).
 */
export function allocatedLineRevenueShare(
  lineTotal: number,
  orderLineTotal: number,
  orderTotalValue: number,
): number {
  const orderGross = Number(orderLineTotal) || 0;
  if (orderGross <= 0) return 0;
  const line = Math.max(0, Number(lineTotal) || 0);
  const orderNet = Math.max(0, Number(orderTotalValue) || 0);
  return roundMoney((line / orderGross) * orderNet);
}

/** STR = sold / (sold + current) × 100 */
export function sellThroughRate(
  soldStocks: number,
  currentStocks: number,
): number | null {
  const sold = Math.max(0, soldStocks);
  const onHand = Math.max(0, currentStocks);
  const denom = sold + onHand;
  if (denom <= 0) return null;
  return roundMoney((sold / denom) * 100);
}

/**
 * ITR = sold ÷ average inventory.
 * Beginning inventory ≈ current + sold (total stocks); ending = current.
 * Average = (beginning + ending) ÷ 2 = current + sold/2.
 * Using ending stock alone (sold ÷ current) explodes when on-hand is tiny.
 */
export function inventoryTurnoverRatio(
  soldStocks: number,
  currentStocks: number,
): number | null {
  const sold = Math.max(0, soldStocks);
  const ending = Math.max(0, currentStocks);
  const beginning = ending + sold;
  const average = (beginning + ending) / 2;
  if (average <= 0) return null;
  return roundMoney(sold / average);
}

/** SSR = current / sold */
export function stockToSalesRatio(
  soldStocks: number,
  currentStocks: number,
): number | null {
  const sold = Math.max(0, soldStocks);
  if (sold <= 0) return null;
  return roundMoney(Math.max(0, currentStocks) / sold);
}

/** Estimated COGS from catalog unit cost × qty sold. */
export function productSoldCost(
  soldStocks: number,
  costPerUnit: number | null | undefined,
): number | null {
  if (costPerUnit == null || !Number.isFinite(Number(costPerUnit))) {
    return null;
  }
  return roundMoney(Math.max(0, soldStocks) * Math.max(0, Number(costPerUnit)));
}

export function serializeProductStockSales(
  row: ProductStockSalesSeed,
): ProductStockSalesRow {
  const currentStocks = roundMoney(
    Math.max(0, Number(row.currentStocks) || 0),
  );
  const soldStocks = roundMoney(Math.max(0, Number(row.soldStocks) || 0));
  const totalStocks = roundMoney(currentStocks + soldStocks);
  const orderCount = Number(row.orderCount) || 0;
  const packsSold = roundMoney(Math.max(0, Number(row.packsSold) || 0));
  const revenue = roundMoney(Math.max(0, Number(row.revenue) || 0));
  const discount = Math.max(0, roundMoney(Number(row.discount) || 0));
  const grossRevenue = roundMoney(revenue + discount);
  const discountPercent =
    grossRevenue > 0 ? roundMoney((discount / grossRevenue) * 100) : null;
  const cost = productSoldCost(soldStocks, row.costPerUnit);
  const profit = cost == null ? null : roundMoney(revenue - cost);
  // Rates use gross so Discount % + Cost % + Margin % ≈ 100% (same as Analytics).
  const costPercent =
    cost != null && grossRevenue > 0
      ? roundMoney((cost / grossRevenue) * 100)
      : null;
  const marginPercent =
    profit != null && grossRevenue > 0
      ? roundMoney((profit / grossRevenue) * 100)
      : null;
  return {
    id: row.productUuid,
    productId: row.productCode,
    name: row.name,
    unit: row.unit,
    totalStocks,
    currentStocks,
    soldStocks,
    grossRevenue,
    revenue,
    discount,
    discountPercent,
    cost,
    costPercent,
    profit,
    marginPercent,
    sellThroughRate: sellThroughRate(soldStocks, currentStocks),
    inventoryTurnover: inventoryTurnoverRatio(soldStocks, currentStocks),
    stockToSalesRatio: stockToSalesRatio(soldStocks, currentStocks),
    orderCount,
    avgOrderValue: averageOrderValue(revenue, orderCount),
    unitsPerTransaction: averageBasketSize(packsSold, orderCount),
  };
}
