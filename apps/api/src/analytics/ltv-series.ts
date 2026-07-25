import { roundMoney } from '../revenue-targets/revenue-target-math';

export type LtvOrderRow = {
  orderDate: Date;
  customerId: string;
  revenue: number;
};

export type LtvPeriodStats = {
  /** Average revenue per customer with ≥1 linked order in the period. */
  avgLtv: number | null;
  customerCount: number;
  /** Total net revenue from customer-linked orders. */
  linkedRevenue: number;
};

function emptyMonthMap(): Record<
  number,
  { revenue: number; customers: Set<string> }
> {
  const map: Record<number, { revenue: number; customers: Set<string> }> = {};
  for (let m = 1; m <= 12; m += 1) {
    map[m] = { revenue: 0, customers: new Set() };
  }
  return map;
}

/**
 * Per-month average LTV among customers who ordered that month
 * (month linked revenue ÷ distinct customers).
 */
export function bucketAvgLtvByMonth(
  rows: LtvOrderRow[],
): Record<number, number | null> {
  const map = emptyMonthMap();
  for (const row of rows) {
    const month = row.orderDate.getUTCMonth() + 1;
    map[month].revenue += Math.max(0, row.revenue);
    map[month].customers.add(row.customerId);
  }
  const out: Record<number, number | null> = {};
  for (let m = 1; m <= 12; m += 1) {
    const bucket = map[m];
    out[m] =
      bucket.customers.size > 0
        ? roundMoney(bucket.revenue / bucket.customers.size)
        : null;
  }
  return out;
}

/** Period average LTV across customers with linked orders. */
export function periodAvgLtvFromOrders(rows: LtvOrderRow[]): LtvPeriodStats {
  const byCustomer = new Map<string, number>();
  for (const row of rows) {
    byCustomer.set(
      row.customerId,
      (byCustomer.get(row.customerId) ?? 0) + Math.max(0, row.revenue),
    );
  }
  const customerCount = byCustomer.size;
  let linkedRevenue = 0;
  for (const value of byCustomer.values()) {
    linkedRevenue += value;
  }
  linkedRevenue = roundMoney(linkedRevenue);
  return {
    customerCount,
    linkedRevenue,
    avgLtv:
      customerCount > 0 ? roundMoney(linkedRevenue / customerCount) : null,
  };
}
