import {
  MAX_LINE_MONEY,
  maxPacksForLine,
  randomPackCount,
  roundMoney,
  splitInstallments,
  toDateOnlyString,
} from './seed-bulk-orders-math';

describe('seed-bulk-orders-math', () => {
  it('caps packs by line money and remaining', () => {
    const max = maxPacksForLine({
      packPrice: 180_000,
      remainingPacks: 1_000_000_000_000n,
      orderMoneyBudget: MAX_LINE_MONEY,
    });
    expect(max).toBeLessThanOrEqual(80_000_000n);
    expect(Number(max) * 180_000).toBeLessThanOrEqual(MAX_LINE_MONEY);
  });

  it('never exceeds remaining packs', () => {
    const max = maxPacksForLine({
      packPrice: 4_500,
      remainingPacks: 12n,
      orderMoneyBudget: MAX_LINE_MONEY,
    });
    expect(max).toBe(12n);
  });

  it('randomPackCount stays within bounds', () => {
    for (let i = 0; i < 50; i += 1) {
      const n = randomPackCount(1000n);
      expect(n).toBeGreaterThanOrEqual(1n);
      expect(n).toBeLessThanOrEqual(1000n);
    }
  });

  it('splitInstallments sums to total and stays chronological', () => {
    const base = new Date('2024-06-01T00:00:00.000Z');
    const rows = splitInstallments({
      totalOrderValue: 10_000.1234,
      count: 7,
      baseDate: base,
      gapDaysMin: 7,
      gapDaysMax: 7,
    });
    expect(rows).toHaveLength(7);
    const sum = roundMoney(rows.reduce((a, r) => a + r.amount, 0));
    expect(sum).toBe(10_000.1234);
    for (let i = 1; i < rows.length; i += 1) {
      expect(rows[i]!.installmentDate >= rows[i - 1]!.installmentDate).toBe(
        true,
      );
    }
    expect(rows[0]!.installmentDate).toBe(toDateOnlyString(base));
  });
});
