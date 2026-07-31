/** Round money to 4 decimal places (matches order totals). */
function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 10000) / 10000;
}

export function sumInstallmentAmounts(
  installments: Array<{ amount: number }>,
): number {
  return roundMoney(
    installments.reduce((sum, row) => sum + (Number(row.amount) || 0), 0),
  );
}

export function calculateRemainingAmount(
  totalOrderValue: number,
  installments: Array<{ amount: number }>,
): number {
  return calculateRemainingFromPaid(
    totalOrderValue,
    sumInstallmentAmounts(installments),
  );
}

export function calculateRemainingFromPaid(
  amountDue: number,
  paidAmount: number,
): number {
  return roundMoney(Math.max(0, amountDue - (Number(paidAmount) || 0)));
}

export function assertInstallmentsWithinTotal(
  amountDue: number,
  installments: Array<{ amount: number }>,
): void {
  const paid = sumInstallmentAmounts(installments);
  if (paid > amountDue + 0.00005) {
    throw new Error(
      `Installments (${paid}) exceed amount due (${amountDue})`,
    );
  }
}

/** Dates must be non-decreasing in submitted list order. */
export function assertInstallmentsChronological(
  installments: Array<{ installmentDate: string }>,
): void {
  for (let i = 1; i < installments.length; i++) {
    const prev = installments[i - 1].installmentDate.slice(0, 10);
    const curr = installments[i].installmentDate.slice(0, 10);
    if (curr < prev) {
      throw new Error(
        `Installment ${i + 1} date (${curr}) cannot be before installment ${i} (${prev})`,
      );
    }
  }
}

const PAYMENT_EPSILON = 0.00005;

export type InvoiceCollectionStatus =
  | 'CREATED'
  | 'SENT'
  | 'PARTIALLY_PAID'
  | 'FULLY_PAID';

/**
 * Derive invoice collection status from paid amount vs amount due on the invoice.
 * When unpaid: SENT if the bill was sent, otherwise CREATED.
 */
export function deriveInvoiceStatusFromPayments(input: {
  amountDue: number;
  paidAmount: number;
  billStatus: 'CREATED' | 'SENT';
}): InvoiceCollectionStatus {
  const total = Number(input.amountDue) || 0;
  const paid = Number(input.paidAmount) || 0;
  if (paid <= PAYMENT_EPSILON) {
    return input.billStatus === 'SENT' ? 'SENT' : 'CREATED';
  }
  if (paid + PAYMENT_EPSILON >= total) {
    return 'FULLY_PAID';
  }
  return 'PARTIALLY_PAID';
}

function dateOnlyString(value: Date): string {
  return value.toISOString().slice(0, 10);
}

/**
 * SME-friendly date hints: stamp bill date when marking sent, and invoice date
 * on first recorded payment — only when the client did not send an explicit date.
 */
export function applyBillInvoiceDateHints(input: {
  billStatus: 'CREATED' | 'SENT';
  previousBillStatus?: 'CREATED' | 'SENT';
  billDate: Date | null;
  billDateProvided: boolean;
  invoiceDate: Date | null;
  invoiceDateProvided: boolean;
  installments: Array<{ installmentDate: string }>;
  paidAmount: number;
  today: Date;
}): { billDate: Date | null; invoiceDate: Date | null } {
  let billDate = input.billDate;
  let invoiceDate = input.invoiceDate;

  const markingSent =
    input.billStatus === 'SENT' &&
    (input.previousBillStatus === 'CREATED' ||
      input.previousBillStatus === undefined);

  if (markingSent && !input.billDateProvided) {
    billDate = input.today;
  }

  if (
    input.paidAmount > PAYMENT_EPSILON &&
    input.installments.length > 0 &&
    !input.invoiceDateProvided
  ) {
    const earliest = input.installments
      .map((row) => row.installmentDate.slice(0, 10))
      .sort()[0];
    if (earliest) {
      invoiceDate = new Date(`${earliest}T00:00:00.000Z`);
    }
  }

  return { billDate, invoiceDate };
}

/** True when a delayed-payment order is past due and not fully collected. */
export function isPaymentOverdue(input: {
  paymentDueDate: Date | string | null | undefined;
  invoiceStatus: InvoiceCollectionStatus;
  today?: Date;
}): boolean {
  if (!input.paymentDueDate) return false;
  if (input.invoiceStatus === 'FULLY_PAID') return false;
  const due =
    typeof input.paymentDueDate === 'string'
      ? input.paymentDueDate.slice(0, 10)
      : dateOnlyString(input.paymentDueDate);
  const today = input.today ?? new Date();
  return due < dateOnlyString(today);
}
