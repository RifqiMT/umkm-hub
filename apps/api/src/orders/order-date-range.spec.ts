import { dateOnlyBounds, isDateOnlyString, parseDateOnlyUtc } from './order-date-range';

describe('order-date-range', () => {
  it('validates YYYY-MM-DD', () => {
    expect(isDateOnlyString('2026-07-26')).toBe(true);
    expect(isDateOnlyString('26-07-2026')).toBe(false);
  });

  it('parses UTC midnight', () => {
    expect(parseDateOnlyUtc('2026-03-01').toISOString()).toBe(
      '2026-03-01T00:00:00.000Z',
    );
  });

  it('returns undefined when both empty', () => {
    expect(dateOnlyBounds(undefined, undefined)).toBeUndefined();
    expect(dateOnlyBounds('', '')).toBeUndefined();
  });

  it('builds from-only and to-only bounds', () => {
    expect(dateOnlyBounds('2024-01-01', undefined)).toEqual({
      gte: new Date('2024-01-01T00:00:00.000Z'),
    });
    expect(dateOnlyBounds(undefined, '2024-12-31')).toEqual({
      lte: new Date('2024-12-31T00:00:00.000Z'),
    });
  });

  it('swaps inverted ranges', () => {
    expect(dateOnlyBounds('2024-12-31', '2024-01-01')).toEqual({
      gte: new Date('2024-01-01T00:00:00.000Z'),
      lte: new Date('2024-12-31T00:00:00.000Z'),
    });
  });
});
