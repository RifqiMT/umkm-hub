/** Rolling years in the Analytics “Annual” series (ending at selected year). */
export const ANNUAL_WINDOW = 10;

/** Inclusive years aligned with web/mobile year pickers. */
export const APP_YEAR_MIN = 2020;
export const APP_YEAR_MAX = 2035;

export type AnalyticsTimeline =
  | { kind: 'all' }
  | { kind: 'years'; years: number[] };

function assertYearValue(n: number) {
  if (!Number.isInteger(n) || n < 2000 || n > 2100) {
    throw new Error('Year must be between 2000 and 2100, or "all"');
  }
}

function uniqueSortedYears(years: number[]): number[] {
  return [...new Set(years)].sort((a, b) => a - b);
}

/**
 * Parse Analytics timeline query.
 * Prefer `years` (comma-separated or `all`). Fall back to legacy `year`.
 * - omitted → current UTC year
 * - `all` → all timelines
 * - `2024,2025,2026` → multi-year scope
 */
export function parseAnalyticsTimeline(
  yearRaw?: string,
  yearsRaw?: string,
  nowYear = new Date().getUTCFullYear(),
): AnalyticsTimeline {
  const raw =
    yearsRaw != null && yearsRaw.trim() !== ''
      ? yearsRaw.trim()
      : yearRaw != null && yearRaw.trim() !== ''
        ? yearRaw.trim()
        : '';

  if (raw === '') return { kind: 'years', years: [nowYear] };
  if (raw.toLowerCase() === 'all') return { kind: 'all' };

  const parts = raw.split(/[,+\s]+/).map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return { kind: 'years', years: [nowYear] };

  const years: number[] = [];
  for (const part of parts) {
    const n = Number(part);
    assertYearValue(n);
    years.push(n);
  }
  return { kind: 'years', years: uniqueSortedYears(years) };
}

/** Years to load for order window + annual series context. */
export function resolveAnalyticsLoadYears(
  timeline: AnalyticsTimeline,
): number[] {
  if (timeline.kind === 'all') {
    return Array.from(
      { length: APP_YEAR_MAX - APP_YEAR_MIN + 1 },
      (_, i) => APP_YEAR_MIN + i,
    );
  }

  const focus = timeline.years;
  if (focus.length === 1) {
    const year = focus[0]!;
    return Array.from(
      { length: ANNUAL_WINDOW },
      (_, i) => year - (ANNUAL_WINDOW - 1 - i),
    );
  }

  // Multi-year: load selected years + one prior for YoY stage math.
  const min = focus[0]!;
  const withPrior = uniqueSortedYears([min - 1, ...focus]);
  return withPrior.filter((y) => y >= APP_YEAR_MIN - 5 && y <= APP_YEAR_MAX + 5);
}

export function isYearInTimeline(
  year: number,
  timeline: AnalyticsTimeline,
): boolean {
  if (timeline.kind === 'all') return true;
  return timeline.years.includes(year);
}

export function isDateInTimeline(
  date: Date,
  timeline: AnalyticsTimeline,
): boolean {
  return isYearInTimeline(date.getUTCFullYear(), timeline);
}

/** Focus years for summary / product tables (not the rolling annual window). */
export function focusYears(timeline: AnalyticsTimeline): number[] | null {
  if (timeline.kind === 'all') return null;
  return timeline.years;
}

export function timelineScopeLabel(
  timeline: AnalyticsTimeline,
): 'all' | 'year' | 'years' {
  if (timeline.kind === 'all') return 'all';
  return timeline.years.length === 1 ? 'year' : 'years';
}
