import { roundMoney } from '../revenue-targets/revenue-target-math';

export type PurchaseFrequencyOrderRow = {
  orderDate: Date;
  customerId: string;
};

export type PurchaseFrequencyPeriodStats = {
  /**
   * Average purchase frequency:
   * linked orders ÷ distinct customers in the period.
   */
  avgPurchaseFrequency: number | null;
  orderCount: number;
  customerCount: number;
};

/** APF for a period; null when there are no linked customers. */
export function averagePurchaseFrequency(
  orderCount: number,
  customerCount: number,
): number | null {
  if (customerCount <= 0) return null;
  return roundMoney(orderCount / customerCount);
}

function emptyMonthMap(): Record<
  number,
  { orders: number; customers: Set<string> }
> {
  const map: Record<number, { orders: number; customers: Set<string> }> = {};
  for (let m = 1; m <= 12; m += 1) {
    map[m] = { orders: 0, customers: new Set() };
  }
  return map;
}

/**
 * Per-month average purchase frequency
 * (month linked orders ÷ distinct customers).
 */
export function bucketAvgPurchaseFrequencyByMonth(
  rows: PurchaseFrequencyOrderRow[],
): Record<number, number | null> {
  const map = emptyMonthMap();
  for (const row of rows) {
    const month = row.orderDate.getUTCMonth() + 1;
    map[month].orders += 1;
    map[month].customers.add(row.customerId);
  }
  const out: Record<number, number | null> = {};
  for (let m = 1; m <= 12; m += 1) {
    const bucket = map[m];
    out[m] = averagePurchaseFrequency(bucket.orders, bucket.customers.size);
  }
  return out;
}

/** Period average purchase frequency across linked orders. */
export function periodAvgPurchaseFrequencyFromOrders(
  rows: PurchaseFrequencyOrderRow[],
): PurchaseFrequencyPeriodStats {
  const customers = new Set<string>();
  for (const row of rows) {
    customers.add(row.customerId);
  }
  const orderCount = rows.length;
  const customerCount = customers.size;
  return {
    orderCount,
    customerCount,
    avgPurchaseFrequency: averagePurchaseFrequency(orderCount, customerCount),
  };
}
