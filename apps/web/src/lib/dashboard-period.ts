/** Dashboard order-date presets (local calendar date-only, matching order entry). */

const DASHBOARD_PERIODS = [
  'all',
  'today',
  'tomorrow',
  'this_week',
  'this_month',
  'next_month',
  'this_quarter',
  'next_quarter',
  'this_year',
] as const;

export type DashboardPeriod = (typeof DASHBOARD_PERIODS)[number];

export const DASHBOARD_PERIOD_LABELS: Record<DashboardPeriod, string> = {
  all: 'All time',
  today: 'Today',
  tomorrow: 'Tomorrow',
  this_week: 'This week',
  this_month: 'This month',
  next_month: 'Next month',
  this_quarter: 'This quarter',
  next_quarter: 'Next quarter',
  this_year: 'This year',
};

type DashboardPeriodRange = {
  orderDateFrom?: string;
  orderDateTo?: string;
};

/** Format local calendar day as YYYY-MM-DD (same convention as order dates). */
function toDateOnly(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function localDay(now: Date, offsetDays = 0): Date {
  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + offsetDays,
  );
}

/** Monday of the ISO week containing `date` (local calendar). */
function startOfIsoWeek(date: Date): Date {
  const d = localDay(date);
  const day = d.getDay() || 7;
  if (day !== 1) d.setDate(d.getDate() - (day - 1));
  return d;
}

function endOfIsoWeek(date: Date): Date {
  const monday = startOfIsoWeek(date);
  return localDay(monday, 6);
}

function quarterIndex(month: number): number {
  return Math.floor(month / 3);
}

function quarterBounds(
  year: number,
  quarter: number,
): { from: Date; to: Date } {
  const startMonth = quarter * 3;
  const from = new Date(year, startMonth, 1);
  const to = new Date(year, startMonth + 3, 0);
  return { from, to };
}

/** Inclusive orderDate YYYY-MM-DD bounds for a dashboard period. */
export function dashboardPeriodRange(
  period: DashboardPeriod,
  now = new Date(),
): DashboardPeriodRange {
  if (period === 'all') return {};

  if (period === 'today') {
    const day = toDateOnly(localDay(now));
    return { orderDateFrom: day, orderDateTo: day };
  }

  if (period === 'tomorrow') {
    const day = toDateOnly(localDay(now, 1));
    return { orderDateFrom: day, orderDateTo: day };
  }

  if (period === 'this_week') {
    return {
      orderDateFrom: toDateOnly(startOfIsoWeek(now)),
      orderDateTo: toDateOnly(endOfIsoWeek(now)),
    };
  }

  if (period === 'this_month') {
    const y = now.getFullYear();
    const m = now.getMonth();
    return {
      orderDateFrom: toDateOnly(new Date(y, m, 1)),
      orderDateTo: toDateOnly(new Date(y, m + 1, 0)),
    };
  }

  if (period === 'next_month') {
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    return {
      orderDateFrom: toDateOnly(new Date(y, m, 1)),
      orderDateTo: toDateOnly(new Date(y, m + 1, 0)),
    };
  }

  if (period === 'this_quarter') {
    const y = now.getFullYear();
    const q = quarterIndex(now.getMonth());
    const { from, to } = quarterBounds(y, q);
    return { orderDateFrom: toDateOnly(from), orderDateTo: toDateOnly(to) };
  }

  if (period === 'next_quarter') {
    const y = now.getFullYear();
    const q = quarterIndex(now.getMonth()) + 1;
    const year = q > 3 ? y + 1 : y;
    const quarter = q % 4;
    const { from, to } = quarterBounds(year, quarter);
    return { orderDateFrom: toDateOnly(from), orderDateTo: toDateOnly(to) };
  }

  const y = now.getFullYear();
  return {
    orderDateFrom: toDateOnly(new Date(y, 0, 1)),
    orderDateTo: toDateOnly(new Date(y, 11, 31)),
  };
}
