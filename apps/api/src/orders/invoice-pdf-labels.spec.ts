import {
  buildInvoiceLabels,
  formatCollectionStatus,
  formatPaymentTerms,
} from './invoice-pdf-labels';

describe('invoice-pdf-labels', () => {
  it('maps payment terms to readable labels', () => {
    expect(formatPaymentTerms('CONSIGNMENT')).toBe('Consignment');
    expect(formatPaymentTerms('DELAYED PAYMENT')).toBe('Delayed payment');
  });

  it('maps collection status to readable labels', () => {
    expect(formatCollectionStatus('PARTIALLY PAID')).toBe('Partially paid');
    expect(formatCollectionStatus('UNPAID')).toBe('Awaiting payment');
  });

  it('builds PKP document labels', () => {
    const labels = buildInvoiceLabels(true);
    expect(labels.documentTitle).toBe('Tax Invoice');
    expect(labels.documentSubtitle).toContain('PKP-registered');
    expect(labels.colPaymentAmount).toBe('Amount (Rp)');
    expect(labels.totalPaid).toBe('Total paid');
    expect(labels.paymentsTitle).toBe('Payment history');
  });
});
