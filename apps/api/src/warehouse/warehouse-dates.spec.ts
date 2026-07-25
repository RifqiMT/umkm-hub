import { parseDateOnlyForTest, todayDateOnlyForTest } from './warehouse-dates';

describe('warehouse date helpers', () => {
  it('parses YYYY-MM-DD as UTC midnight', () => {
    const d = parseDateOnlyForTest('2026-07-24');
    expect(d.toISOString()).toBe('2026-07-24T00:00:00.000Z');
  });

  it('rejects invalid date strings', () => {
    expect(() => parseDateOnlyForTest('24-07-2026')).toThrow(/Invalid date/);
  });

  it('todayDateOnly returns a date-only UTC value', () => {
    const d = todayDateOnlyForTest();
    expect(d.toISOString().endsWith('T00:00:00.000Z')).toBe(true);
  });
});
