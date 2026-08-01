type InvoiceCollectionStatus =
  | 'CREATED'
  | 'SENT'
  | 'PARTIALLY_PAID'
  | 'FULLY_PAID';

const PAYMENT_EPSILON = 0.00005;

/** Derive invoice collection status from paid amount vs amount due. */
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
