import { buildInvoicePdf, resolveInvoicePaymentState } from './invoice-pdf';
import { computeFiscalBreakdown } from './fiscal-invoice';
import { formatInvoiceQuantityLines } from './invoice-line-display';
import { reconcileInvoicePaymentTotals } from './invoice-totals';

function countPdfPages(buffer: Buffer): number {
  return buffer.toString('latin1').match(/\/Type\s*\/Page\b/g)?.length ?? 0;
}

function lineItem(input: {
  description: string;
  packCount: number;
  packSize?: number;
  unit?: string;
  unitPrice: number;
  lineTotal: number;
}) {
  const qty = formatInvoiceQuantityLines({
    packCount: input.packCount,
    packSizeSnapshot: input.packSize ?? 1,
    unit: input.unit ?? 'PCS',
  });
  return {
    description: input.description,
    quantityLabel: `${input.packCount} pcs`,
    quantityPacks: qty.packs,
    quantityPackSize: qty.packSize,
    unitPrice: input.unitPrice,
    lineTotal: input.lineTotal,
  };
}

const baseDoc = {
  invoiceNumber: 'INV-TEST-1',
  invoiceDate: '2026-07-31',
  dueDate: '2026-08-30',
  seller: {
    name: 'Toko Sumber Rejeki Demo',
    address: 'Jl. Sudirman Kav. 52-53, Jakarta Pusat',
    phone: '+62 812 3456 7890',
    npwp: '01.234.567.8-901.000',
    email: 'seller@example.com',
  },
  buyer: {
    name: 'Siti Aminah',
    company: 'Warung Sederhana',
    address: 'Jl. Melati No. 12, Bandung',
    npwp: '98.765.432.1-098.765',
  },
  orderReference: '2026_07_31_ABCD1234',
  paymentTerms: 'DELAYED PAYMENT',
  collectionStatus: 'PARTIALLY PAID',
  lineTotal: 250000,
  discountLabel: 'Discount',
  discountAmount: 0,
  paidAmount: 100000,
  remainingAmount: 150000,
  payments: [{ date: '2026-07-31', amount: 100000 }],
};

describe('invoice-pdf', () => {
  it('builds a non-empty PDF buffer', async () => {
    const fiscal = computeFiscalBreakdown({
      orderTotal: 250000,
      isPkp: false,
      ppnPercent: 11,
      taxInclusive: false,
    });
    const buffer = await buildInvoicePdf({
      ...baseDoc,
      lineItems: [
        lineItem({
          description: 'Product A',
          packCount: 10,
          unitPrice: 25000,
          lineTotal: 250000,
        }),
      ],
      fiscal,
    });

    expect(buffer.length).toBeGreaterThan(500);
    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
  });

  it('renders PKP invoice with large pack quantities and totals', async () => {
    const fiscal = computeFiscalBreakdown({
      orderTotal: 2_107_247_967_865_812,
      isPkp: true,
      ppnPercent: 11,
      taxInclusive: false,
    });
    const payments = [
      { date: '2031-01-25', amount: 666_132_642_130 },
      { date: '2031-02-13', amount: 1_751_354_579_996 },
    ];
    const paymentTotals = reconcileInvoicePaymentTotals({ fiscal, installments: payments });
    const buffer = await buildInvoicePdf({
      ...baseDoc,
      invoiceNumber: 'INV-20301230-4FBD91DC',
      lineTotal: 22_089_988_740_000,
      discountLabel: 'Discount (2.89%)',
      discountAmount: 640_000_000_000,
      fiscal,
      paidAmount: paymentTotals.paidAmount,
      remainingAmount: paymentTotals.remainingAmount,
      payments,
      lineItems: [
        lineItem({
          description: 'Kaki Ayam',
          packCount: 51_792_787,
          packSize: 500,
          unit: 'GRAM',
          unitPrice: 65_000,
          lineTotal: 3_366_531_155_000,
        }),
        lineItem({
          description: 'Minyak Goreng',
          packCount: 42_610_000,
          packSize: 1000,
          unit: 'LITER',
          unitPrice: 180_000,
          lineTotal: 5_964_740_320_000,
        }),
      ],
    });

    const text = buffer.toString('latin1');
    expect(text).not.toMatch(/Rp\s[\d.,]+\sT/);
    expect(buffer.length).toBeGreaterThan(1500);
    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
  });

  it('puts payment history and summary on dedicated pages', async () => {
    const fiscal = computeFiscalBreakdown({
      orderTotal: 250000,
      isPkp: false,
      ppnPercent: 11,
      taxInclusive: false,
    });
    const buffer = await buildInvoicePdf({
      ...baseDoc,
      lineItems: [
        lineItem({
          description: 'Product A',
          packCount: 10,
          unitPrice: 25000,
          lineTotal: 250000,
        }),
      ],
      fiscal,
      payments: [
        { date: '2026-07-31', amount: 100000 },
        { date: '2026-08-15', amount: 50000 },
      ],
    });

    expect(countPdfPages(buffer)).toBe(3);
  });

  it('uses a dedicated summary page when there are no payments', async () => {
    const fiscal = computeFiscalBreakdown({
      orderTotal: 250000,
      isPkp: false,
      ppnPercent: 11,
      taxInclusive: false,
    });
    const buffer = await buildInvoicePdf({
      ...baseDoc,
      lineItems: [
        lineItem({
          description: 'Product A',
          packCount: 10,
          unitPrice: 25000,
          lineTotal: 250000,
        }),
      ],
      fiscal,
      payments: [],
    });

    expect(countPdfPages(buffer)).toBe(2);
  });

  it('paginates long line-item lists', async () => {
    const fiscal = computeFiscalBreakdown({
      orderTotal: 500000,
      isPkp: false,
      ppnPercent: 11,
      taxInclusive: false,
    });
    const lineItems = Array.from({ length: 28 }, (_, i) =>
      lineItem({
        description: `Catalog SKU ${i + 1} — extended product name for wrap testing`,
        packCount: i + 1,
        unitPrice: 10000,
        lineTotal: (i + 1) * 10000,
      }),
    );
    const buffer = await buildInvoicePdf({
      ...baseDoc,
      lineItems,
      lineTotal: 500000,
      fiscal,
      payments: [],
    });

    expect(buffer.length).toBeGreaterThan(3000);
  });

  it('does not show internal template metadata on the page', async () => {
    const fiscal = computeFiscalBreakdown({
      orderTotal: 250000,
      isPkp: false,
      ppnPercent: 11,
      taxInclusive: false,
    });
    const buffer = await buildInvoicePdf({
      ...baseDoc,
      lineItems: [
        lineItem({
          description: 'Product A',
          packCount: 10,
          unitPrice: 25000,
          lineTotal: 250000,
        }),
      ],
      fiscal,
    });

    const text = buffer.toString('latin1');
    expect(text).not.toContain('PDF template');
  });

  it('derives paid-in-full display state from totals when order status is stale', () => {
    const fiscal = computeFiscalBreakdown({
      orderTotal: 250000,
      isPkp: false,
      ppnPercent: 11,
      taxInclusive: false,
    });
    const state = resolveInvoicePaymentState({
      ...baseDoc,
      collectionStatus: 'PARTIALLY PAID',
      paidAmount: fiscal.total,
      remainingAmount: 150000,
      fiscal,
      lineItems: [],
    });

    expect(state.paidInFull).toBe(true);
    expect(state.statusKey).toBe('PAID');
    expect(state.remainingAmount).toBe(0);
  });

  it('treats sub-rupiah remainder as paid in full', () => {
    const fiscal = computeFiscalBreakdown({
      orderTotal: 250000,
      isPkp: false,
      ppnPercent: 11,
      taxInclusive: false,
    });
    const state = resolveInvoicePaymentState({
      ...baseDoc,
      collectionStatus: 'PARTIALLY PAID',
      paidAmount: fiscal.total - 0.5,
      remainingAmount: 0.5,
      fiscal,
      lineItems: [],
    });

    expect(state.paidInFull).toBe(true);
    expect(state.statusKey).toBe('PAID');
    expect(state.remainingAmount).toBe(0);
  });

  it('builds a summary PDF for fully collected invoices', async () => {
    const fiscal = computeFiscalBreakdown({
      orderTotal: 250000,
      isPkp: false,
      ppnPercent: 11,
      taxInclusive: false,
    });
    const buffer = await buildInvoicePdf({
      ...baseDoc,
      collectionStatus: 'PARTIALLY PAID',
      paidAmount: fiscal.total,
      remainingAmount: 0,
      fiscal,
      lineItems: [
        lineItem({
          description: 'Product A',
          packCount: 10,
          unitPrice: 25000,
          lineTotal: 250000,
        }),
      ],
      payments: [{ date: '2026-07-31', amount: fiscal.total }],
    });

    expect(buffer.length).toBeGreaterThan(500);
    expect(resolveInvoicePaymentState({
      ...baseDoc,
      collectionStatus: 'PARTIALLY PAID',
      paidAmount: fiscal.total,
      remainingAmount: 0,
      fiscal,
      lineItems: [],
    }).statusKey).toBe('PAID');
  });
});
