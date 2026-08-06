/**
 * Generate a sample Kontra bon PDF for visual inspection.
 * Usage: npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/preview-kontra-bon-pdf.ts
 */
import * as fs from 'fs';
import * as path from 'path';
import {
  buildKontraBonPdf,
  KONTRA_BON_PDF_TEMPLATE_VERSION,
} from '../src/orders/kontra-bon-pdf';
import { formatInvoiceQuantityLines } from '../src/orders/invoice-line-display';

function pdfLineItem(input: {
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

async function main() {
  const buffer = await buildKontraBonPdf({
    documentNumber: 'KB-6-Aug-2026-Ref-4FBD91DC',
    documentDate: '2026-08-06',
    dueDate: '2026-09-05',
    seller: {
      name: 'Toko Sumber Rejeki Demo',
      address: 'Jl. Sudirman Kav. 52-53, Jakarta Pusat 12190',
      phone: '+62 812 3456 7890',
    },
    buyer: {
      name: 'Siti Aminah',
      company: 'Warung Sederhana',
      address: 'Jl. Melati No. 12, Bandung, Jawa Barat',
    },
    orderReference: '2026_08_06_4fbd91dc-c86b-4e1c-a5c8-105028f6ae8a',
    paymentTerms: 'KONTRA_BON',
    lineItems: [
      pdfLineItem({
        description: 'Kaki Ayam',
        packCount: 20,
        packSize: 500,
        unit: 'GRAM',
        unitPrice: 45000,
        lineTotal: 900000,
      }),
      pdfLineItem({
        description: 'Minyak Goreng',
        packCount: 5,
        packSize: 1000,
        unit: 'ML',
        unitPrice: 30000,
        lineTotal: 150000,
      }),
    ],
    lineTotal: 1050000,
    discountLabel: 'Discount (5%)',
    discountAmount: 52500,
    amountDue: 997500,
  });

  const outDir = path.join(__dirname, '..', 'tmp');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'preview-kontra-bon.pdf');
  fs.writeFileSync(outPath, buffer);
  console.log(
    `Wrote ${outPath} (${buffer.length} bytes, template ${KONTRA_BON_PDF_TEMPLATE_VERSION})`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
