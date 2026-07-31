import {
  assertInstallmentsChronological,
  assertInstallmentsWithinTotal,
  applyBillInvoiceDateHints,
  calculateRemainingAmount,
  calculateRemainingFromPaid,
  deriveInvoiceStatusFromPayments,
  isPaymentOverdue,
  sumInstallmentAmounts,
} from './order-installments';

describe('order-installments', () => {
  it('sums installment amounts', () => {
    expect(
      sumInstallmentAmounts([{ amount: 10 }, { amount: 15.5 }, { amount: 0 }]),
    ).toBe(25.5);
  });

  it('computes remaining amount and clamps at zero', () => {
    expect(
      calculateRemainingAmount(100, [{ amount: 40 }, { amount: 25 }]),
    ).toBe(35);
    expect(calculateRemainingAmount(50, [{ amount: 50 }])).toBe(0);
    expect(calculateRemainingAmount(50, [{ amount: 60 }])).toBe(0);
    expect(calculateRemainingFromPaid(100, 65)).toBe(35);
  });

  it('rejects installments above total', () => {
    expect(() =>
      assertInstallmentsWithinTotal(100, [{ amount: 60 }, { amount: 50 }]),
    ).toThrow(/exceed amount due/);
  });

  it('rejects installment dates that go backwards', () => {
    expect(() =>
      assertInstallmentsChronological([
        { installmentDate: '2026-08-01' },
        { installmentDate: '2026-07-25' },
      ]),
    ).toThrow(/cannot be before/);
  });

  it('derives invoice status from payments and bill', () => {
    expect(
      deriveInvoiceStatusFromPayments({
        amountDue: 100,
        paidAmount: 0,
        billStatus: 'CREATED',
      }),
    ).toBe('CREATED');
    expect(
      deriveInvoiceStatusFromPayments({
        amountDue: 100,
        paidAmount: 0,
        billStatus: 'SENT',
      }),
    ).toBe('SENT');
    expect(
      deriveInvoiceStatusFromPayments({
        amountDue: 100,
        paidAmount: 40,
        billStatus: 'SENT',
      }),
    ).toBe('PARTIALLY_PAID');
    expect(
      deriveInvoiceStatusFromPayments({
        amountDue: 100,
        paidAmount: 100,
        billStatus: 'CREATED',
      }),
    ).toBe('FULLY_PAID');
  });

  it('derives FULLY_PAID against PKP invoice total', () => {
    expect(
      deriveInvoiceStatusFromPayments({
        amountDue: 111,
        paidAmount: 111,
        billStatus: 'SENT',
      }),
    ).toBe('FULLY_PAID');
    expect(
      deriveInvoiceStatusFromPayments({
        amountDue: 111,
        paidAmount: 100,
        billStatus: 'SENT',
      }),
    ).toBe('PARTIALLY_PAID');
  });

  it('stamps bill date when marking sent without explicit date', () => {
    const today = new Date('2026-07-31T00:00:00.000Z');
    expect(
      applyBillInvoiceDateHints({
        billStatus: 'SENT',
        previousBillStatus: 'CREATED',
        billDate: null,
        billDateProvided: false,
        invoiceDate: null,
        invoiceDateProvided: false,
        installments: [],
        paidAmount: 0,
        today,
      }).billDate,
    ).toEqual(today);
  });

  it('stamps invoice date from earliest payment when not explicit', () => {
    expect(
      applyBillInvoiceDateHints({
        billStatus: 'SENT',
        billDate: new Date('2026-07-20T00:00:00.000Z'),
        billDateProvided: true,
        invoiceDate: null,
        invoiceDateProvided: false,
        installments: [
          { installmentDate: '2026-08-05' },
          { installmentDate: '2026-08-15' },
        ],
        paidAmount: 50,
        today: new Date('2026-07-31T00:00:00.000Z'),
      }).invoiceDate,
    ).toEqual(new Date('2026-08-05T00:00:00.000Z'));
  });

  it('detects overdue delayed payments', () => {
    expect(
      isPaymentOverdue({
        paymentDueDate: '2026-07-01',
        invoiceStatus: 'PARTIALLY_PAID',
        today: new Date('2026-07-31T00:00:00.000Z'),
      }),
    ).toBe(true);
    expect(
      isPaymentOverdue({
        paymentDueDate: '2026-08-01',
        invoiceStatus: 'PARTIALLY_PAID',
        today: new Date('2026-07-31T00:00:00.000Z'),
      }),
    ).toBe(false);
    expect(
      isPaymentOverdue({
        paymentDueDate: '2026-07-01',
        invoiceStatus: 'FULLY_PAID',
        today: new Date('2026-07-31T00:00:00.000Z'),
      }),
    ).toBe(false);
  });
});
