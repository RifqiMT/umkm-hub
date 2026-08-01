/**
 * Units Per Transaction (UPT) helpers.
 * UPT = Σ(packCount) ÷ order count for non-cancelled orders.
 */
import { roundMoney } from '../revenue-targets/revenue-target-math';

export type BasketOrderRow = {
  orderDate: Date;
  /** Total packs sold on the order (sum of line packCount). */
  packCount: number;
};

type BasketPeriodStats = {
  /** Mean packs per non-cancelled order (Units Per Transaction). */
  avgBasketSize: number | null;
  orderCount: number;
  totalPacks: number;
};

/** Units Per Transaction for a period; null when there are no orders. */
export function averageBasketSize(
  totalPacks: number,
  orderCount: number,
): number | null {
  if (orderCount <= 0) return null;
  return roundMoney(totalPacks / orderCount);
}

function emptyMonthMap(): Record<number, { packs: number; orders: number }> {
  const map: Record<number, { packs: number; orders: number }> = {};
  for (let m = 1; m <= 12; m += 1) {
    map[m] = { packs: 0, orders: 0 };
  }
  return map;
}

/**
 * Per-month Units Per Transaction
 * (month total packs ÷ order count).
 */
export function bucketAvgBasketByMonth(
  rows: BasketOrderRow[],
): Record<number, number | null> {
  const map = emptyMonthMap();
  for (const row of rows) {
    const month = row.orderDate.getUTCMonth() + 1;
    map[month].packs += Math.max(0, row.packCount);
    map[month].orders += 1;
  }
  const out: Record<number, number | null> = {};
  for (let m = 1; m <= 12; m += 1) {
    const bucket = map[m];
    out[m] = averageBasketSize(bucket.packs, bucket.orders);
  }
  return out;
}

/** Period Units Per Transaction across orders. */
export function periodAvgBasketFromOrders(
  rows: BasketOrderRow[],
): BasketPeriodStats {
  let totalPacks = 0;
  for (const row of rows) {
    totalPacks += Math.max(0, row.packCount);
  }
  totalPacks = roundMoney(totalPacks);
  const orderCount = rows.length;
  return {
    orderCount,
    totalPacks,
    avgBasketSize: averageBasketSize(totalPacks, orderCount),
  };
}
