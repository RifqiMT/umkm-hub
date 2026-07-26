import {
  averageRepeatOrderDays,
  firstRepeatOrderDays,
  repeatOrderDuration,
} from './repeat-order-duration';

describe('repeatOrderDuration', () => {
  it('returns nulls for fewer than two orders', () => {
    expect(repeatOrderDuration([])).toEqual({
      firstRepeatOrderDays: null,
      avgRepeatOrderDays: null,
    });
    expect(
      repeatOrderDuration([new Date(Date.UTC(2026, 0, 1))]),
    ).toEqual({
      firstRepeatOrderDays: null,
      avgRepeatOrderDays: null,
    });
  });

  it('computes first gap and mean of consecutive UTC gaps', () => {
    // gaps: 10, 20 → first 10, avg 15
    expect(
      repeatOrderDuration([
        new Date(Date.UTC(2026, 0, 1)),
        new Date(Date.UTC(2026, 0, 11)),
        new Date(Date.UTC(2026, 0, 31)),
      ]),
    ).toEqual({
      firstRepeatOrderDays: 10,
      avgRepeatOrderDays: 15,
    });
  });

  it('counts same-day consecutive orders as a 0-day first gap', () => {
    expect(
      firstRepeatOrderDays([
        new Date(Date.UTC(2026, 0, 1, 8)),
        new Date(Date.UTC(2026, 0, 1, 18)),
        new Date(Date.UTC(2026, 0, 3)),
      ]),
    ).toBe(0);
    expect(
      averageRepeatOrderDays([
        new Date(Date.UTC(2026, 0, 1, 8)),
        new Date(Date.UTC(2026, 0, 1, 18)),
        new Date(Date.UTC(2026, 0, 3)),
      ]),
    ).toBe(1);
  });

  it('sorts unsorted input dates', () => {
    expect(
      repeatOrderDuration([
        new Date(Date.UTC(2026, 0, 21)),
        new Date(Date.UTC(2026, 0, 1)),
        new Date(Date.UTC(2026, 0, 11)),
      ]),
    ).toEqual({
      firstRepeatOrderDays: 10,
      avgRepeatOrderDays: 10,
    });
  });
});
