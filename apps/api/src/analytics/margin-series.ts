import { roundMoney } from '../revenue-targets/revenue-target-math';

export type MarginOrderRow = {
  orderDate: Date;
  totalOrderValue: number;
  productQty: number;
  costPerUnit: number | null;
};

export type PeriodMargin = {
  revenue: number;
  /** Sum of estimated COGS for orders that have catalog cost. Null if none. */
  cost: number | null;
  profit: number | null;
  marginPercent: number | null;
};

function emptyMonthMargins(): Record<number, PeriodMargin> {
  const byMonth: Record<number, PeriodMargin> = {};
  for (let m = 1; m <= 12; m += 1) {
    byMonth[m] = {
      revenue: 0,
      cost: null,
      profit: null,
      marginPercent: null,
    };
  }
  return byMonth;
}

function finalizePeriod(revenue: number, costSum: number, hasCost: boolean): PeriodMargin {
  const rev = roundMoney(revenue);
  if (!hasCost) {
    return { revenue: rev, cost: null, profit: null, marginPercent: null };
  }
  const cost = roundMoney(costSum);
  const profit = roundMoney(rev - cost);
  const marginPercent =
    rev > 0 ? roundMoney((profit / rev) * 100) : null;
  return { revenue: rev, cost, profit, marginPercent };
}

/** Bucket revenue + estimated COGS by UTC month; margin uses full-month revenue. */
export function bucketMarginByMonth(
  rows: MarginOrderRow[],
): Record<number, PeriodMargin> {
  const revenueByMonth: Record<number, number> = {};
  const costByMonth: Record<number, number> = {};
  const hasCostByMonth: Record<number, boolean> = {};
  for (let m = 1; m <= 12; m += 1) {
    revenueByMonth[m] = 0;
    costByMonth[m] = 0;
    hasCostByMonth[m] = false;
  }

  for (const row of rows) {
    const month = row.orderDate.getUTCMonth() + 1;
    revenueByMonth[month] += row.totalOrderValue;
    if (row.costPerUnit != null) {
      costByMonth[month] +=
        Math.max(0, row.productQty) * Math.max(0, row.costPerUnit);
      hasCostByMonth[month] = true;
    }
  }

  const byMonth = emptyMonthMargins();
  for (let m = 1; m <= 12; m += 1) {
    byMonth[m] = finalizePeriod(
      revenueByMonth[m] ?? 0,
      costByMonth[m] ?? 0,
      hasCostByMonth[m] ?? false,
    );
  }
  return byMonth;
}

/** Year-level margin from order rows (any dates in the set). */
export function periodMarginFromOrders(rows: MarginOrderRow[]): PeriodMargin {
  let revenue = 0;
  let costSum = 0;
  let hasCost = false;
  for (const row of rows) {
    revenue += row.totalOrderValue;
    if (row.costPerUnit != null) {
      costSum += Math.max(0, row.productQty) * Math.max(0, row.costPerUnit);
      hasCost = true;
    }
  }
  return finalizePeriod(revenue, costSum, hasCost);
}
