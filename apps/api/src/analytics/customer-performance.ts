import { roundMoney } from '../revenue-targets/revenue-target-math';
import { repeatOrderDuration } from './repeat-order-duration';

export type CustomerOrderRow = {
  orderId: string;
  customerId: string;
  customerName: string;
  companyName: string;
  companyType: string;
  orderDate: Date;
  /** Net order total after discount. */
  revenue: number;
  /** Order discount (gross − net). */
  discount: number;
  /** Estimated COGS for the order (sum of line qty × catalog cost). Null if none set. */
  cost: number | null;
  /** Packs sold on this order (sum of line pack counts). */
  packsSold: number;
};

export type CustomerPerformanceRow = {
  customerId: string;
  name: string;
  companyName: string;
  companyType: string;
  orderCount: number;
  /** Sum of packs across the customer’s orders in scope. */
  packsSold: number;
  /** Pre-discount gross (revenue + discount). */
  grossRevenue: number;
  revenue: number;
  avgOrderValue: number | null;
  /**
   * UTC days from first → second order for this customer.
   * Null when fewer than two distinct orders.
   */
  firstRepeatOrderDays: number | null;
  /**
   * Mean UTC days between consecutive orders for this customer.
   * Null when fewer than two distinct orders.
   */
  avgRepeatOrderDays: number | null;
  discount: number;
  discountPercent: number | null;
  cost: number | null;
  costPercent: number | null;
  profit: number | null;
  marginPercent: number | null;
};

/**
 * Aggregate year orders into per-customer revenue / discount / cost / margin.
 * Cost uses current catalog `costPerUnit` on each line (not historical snapshots).
 */
export function aggregateCustomerPerformance(
  rows: CustomerOrderRow[],
): CustomerPerformanceRow[] {
  type Acc = {
    customerId: string;
    name: string;
    companyName: string;
    companyType: string;
    orderDatesById: Map<string, Date>;
    packsSold: number;
    revenue: number;
    discount: number;
    costSum: number;
    hasCost: boolean;
  };

  const byCustomer = new Map<string, Acc>();

  for (const row of rows) {
    const packs = Math.max(0, row.packsSold);
    const existing = byCustomer.get(row.customerId);
    if (existing) {
      if (!existing.orderDatesById.has(row.orderId)) {
        existing.orderDatesById.set(row.orderId, row.orderDate);
      }
      existing.packsSold += packs;
      existing.revenue += row.revenue;
      existing.discount += Math.max(0, row.discount);
      if (row.cost != null) {
        existing.costSum += row.cost;
        existing.hasCost = true;
      }
    } else {
      byCustomer.set(row.customerId, {
        customerId: row.customerId,
        name: row.customerName,
        companyName: row.companyName,
        companyType: row.companyType,
        orderDatesById: new Map([[row.orderId, row.orderDate]]),
        packsSold: packs,
        revenue: row.revenue,
        discount: Math.max(0, row.discount),
        costSum: row.cost != null ? row.cost : 0,
        hasCost: row.cost != null,
      });
    }
  }

  const result: CustomerPerformanceRow[] = [];
  for (const acc of byCustomer.values()) {
    const revenue = roundMoney(acc.revenue);
    const discount = roundMoney(acc.discount);
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

    if (acc.hasCost) {
      cost = roundMoney(acc.costSum);
      profit = roundMoney(revenue - cost);
      if (grossRevenue > 0) {
        costPercent = roundMoney((cost / grossRevenue) * 100);
        marginPercent = roundMoney((profit / grossRevenue) * 100);
      }
    }

    result.push({
      customerId: acc.customerId,
      name: acc.name,
      companyName: acc.companyName,
      companyType: acc.companyType,
      orderCount,
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
