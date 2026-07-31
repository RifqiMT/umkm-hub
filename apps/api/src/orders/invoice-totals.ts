import { roundMoney, type FiscalBreakdown } from './fiscal-invoice';
import { sumInstallmentAmounts } from './order-installments';

export type InvoicePaymentTotals = {
  /** Amount due on the invoice (includes PPN when PKP tax-exclusive). */
  invoiceTotal: number;
  paidAmount: number;
  remainingAmount: number;
  paidPercent: number;
};

/** Sum line-item amounts shown in the PDF table. */
export function sumLineItemTotals(lineItems: Array<{ lineTotal: number }>): number {
  return roundMoney(lineItems.reduce((sum, row) => sum + (Number(row.lineTotal) || 0), 0));
}

/**
 * Reconcile paid / remaining amounts against the invoice total shown on the PDF.
 * Payments are compared to `fiscal.total`, not pre-tax order value alone.
 */
export function reconcileInvoicePaymentTotals(input: {
  fiscal: FiscalBreakdown;
  installments: Array<{ amount: number }>;
}): InvoicePaymentTotals {
  const invoiceTotal = roundMoney(input.fiscal.total);
  const paidAmount = sumInstallmentAmounts(input.installments);
  const remainingAmount = roundMoney(Math.max(0, invoiceTotal - paidAmount));
  const paidPercent =
    invoiceTotal > 0 ? Math.min(100, (paidAmount / invoiceTotal) * 100) : 0;

  return {
    invoiceTotal,
    paidAmount,
    remainingAmount,
    paidPercent,
  };
}

/** Order-level discount before tax (subtotal − net order value). */
export function computeOrderDiscountAmount(
  lineTotal: number,
  totalOrderValue: number,
): number {
  return roundMoney(Math.max(0, lineTotal - totalOrderValue));
}

/**
 * Prefer the sum of displayed line items for the PDF subtotal so the table
 * matches the summary row.
 */
export function resolveInvoiceSubtotal(
  lineItems: Array<{ lineTotal: number }>,
  orderLineTotal: number,
): number {
  const fromLines = sumLineItemTotals(lineItems);
  if (lineItems.length === 0) return roundMoney(orderLineTotal);
  if (Math.abs(fromLines - orderLineTotal) <= 0.01) return roundMoney(orderLineTotal);
  return fromLines;
}
