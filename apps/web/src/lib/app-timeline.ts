/**
 * Shared calendar timelines for Analytics, Targets, and related year pickers.
 * Covers seeded history/future (2022–2030) with a small buffer.
 */

/** Rolling years in Analytics “Annual” charts (ending at selected year). */
export const APP_ANNUAL_WINDOW = 10;

/** Inclusive calendar years offered in year pickers. */
const APP_YEAR_MIN = 2020;
const APP_YEAR_MAX = 2035;

/** Descending year list for selects (newest first). */
export function appYearOptions(nowYear = new Date().getFullYear()): number[] {
  const end = Math.max(APP_YEAR_MAX, nowYear + 5);
  const start = Math.min(APP_YEAR_MIN, nowYear - 10);
  const years: number[] = [];
  for (let y = end; y >= start; y -= 1) {
    years.push(y);
  }
  return years;
}

function annualWindowStart(
  endYear: number,
  window = APP_ANNUAL_WINDOW,
): number {
  return endYear - (window - 1);
}

export function annualWindowLabel(
  endYear: number,
  window = APP_ANNUAL_WINDOW,
): string {
  return `${annualWindowStart(endYear, window)}–${endYear}`;
}
