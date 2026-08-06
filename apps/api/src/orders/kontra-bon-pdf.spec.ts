import {
  buildKontraBonPdf,
  formatKontraBonStockSummary,
} from './kontra-bon-pdf';
import { formatInvoiceQuantityLines } from './invoice-line-display';

function lineItem(input: {
  description: string;
  packCount: number;
  packSize?: number;
  unit?: string;
  unitPrice: number;
  lineTotal: number;
}) {
  const unit = input.unit ?? 'PCS';
  const packSize = input.packSize ?? 1;
  const productQty = input.packCount * packSize;
  const qty = formatInvoiceQuantityLines({
    packCount: input.packCount,
    packSizeSnapshot: packSize,
    productQty,
    unit,
  });
  return {
    description: input.description,
    quantityPacks: qty.packs,
    quantityPackSize: qty.packSize,
    packCount: input.packCount,
    productQty,
    unit,
    unitPrice: input.unitPrice,
    lineTotal: input.lineTotal,
  };
}

function countPdfPages(buffer: Buffer): number {
  return buffer.toString('latin1').match(/\/Type\s*\/Page\b/g)?.length ?? 0;
}

describe('kontra-bon-pdf', () => {
  it('builds a two-page PDF: summary then details', async () => {
    const buffer = await buildKontraBonPdf({
      documentNumber: 'KB-26-Jul-2026-Ref-ABCD1234',
      documentDate: '2026-07-26',
      dueDate: '2026-08-25',
      seller: {
        name: 'Toko Sumber Rejeki Demo',
        address: 'Jl. Sudirman Kav. 52-53, Jakarta Pusat',
        phone: '+62 812 3456 7890',
      },
      buyer: {
        name: 'Siti Aminah',
        company: 'Warung Sederhana',
        address: 'Jl. Melati No. 12, Bandung',
      },
      orderReference: '2026_07_26_abcd1234-eeee-ffff-aaaa-bbbbbbbbbbbb',
      paymentTerms: 'KONTRA_BON',
      lineItems: [
        lineItem({
          description: 'Product A',
          packCount: 10,
          unitPrice: 25000,
          lineTotal: 250000,
        }),
      ],
      lineTotal: 250000,
      discountLabel: 'Discount',
      discountAmount: 0,
      amountDue: 250000,
    });

    expect(buffer.length).toBeGreaterThan(500);
    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
    expect(countPdfPages(buffer)).toBe(2);
  });

  it('renders discount and multiple lines across summary + details pages', async () => {
    const buffer = await buildKontraBonPdf({
      documentNumber: 'KB-TEST-MULTI',
      documentDate: '2026-08-06',
      dueDate: null,
      seller: {
        name: 'Demo Seller',
        address: 'Jakarta',
        phone: '',
      },
      buyer: {
        name: 'Buyer',
        company: '',
        address: '',
      },
      orderReference: 'ORD-1',
      paymentTerms: 'KONTRA_BON',
      lineItems: [
        lineItem({
          description: 'Kaki Ayam',
          packCount: 20,
          packSize: 500,
          unit: 'GRAM',
          unitPrice: 45000,
          lineTotal: 900000,
        }),
        lineItem({
          description: 'Minyak Goreng',
          packCount: 5,
          packSize: 1000,
          unit: 'ML',
          unitPrice: 30000,
          lineTotal: 150000,
        }),
      ],
      lineTotal: 1050000,
      discountLabel: 'Discount (10%)',
      discountAmount: 105000,
      amountDue: 945000,
    });

    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
    expect(buffer.length).toBeGreaterThan(800);
    expect(countPdfPages(buffer)).toBeGreaterThanOrEqual(2);
  });

  it('formats aggregated stock summary for page 1', () => {
    expect(
      formatKontraBonStockSummary([
        lineItem({
          description: 'A',
          packCount: 10,
          unitPrice: 1,
          lineTotal: 1,
        }),
        lineItem({
          description: 'B',
          packCount: 5,
          unitPrice: 1,
          lineTotal: 1,
        }),
      ]),
    ).toMatch(/15/);
  });
});
