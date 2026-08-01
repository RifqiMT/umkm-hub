import { averageBasketSize } from '../analytics/basket-series';
import { averageOrderValue } from '../analytics/duration-series';
import { roundMoney } from '../revenue-targets/revenue-target-math';

export type CustomerOrderTotalsSeed = {
  customerId: string;
  customerCode: string;
  name: string;
  title: string;
  companyName: string;
  companyType: string;
  email: string;
  phone: string;
  totals: number;
  discount: number;
  orderTotal: number;
  orderCount: number;
  packsSold: number;
  cancelledCount: number;
};

type CustomerOrderTotalsRow = {
  id: string;
  customerId: string;
  name: string;
  title: string;
  companyName: string;
  companyType: string;
  email: string;
  phone: string;
  /**
   * Σ Order.lineTotal (pre-discount, non-cancelled).
   * Same value as grossRevenue; kept for existing clients.
   */
  totals: number;
  /** Alias of totals — pre-discount gross revenue. */
  grossRevenue: number;
  /** Σ (lineTotal − totalOrderValue) for non-cancelled. */
  discount: number;
  /** Σ Order.totalOrderValue (post-discount, non-cancelled). */
  orderTotal: number;
  /** Non-cancelled linked order count. */
  orderCount: number;
  /** Σ OrderLine.packCount on non-cancelled orders. */
  packsSold: number;
  /** Cancelled linked order count. */
  cancelledCount: number;
  /** cancelled ÷ (active + cancelled) × 100. */
  cancelRate: number | null;
  /** orderTotal ÷ orderCount. */
  avgOrderValue: number | null;
  /** packsSold ÷ orderCount (Units Per Transaction). */
  unitsPerTransaction: number | null;
  discountPercent: number | null;
};

/** Absolute discount off one order (floored at 0). */
export function orderDiscountAmount(
  lineTotal: number,
  totalOrderValue: number,
): number {
  return Math.max(0, roundMoney(lineTotal - totalOrderValue));
}

export function cancelRatePercent(
  cancelledCount: number,
  activeCount: number,
): number | null {
  const denom = cancelledCount + activeCount;
  if (denom <= 0) return null;
  return roundMoney((cancelledCount / denom) * 100);
}

export function serializeCustomerOrderTotals(
  row: CustomerOrderTotalsSeed,
): CustomerOrderTotalsRow {
  const totals = roundMoney(Number(row.totals) || 0);
  const discount = Math.max(0, roundMoney(Number(row.discount) || 0));
  const orderTotal = roundMoney(Number(row.orderTotal) || 0);
  const orderCount = Number(row.orderCount) || 0;
  const packsSold = roundMoney(Math.max(0, Number(row.packsSold) || 0));
  const cancelledCount = Number(row.cancelledCount) || 0;
  const discountPercent =
    totals > 0 ? roundMoney((discount / totals) * 100) : null;
  return {
    id: row.customerId,
    customerId: row.customerCode,
    name: row.name,
    title: row.title,
    companyName: row.companyName,
    companyType: row.companyType,
    email: row.email,
    phone: row.phone,
    totals,
    grossRevenue: totals,
    discount,
    orderTotal,
    orderCount,
    packsSold,
    cancelledCount,
    cancelRate: cancelRatePercent(cancelledCount, orderCount),
    avgOrderValue: averageOrderValue(orderTotal, orderCount),
    unitsPerTransaction: averageBasketSize(packsSold, orderCount),
    discountPercent,
  };
}
