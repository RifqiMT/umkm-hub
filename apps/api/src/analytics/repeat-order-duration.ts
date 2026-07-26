import { roundMoney } from '../revenue-targets/revenue-target-math';

function utcDayDiff(from: Date, to: Date): number {
  const a = Date.UTC(
    from.getUTCFullYear(),
    from.getUTCMonth(),
    from.getUTCDate(),
  );
  const b = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
  return Math.round((b - a) / 86_400_000);
}

export type RepeatOrderDuration = {
  /** UTC days from first → second order. Null when fewer than two orders. */
  firstRepeatOrderDays: number | null;
  /** Mean UTC days between consecutive orders. Null when fewer than two orders. */
  avgRepeatOrderDays: number | null;
};

/**
 * First-gap and mean-gap durations between consecutive orders (sorted by date).
 * Same-day consecutive orders contribute a 0-day gap.
 */
export function repeatOrderDuration(orderDates: Date[]): RepeatOrderDuration {
  if (orderDates.length < 2) {
    return { firstRepeatOrderDays: null, avgRepeatOrderDays: null };
  }
  const sorted = [...orderDates].sort((a, b) => a.getTime() - b.getTime());
  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i += 1) {
    gaps.push(utcDayDiff(sorted[i - 1]!, sorted[i]!));
  }
  if (gaps.length === 0) {
    return { firstRepeatOrderDays: null, avgRepeatOrderDays: null };
  }
  const sum = gaps.reduce((a, b) => a + b, 0);
  return {
    firstRepeatOrderDays: gaps[0]!,
    avgRepeatOrderDays: roundMoney(sum / gaps.length),
  };
}

export function averageRepeatOrderDays(orderDates: Date[]): number | null {
  return repeatOrderDuration(orderDates).avgRepeatOrderDays;
}

export function firstRepeatOrderDays(orderDates: Date[]): number | null {
  return repeatOrderDuration(orderDates).firstRepeatOrderDays;
}
