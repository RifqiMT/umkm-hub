/** Round money to 4 decimal places (same convention as orders). */
export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 10000) / 10000;
}

/**
 * Systematic monthly series from January base + MoM growth %.
 * amount(m) = base × (1 + growth/100)^(m−1) for m = 1…12
 */
export function generateSystematicMonthlyAmounts(
  baseMonthAmount: number,
  monthlyGrowthPercent: number,
): number[] {
  if (baseMonthAmount < 0) {
    throw new Error('Base month amount must be ≥ 0');
  }
  const factor = 1 + monthlyGrowthPercent / 100;
  const amounts: number[] = [];
  for (let month = 1; month <= 12; month += 1) {
    amounts.push(roundMoney(baseMonthAmount * factor ** (month - 1)));
  }
  return amounts;
}

/** Next year's systematic annual base from this year + YoY growth %. */
export function projectNextAnnualAmount(
  baseAnnualAmount: number,
  annualGrowthPercent: number,
): number {
  if (baseAnnualAmount < 0) {
    throw new Error('Base annual amount must be ≥ 0');
  }
  return roundMoney(baseAnnualAmount * (1 + annualGrowthPercent / 100));
}

export function attainmentPercent(
  actual: number,
  target: number,
): number | null {
  if (target <= 0) return null;
  return roundMoney((actual / target) * 100);
}

export function sumAmounts(amounts: number[]): number {
  return roundMoney(amounts.reduce((sum, n) => sum + n, 0));
}

/**
 * When 12 monthly targets exist, annual target is always their sum.
 * Used for display and for writing annual fields after a monthly save.
 */
export function annualTargetFromMonthAmounts(amounts: number[]): number {
  if (amounts.length !== 12) {
    throw new Error('Expected exactly 12 monthly amounts');
  }
  return sumAmounts(amounts);
}

/**
 * Split an annual target into 12 monthly amounts.
 * Months 1–11 get an even share; December absorbs the remainder so the
 * sum equals the annual total exactly (within money rounding).
 */
export function distributeAnnualToMonths(annualAmount: number): number[] {
  if (annualAmount < 0) {
    throw new Error('Annual amount must be ≥ 0');
  }
  const annual = roundMoney(annualAmount);
  if (annual === 0) {
    return Array(12).fill(0);
  }
  const perMonth = roundMoney(annual / 12);
  const amounts = Array.from({ length: 11 }, () => perMonth);
  const firstEleven = sumAmounts(amounts);
  amounts.push(roundMoney(annual - firstEleven));
  return amounts;
}
