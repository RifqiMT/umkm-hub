/**
 * Generate a sample invoice PDF for visual inspection.
 * Usage: npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/preview-invoice-pdf.ts
 */
import * as fs from 'fs';
import * as path from 'path';
import { buildInvoicePdf, INVOICE_PDF_TEMPLATE_VERSION } from '../src/orders/invoice-pdf';
import { computeFiscalBreakdown } from '../src/orders/fiscal-invoice';
import { formatInvoiceQuantityLines } from '../src/orders/invoice-line-display';
import { reconcileInvoicePaymentTotals } from '../src/orders/invoice-totals';

function pdfLineItem(input: {
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
    quantityLabel: qty.packs,
    quantityPacks: qty.packs,
    quantityPackSize: qty.packSize,
    unitPrice: input.unitPrice,
    lineTotal: input.lineTotal,
  };
}

async function main() {
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
    invoiceNumber: 'INV-20301230-4FBD91DC',
    invoiceDate: '2030-12-30',
    dueDate: '2031-01-30',
    seller: {
      name: 'Toko Sumber Rejeki Demo',
      address: 'Jl. Sudirman Kav. 52-53, Jakarta Pusat 12190',
      phone: '+62 812 3456 7890',
      npwp: '01.234.567.8-901.000',
      email: 'demo@umkmhub.test',
    },
    buyer: {
      name: 'Siti Aminah',
      company: 'Warung Sederhana',
      address: 'Jl. Melati No. 12, Bandung, Jawa Barat',
      npwp: '98.765.432.1-098.765',
    },
    orderReference: '2030_12_30_4fbd91dc-c86b-4e1c-a5c8-105028f6ae8a',
    paymentTerms: 'CONSIGNMENT',
    collectionStatus: 'PARTIALLY PAID',
    lineItems: [
      pdfLineItem({
        description: 'Kaki Ayam',
        packCount: 62_720_000,
        packSize: 500,
        unit: 'GRAM',
        unitPrice: 45_000,
        lineTotal: 2_820_000_000_000,
      }),
      pdfLineItem({
        description: 'Minyak Goreng',
        packCount: 51_970_000,
        packSize: 100,
        unit: 'LITER',
        unitPrice: 180_000,
        lineTotal: 9_354_600_000_000,
      }),
      pdfLineItem({
        description: 'Daging Kambing Tenderloin (1000)',
        packCount: 55_220_000,
        packSize: 1000,
        unit: 'GRAM',
        unitPrice: 188_000,
        lineTotal: 10_381_360_000_000,
      }),
      pdfLineItem({
        description: 'Daging Kambing Giling (1000)',
        packCount: 43_070_000,
        packSize: 1000,
        unit: 'GRAM',
        unitPrice: 115_000,
        lineTotal: 4_953_050_000_000,
      }),
      pdfLineItem({
        description: 'Karkas Ayam (500)',
        packCount: 69_170_000,
        packSize: 500,
        unit: 'GRAM',
        unitPrice: 45_000,
        lineTotal: 3_112_650_000_000,
      }),
    ],
    lineTotal: 22_089_988_740_000,
    discountLabel: 'Discount (2.89%)',
    discountAmount: 640_000_000_000,
    fiscal,
    paidAmount: paymentTotals.paidAmount,
    remainingAmount: paymentTotals.remainingAmount,
    payments,
  });

  const out = path.join(__dirname, '..', 'invoice-preview.pdf');
  fs.writeFileSync(out, buffer);
  console.log(`Wrote ${out} (${buffer.length} bytes) template=${INVOICE_PDF_TEMPLATE_VERSION}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
