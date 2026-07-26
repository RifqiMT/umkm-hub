import { roundMoney } from '../revenue-targets/revenue-target-math';

export type ProductRevenueRow = {
  orderDate: Date;
  productId: string;
  revenue: number;
};

export type ProductRevenuePeriodStats = {
  /** Average net revenue per product with ≥1 sale in the period. */
  avgProductRevenue: number | null;
  productCount: number;
  /** Total net line revenue across products. */
  productRevenue: number;
};

function emptyMonthMap(): Record<
  number,
  { revenue: number; products: Set<string> }
> {
  const map: Record<number, { revenue: number; products: Set<string> }> = {};
  for (let m = 1; m <= 12; m += 1) {
    map[m] = { revenue: 0, products: new Set() };
  }
  return map;
}

/**
 * Per-month average product revenue among products sold that month
 * (month product revenue ÷ distinct products).
 */
export function bucketAvgProductRevenueByMonth(
  rows: ProductRevenueRow[],
): Record<number, number | null> {
  const map = emptyMonthMap();
  for (const row of rows) {
    const month = row.orderDate.getUTCMonth() + 1;
    map[month].revenue += Math.max(0, row.revenue);
    map[month].products.add(row.productId);
  }
  const out: Record<number, number | null> = {};
  for (let m = 1; m <= 12; m += 1) {
    const bucket = map[m];
    out[m] =
      bucket.products.size > 0
        ? roundMoney(bucket.revenue / bucket.products.size)
        : null;
  }
  return out;
}

/** Period average revenue across products with sales. */
export function periodAvgProductRevenueFromLines(
  rows: ProductRevenueRow[],
): ProductRevenuePeriodStats {
  const byProduct = new Map<string, number>();
  for (const row of rows) {
    byProduct.set(
      row.productId,
      (byProduct.get(row.productId) ?? 0) + Math.max(0, row.revenue),
    );
  }
  const productCount = byProduct.size;
  let productRevenue = 0;
  for (const value of byProduct.values()) {
    productRevenue += value;
  }
  productRevenue = roundMoney(productRevenue);
  return {
    productCount,
    productRevenue,
    avgProductRevenue:
      productCount > 0 ? roundMoney(productRevenue / productCount) : null,
  };
}
