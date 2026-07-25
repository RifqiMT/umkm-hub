import { roundMoney } from '../revenue-targets/revenue-target-math';

export type CustomerOrderRow = {
  orderId: string;
  customerId: string;
  customerName: string;
  companyName: string;
  companyType: string;
  /** Net order total after discount. */
  revenue: number;
  /** Order discount (gross − net). */
  discount: number;
  /** Estimated COGS for the order (sum of line qty × catalog cost). Null if none set. */
  cost: number | null;
};

export type CustomerPerformanceRow = {
  customerId: string;
  name: string;
  companyName: string;
  companyType: string;
  orderCount: number;
  revenue: number;
  avgOrderValue: number | null;
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
    orderIds: Set<string>;
    revenue: number;
    discount: number;
    costSum: number;
    hasCost: boolean;
  };

  const byCustomer = new Map<string, Acc>();

  for (const row of rows) {
    const existing = byCustomer.get(row.customerId);
    if (existing) {
      existing.orderIds.add(row.orderId);
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
        orderIds: new Set([row.orderId]),
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
    const orderCount = acc.orderIds.size;
    const avgOrderValue =
      orderCount > 0 ? roundMoney(revenue / orderCount) : null;
    const gross = revenue + discount;
    const discountPercent =
      gross > 0 ? roundMoney((discount / gross) * 100) : null;

    let cost: number | null = null;
    let costPercent: number | null = null;
    let profit: number | null = null;
    let marginPercent: number | null = null;

    if (acc.hasCost) {
      cost = roundMoney(acc.costSum);
      profit = roundMoney(revenue - cost);
      if (gross > 0) {
        costPercent = roundMoney((cost / gross) * 100);
        marginPercent = roundMoney((profit / gross) * 100);
      }
    }

    result.push({
      customerId: acc.customerId,
      name: acc.name,
      companyName: acc.companyName,
      companyType: acc.companyType,
      orderCount,
      revenue,
      avgOrderValue,
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
