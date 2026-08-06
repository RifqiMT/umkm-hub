import PDFDocument from 'pdfkit';
import { formatOrderReferenceBrief } from './invoice-order-reference';
import { formatQtyFull } from './invoice-line-display';
import {
  buildKontraBonLabels,
  type KontraBonPdfLabels,
} from './kontra-bon-pdf-labels';
import {
  PdfColor as C,
  PdfPage,
  PdfPageFooterH,
  PdfTable as T,
  Space,
  PdfType,
  type PdfPageBox as PageBox,
  pdfDrawChrome,
  pdfDrawFooterBar,
  pdfDrawMetaChips,
  pdfDrawSectionTitle,
  pdfDrawText as drawText,
  pdfFillRect as fillRect,
  pdfFillRoundRect as fillRoundRect,
  pdfFormatDate as formatDate,
  pdfMoney as money,
  pdfPageBox,
  pdfStrokeDashedLine as strokeDashedLine,
  pdfStrokeHLine as strokeHLine,
  pdfStrokeRoundRect as strokeRoundRect,
  pdfVCenter as vCenterY,
} from './pdf-theme';

export const KONTRA_BON_PDF_TEMPLATE_VERSION = '2026-08-06-v6';

export type KontraBonLineItem = {
  description: string;
  quantityPacks: string;
  quantityPackSize: string;
  /** Packs ordered (for stock aggregation). */
  packCount: number;
  /** Stock units drawn (packs × pack size). */
  productQty: number;
  unit: string;
  unitPrice: number;
  lineTotal: number;
};

export type KontraBonDocumentData = {
  documentNumber: string;
  documentDate: string;
  dueDate?: string | null;
  seller: {
    name: string;
    address: string;
    phone: string;
  };
  buyer: {
    name: string;
    company: string;
    address: string;
  };
  orderReference: string;
  paymentTerms: string;
  lineItems: KontraBonLineItem[];
  lineTotal: number;
  discountLabel: string;
  discountAmount: number;
  amountDue: number;
};

type DueState = { label: string; bg: string; fg: string };

function daysUntilDue(dueIso: string | null | undefined): number | null {
  if (!dueIso) return null;
  const due = new Date(`${dueIso.slice(0, 10)}T00:00:00.000Z`);
  if (Number.isNaN(due.getTime())) return null;
  const today = new Date();
  const todayUtc = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
  );
  return Math.round((due.getTime() - todayUtc) / 86_400_000);
}

function resolveDueState(
  data: KontraBonDocumentData,
  labels: KontraBonPdfLabels,
): DueState {
  const days = daysUntilDue(data.dueDate);
  if (days != null && days < 0) {
    return { label: labels.statusOverdue, bg: C.dangerSoft, fg: C.danger };
  }
  if (days != null && days <= 14) {
    return { label: labels.statusDue, bg: C.warnSoft, fg: C.warn };
  }
  return { label: labels.statusOpen, bg: C.brandSoft, fg: C.brandDeep };
}

function unitSuffix(unit: string): string {
  const u = unit.toUpperCase();
  if (u === 'LITER') return 'L';
  if (u === 'GRAM') return 'g';
  if (u === 'ML') return 'ml';
  return 'pcs';
}

/** Aggregate stock label for the page-1 summary table. */
export function formatKontraBonStockSummary(
  items: KontraBonLineItem[],
): string {
  if (items.length === 0) return '—';

  const totalPacks = items.reduce(
    (sum, row) => sum + (Number(row.packCount) || 0),
    0,
  );
  const packsLabel = `${formatQtyFull(totalPacks)} ${
    totalPacks === 1 ? 'pack' : 'packs'
  }`;

  const byUnit = new Map<string, number>();
  for (const row of items) {
    const key = unitSuffix(row.unit || 'PCS');
    byUnit.set(key, (byUnit.get(key) ?? 0) + (Number(row.productQty) || 0));
  }

  const unitParts = [...byUnit.entries()]
    .filter(([, qty]) => qty > 0)
    .map(([suffix, qty]) => `${formatQtyFull(qty)} ${suffix}`);

  if (unitParts.length === 0) return packsLabel;
  if (
    unitParts.length === 1 &&
    unitParts[0]!.endsWith(' pcs') &&
    totalPacks === items.reduce((s, r) => s + (Number(r.productQty) || 0), 0)
  ) {
    return unitParts[0]!;
  }
  return `${packsLabel} · ${unitParts.join(' · ')}`;
}

function pageBox(doc: PDFKit.PDFDocument): PageBox {
  return pdfPageBox(doc);
}

function drawChrome(
  doc: PDFKit.PDFDocument,
  box: PageBox,
  data: KontraBonDocumentData,
  labels: KontraBonPdfLabels,
  pageLabel?: string,
) {
  pdfDrawChrome(doc, box, {
    tagline: labels.brandTagline,
    rightLabel: labels.headerDocNo,
    rightValue: data.documentNumber,
    centerPill: pageLabel,
  });
}

function drawHero(
  doc: PDFKit.PDFDocument,
  box: PageBox,
  data: KontraBonDocumentData,
  labels: KontraBonPdfLabels,
): number {
  let y = box.top;
  const due = resolveDueState(data, labels);

  drawText(doc, labels.documentTitle, box.left, y, box.width * 0.58, {
    font: 'Helvetica-Bold',
    size: PdfType.display,
    color: C.ink,
  });

  const pillW = Math.max(72, due.label.length * 5.4 + 20);
  fillRoundRect(doc, box.right - pillW, y + Space.xs, pillW, 20, 10, due.bg);
  drawText(doc, due.label, box.right - pillW, y + Space.sm + 1, pillW, {
    font: 'Helvetica-Bold',
    size: PdfType.caption,
    color: due.fg,
    align: 'center',
  });

  y += Space.xxxl;
  drawText(doc, labels.documentSubtitle, box.left, y, box.width * 0.92, {
    size: PdfType.caption,
    color: C.muted,
  });
  y += Space.xl;

  return pdfDrawMetaChips(doc, box, y, [
    { label: labels.issued, value: formatDate(data.documentDate) },
    {
      label: labels.paymentDue,
      value: data.dueDate ? formatDate(data.dueDate) : labels.paymentDueFallback,
    },
    {
      label: labels.orderReference,
      value: formatOrderReferenceBrief(data.orderReference),
    },
  ]);
}

function drawParties(
  doc: PDFKit.PDFDocument,
  box: PageBox,
  y: number,
  data: KontraBonDocumentData,
  labels: KontraBonPdfLabels,
): number {
  const pad = Space.lg;
  const gap = Space.xxl;
  const colW = (box.width - pad * 2 - gap) / 2;
  const leftX = box.left + pad;
  const rightX = leftX + colW + gap;

  const sellerLines = [
    data.seller.name,
    data.seller.address,
    data.seller.phone,
  ].filter((l) => l.trim());

  const buyerName =
    data.buyer.company.trim() || data.buyer.name.trim() || 'Customer';
  const buyerLines = [
    buyerName,
    data.buyer.company && data.buyer.name !== buyerName ? data.buyer.name : '',
    data.buyer.address,
  ].filter((l) => l.trim());

  doc.font('Helvetica').fontSize(PdfType.bodySm);
  const measure = (lines: string[]) => {
    let h = Space.xl;
    lines.forEach((line, i) => {
      const size = i === 0 ? 10.5 : PdfType.bodySm;
      doc.font(i === 0 ? 'Helvetica-Bold' : 'Helvetica').fontSize(size);
      h += doc.heightOfString(line, { width: colW }) + (i === 0 ? Space.sm : Space.xs + 1);
    });
    return h;
  };

  const cardH =
    pad * 2 + Math.max(measure(sellerLines), measure(buyerLines), 52);

  fillRoundRect(doc, box.left, y, box.width, cardH, PdfPage.radius, C.white);
  strokeRoundRect(doc, box.left, y, box.width, cardH, PdfPage.radius, C.line);
  fillRect(doc, box.left, y + Space.md, PdfPage.accentRail, cardH - Space.xl, C.brand);

  const midX = box.left + box.width / 2;
  doc
    .moveTo(midX, y + Space.md)
    .lineTo(midX, y + cardH - Space.md)
    .strokeColor(C.line)
    .lineWidth(0.5)
    .stroke();

  const drawCol = (x: number, title: string, lines: string[]) => {
    drawText(doc, title.toUpperCase(), x, y + pad, colW, {
      font: 'Helvetica-Bold',
      size: PdfType.label,
      color: C.brandDeep,
    });
    let ly = y + pad + Space.md + 2;
    lines.forEach((line, i) => {
      const lh = drawText(doc, line, x, ly, colW, {
        font: i === 0 ? 'Helvetica-Bold' : 'Helvetica',
        size: i === 0 ? 10.5 : PdfType.bodySm,
        color: i === 0 ? C.ink : C.subtext,
        wrap: true,
        maxHeight: 28,
      });
      ly += Math.min(lh, 28) + (i === 0 ? Space.sm : Space.xs + 1);
    });
  };

  drawCol(leftX, labels.seller, sellerLines);
  drawCol(rightX, labels.buyer, buyerLines);

  return y + cardH + Space.xl;
}

/** Page 1 — three-column summary: products · stocks · amount */
function drawSummaryTable(
  doc: PDFKit.PDFDocument,
  box: PageBox,
  y: number,
  data: KontraBonDocumentData,
  labels: KontraBonPdfLabels,
): number {
  y = pdfDrawSectionTitle(
    doc,
    box,
    y,
    labels.summarySection,
    labels.summaryHint,
  );

  const headH = T.headH;
  const rowH = 56;
  const colW = box.width / 3;

  fillRect(doc, box.left, y, box.width, headH, C.brandDeep);
  const headers = [labels.colProducts, labels.colStocks, labels.colAmount];
  headers.forEach((h, i) => {
    drawText(
      doc,
      h,
      box.left + i * colW + Space.md,
      vCenterY(y, headH, PdfType.caption),
      colW - Space.xl,
      {
        font: 'Helvetica-Bold',
        size: PdfType.caption,
        color: C.white,
        align: i === 2 ? 'right' : 'left',
      },
    );
  });
  y += headH;

  fillRect(doc, box.left, y, box.width, rowH, C.surface);
  strokeHLine(doc, box.left, box.right, y + rowH, C.line);

  const products = labels.productsCount(data.lineItems.length);
  const stocks = formatKontraBonStockSummary(data.lineItems);
  const amount = money(data.amountDue);

  drawText(doc, products, box.left + Space.md, y + Space.xl, colW - Space.xl, {
    font: 'Helvetica-Bold',
    size: PdfType.section,
    color: C.ink,
  });
  drawText(doc, stocks, box.left + colW + Space.md, y + Space.lg, colW - Space.xl, {
    font: 'Helvetica-Bold',
    size: PdfType.body,
    color: C.ink,
    wrap: true,
    maxHeight: 32,
  });
  drawText(doc, amount, box.left + colW * 2 + Space.md, y + Space.xl, colW - Space.xl, {
    font: 'Helvetica-Bold',
    size: PdfType.section,
    color: C.brandDeep,
    align: 'right',
    minSize: 8,
  });

  y += rowH + Space.md;
  drawText(doc, labels.seeDetails, box.left, y, box.width, {
    size: PdfType.caption,
    color: C.subtext,
  });
  return y + Space.xl;
}

function drawClosing(
  doc: PDFKit.PDFDocument,
  box: PageBox,
  y: number,
  data: KontraBonDocumentData,
  labels: KontraBonPdfLabels,
): number {
  const dueText = data.dueDate ? formatDate(data.dueDate) : '';
  const body = labels.acknowledgmentBody(money(data.amountDue), dueText);

  drawText(doc, labels.acknowledgment, box.left, y, box.width, {
    font: 'Helvetica-Bold',
    size: 10,
    color: C.ink,
  });
  y += Space.md + 2;
  const h = drawText(doc, body, box.left, y, box.width, {
    size: PdfType.bodySm,
    color: C.muted,
    wrap: true,
  });
  y += h + Space.xxl;

  const gap = Space.xxxl;
  const colW = (box.width - gap) / 2;
  const sign = (x: number, title: string) => {
    drawText(doc, title.toUpperCase(), x, y, colW, {
      font: 'Helvetica-Bold',
      size: PdfType.label,
      color: C.label,
    });
    strokeDashedLine(doc, x, x + colW, y + Space.xxxl + Space.xl, C.brandLine);
    drawText(doc, labels.signHint, x, y + Space.xxxl + Space.xl + Space.sm, colW, {
      size: 7,
      color: C.subtext,
    });
  };
  sign(box.left, labels.sellerSign);
  sign(box.left + colW + gap, labels.buyerSign);
  return y + Space.xxxl + Space.xxxl + Space.md;
}

function detailsTableLayout(box: PageBox) {
  const innerLeft = box.left + T.cellPadX;
  const innerRight = box.right - T.cellPadX;
  const innerW = innerRight - innerLeft;
  const indexW = 20;
  const amountW = Math.max(78, Math.round(innerW * 0.2));
  const priceW = Math.max(72, Math.round(innerW * 0.18));
  const qtyW = Math.max(70, Math.round(innerW * 0.18));
  const amountX = innerRight - amountW;
  const priceX = amountX - T.colGap - priceW;
  const qtyX = priceX - T.colGap - qtyW;
  const indexX = innerLeft;
  const descX = indexX + indexW + T.colGap;
  const descW = Math.max(80, qtyX - T.colGap - descX);
  return { indexX, indexW, descX, descW, qtyX, qtyW, priceX, priceW, amountX, amountW };
}

function measureDetailRowH(item: KontraBonLineItem): number {
  const hasPack = Boolean(item.quantityPackSize?.trim());
  return Math.max(
    T.rowMinH,
    T.rowPadY * 2 + T.bodySize + (hasPack ? T.rowLineGap + T.subSize : 0),
  );
}

function drawDetailsPage(
  doc: PDFKit.PDFDocument,
  data: KontraBonDocumentData,
  labels: KontraBonPdfLabels,
) {
  doc.addPage();
  let box = pageBox(doc);
  drawChrome(doc, box, data, labels, labels.continued);

  let y = box.top;
  drawText(doc, labels.detailsTitle, box.left, y, box.width * 0.55, {
    font: 'Helvetica-Bold',
    size: PdfType.title,
    color: C.ink,
  });
  drawText(doc, labels.detailsSubtitle, box.left + box.width * 0.4, y + Space.xs + 1, box.width * 0.6, {
    size: PdfType.caption,
    color: C.subtext,
    align: 'right',
  });
  y += Space.xxl;

  let cols = detailsTableLayout(box);
  const drawHeader = () => {
    fillRect(doc, box.left, y, box.width, T.headH, C.brandDeep);
    const hy = vCenterY(y, T.headH, T.headSize);
    const cells: Array<{
      t: string;
      x: number;
      w: number;
      align?: 'left' | 'right' | 'center';
    }> = [
      { t: labels.colIndex, x: cols.indexX, w: cols.indexW, align: 'center' },
      { t: labels.colItem, x: cols.descX, w: cols.descW },
      { t: labels.colQty, x: cols.qtyX, w: cols.qtyW, align: 'right' },
      { t: labels.colUnitPrice, x: cols.priceX, w: cols.priceW, align: 'right' },
      { t: labels.colLineAmount, x: cols.amountX, w: cols.amountW, align: 'right' },
    ];
    cells.forEach((c) => {
      drawText(doc, c.t, c.x, hy, c.w, {
        font: 'Helvetica-Bold',
        size: T.headSize,
        color: C.white,
        align: c.align ?? 'left',
      });
    });
    y += T.headH;
  };

  drawHeader();

  data.lineItems.forEach((item, i) => {
    const rowH = measureDetailRowH(item);
    if (y + rowH > box.bottom - 140) {
      doc.addPage();
      box = pageBox(doc);
      drawChrome(doc, box, data, labels, labels.continued);
      y = box.top;
      cols = detailsTableLayout(box);
      drawText(doc, labels.detailsTitle, box.left, y, box.width, {
        font: 'Helvetica-Bold',
        size: PdfType.section,
        color: C.ink,
      });
      y += Space.lg;
      drawHeader();
    }

    if (i % 2 === 1) fillRect(doc, box.left, y, box.width, rowH, C.surface);
    const ty = y + T.rowPadY;
    drawText(doc, String(i + 1), cols.indexX, ty, cols.indexW, {
      size: T.bodySize,
      color: C.label,
      align: 'center',
    });
    drawText(doc, item.description, cols.descX, ty, cols.descW, {
      font: 'Helvetica-Bold',
      size: T.bodySize,
      color: C.ink,
      minSize: 7,
    });
    drawText(doc, item.quantityPacks, cols.qtyX, ty, cols.qtyW, {
      size: T.bodySize,
      color: C.ink,
      align: 'right',
    });
    if (item.quantityPackSize?.trim()) {
      drawText(
        doc,
        item.quantityPackSize,
        cols.qtyX,
        ty + T.bodySize + T.rowLineGap,
        cols.qtyW,
        { size: T.subSize, color: C.subtext, align: 'right' },
      );
    }
    drawText(doc, money(item.unitPrice), cols.priceX, ty, cols.priceW, {
      size: T.bodySize,
      color: C.ink,
      align: 'right',
      minSize: 6,
    });
    drawText(doc, money(item.lineTotal), cols.amountX, ty, cols.amountW, {
      font: 'Helvetica-Bold',
      size: T.bodySize,
      color: C.ink,
      align: 'right',
      minSize: 6,
    });
    strokeHLine(doc, box.left, box.right, y + rowH, C.line);
    y += rowH;
  });

  if (y + 120 > box.bottom) {
    doc.addPage();
    box = pageBox(doc);
    drawChrome(doc, box, data, labels, labels.continued);
    y = box.top;
  }

  y += Space.xl;
  drawText(doc, labels.calculationTitle, box.left, y, box.width, {
    font: 'Helvetica-Bold',
    size: PdfType.section,
    color: C.ink,
  });
  y += Space.lg;

  const panelW = Math.min(280, box.width * 0.55);
  const x = box.right - panelW;
  const rows: Array<{ label: string; value: string; hero?: boolean }> = [
    { label: labels.subtotal, value: money(data.lineTotal) },
  ];
  if (data.discountAmount > 0) {
    rows.push({
      label: data.discountLabel || labels.discount,
      value: `− ${money(data.discountAmount)}`,
    });
  }
  rows.push({
    label: labels.amountDue,
    value: money(data.amountDue),
    hero: true,
  });

  const panelH = Space.lg + rows.length * Space.xxl + Space.sm;
  fillRoundRect(doc, x - Space.md, y - Space.sm, panelW + Space.xl, panelH, PdfPage.radius, C.surface);
  strokeRoundRect(doc, x - Space.md, y - Space.sm, panelW + Space.xl, panelH, PdfPage.radius, C.line);

  let cy = y;
  for (const row of rows) {
    if (row.hero) {
      fillRoundRect(doc, x - Space.xs, cy - Space.xs + 1, panelW + Space.sm, 24, 6, C.brandDeep);
      drawText(doc, row.label, x, cy + Space.xs, panelW * 0.45, {
        font: 'Helvetica-Bold',
        size: PdfType.bodySm,
        color: C.brandMist,
      });
      drawText(doc, row.value, x + panelW * 0.4, cy + Space.xs - 1, panelW * 0.6, {
        font: 'Helvetica-Bold',
        size: 11,
        color: C.white,
        align: 'right',
        minSize: 7,
      });
      cy += Space.xxxl - 4;
    } else {
      drawText(doc, row.label, x, cy, panelW * 0.5, {
        size: PdfType.bodySm,
        color: C.muted,
      });
      drawText(doc, row.value, x + panelW * 0.45, cy, panelW * 0.55, {
        size: PdfType.body,
        color: C.ink,
        align: 'right',
        minSize: 6.5,
      });
      cy += Space.lg + 2;
    }
  }
}

export function buildKontraBonPdf(
  data: KontraBonDocumentData,
): Promise<Buffer> {
  const labels = buildKontraBonLabels();

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      bufferPages: true,
      margins: {
        top: PdfPage.marginTop,
        bottom: PdfPageFooterH,
        left: PdfPage.marginX,
        right: PdfPage.marginX,
      },
      info: {
        Title: `Kontra bon ${data.documentNumber}`,
        Author: data.seller.name,
        Subject: 'Kontra bon — goods & payment acknowledgment',
        Keywords: `kontra-bon,${KONTRA_BON_PDF_TEMPLATE_VERSION}`,
      },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const box = pageBox(doc);
    drawChrome(doc, box, data, labels);
    let y = drawHero(doc, box, data, labels);
    y = drawParties(doc, box, y, data, labels);
    y = drawSummaryTable(doc, box, y, data, labels);
    drawClosing(doc, box, y, data, labels);

    drawDetailsPage(doc, data, labels);

    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(range.start + i);
      pdfDrawFooterBar(doc, labels.footerNote, labels.pageOf(i + 1, range.count));
    }

    doc.end();
  });
}
