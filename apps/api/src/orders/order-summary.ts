/** Pure helpers for Orders catalog summary stats. */

import { roundMoney } from '../revenue-targets/revenue-target-math';

export function roundPackCount(value: number): number {
  return Math.round((value + Number.EPSILON) * 10000) / 10000;
}

/** Total packs sold = line packs + header-only order packs (legacy rows). */
export function totalProductsSold(input: {
  linePackSum: number;
  headerOnlyPackSum: number;
}): number {
  return roundPackCount(
    Math.max(0, input.linePackSum) + Math.max(0, input.headerOnlyPackSum),
  );
}

export function toDateOnlyIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  if (typeof value === 'string') {
    const day = value.slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null;
  }
  return value.toISOString().slice(0, 10);
}

/** Percent rate rounded to 2 decimals; null when denominator is not positive. */
export function ratePercent(
  numerator: number,
  denominator: number,
): number | null {
  if (!(denominator > 0) || !Number.isFinite(numerator)) return null;
  return roundMoney((numerator / denominator) * 100);
}

/** Cancelled ÷ all orders × 100. */
export function cancellationRatePercent(
  cancelledCount: number,
  totalOrderCount: number,
): number | null {
  return ratePercent(Math.max(0, cancelledCount), Math.max(0, totalOrderCount));
}

/**
 * Discount as share of pre-discount line totals:
 * (Σ lineTotal − Σ totalOrderValue) ÷ Σ lineTotal × 100.
 */
export function discountRatePercent(
  lineTotalSum: number,
  revenueSum: number,
): number | null {
  const gross = Math.max(0, lineTotalSum);
  const discounted = Math.max(0, gross - Math.max(0, revenueSum));
  return ratePercent(discounted, gross);
}

/** Fully paid (remaining ≈ 0) ÷ active (non-cancelled) orders × 100. */
export function fullPaymentRatePercent(
  fullyPaidCount: number,
  activeOrderCount: number,
): number | null {
  return ratePercent(Math.max(0, fullyPaidCount), Math.max(0, activeOrderCount));
}

/**
 * Profit margin on post-discount revenue when any COGS is known:
 * (revenue − cost) ÷ revenue × 100.
 */
export function profitMarginRatePercent(
  revenue: number,
  costSum: number,
  hasCost: boolean,
): number | null {
  if (!hasCost) return null;
  const rev = Math.max(0, revenue);
  if (!(rev > 0)) return null;
  const profit = rev - Math.max(0, costSum);
  return ratePercent(profit, rev);
}
