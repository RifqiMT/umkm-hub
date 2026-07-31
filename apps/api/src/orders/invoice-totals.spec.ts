import { computeFiscalBreakdown } from './fiscal-invoice';
import {
  computeOrderDiscountAmount,
  reconcileInvoicePaymentTotals,
  resolveInvoiceSubtotal,
  sumLineItemTotals,
} from './invoice-totals';

describe('invoice-totals', () => {
  it('sums line item totals', () => {
    expect(
      sumLineItemTotals([
        { lineTotal: 100_000 },
        { lineTotal: 150_000 },
      ]),
    ).toBe(250_000);
  });

  it('uses fiscal.total for PKP tax-exclusive payment remaining', () => {
    const fiscal = computeFiscalBreakdown({
      orderTotal: 1_000_000,
      isPkp: true,
      ppnPercent: 11,
      taxInclusive: false,
    });
    const totals = reconcileInvoicePaymentTotals({
      fiscal,
      installments: [{ amount: 500_000 }],
    });

    expect(fiscal.total).toBe(1_110_000);
    expect(totals.paidAmount).toBe(500_000);
    expect(totals.remainingAmount).toBe(610_000);
    expect(totals.paidPercent).toBeCloseTo(45.045, 2);
  });

  it('uses fiscal.total for non-PKP invoices', () => {
    const fiscal = computeFiscalBreakdown({
      orderTotal: 250_000,
      isPkp: false,
      ppnPercent: 11,
      taxInclusive: false,
    });
    const totals = reconcileInvoicePaymentTotals({
      fiscal,
      installments: [{ amount: 100_000 }, { amount: 50_000 }],
    });

    expect(totals.invoiceTotal).toBe(250_000);
    expect(totals.paidAmount).toBe(150_000);
    expect(totals.remainingAmount).toBe(100_000);
    expect(totals.paidPercent).toBe(60);
  });

  it('computes order discount from subtotal and net value', () => {
    expect(computeOrderDiscountAmount(250_000, 225_000)).toBe(25_000);
  });

  it('prefers displayed line-item sum when order header subtotal drifts', () => {
    expect(
      resolveInvoiceSubtotal(
        [{ lineTotal: 100_000 }, { lineTotal: 150_000 }],
        999_999,
      ),
    ).toBe(250_000);
  });
});
