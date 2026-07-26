import {
  parseAnalyticsTimeline,
  parseAnalyticsYear,
  resolveAnalyticsLoadYears,
  resolveAnalyticsYears,
  APP_YEAR_MIN,
  APP_YEAR_MAX,
  ANNUAL_WINDOW,
  isYearInTimeline,
  focusYears,
  timelineScopeLabel,
} from './analytics-period';

describe('analytics-period timeline scope', () => {
  it('defaults to current year when omitted', () => {
    expect(parseAnalyticsTimeline(undefined, undefined, 2026)).toEqual({
      kind: 'years',
      years: [2026],
    });
  });

  it('accepts all timelines', () => {
    expect(parseAnalyticsTimeline('all', undefined, 2026)).toEqual({
      kind: 'all',
    });
    expect(parseAnalyticsTimeline(undefined, 'ALL', 2026)).toEqual({
      kind: 'all',
    });
  });

  it('accepts multi-year lists', () => {
    expect(parseAnalyticsTimeline(undefined, '2024,2026,2025', 2026)).toEqual({
      kind: 'years',
      years: [2024, 2025, 2026],
    });
  });

  it('years query wins over legacy year', () => {
    expect(parseAnalyticsTimeline('2022', '2024,2025', 2026)).toEqual({
      kind: 'years',
      years: [2024, 2025],
    });
  });

  it('parseAnalyticsYear remains compatible', () => {
    expect(parseAnalyticsYear(undefined, 2026)).toBe(2026);
    expect(parseAnalyticsYear('all', 2026)).toBeNull();
    expect(parseAnalyticsYear('2024', 2026)).toBe(2024);
  });

  it('resolveAnalyticsLoadYears returns full range for all', () => {
    const years = resolveAnalyticsLoadYears({ kind: 'all' });
    expect(years[0]).toBe(APP_YEAR_MIN);
    expect(years[years.length - 1]).toBe(APP_YEAR_MAX);
  });

  it('resolveAnalyticsLoadYears returns rolling window for a single year', () => {
    const years = resolveAnalyticsLoadYears({
      kind: 'years',
      years: [2026],
    });
    expect(years).toHaveLength(ANNUAL_WINDOW);
    expect(years[0]).toBe(2026 - (ANNUAL_WINDOW - 1));
    expect(years[years.length - 1]).toBe(2026);
  });

  it('resolveAnalyticsLoadYears includes prior year for multi-select', () => {
    const years = resolveAnalyticsLoadYears({
      kind: 'years',
      years: [2024, 2026],
    });
    expect(years).toEqual([2023, 2024, 2026]);
  });

  it('resolveAnalyticsYears delegates to load years', () => {
    expect(resolveAnalyticsYears(null)[0]).toBe(APP_YEAR_MIN);
    expect(resolveAnalyticsYears(2026)).toHaveLength(ANNUAL_WINDOW);
  });

  it('isYearInTimeline checks membership', () => {
    expect(isYearInTimeline(2025, { kind: 'all' })).toBe(true);
    expect(
      isYearInTimeline(2025, { kind: 'years', years: [2024, 2026] }),
    ).toBe(false);
    expect(
      isYearInTimeline(2026, { kind: 'years', years: [2024, 2026] }),
    ).toBe(true);
  });

  it('focusYears and timelineScopeLabel describe the selection', () => {
    expect(focusYears({ kind: 'all' })).toBeNull();
    expect(timelineScopeLabel({ kind: 'all' })).toBe('all');
    expect(focusYears({ kind: 'years', years: [2026] })).toEqual([2026]);
    expect(timelineScopeLabel({ kind: 'years', years: [2026] })).toBe('year');
    expect(focusYears({ kind: 'years', years: [2024, 2025] })).toEqual([
      2024, 2025,
    ]);
    expect(
      timelineScopeLabel({ kind: 'years', years: [2024, 2025] }),
    ).toBe('years');
  });
});
