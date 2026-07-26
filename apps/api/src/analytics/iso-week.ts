/** ISO week helpers (UTC dates) for Analytics weekly charts. */

export type IsoWeekRef = {
  isoYear: number;
  isoWeek: number;
  /** Chart label, e.g. W12 or W12 '26 when year context varies. */
  label: string;
  /** Monday 00:00 UTC of the ISO week. */
  start: Date;
  /** Exclusive end (next Monday). */
  end: Date;
};

/** ISO week-year and week number (1–53) for a UTC instant. */
export function getIsoWeekParts(date: Date): {
  isoYear: number;
  isoWeek: number;
} {
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  // Thursday in current week decides the year
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const isoYear = d.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const isoWeek = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7,
  );
  return { isoYear, isoWeek };
}

export function isoWeekKey(isoYear: number, isoWeek: number): string {
  return `${isoYear}-W${String(isoWeek).padStart(2, '0')}`;
}

export function isoWeekKeyFromDate(date: Date): string {
  const { isoYear, isoWeek } = getIsoWeekParts(date);
  return isoWeekKey(isoYear, isoWeek);
}

/** Monday UTC of the ISO week containing `date`. */
export function startOfIsoWeek(date: Date): Date {
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const day = d.getUTCDay() || 7;
  if (day !== 1) d.setUTCDate(d.getUTCDate() - (day - 1));
  return d;
}

function weekRefFromMonday(
  monday: Date,
  labelStyle: 'short' | 'year',
): IsoWeekRef {
  const { isoYear, isoWeek } = getIsoWeekParts(monday);
  const end = new Date(monday);
  end.setUTCDate(end.getUTCDate() + 7);
  const weekLabel = `W${String(isoWeek).padStart(2, '0')}`;
  const label =
    labelStyle === 'year'
      ? `${weekLabel} '${String(isoYear).slice(-2)}`
      : weekLabel;
  return { isoYear, isoWeek, label, start: monday, end };
}

/** Every ISO week that intersects the UTC calendar year. */
export function listIsoWeeksInCalendarYear(year: number): IsoWeekRef[] {
  return listIsoWeeksInCalendarYears([year]);
}

/**
 * Every ISO week that intersects any of the UTC calendar years.
 * Dedupes boundary weeks; uses year-suffixed labels when spanning >1 year.
 */
export function listIsoWeeksInCalendarYears(years: number[]): IsoWeekRef[] {
  const uniqueYears = [...new Set(years)]
    .filter((y) => Number.isInteger(y))
    .sort((a, b) => a - b);
  if (uniqueYears.length === 0) return [];

  const labelStyle: 'short' | 'year' =
    uniqueYears.length > 1 ? 'year' : 'short';
  const seen = new Set<string>();
  const out: IsoWeekRef[] = [];

  for (const year of uniqueYears) {
    const cursor = new Date(Date.UTC(year, 0, 1));
    const end = new Date(Date.UTC(year + 1, 0, 1));
    while (cursor < end) {
      const monday = startOfIsoWeek(cursor);
      const key = isoWeekKeyFromDate(monday);
      if (!seen.has(key)) {
        seen.add(key);
        out.push(weekRefFromMonday(monday, labelStyle));
      }
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  }

  out.sort((a, b) => a.start.getTime() - b.start.getTime());
  return out;
}

export type CalendarQuarterRef = {
  year: number;
  /** Calendar quarter 1–4 (UTC). */
  quarter: number;
  label: string;
};

/** Every calendar quarter in the given years (chronological). */
export function listCalendarQuartersInYears(
  years: number[],
): CalendarQuarterRef[] {
  const uniqueYears = [...new Set(years)]
    .filter((y) => Number.isInteger(y))
    .sort((a, b) => a - b);
  const multi = uniqueYears.length > 1;
  const out: CalendarQuarterRef[] = [];
  for (const year of uniqueYears) {
    for (let quarter = 1; quarter <= 4; quarter += 1) {
      out.push({
        year,
        quarter,
        label: multi
          ? `Q${quarter} '${String(year).slice(-2)}`
          : `Q${quarter}`,
      });
    }
  }
  return out;
}

/** Every calendar month in the given years (chronological). */
export function listCalendarMonthsInYears(
  years: number[],
): Array<{ year: number; month: number; label: string }> {
  const uniqueYears = [...new Set(years)]
    .filter((y) => Number.isInteger(y))
    .sort((a, b) => a - b);
  const labels = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ] as const;
  const multi = uniqueYears.length > 1;
  const out: Array<{ year: number; month: number; label: string }> = [];
  for (const year of uniqueYears) {
    for (let month = 1; month <= 12; month += 1) {
      out.push({
        year,
        month,
        label: multi
          ? `${labels[month - 1]} '${String(year).slice(-2)}`
          : labels[month - 1]!,
      });
    }
  }
  return out;
}

/** Rolling ISO weeks ending at the week that contains `endDate` (inclusive). */
export function listLastIsoWeeks(
  endDate: Date,
  count: number,
): IsoWeekRef[] {
  const safeCount = Math.max(1, Math.floor(count));
  let monday = startOfIsoWeek(endDate);
  const weeks: IsoWeekRef[] = [];
  for (let i = 0; i < safeCount; i += 1) {
    weeks.push(weekRefFromMonday(monday, 'year'));
    monday = new Date(monday);
    monday.setUTCDate(monday.getUTCDate() - 7);
  }
  return weeks.reverse();
}

/** Last N calendar months ending at the month of `endDate` (inclusive). */
export function listLastCalendarMonths(
  endDate: Date,
  count: number,
): Array<{ year: number; month: number; label: string }> {
  const safeCount = Math.max(1, Math.floor(count));
  let y = endDate.getUTCFullYear();
  let m = endDate.getUTCMonth() + 1;
  const months: Array<{ year: number; month: number; label: string }> = [];
  const labels = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ] as const;
  for (let i = 0; i < safeCount; i += 1) {
    months.push({
      year: y,
      month: m,
      label: `${labels[m - 1]} '${String(y).slice(-2)}`,
    });
    m -= 1;
    if (m < 1) {
      m = 12;
      y -= 1;
    }
  }
  return months.reverse();
}
