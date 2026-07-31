function titleCase(raw: string): string {
  return raw
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** User-friendly payment terms for invoice PDF copy. */
export function formatPaymentTerms(raw: string): string {
  const key = raw.trim().toUpperCase().replace(/\s+/g, '_');
  const map: Record<string, string> = {
    CASH: 'Cash on delivery',
    CONSIGNMENT: 'Consignment',
    DELAYED_PAYMENT: 'Delayed payment',
    INSTALLMENT: 'Installment plan',
    PAID: 'Paid in full',
    PARTIAL: 'Partial payment',
  };
  return map[key] ?? titleCase(raw.replace(/_/g, ' '));
}

/** User-friendly collection status for invoice PDF copy. */
export function formatCollectionStatus(raw: string): string {
  const key = raw.trim().toUpperCase().replace(/\s+/g, '_');
  const map: Record<string, string> = {
    PAID: 'Paid in full',
    PARTIALLY_PAID: 'Partially paid',
    UNPAID: 'Awaiting payment',
    OVERDUE: 'Overdue',
    DRAFT: 'Draft',
  };
  return map[key] ?? titleCase(raw.replace(/_/g, ' '));
}

export type InvoicePdfLabels = {
  documentTitle: string;
  documentSubtitle: string;
  invoiceNumber: string;
  invoiceDate: string;
  paymentDue: string;
  paymentDueFallback: string;
  paymentTerms: string;
  orderReference: string;
  seller: string;
  buyer: string;
  productsSection: string;
  productsCount: (count: number) => string;
  colIndex: string;
  colDescription: string;
  colQuantity: string;
  colLineTotal: string;
  unitPrice: (price: string) => string;
  paymentsTitle: string;
  paymentsSubtitle: (count: number) => string;
  colPaymentDate: string;
  colPaymentAmount: string;
  totalPaid: string;
  summaryTitle: string;
  outstandingBalance: string;
  balancePaid: string;
  paidInFullTitle: string;
  invoiceTotalLine: (total: string) => string;
  allPaymentsReceived: string;
  collectedRemaining: (pctLabel: string, remaining: string) => string;
  paidProgress: (pctLabel: string, paid: string, total: string) => string;
  breakdownTitle: string;
  colBreakdownItem: string;
  colBreakdownAmount: string;
  subtotal: string;
  taxableAmount: string;
  vat: (rate: number) => string;
  invoiceTotal: string;
  totalPaidRow: string;
  amountOutstanding: string;
  collectedLabel: string;
  footerPkp: string;
  footerNonPkp: string;
  tabDetails: string;
  tabPayments: string;
  tabSummary: string;
  brandTagline: string;
  headerInvoiceNo: string;
  footerPage: (page: number, total: number) => string;
};

export function buildInvoiceLabels(isPkp: boolean): InvoicePdfLabels {
  return {
    documentTitle: isPkp ? 'Tax Invoice' : 'Invoice',
    documentSubtitle: isPkp
      ? 'Official tax invoice from a PKP-registered seller'
      : 'For your records — not a tax invoice (faktur pajak)',
    invoiceNumber: 'Invoice number',
    invoiceDate: 'Invoice date',
    paymentDue: 'Payment due',
    paymentDueFallback: 'Upon receipt',
    paymentTerms: 'Payment terms',
    orderReference: 'Order reference',
    seller: 'From',
    buyer: 'Bill to',
    productsSection: 'Line items',
    productsCount: (count) =>
      count === 1 ? '1 item' : `${count} items`,
    colIndex: 'No.',
    colDescription: 'Description',
    colQuantity: 'Quantity',
    colLineTotal: 'Amount (Rp)',
    unitPrice: (price) => `@ ${price} each`,
    paymentsTitle: 'Payment history',
    paymentsSubtitle: (count) =>
      count === 1 ? '1 payment recorded' : `${count} payments recorded`,
    colPaymentDate: 'Date paid',
    colPaymentAmount: 'Amount (Rp)',
    totalPaid: 'Total paid',
    summaryTitle: 'Payment summary',
    outstandingBalance: 'Amount due',
    balancePaid: 'Nothing due — paid in full',
    paidInFullTitle: 'Paid in full',
    invoiceTotalLine: (total) => `${total} invoice total`,
    allPaymentsReceived: 'All payments received',
    collectedRemaining: (pctLabel, remaining) =>
      `${pctLabel}% collected · ${remaining} remaining`,
    paidProgress: (pctLabel, paid, total) =>
      `${paid} of ${total} collected (${pctLabel}%)`,
    breakdownTitle: 'Amount breakdown',
    colBreakdownItem: 'Description',
    colBreakdownAmount: 'Amount (Rp)',
    subtotal: 'Subtotal',
    taxableAmount: 'Taxable amount (DPP)',
    vat: (rate) => `VAT / PPN (${rate}%)`,
    invoiceTotal: 'Invoice total',
    totalPaidRow: 'Total paid',
    amountOutstanding: 'Amount due',
    collectedLabel: 'Collected',
    footerPkp:
      'PKP tax invoice — export e-Faktur CSV/XML from UMKM Hub for Coretax filing.',
    footerNonPkp:
      'Commercial invoice for business records — not a tax invoice.',
    tabDetails: 'Details',
    tabPayments: 'Payments',
    tabSummary: 'Summary',
    brandTagline: 'Invoicing & payments',
    headerInvoiceNo: 'Invoice no.',
    footerPage: (page, total) => `Page ${page} of ${total}`,
  };
}
