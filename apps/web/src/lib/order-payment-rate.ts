/** Order payment progress (Paid % column + stage full-payment alignment). */

const PAYMENT_EPSILON = 0.00005;

function roundRate(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function orderPaidAmount(order: {
  paidAmount?: number | null;
  installments?: Array<{ amount: number }> | null;
}): number {
  if (order.paidAmount != null && Number.isFinite(order.paidAmount)) {
    return Number(order.paidAmount);
  }
  if (!order.installments?.length) return 0;
  return order.installments.reduce(
    (sum, row) => sum + (Number(row.amount) || 0),
    0,
  );
}

function isOrderFullyPaid(order: {
  totalOrderValue: number;
  paidAmount?: number | null;
  installments?: Array<{ amount: number }> | null;
}): boolean {
  const total = Number(order.totalOrderValue) || 0;
  if (!(total > 0)) return false;
  return orderPaidAmount(order) >= total - PAYMENT_EPSILON;
}

/** Paid ÷ total × 100; fully paid → 100; null when total ≤ 0. */
export function orderPaymentRatePercent(order: {
  totalOrderValue: number;
  paidAmount?: number | null;
  installments?: Array<{ amount: number }> | null;
}): number | null {
  const total = Number(order.totalOrderValue) || 0;
  if (!(total > 0)) return null;
  if (isOrderFullyPaid(order)) return 100;
  const paid = Math.max(0, orderPaidAmount(order));
  const rate = roundRate((paid / total) * 100);
  return Math.min(100, Math.max(0, rate));
}
