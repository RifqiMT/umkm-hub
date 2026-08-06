import PDFDocument from 'pdfkit';
import type { FiscalBreakdown, InvoiceNumberParts } from './fiscal-invoice';
import { formatInvoiceNumberDisplay, roundMoney } from './fiscal-invoice';
import { formatOrderReferenceBrief } from './invoice-order-reference';
import {
  buildInvoiceLabels,
  formatCollectionStatus,
  formatPaymentTerms,
  type InvoicePdfLabels,
} from './invoice-pdf-labels';
import {
  PdfColor as C,
  PdfPage,
  PdfPageFooterH,
  PdfTable as T,
  Space,
  PdfType,
  type PdfPageBox as PageBox,
  pdfDrawMoney as drawMoneyCell,
  pdfDrawText as drawText,
  pdfFillRect as fillRect,
  pdfFillRoundRect as fillRoundRect,
  pdfFormatDate as formatDate,
  pdfMoney as money,
  pdfPageBox,
  pdfStrokeHLine as strokeHLine,
  pdfStrokeRoundRect as strokeRoundRect,
  pdfVCenter as vCenterY,
} from './pdf-theme';

export const INVOICE_PDF_TEMPLATE_VERSION = '2026-08-06-v28';

type InvoiceLineItem = {
  description: string;
  quantityLabel: string;
  quantityPacks: string;
  quantityPackSize: string;
  unitPrice: number;
  lineTotal: number;
};

type InvoicePaymentRow = {
  date: string;
  amount: number;
};

export type InvoiceDocumentData = {
  invoiceNumber: string;
  invoiceDisplay?: InvoiceNumberParts;
  invoiceDate: string;
  dueDate?: string | null;
  seller: {
    name: string;
    address: string;
    phone: string;
    npwp: string;
    email?: string;
  };
  buyer: {
    name: string;
    company: string;
    address: string;
    npwp: string;
  };
  orderReference: string;
  paymentTerms: string;
  collectionStatus: string;
  lineItems: InvoiceLineItem[];
  lineTotal: number;
  discountLabel: string;
  discountAmount: number;
  fiscal: FiscalBreakdown;
  paidAmount: number;
  remainingAmount: number;
  payments: InvoicePaymentRow[];
};

const PAGE = {
  marginX: PdfPage.marginX,
  marginTop: PdfPage.marginTop,
  footerBodyH: PdfPage.footerBodyH,
  footerAccentH: PdfPage.footerAccentH,
} as const;

const PAGE_FOOTER_H = PdfPageFooterH;
const HEADER_H = PdfPage.headerH;

function fillTableBar(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string = C.brandDeep,
) {
  fillRect(doc, x, y, w, h, color);
}

function drawTableRowDivider(
  doc: PDFKit.PDFDocument,
  box: PageBox,
  y: number,
  strong = false,
) {
  strokeHLine(doc, box.left, box.right, y, strong ? C.brandLine : C.line);
}

function drawTableIndexCell(
  doc: PDFKit.PDFDocument,
  x: number,
  w: number,
  y: number,
  rowH: number,
  index: number,
) {
  drawText(doc, String(index), x, vCenterY(y, rowH, T.bodySize), w, {
    font: 'Helvetica',
    size: T.bodySize,
    color: C.label,
    align: 'center',
  });
}

function drawTableHeaderRow(
  doc: PDFKit.PDFDocument,
  box: PageBox,
  y: number,
  cells: Array<{ text: string; x: number; w: number; align?: 'left' | 'center' | 'right' }>,
): number {
  fillTableBar(doc, box.left, y, box.width, T.headH);
  const textY = vCenterY(y, T.headH, T.headSize);
  cells.forEach((cell) => {
    drawText(doc, cell.text, cell.x, textY, cell.w, {
      font: 'Helvetica-Bold',
      size: T.headSize,
      color: C.white,
      align: cell.align ?? 'left',
    });
  });
  return y + T.headH;
}

function drawTableFooterRow(
  doc: PDFKit.PDFDocument,
  box: PageBox,
  y: number,
  label: string,
  amount: number,
  labelX: number,
  labelW: number,
  amountX: number,
  amountW: number,
  amountColor: string = C.white,
) {
  fillTableBar(doc, box.left, y, box.width, T.footH);
  const textY = vCenterY(y, T.footH, T.bodySize);
  drawText(doc, label, labelX, textY, labelW, {
    font: 'Helvetica-Bold',
    size: T.bodySize,
    color: C.white,
  });
  drawMoneyCell(doc, amount, amountX, textY - 0.5, amountW, {
    strong: true,
    size: T.bodySize,
    color: amountColor,
    minSize: 6.5,
  });
}

type PageKind = 'details' | 'payments' | 'summary';

type TableLayout = {
  indexX: number;
  indexW: number;
  descX: number;
  descW: number;
  qtyX: number;
  qtyW: number;
  amountX: number;
  amountW: number;
};

type PageContext = {
  invoiceDisplay: InvoiceNumberParts;
  orderReferenceBrief: string;
  hasPayments: boolean;
  labels: InvoicePdfLabels;
};

function pageBox(doc: PDFKit.PDFDocument): PageBox {
  return pdfPageBox(doc);
}

function truncate(text: string, max: number): string {
  const t = text.trim();
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

function tableLayout(box: PageBox): TableLayout {
  const innerLeft = box.left + T.cellPadX;
  const innerRight = box.right - T.cellPadX;
  const innerW = innerRight - innerLeft;
  const indexW = 24;
  const amountW = Math.round(innerW * 0.34);
  const qtyW = Math.round(innerW * 0.22);
  const amountX = innerRight - amountW;
  const qtyX = amountX - T.colGap - qtyW;
  const indexX = innerLeft;
  const descX = indexX + indexW + T.colGap;
  const descW = qtyX - T.colGap - descX;
  return { indexX, indexW, descX, descW, qtyX, qtyW, amountX, amountW };
}

function paymentsTableColumns(box: PageBox) {
  const innerLeft = box.left + T.cellPadX;
  const innerRight = box.right - T.cellPadX;
  const innerW = innerRight - innerLeft;
  const indexW = 24;
  const amountW = Math.round(innerW * 0.38);
  const amountX = innerRight - amountW;
  const dateX = innerLeft + indexW + T.colGap;
  const dateW = amountX - T.colGap - dateX;
  return { indexX: innerLeft, indexW, amountW, amountX, dateX, dateW };
}

function drawSectionTitle(
  doc: PDFKit.PDFDocument,
  box: PageBox,
  y: number,
  title: string,
  subtitle: string,
): number {
  drawText(doc, title, box.left, y, box.width * 0.55, {
    font: 'Helvetica-Bold',
    size: PdfType.section,
    color: C.ink,
  });
  drawText(doc, subtitle, box.left + box.width * 0.4, y + 2, box.width * 0.6, {
    size: PdfType.caption,
    color: C.subtext,
    align: 'right',
  });
  y += Space.lg;
  strokeHLine(doc, box.left, box.right, y, C.line);
  return y + Space.md;
}

function drawLineItemsHeader(
  doc: PDFKit.PDFDocument,
  cols: TableLayout,
  box: PageBox,
  y: number,
  labels: InvoicePdfLabels,
): number {
  return drawTableHeaderRow(doc, box, y, [
    { text: labels.colIndex, x: cols.indexX, w: cols.indexW, align: 'center' },
    { text: labels.colDescription, x: cols.descX, w: cols.descW },
    { text: labels.colQuantity, x: cols.qtyX, w: cols.qtyW, align: 'right' },
    { text: labels.colLineTotal, x: cols.amountX, w: cols.amountW, align: 'right' },
  ]);
}

function statusStyle(status: string): { bg: string; fg: string } {
  const s = status.toLowerCase();
  if (s.includes('overdue')) return { bg: C.dangerSoft, fg: C.danger };
  if (s.includes('paid') && !s.includes('partial')) return { bg: C.successSoft, fg: C.success };
  if (s.includes('partial')) return { bg: C.warnSoft, fg: C.warn };
  return { bg: C.brandSoft, fg: C.brandDeep };
}

type InvoicePaymentDisplayState = {
  invoiceTotal: number;
  paidAmount: number;
  remainingAmount: number;
  paidInFull: boolean;
  partiallyPaid: boolean;
  overdue: boolean;
  statusKey: string;
  pct: number;
  pctLabel: string;
};

/** Derive user-facing payment status from invoice totals (not stale order flags). */
export function resolveInvoicePaymentState(
  data: InvoiceDocumentData,
): InvoicePaymentDisplayState {
  const invoiceTotal = roundMoney(data.fiscal.total);
  const paidAmount = roundMoney(data.paidAmount);
  const rawRemaining = roundMoney(Math.max(0, invoiceTotal - paidAmount));
  /** Treat sub-rupiah rounding dust as fully paid (avoids "Rp 0" with partial status). */
  const paidInFull =
    invoiceTotal <= 0 ? paidAmount <= 0 : rawRemaining < 1 || paidAmount >= invoiceTotal;
  const remainingAmount = paidInFull ? 0 : rawRemaining;
  const pct =
    invoiceTotal > 0 ? Math.min(100, (paidAmount / invoiceTotal) * 100) : paidInFull ? 100 : 0;
  const pctLabel = pct < 1 && pct > 0 ? '<1' : pct.toFixed(0);
  const partiallyPaid = !paidInFull && paidAmount > 0;
  const overdue =
    !paidInFull && data.collectionStatus.toLowerCase().includes('overdue');

  let statusKey: string;
  if (paidInFull) statusKey = 'PAID';
  else if (overdue) statusKey = 'OVERDUE';
  else if (partiallyPaid) statusKey = 'PARTIALLY_PAID';
  else statusKey = 'UNPAID';

  return {
    invoiceTotal,
    paidAmount,
    remainingAmount,
    paidInFull,
    partiallyPaid,
    overdue,
    statusKey,
    pct,
    pctLabel,
  };
}

function outstandingAmountColor(state: InvoicePaymentDisplayState): string {
  if (state.paidInFull) return C.success;
  if (state.overdue) return C.danger;
  return C.brandDeep;
}

function paidPercent(data: InvoiceDocumentData): number {
  return resolveInvoicePaymentState(data).pct;
}

function paidPercentLabel(pct: number): string {
  return pct < 1 && pct > 0 ? '<1' : pct.toFixed(0);
}

function pageTabs(ctx: PageContext): Array<{ id: PageKind; label: string }> {
  const tabs: Array<{ id: PageKind; label: string }> = [
    { id: 'details', label: ctx.labels.tabDetails },
  ];
  if (ctx.hasPayments) tabs.push({ id: 'payments', label: ctx.labels.tabPayments });
  tabs.push({ id: 'summary', label: ctx.labels.tabSummary });
  return tabs;
}

function drawPageHeader(
  doc: PDFKit.PDFDocument,
  box: PageBox,
  ctx: PageContext,
  active: PageKind,
) {
  const pageW = doc.page.width;
  fillRect(doc, 0, 0, pageW, HEADER_H, C.brandTint);
  fillRect(doc, 0, 0, PdfPage.accentRail, HEADER_H, C.brandDeep);

  drawText(doc, 'UMKM Hub', box.left, Space.md, 150, {
    font: 'Helvetica-Bold',
    size: 11,
    color: C.brandDeep,
  });
  drawText(doc, ctx.labels.brandTagline, box.left, Space.md + 15, 160, {
    size: PdfType.label,
    color: C.muted,
  });

  const tabs = pageTabs(ctx);
  const tabGap = Space.sm;
  doc.font('Helvetica-Bold').fontSize(PdfType.caption);
  const tabWidths = tabs.map((t) => doc.widthOfString(t.label) + 20);
  const tabsW = tabWidths.reduce((a, b) => a + b, 0) + tabGap * (tabs.length - 1);
  let tabX = box.left + (box.width - tabsW) / 2;
  const tabTop = Space.md - 1;

  tabs.forEach((tab, i) => {
    const tw = tabWidths[i]!;
    const isActive = tab.id === active;
    if (isActive) {
      fillRoundRect(doc, tabX, tabTop, tw, 22, 11, C.white);
      strokeRoundRect(doc, tabX, tabTop, tw, 22, 11, C.brand, 0.75);
      fillRect(doc, tabX + Space.sm, tabTop + 20, tw - Space.lg, 2, C.brand);
    } else {
      fillRoundRect(doc, tabX, tabTop, tw, 22, 11, C.brandSoft);
    }
    drawText(doc, tab.label, tabX, tabTop + 6, tw, {
      font: isActive ? 'Helvetica-Bold' : 'Helvetica',
      size: PdfType.caption,
      color: isActive ? C.brandDeep : C.muted,
      align: 'center',
    });
    tabX += tw + tabGap;
  });

  const rightW = Math.min(220, Math.round(box.width * 0.34));
  const rightX = box.right - rightW;
  drawText(doc, ctx.labels.headerInvoiceNo, rightX, Space.md, rightW, {
    size: PdfType.label,
    color: C.label,
    align: 'right',
  });
  drawText(doc, ctx.invoiceDisplay.header, rightX, Space.md + 13, rightW, {
    font: 'Helvetica-Bold',
    size: PdfType.bodySm,
    color: C.ink,
    align: 'right',
    minSize: 6.5,
  });

  strokeHLine(doc, 0, pageW, HEADER_H, C.brandLine);
}

function newPage(
  doc: PDFKit.PDFDocument,
  ctx: PageContext,
  active: PageKind,
  pageKinds: PageKind[],
): PageBox {
  doc.addPage();
  pageKinds.push(active);
  const box = pageBox(doc);
  drawPageHeader(doc, box, ctx, active);
  return box;
}

function drawMetaStrip(
  doc: PDFKit.PDFDocument,
  box: PageBox,
  y: number,
  labels: InvoicePdfLabels,
  data: InvoiceDocumentData,
  orderReferenceBrief: string,
): number {
  const cols = [
    { label: labels.invoiceDate, value: formatDate(data.invoiceDate) },
    {
      label: labels.paymentDue,
      value: data.dueDate ? formatDate(data.dueDate) : labels.paymentDueFallback,
    },
    { label: labels.paymentTerms, value: formatPaymentTerms(data.paymentTerms) },
    { label: labels.orderReference, value: orderReferenceBrief },
  ];
  const barH = 44;
  const gap = Space.sm;
  const colW = (box.width - gap * (cols.length - 1)) / cols.length;

  cols.forEach((col, i) => {
    const cx = box.left + i * (colW + gap);
    fillRoundRect(doc, cx, y, colW, barH, PdfPage.radiusSm, C.surface);
    drawText(doc, col.label.toUpperCase(), cx + Space.md, y + Space.sm, colW - Space.xl, {
      font: 'Helvetica-Bold',
      size: PdfType.micro,
      color: C.label,
    });
    drawText(doc, col.value, cx + Space.md, y + Space.md + 6, colW - Space.xl, {
      font: 'Helvetica-Bold',
      size: PdfType.bodySm,
      color: C.ink,
      minSize: 6.5,
    });
  });

  return y + barH + Space.lg;
}

function drawTitleBlock(
  doc: PDFKit.PDFDocument,
  data: InvoiceDocumentData,
  labels: InvoicePdfLabels,
  orderReferenceBrief: string,
  box: PageBox,
): number {
  let y = box.top;
  const payment = resolveInvoicePaymentState(data);
  const pill = statusStyle(payment.statusKey);
  const statusLabel = formatCollectionStatus(payment.statusKey);

  drawText(doc, labels.documentTitle, box.left, y, box.width * 0.62, {
    font: 'Helvetica-Bold',
    size: PdfType.display,
    color: C.ink,
  });

  const pillW = Math.max(96, statusLabel.length * 5.4 + 22);
  const pillX = box.right - pillW;
  fillRoundRect(doc, pillX, y + Space.xs, pillW, 20, 10, pill.bg);
  drawText(doc, statusLabel, pillX, y + Space.sm + 1, pillW, {
    font: 'Helvetica-Bold',
    size: PdfType.caption,
    color: pill.fg,
    align: 'center',
  });

  y += Space.xxxl;
  drawText(doc, labels.documentSubtitle, box.left, y, box.width * 0.92, {
    size: PdfType.caption,
    color: C.muted,
    wrap: true,
  });

  y += Space.xl;
  return drawMetaStrip(doc, box, y, labels, data, orderReferenceBrief);
}

function drawPartyColumn(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  w: number,
  title: string,
  lines: string[],
): number {
  const content = lines.filter((l) => l.trim());

  drawText(doc, title, x, y, w, {
    font: 'Helvetica-Bold',
    size: PdfType.caption,
    color: C.brandDeep,
  });
  strokeHLine(doc, x, x + w, y + Space.md + 1, C.brandLine);

  let ly = y + Space.xl + 2;
  content.forEach((line, i) => {
    const lh = drawText(doc, line, x, ly, w, {
      font: i === 0 ? 'Helvetica-Bold' : 'Helvetica',
      size: i === 0 ? 10.5 : PdfType.bodySm,
      color: i === 0 ? C.ink : C.subtext,
      wrap: true,
    });
    ly += lh + (i === 0 ? Space.sm : Space.xs + 1);
  });

  return ly - y;
}

function drawParties(
  doc: PDFKit.PDFDocument,
  data: InvoiceDocumentData,
  labels: InvoicePdfLabels,
  box: PageBox,
  y: number,
): number {
  const pad = Space.lg;
  const gap = Space.xxl;
  const colW = (box.width - pad * 2 - gap) / 2;
  const leftX = box.left + pad;
  const rightX = leftX + colW + gap;

  const leftLines = [
    data.seller.name,
    data.seller.address,
    data.seller.phone ? `Tel. ${data.seller.phone}` : '',
    data.seller.email ? `Email. ${data.seller.email}` : '',
    data.seller.npwp ? `NPWP ${data.seller.npwp}` : '',
  ].filter((l) => l.trim());
  const rightLines = [
    data.buyer.company || data.buyer.name,
    data.buyer.company ? data.buyer.name : '',
    data.buyer.address,
    data.buyer.npwp ? `NPWP ${data.buyer.npwp}` : '',
  ].filter(Boolean);

  doc.font('Helvetica').fontSize(PdfType.bodySm);
  const measureCol = (lines: string[]) => {
    let h = Space.xl;
    lines.forEach((line, i) => {
      h += doc.heightOfString(line, { width: colW }) + (i === 0 ? Space.sm : Space.xs + 1);
    });
    return h;
  };
  const cardH = pad * 2 + Math.max(measureCol(leftLines), measureCol(rightLines), 56);

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

  const contentY = y + pad;
  drawPartyColumn(doc, leftX, contentY, colW, labels.seller, leftLines);
  drawPartyColumn(doc, rightX, contentY, colW, labels.buyer, rightLines);

  return y + cardH + Space.xl;
}

function drawLineItemsTable(
  doc: PDFKit.PDFDocument,
  data: InvoiceDocumentData,
  box: PageBox,
  startY: number,
  ctx: PageContext,
  pageKinds: PageKind[],
): { y: number; box: PageBox } {
  let cols = tableLayout(box);
  let y = drawSectionTitle(
    doc,
    box,
    startY,
    ctx.labels.productsSection,
    ctx.labels.productsCount(data.lineItems.length),
  );

  y = drawLineItemsHeader(doc, cols, box, y, ctx.labels);

  data.lineItems.forEach((line, index) => {
    const qtyPacks = line.quantityPacks || line.quantityLabel;
    const qtyPackSize = line.quantityPackSize ?? '';
    const unitPriceLabel = ctx.labels.unitPrice(money(line.unitPrice));

    doc.font('Helvetica-Bold').fontSize(T.bodySize);
    const descH = doc.heightOfString(line.description, { width: cols.descW });
    doc.font('Helvetica').fontSize(T.subSize);
    const subH = doc.heightOfString(unitPriceLabel, { width: cols.descW });
    doc.font('Helvetica-Bold').fontSize(T.bodySize);
    const qtyPacksH = doc.heightOfString(qtyPacks, { width: cols.qtyW, align: 'right' });
    doc.font('Helvetica').fontSize(T.subSize);
    const qtySizeH = qtyPackSize
      ? doc.heightOfString(qtyPackSize, { width: cols.qtyW, align: 'right' })
      : 0;
    doc.font('Helvetica-Bold').fontSize(T.bodySize);
    const amountH =
      T.bodySize +
      (doc.widthOfString(money(line.lineTotal)) > cols.amountW - 2 ? T.bodySize + 2 : 0);
    const qtyBlockH = qtyPacksH + (qtyPackSize ? T.rowLineGap + qtySizeH : 0);
    const contentH = Math.max(descH + T.rowLineGap + subH, qtyBlockH, amountH);
    const rowH = Math.max(T.rowMinH, contentH + T.rowPadY * 2);

    if (y + rowH > box.bottom) {
      box = newPage(doc, ctx, 'details', pageKinds);
      cols = tableLayout(box);
      y = box.top + 4;
      y = drawLineItemsHeader(doc, cols, box, y, ctx.labels);
    }

    if (index % 2 === 1) fillRect(doc, box.left, y, box.width, rowH, C.surface);

    const ty = y + T.rowPadY;
    drawTableIndexCell(doc, cols.indexX, cols.indexW, y, rowH, index + 1);

    const dH = drawText(doc, line.description, cols.descX, ty, cols.descW, {
      font: 'Helvetica-Bold',
      size: T.bodySize,
      wrap: true,
    });
    drawText(doc, unitPriceLabel, cols.descX, ty + dH + T.rowLineGap, cols.descW, {
      size: T.subSize,
      color: C.subtext,
    });

    let qtyY = ty;
    const qpH = drawText(doc, qtyPacks, cols.qtyX, qtyY, cols.qtyW, {
      font: 'Helvetica-Bold',
      size: T.bodySize,
      color: C.ink,
      align: 'right',
      minSize: 6.5,
    });
    qtyY += qpH + T.rowLineGap;
    if (qtyPackSize) {
      drawText(doc, qtyPackSize, cols.qtyX, qtyY, cols.qtyW, {
        size: T.subSize,
        color: C.subtext,
        align: 'right',
        minSize: 6,
      });
    }

    drawMoneyCell(doc, line.lineTotal, cols.amountX, ty, cols.amountW, {
      strong: true,
      color: C.ink,
      size: T.bodySize,
      minSize: 5,
    });

    drawTableRowDivider(doc, box, y + rowH);
    y += rowH;
  });

  drawTableRowDivider(doc, box, y, true);
  return { y: y + Space.md, box };
}

function drawPaymentsTableHeader(
  doc: PDFKit.PDFDocument,
  box: PageBox,
  y: number,
  labels: InvoicePdfLabels,
  cols: ReturnType<typeof paymentsTableColumns>,
): number {
  return drawTableHeaderRow(doc, box, y, [
    { text: labels.colIndex, x: cols.indexX, w: cols.indexW, align: 'center' },
    { text: labels.colPaymentDate, x: cols.dateX, w: cols.dateW },
    { text: labels.colPaymentAmount, x: cols.amountX, w: cols.amountW, align: 'right' },
  ]);
}

function drawPaymentsPage(
  doc: PDFKit.PDFDocument,
  data: InvoiceDocumentData,
  ctx: PageContext,
  pageKinds: PageKind[],
): void {
  let box = newPage(doc, ctx, 'payments', pageKinds);
  let cols = paymentsTableColumns(box);
  let y = drawSectionTitle(
    doc,
    box,
    box.top,
    ctx.labels.paymentsTitle,
    ctx.labels.paymentsSubtitle(data.payments.length),
  );

  y = drawPaymentsTableHeader(doc, box, y, ctx.labels, cols);

  data.payments.forEach((payment, index) => {
    const rowH = T.payRowH;
    if (y + rowH > box.bottom) {
      box = newPage(doc, ctx, 'payments', pageKinds);
      cols = paymentsTableColumns(box);
      y = box.top + 8;
      y = drawPaymentsTableHeader(doc, box, y, ctx.labels, cols);
    }

    if (index % 2 === 1) fillRect(doc, box.left, y, box.width, rowH, C.surface);

    const ty = vCenterY(y, rowH, T.bodySize);
    drawTableIndexCell(doc, cols.indexX, cols.indexW, y, rowH, index + 1);
    drawText(doc, formatDate(payment.date), cols.dateX, ty, cols.dateW, {
      size: T.bodySize,
      color: C.ink,
    });
    drawMoneyCell(doc, payment.amount, cols.amountX, ty - 0.5, cols.amountW, {
      strong: true,
      color: C.ink,
      size: T.bodySize,
      minSize: 6,
    });
    drawTableRowDivider(doc, box, y + rowH);
    y += rowH;
  });

  drawTableFooterRow(
    doc,
    box,
    y,
    ctx.labels.totalPaid,
    data.paidAmount,
    cols.dateX,
    cols.dateW,
    cols.amountX,
    cols.amountW,
  );
}

function drawProgressBar(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  w: number,
  h: number,
  pct: number,
) {
  fillRoundRect(doc, x, y, w, h, h / 2, C.line);
  if (pct <= 0) return;
  const fillW = Math.max(h, (w * pct) / 100);
  fillRoundRect(doc, x, y, fillW, h, h / 2, pct >= 100 ? C.success : C.brand);
}

function drawSummaryHero(
  doc: PDFKit.PDFDocument,
  box: PageBox,
  y: number,
  data: InvoiceDocumentData,
  labels: InvoicePdfLabels,
): number {
  const payment = resolveInvoicePaymentState(data);
  const pad = Space.xl;
  const innerX = box.left + pad;
  const innerW = box.width - pad * 2;
  const statusLabel = formatCollectionStatus(payment.statusKey);
  const pill = statusStyle(payment.statusKey);
  const accentColor = outstandingAmountColor(payment);
  const heroH = payment.paidInFull ? 72 : 88;

  fillRoundRect(doc, box.left, y, box.width, heroH, PdfPage.radius, C.brandTint);
  strokeRoundRect(doc, box.left, y, box.width, heroH, PdfPage.radius, C.brandLine);
  fillRoundRect(doc, innerX, y + Space.md, PdfPage.accentRail + 1, heroH - Space.xl, 2, accentColor);

  const pillW = Math.max(88, statusLabel.length * 5.2 + 18);
  const pillX = box.right - pad - pillW;
  fillRoundRect(doc, pillX, y + Space.md, pillW, 18, 9, pill.bg);
  drawText(doc, statusLabel, pillX, y + Space.md + 4, pillW, {
    font: 'Helvetica-Bold',
    size: 7,
    color: pill.fg,
    align: 'center',
  });

  if (payment.paidInFull) {
    drawText(doc, labels.paidInFullTitle, innerX + Space.md, y + Space.xxl + 2, innerW - pillW - Space.sm, {
      font: 'Helvetica-Bold',
      size: PdfType.display,
      color: C.success,
    });
    drawText(
      doc,
      labels.invoiceTotalLine(money(payment.invoiceTotal)),
      innerX + Space.md,
      y + Space.xxxl + Space.xl,
      innerW - Space.xxl,
      { size: PdfType.bodySm, color: C.muted },
    );
  } else {
    drawText(doc, labels.outstandingBalance, innerX + Space.md, y + Space.lg + 2, innerW - pillW - Space.sm, {
      size: PdfType.caption,
      color: C.subtext,
    });
    drawMoneyCell(doc, payment.remainingAmount, innerX + Space.md, y + Space.xxl + 4, innerW - pillW - Space.sm, {
      strong: true,
      size: PdfType.display,
      minSize: 12,
      align: 'left',
      color: accentColor,
    });
    const barY = y + heroH - Space.md - 2;
    drawProgressBar(doc, innerX + Space.md, barY, innerW - Space.xxl, 5, payment.pct);
  }

  return y + heroH + Space.lg;
}

function buildBreakdownRows(
  data: InvoiceDocumentData,
  labels: InvoicePdfLabels,
): Array<{
  label: string;
  amount: number;
  strong?: boolean;
  divider?: boolean;
}> {
  const rows: Array<{
    label: string;
    amount: number;
    strong?: boolean;
    divider?: boolean;
  }> = [{ label: labels.subtotal, amount: data.lineTotal }];
  if (data.discountAmount > 0) {
    rows.push({
      label: truncate(data.discountLabel, 34),
      amount: -data.discountAmount,
    });
  }
  rows.push({ label: labels.taxableAmount, amount: data.fiscal.dpp });
  if (data.fiscal.isPkp) {
    rows.push({ label: labels.vat(data.fiscal.ppnRate), amount: data.fiscal.ppn });
  }
  rows.push({
    label: labels.invoiceTotal,
    amount: data.fiscal.total,
    strong: true,
    divider: true,
  });
  rows.push({ label: labels.totalPaidRow, amount: data.paidAmount });
  return rows;
}

function drawTotalsRows(
  doc: PDFKit.PDFDocument,
  rows: Array<{
    label: string;
    amount: number;
    strong?: boolean;
    divider?: boolean;
    highlight?: boolean;
  }>,
  data: InvoiceDocumentData,
  x: number,
  y: number,
  w: number,
): number {
  const rowH = 26;
  const valueW = Math.min(220, Math.round(w * 0.52));
  const valueX = x + w - valueW;
  const labelW = valueX - x - 12;

  let ry = y;
  for (const row of rows) {
    if (row.divider) strokeHLine(doc, x, x + w, ry - 2, C.brandLine);

    drawText(doc, row.label, x, ry + 5, labelW, {
      font: row.strong ? 'Helvetica-Bold' : 'Helvetica',
      size: row.strong ? 8.5 : 8,
      color: row.strong ? C.ink : C.muted,
    });
    drawMoneyCell(doc, row.amount, valueX, ry + 4, valueW, {
      strong: row.strong,
      size: row.strong ? 8.5 : 8,
      color: row.highlight ? outstandingAmountColor(resolveInvoicePaymentState(data)) : undefined,
      minSize: 5,
    });
    strokeHLine(doc, x, x + w, ry + rowH, C.line);
    ry += rowH;
  }
  return ry;
}

function drawSummaryBreakdown(
  doc: PDFKit.PDFDocument,
  box: PageBox,
  y: number,
  data: InvoiceDocumentData,
  labels: InvoicePdfLabels,
): number {
  const innerLeft = box.left + T.cellPadX;
  const innerRight = box.right - T.cellPadX;
  const amountW = Math.min(220, Math.round(box.width * 0.38));
  const amountX = innerRight - amountW;
  const itemX = innerLeft;
  const itemW = amountX - T.colGap - itemX;

  y = drawTableHeaderRow(doc, box, y, [
    { text: labels.colBreakdownItem, x: itemX, w: itemW },
    { text: labels.colBreakdownAmount, x: amountX, w: amountW, align: 'right' },
  ]);

  const payment = resolveInvoicePaymentState(data);
  const rows = buildBreakdownRows(data, labels);
  const bodyTop = y + 4;
  const bodyEnd = drawTotalsRows(doc, rows, data, innerLeft, bodyTop, innerRight - innerLeft);

  drawTableFooterRow(
    doc,
    box,
    bodyEnd,
    labels.amountOutstanding,
    payment.remainingAmount,
    itemX,
    itemW,
    amountX,
    amountW,
  );

  return bodyEnd + T.footH;
}

function drawSummaryPage(
  doc: PDFKit.PDFDocument,
  data: InvoiceDocumentData,
  ctx: PageContext,
  pageKinds: PageKind[],
): void {
  const box = newPage(doc, ctx, 'summary', pageKinds);
  let y = drawSectionTitle(doc, box, box.top, ctx.labels.summaryTitle, ctx.orderReferenceBrief);

  y = drawSummaryHero(doc, box, y, data, ctx.labels);

  y += Space.xs;
  drawText(doc, ctx.labels.breakdownTitle, box.left, y, box.width, {
    font: 'Helvetica-Bold',
    size: 11,
    color: C.ink,
  });
  drawSummaryBreakdown(doc, box, y + Space.md, data, ctx.labels);
}

function drawFooter(
  doc: PDFKit.PDFDocument,
  data: InvoiceDocumentData,
  labels: InvoicePdfLabels,
  pageNum: number,
  pageTotal: number,
) {
  const savedBottom = doc.page.margins.bottom;
  doc.page.margins.bottom = 0;

  const pageW = doc.page.width;
  const footTop = doc.page.height - PAGE_FOOTER_H;
  const bodyH = PAGE.footerBodyH;
  const textLeft = PAGE.marginX;
  const textRight = pageW - PAGE.marginX;
  const textW = textRight - textLeft;

  fillRect(doc, 0, footTop, pageW, bodyH, C.brandTint);
  strokeHLine(doc, 0, pageW, footTop, C.brandLine);
  fillRect(doc, 0, footTop + bodyH, pageW, PAGE.footerAccentH, C.brand);

  const note = data.fiscal.isPkp ? labels.footerPkp : labels.footerNonPkp;
  const noteW = Math.round(textW * 0.62);
  const textY = footTop + (bodyH - 7.5) / 2 - 0.5;

  drawText(doc, note, textLeft, footTop + Space.sm, noteW, {
    size: 7,
    color: C.subtext,
    wrap: true,
    maxHeight: bodyH - 10,
  });

  const metaX = textLeft + noteW + Space.md;
  const metaW = textRight - metaX;
  drawText(doc, labels.footerPage(pageNum, pageTotal), metaX, textY, metaW, {
    font: 'Helvetica-Bold',
    size: PdfType.caption,
    color: C.ink,
    align: 'right',
  });

  doc.page.margins.bottom = savedBottom;
}

export function buildInvoicePdf(data: InvoiceDocumentData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: {
        top: PAGE.marginTop,
        bottom: PAGE_FOOTER_H,
        left: PAGE.marginX,
        right: PAGE.marginX,
      },
      bufferPages: true,
    });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const orderReferenceBrief = formatOrderReferenceBrief(data.orderReference);
    const invoiceDisplay =
      data.invoiceDisplay ?? formatInvoiceNumberDisplay(data.invoiceNumber);
    doc.info.Title = `Invoice ${invoiceDisplay.header}`;
    doc.info.Subject = 'UMKM Hub invoice';
    doc.info.Creator = 'UMKM Hub';
    const labels = buildInvoiceLabels(data.fiscal.isPkp);
    const ctx: PageContext = {
      invoiceDisplay,
      orderReferenceBrief,
      hasPayments: data.payments.length > 0,
      labels,
    };

    const pageKinds: PageKind[] = ['details'];

    const box = pageBox(doc);
    drawPageHeader(doc, box, ctx, 'details');

    let y = drawTitleBlock(doc, data, labels, orderReferenceBrief, box);
    y = drawParties(doc, data, labels, box, y);
    drawLineItemsTable(doc, data, box, y, ctx, pageKinds);

    if (data.payments.length > 0) {
      drawPaymentsPage(doc, data, ctx, pageKinds);
    }
    drawSummaryPage(doc, data, ctx, pageKinds);

    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(i);
      drawFooter(doc, data, labels, i + 1, range.count);
    }

    doc.end();
  });
}
