import {
  attainmentPercent,
  roundMoney,
} from '../revenue-targets/revenue-target-math';
import type { IsoWeekRef } from './iso-week';

/** Map key: `${calendarYear}-${month}` where month is 1–12. */
export type MonthTargetMap = Map<string, number>;

export function monthTargetKey(year: number, month: number): string {
  return `${year}-${month}`;
}

/** UTC calendar days in month (month is 1–12). */
export function daysInUtcMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Day-weighted weekly target from monthly plan amounts.
 *
 * For ISO week [start, end):
 *   T_w = Σ_m T_m × (UTC days of week in month m) / (days in month m)
 *
 * Returns null when no intersecting calendar month has a target.
 */
export function weeklyTargetFromMonthly(
  week: Pick<IsoWeekRef, 'start' | 'end'>,
  monthTargets: MonthTargetMap | undefined,
): number | null {
  if (!monthTargets || monthTargets.size === 0) return null;

  let total = 0;
  let hasTarget = false;
  const cursor = new Date(week.start);
  while (cursor < week.end) {
    const year = cursor.getUTCFullYear();
    const month = cursor.getUTCMonth() + 1;
    const monthAmount = monthTargets.get(monthTargetKey(year, month));
    if (monthAmount != null && Number.isFinite(monthAmount)) {
      hasTarget = true;
      const days = daysInUtcMonth(year, month);
      if (days > 0) {
        total += monthAmount / days;
      }
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  if (!hasTarget) return null;
  return roundMoney(total);
}

export function weeklyAttainmentPercent(
  revenue: number,
  target: number | null,
): number | null {
  if (target == null) return null;
  return attainmentPercent(revenue, target);
}

/** Build lookup from plans that have a full 12-month schedule. */
export function buildMonthTargetMap(
  plans: Array<{
    year: number;
    months: Array<{ month: number; amount: number }>;
  }>,
): MonthTargetMap {
  const map: MonthTargetMap = new Map();
  for (const plan of plans) {
    if (plan.months.length !== 12) continue;
    for (const row of plan.months) {
      map.set(monthTargetKey(plan.year, row.month), row.amount);
    }
  }
  return map;
}
