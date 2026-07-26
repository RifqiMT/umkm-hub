import {
  cancellationRatePercent,
  discountRatePercent,
  fullPaymentRatePercent,
  profitMarginRatePercent,
  ratePercent,
  roundPackCount,
  toDateOnlyIso,
  totalProductsSold,
} from './order-summary';

describe('order-summary', () => {
  it('sums line and header-only packs', () => {
    expect(
      totalProductsSold({ linePackSum: 10.5, headerOnlyPackSum: 2 }),
    ).toBe(12.5);
    expect(roundPackCount(1.23456)).toBe(1.2346);
  });

  it('normalizes dates to YYYY-MM-DD', () => {
    expect(toDateOnlyIso('2024-06-15T12:00:00.000Z')).toBe('2024-06-15');
    expect(toDateOnlyIso(new Date('2024-06-15T00:00:00.000Z'))).toBe(
      '2024-06-15',
    );
    expect(toDateOnlyIso(null)).toBeNull();
  });

  it('computes rate percents with null when undefined', () => {
    expect(ratePercent(1, 0)).toBeNull();
    expect(ratePercent(25, 100)).toBe(25);
    expect(cancellationRatePercent(10, 200)).toBe(5);
    expect(cancellationRatePercent(0, 0)).toBeNull();
    expect(discountRatePercent(1000, 900)).toBe(10);
    expect(discountRatePercent(0, 0)).toBeNull();
    expect(fullPaymentRatePercent(40, 100)).toBe(40);
    expect(profitMarginRatePercent(1000, 400, true)).toBe(60);
    expect(profitMarginRatePercent(1000, 400, false)).toBeNull();
    expect(profitMarginRatePercent(0, 0, true)).toBeNull();
  });
});
