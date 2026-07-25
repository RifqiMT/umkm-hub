/** Full digit quantity / non-currency amounts (no Mn/Bn abbreviation). */
export function formatQty(value: number) {
  return value.toLocaleString('en-US', {
    maximumFractionDigits: 4,
  });
}

function formatFullMoney(value: number) {
  return value.toLocaleString('en-US', {
    maximumFractionDigits: 0,
  });
}

const COMPACT_TIERS = [
  { abs: 1e18, suffix: 'Qn' },
  { abs: 1e15, suffix: 'Qd' },
  { abs: 1e12, suffix: 'Tn' },
  { abs: 1e9, suffix: 'Bn' },
  { abs: 1e6, suffix: 'Mn' },
] as const;

/**
 * Display money for tables, KPIs, and charts.
 * e.g. 1_532_000 → "1.53 Mn", 1_532_000_000 → "1.53 Bn"
 * Under 1 million stays full digits.
 */
export function formatMoney(value: number) {
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);

  for (const tier of COMPACT_TIERS) {
    if (abs >= tier.abs) {
      const scaled = abs / tier.abs;
      return `${sign}${scaled.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} ${tier.suffix}`;
    }
  }

  return formatFullMoney(value);
}
