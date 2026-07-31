/** Shared order payment progress math (list Paid % + summary full-payment). */

/** Matches installment / summary SQL tolerance. */
export const PAYMENT_EPSILON = 0.00005;

function roundRate(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function sumInstallmentAmounts(
  installments: Array<{ amount: number }> | null | undefined,
): number {
  if (!installments?.length) return 0;
  return installments.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
}

/** Paid amount: prefer server `paidAmount`, else Σ installments. */
export function orderPaidAmount(order: {
  paidAmount?: number | null;
  installments?: Array<{ amount: number }> | null;
}): number {
  if (order.paidAmount != null && Number.isFinite(order.paidAmount)) {
    return Number(order.paidAmount);
  }
  return sumInstallmentAmounts(order.installments);
}

/** Invoice amount due; falls back to net order value when omitted. */
function orderAmountDue(order: {
  amountDue?: number | null;
  totalOrderValue: number;
}): number {
  const due = order.amountDue ?? order.totalOrderValue;
  return Number(due) || 0;
}

/** True when remaining ≈ 0 (same rule as summary full-payment SQL). */
export function isOrderFullyPaid(order: {
  amountDue?: number | null;
  totalOrderValue: number;
  paidAmount?: number | null;
  installments?: Array<{ amount: number }> | null;
}): boolean {
  const total = orderAmountDue(order);
  if (!(total > 0)) return false;
  return orderPaidAmount(order) >= total - PAYMENT_EPSILON;
}

/**
 * Paid ÷ amount due × 100 for list/KPI display.
 * Fully paid orders always report 100 (avoids 99.99 vs 100 drift).
 * Null when amount due ≤ 0.
 */
export function orderPaymentRatePercent(order: {
  amountDue?: number | null;
  totalOrderValue: number;
  paidAmount?: number | null;
  installments?: Array<{ amount: number }> | null;
}): number | null {
  const total = orderAmountDue(order);
  if (!(total > 0)) return null;
  if (isOrderFullyPaid(order)) return 100;
  const paid = Math.max(0, orderPaidAmount(order));
  const rate = roundRate((paid / total) * 100);
  return Math.min(100, Math.max(0, rate));
}

/**
 * Share of active orders that are fully paid.
 * `activeOrders` must exclude CANCELLED (same as GET /orders/summary).
 */
export function fullPaymentRateFromOrders(
  orders: Array<{
    status?: string | null;
    amountDue?: number | null;
    totalOrderValue: number;
    paidAmount?: number | null;
    installments?: Array<{ amount: number }> | null;
  }>,
): number | null {
  const active = orders.filter(
    (order) => String(order.status ?? '').toUpperCase() !== 'CANCELLED',
  );
  if (active.length === 0) return null;
  const fullyPaid = active.filter((order) => isOrderFullyPaid(order)).length;
  return roundRate((fullyPaid / active.length) * 100);
}
