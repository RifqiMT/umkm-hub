import {
  getIsoWeekParts,
  isoWeekKey,
  listCalendarMonthsInYears,
  listCalendarQuartersInYears,
  listIsoWeeksInCalendarYear,
  listIsoWeeksInCalendarYears,
  listLastIsoWeeks,
  listLastCalendarMonths,
  startOfIsoWeek,
} from './iso-week';

describe('iso-week', () => {
  it('getIsoWeekParts returns stable parts for a known Thursday', () => {
    // 2026-01-01 is Thursday → ISO week 1 of 2026
    const parts = getIsoWeekParts(new Date(Date.UTC(2026, 0, 1)));
    expect(parts).toEqual({ isoYear: 2026, isoWeek: 1 });
  });

  it('startOfIsoWeek returns Monday', () => {
    const monday = startOfIsoWeek(new Date(Date.UTC(2026, 0, 1)));
    expect(monday.getUTCDay()).toBe(1);
    expect(monday.toISOString().slice(0, 10)).toBe('2025-12-29');
  });

  it('isoWeekKey pads week numbers', () => {
    expect(isoWeekKey(2026, 3)).toBe('2026-W03');
  });

  it('listIsoWeeksInCalendarYear covers the year without duplicates', () => {
    const weeks = listIsoWeeksInCalendarYear(2026);
    expect(weeks.length).toBeGreaterThanOrEqual(52);
    expect(weeks.length).toBeLessThanOrEqual(54);
    const keys = new Set(weeks.map((w) => `${w.isoYear}-W${w.isoWeek}`));
    expect(keys.size).toBe(weeks.length);
    expect(weeks[0]!.label).toMatch(/^W\d{2}$/);
  });

  it('listLastIsoWeeks returns chronological rolling weeks', () => {
    const weeks = listLastIsoWeeks(new Date(Date.UTC(2026, 6, 15)), 4);
    expect(weeks).toHaveLength(4);
    expect(weeks[0]!.start.getTime()).toBeLessThan(weeks[3]!.start.getTime());
    expect(weeks[3]!.label).toMatch(/^W\d{2} '\d{2}$/);
  });

  it('listLastCalendarMonths returns chronological months', () => {
    const months = listLastCalendarMonths(new Date(Date.UTC(2026, 2, 10)), 3);
    expect(months).toEqual([
      { year: 2026, month: 1, label: "Jan '26" },
      { year: 2026, month: 2, label: "Feb '26" },
      { year: 2026, month: 3, label: "Mar '26" },
    ]);
  });

  it('listIsoWeeksInCalendarYears covers every selected year', () => {
    const weeks = listIsoWeeksInCalendarYears([2025, 2026]);
    expect(weeks.length).toBeGreaterThanOrEqual(104);
    expect(weeks[0]!.label).toMatch(/^W\d{2} '\d{2}$/);
    expect(weeks[0]!.start.getTime()).toBeLessThan(
      weeks[weeks.length - 1]!.start.getTime(),
    );
    const keys = new Set(weeks.map((w) => `${w.isoYear}-W${w.isoWeek}`));
    expect(keys.size).toBe(weeks.length);
  });

  it('listCalendarMonthsInYears returns every month in scope', () => {
    expect(listCalendarMonthsInYears([2025, 2026])).toHaveLength(24);
    expect(listCalendarMonthsInYears([2026])[0]).toEqual({
      year: 2026,
      month: 1,
      label: 'Jan',
    });
    expect(listCalendarMonthsInYears([2025, 2026])[0]?.label).toBe("Jan '25");
  });

  it('listCalendarQuartersInYears returns every quarter in scope', () => {
    expect(listCalendarQuartersInYears([2026])).toEqual([
      { year: 2026, quarter: 1, label: 'Q1' },
      { year: 2026, quarter: 2, label: 'Q2' },
      { year: 2026, quarter: 3, label: 'Q3' },
      { year: 2026, quarter: 4, label: 'Q4' },
    ]);
    expect(listCalendarQuartersInYears([2025, 2026])).toHaveLength(8);
    expect(listCalendarQuartersInYears([2025, 2026])[0]?.label).toBe("Q1 '25");
  });
});
