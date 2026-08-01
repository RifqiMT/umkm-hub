import { roundMoney } from '../revenue-targets/revenue-target-math';
import { repeatOrderDuration } from './repeat-order-duration';

type ProductOrderRow = {
  orderId: string;
  productId: string;
  productName: string;
  unit: string;
  orderDate: Date;
  /** Discount-allocated revenue for this line. */
  totalOrderValue: number;
  /** Allocated order discount for this line (gross − allocated revenue). */
  discount: number;
  productQty: number;
  /** Packs sold on this line. */
  packCount: number;
  costPerUnit: number | null;
};

type ProductPerformanceRow = {
  productId: string;
  name: string;
  unit: string;
  /** Distinct orders that include this product. */
  orderCount: number;
  qtySold: number;
  /** Sum of pack counts across lines for this product. */
  packsSold: number;
  /** Pre-discount gross (revenue + discount). */
  grossRevenue: number;
  revenue: number;
  /** Net revenue ÷ distinct orders (null when orderCount is 0). */
  avgOrderValue: number | null;
  /**
   * UTC days from first → second order that includes this product.
   * Null when fewer than two distinct orders.
   */
  firstRepeatOrderDays: number | null;
  /**
   * Mean UTC days between consecutive orders that include this product.
   * Null when fewer than two distinct orders.
   */
  avgRepeatOrderDays: number | null;
  /** Sum of discount allocated to this product’s lines. */
  discount: number;
  /** Discount as % of gross (revenue + discount). Null when gross is 0. */
  discountPercent: number | null;
  /** Estimated COGS using current catalog costPerUnit × qty sold. Null if cost unset. */
  cost: number | null;
  /** Cost as % of gross (same base as discount % and margin %). */
  costPercent: number | null;
  profit: number | null;
  /** Profit as % of gross. With discount % + COGS % sums to ~100%. */
  marginPercent: number | null;
};

/**
 * Aggregate year order lines into per-product revenue / cost / margin.
 * Cost uses current catalog `costPerUnit` (not historical snapshots).
 */
export function aggregateProductPerformance(
  rows: ProductOrderRow[],
): ProductPerformanceRow[] {
  type Acc = {
    productId: string;
    name: string;
    unit: string;
    orderDatesById: Map<string, Date>;
    qtySold: number;
    packsSold: number;
    revenue: number;
    discount: number;
    costPerUnit: number | null;
  };

  const byProduct = new Map<string, Acc>();

  for (const row of rows) {
    const packs = Math.max(0, row.packCount);
    const existing = byProduct.get(row.productId);
    if (existing) {
      if (!existing.orderDatesById.has(row.orderId)) {
        existing.orderDatesById.set(row.orderId, row.orderDate);
      }
      existing.qtySold += row.productQty;
      existing.packsSold += packs;
      existing.revenue += row.totalOrderValue;
      existing.discount += Math.max(0, row.discount);
      if (existing.costPerUnit == null && row.costPerUnit != null) {
        existing.costPerUnit = row.costPerUnit;
      }
    } else {
      byProduct.set(row.productId, {
        productId: row.productId,
        name: row.productName,
        unit: row.unit,
        orderDatesById: new Map([[row.orderId, row.orderDate]]),
        qtySold: row.productQty,
        packsSold: packs,
        revenue: row.totalOrderValue,
        discount: Math.max(0, row.discount),
        costPerUnit: row.costPerUnit,
      });
    }
  }

  const result: ProductPerformanceRow[] = [];
  for (const acc of byProduct.values()) {
    const revenue = roundMoney(acc.revenue);
    const discount = roundMoney(acc.discount);
    const qtySold = roundMoney(acc.qtySold);
    const packsSold = roundMoney(acc.packsSold);
    const orderCount = acc.orderDatesById.size;
    const avgOrderValue =
      orderCount > 0 ? roundMoney(revenue / orderCount) : null;
    const { firstRepeatOrderDays, avgRepeatOrderDays } = repeatOrderDuration([
      ...acc.orderDatesById.values(),
    ]);
    const grossRevenue = roundMoney(revenue + discount);
    const discountPercent =
      grossRevenue > 0 ? roundMoney((discount / grossRevenue) * 100) : null;
    let cost: number | null = null;
    let costPercent: number | null = null;
    let profit: number | null = null;
    let marginPercent: number | null = null;

    if (acc.costPerUnit != null) {
      cost = roundMoney(Math.max(0, qtySold) * Math.max(0, acc.costPerUnit));
      profit = roundMoney(revenue - cost);
      // All rates use gross so Discount % + COGS % + Margin % ≈ 100%.
      if (grossRevenue > 0) {
        costPercent = roundMoney((cost / grossRevenue) * 100);
        marginPercent = roundMoney((profit / grossRevenue) * 100);
      }
    }

    result.push({
      productId: acc.productId,
      name: acc.name,
      unit: acc.unit,
      orderCount,
      qtySold,
      packsSold,
      grossRevenue,
      revenue,
      avgOrderValue,
      firstRepeatOrderDays,
      avgRepeatOrderDays,
      discount,
      discountPercent,
      cost,
      costPercent,
      profit,
      marginPercent,
    });
  }

  return result.sort((a, b) => {
    if (b.revenue !== a.revenue) return b.revenue - a.revenue;
    return a.name.localeCompare(b.name);
  });
}
