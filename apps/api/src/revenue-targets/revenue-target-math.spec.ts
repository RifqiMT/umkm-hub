import {
  attainmentPercent,
  annualTargetFromMonthAmounts,
  assertMoneyFits,
  distributeAnnualToMonths,
  generateSystematicMonthlyAmounts,
  projectNextAnnualAmount,
  sumAmounts,
} from './revenue-target-math';

describe('assertMoneyFits', () => {
  it('accepts large seeded-scale totals', () => {
    expect(() => assertMoneyFits(4.5e16)).not.toThrow();
  });

  it('rejects non-finite and oversize values', () => {
    expect(() => assertMoneyFits(Number.POSITIVE_INFINITY)).toThrow(/finite/);
    expect(() => assertMoneyFits(1e24)).toThrow(/too large/);
  });
});

describe('generateSystematicMonthlyAmounts', () => {
  it('keeps a flat series when growth is 0', () => {
    expect(generateSystematicMonthlyAmounts(1000, 0)).toEqual(
      Array(12).fill(1000),
    );
  });

  it('applies compound MoM growth from January', () => {
    const amounts = generateSystematicMonthlyAmounts(1000, 10);
    expect(amounts[0]).toBe(1000);
    expect(amounts[1]).toBe(1100);
    expect(amounts[2]).toBe(1210);
    expect(amounts).toHaveLength(12);
  });

  it('rejects negative base', () => {
    expect(() => generateSystematicMonthlyAmounts(-1, 0)).toThrow();
  });
});

describe('projectNextAnnualAmount', () => {
  it('grows year-over-year', () => {
    expect(projectNextAnnualAmount(120_000, 20)).toBe(144_000);
  });
});

describe('attainmentPercent', () => {
  it('returns null when target is 0', () => {
    expect(attainmentPercent(500, 0)).toBeNull();
  });

  it('computes percent of target', () => {
    expect(attainmentPercent(50, 100)).toBe(50);
  });
});

describe('sumAmounts', () => {
  it('sums monthly targets', () => {
    expect(sumAmounts([100, 200, 300])).toBe(600);
  });
});

describe('annualTargetFromMonthAmounts', () => {
  it('equals the sum of twelve months', () => {
    const amounts = generateSystematicMonthlyAmounts(1000, 5);
    expect(annualTargetFromMonthAmounts(amounts)).toBe(sumAmounts(amounts));
  });

  it('rejects incomplete series', () => {
    expect(() => annualTargetFromMonthAmounts([1, 2, 3])).toThrow();
  });
});

describe('distributeAnnualToMonths', () => {
  it('splits evenly and preserves annual total', () => {
    const amounts = distributeAnnualToMonths(120_000);
    expect(amounts).toHaveLength(12);
    expect(amounts.every((a) => a === 10_000)).toBe(true);
    expect(sumAmounts(amounts)).toBe(120_000);
  });

  it('puts remainder on December so sum matches annual', () => {
    const amounts = distributeAnnualToMonths(100);
    expect(amounts).toHaveLength(12);
    expect(sumAmounts(amounts)).toBe(100);
    expect(amounts.slice(0, 11).every((a) => a === amounts[0])).toBe(true);
  });
});
