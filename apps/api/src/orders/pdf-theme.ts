/**
 * Shared visual system for printable PDFs (invoice, kontra bon).
 * Spacing uses a 4pt base scale so gaps between text and objects stay proportional.
 */
import type PDFKit from 'pdfkit';

export const PdfColor = {
  brand: '#0B6B58',
  brandDeep: '#064F41',
  brandSoft: '#EEF6F3',
  brandTint: '#F4FAF8',
  brandLine: '#9CBFB4',
  brandMist: '#B7D6CD',
  ink: '#101815',
  muted: '#3A4541',
  subtext: '#4A5652',
  label: '#566460',
  line: '#D8E4DF',
  surface: '#F7FAF9',
  white: '#FFFFFF',
  warn: '#9A3412',
  warnSoft: '#FEF3C7',
  danger: '#991B1B',
  dangerSoft: '#FEE2E2',
  success: '#047857',
  successSoft: '#D1FAE5',
} as const;

/** 4pt spacing scale — prefer these over magic numbers. */
export const Space = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  section: 28,
} as const;

export const PdfType = {
  display: 22,
  title: 16,
  section: 12,
  body: 9,
  bodySm: 8.5,
  caption: 7.5,
  label: 6.5,
  micro: 6,
} as const;

export const PdfPage = {
  marginX: 32,
  marginTop: 48,
  footerBodyH: 26,
  footerAccentH: 3,
  headerH: 48,
  contentTopGap: 12,
  radius: 10,
  radiusSm: 8,
  accentRail: 3,
} as const;

export const PdfPageFooterH = PdfPage.footerBodyH + PdfPage.footerAccentH;

export const PdfTable = {
  cellPadX: 10,
  colGap: 10,
  headH: 26,
  footH: 26,
  headSize: 7,
  bodySize: 9,
  subSize: 7.5,
  rowPadY: 8,
  rowLineGap: 2,
  rowMinH: 34,
  payRowH: 30,
} as const;

export type PdfPageBox = {
  left: number;
  right: number;
  width: number;
  top: number;
  bottom: number;
};

export type PdfTextOpts = {
  font?: string;
  size?: number;
  minSize?: number;
  color?: string;
  align?: 'left' | 'center' | 'right';
  wrap?: boolean;
  maxHeight?: number;
};

export function pdfPageBox(doc: PDFKit.PDFDocument): PdfPageBox {
  return {
    left: doc.page.margins.left,
    right: doc.page.width - doc.page.margins.right,
    width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
    top: PdfPage.headerH + PdfPage.contentTopGap,
    bottom: doc.page.height - doc.page.margins.bottom,
  };
}

export function pdfVCenter(y: number, barH: number, fontSize: number): number {
  return y + (barH - fontSize) / 2 - 0.5;
}

export function pdfFillRect(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
) {
  doc.save().rect(x, y, w, h).fillColor(color).fill().restore();
}

export function pdfFillRoundRect(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  color: string,
) {
  doc.save().roundedRect(x, y, w, h, r).fillColor(color).fill().restore();
}

export function pdfStrokeRoundRect(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  color: string,
  width = 0.7,
) {
  doc
    .save()
    .roundedRect(x, y, w, h, r)
    .strokeColor(color)
    .lineWidth(width)
    .stroke()
    .restore();
}

export function pdfStrokeHLine(
  doc: PDFKit.PDFDocument,
  x1: number,
  x2: number,
  y: number,
  color: string = PdfColor.line,
) {
  doc.moveTo(x1, y).lineTo(x2, y).strokeColor(color).lineWidth(0.5).stroke();
}

export function pdfStrokeDashedLine(
  doc: PDFKit.PDFDocument,
  x1: number,
  x2: number,
  y: number,
  color: string = PdfColor.brandLine,
) {
  doc
    .save()
    .moveTo(x1, y)
    .lineTo(x2, y)
    .strokeColor(color)
    .lineWidth(0.8)
    .dash(2.5, { space: 2 })
    .stroke()
    .undash()
    .restore();
}

export function pdfDrawText(
  doc: PDFKit.PDFDocument,
  text: string,
  x: number,
  y: number,
  w: number,
  opts: PdfTextOpts = {},
): number {
  const font = opts.font ?? 'Helvetica';
  let size = opts.size ?? PdfType.body;
  const minSize = opts.minSize ?? PdfType.micro;
  const align = opts.align ?? 'left';
  const wrap = opts.wrap ?? false;

  doc.font(font);
  if (!wrap) {
    while (size > minSize) {
      doc.fontSize(size);
      if (doc.widthOfString(text) <= w - 1) break;
      size -= 0.5;
    }
  }
  doc.fontSize(size).fillColor(opts.color ?? PdfColor.ink);

  const textOpts: PDFKit.Mixins.TextOptions = {
    width: w,
    align,
    lineBreak: wrap,
  };
  if (opts.maxHeight != null) textOpts.height = opts.maxHeight;

  const height = doc.heightOfString(text, { width: w, align });
  doc.text(text, x, y, textOpts);
  doc.x = x;
  doc.y = y;
  return opts.maxHeight != null
    ? Math.min(height, opts.maxHeight)
    : Math.max(height, size * 1.15);
}

export function pdfMoney(value: number): string {
  const n = Number(value) || 0;
  if (!Number.isFinite(n)) return 'Rp 0';
  const abs = Math.abs(n);
  const prefix = n < 0 ? '- ' : '';
  const formatted = new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: 0,
  }).format(Math.round(abs));
  return `${prefix}Rp ${formatted}`;
}

export function pdfFormatDate(iso: string): string {
  const day = iso.slice(0, 10);
  const d = new Date(`${day}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(d);
}

export function pdfDrawMoney(
  doc: PDFKit.PDFDocument,
  value: number,
  x: number,
  y: number,
  w: number,
  opts: {
    strong?: boolean;
    color?: string;
    size?: number;
    minSize?: number;
    align?: 'left' | 'right';
  } = {},
): number {
  const text = pdfMoney(value);
  const font = opts.strong ? 'Helvetica-Bold' : 'Helvetica';
  let fitSize = opts.size ?? PdfType.body;
  const color = opts.color ?? (opts.strong ? PdfColor.brandDeep : PdfColor.ink);
  const align = opts.align ?? 'right';
  const minSize = opts.minSize ?? 5;
  doc.font(font).fontSize(fitSize);
  while (fitSize > minSize && doc.widthOfString(text) > w - 1) {
    fitSize -= 0.5;
    doc.fontSize(fitSize);
  }
  if (doc.widthOfString(text) <= w - 1) {
    return pdfDrawText(doc, text, x, y, w, {
      font,
      size: fitSize,
      color,
      align,
      minSize,
    });
  }
  const amountOnly = text.replace(/^(-?\s*)Rp\s*/, '$1');
  pdfDrawText(doc, 'Rp', x, y, w, {
    font,
    size: 7.5,
    color: opts.color ?? PdfColor.subtext,
    align,
  });
  return (
    7 +
    pdfDrawText(doc, amountOnly, x, y + Space.sm, w, {
      font,
      size: fitSize - 1,
      color,
      align,
      minSize: Math.max(4, minSize - 0.5),
    })
  );
}

/** Soft brand chrome shared by invoice & kontra bon. */
export function pdfDrawChrome(
  doc: PDFKit.PDFDocument,
  box: PdfPageBox,
  opts: {
    brandTitle?: string;
    tagline: string;
    rightLabel: string;
    rightValue: string;
    centerPill?: string;
  },
) {
  const pageW = doc.page.width;
  const h = PdfPage.headerH;
  pdfFillRect(doc, 0, 0, pageW, h, PdfColor.brandTint);
  pdfFillRect(doc, 0, 0, PdfPage.accentRail, h, PdfColor.brandDeep);

  pdfDrawText(doc, opts.brandTitle ?? 'UMKM Hub', box.left, Space.md, 140, {
    font: 'Helvetica-Bold',
    size: 11,
    color: PdfColor.brandDeep,
  });
  pdfDrawText(doc, opts.tagline, box.left, Space.md + 15, 220, {
    size: PdfType.label,
    color: PdfColor.muted,
  });

  if (opts.centerPill) {
    const pillW = Math.max(72, opts.centerPill.length * 5.2 + 18);
    const cx = box.left + (box.width - pillW) / 2;
    pdfFillRoundRect(doc, cx, Space.md - 1, pillW, 20, 10, PdfColor.white);
    pdfStrokeRoundRect(doc, cx, Space.md - 1, pillW, 20, 10, PdfColor.brandLine);
    pdfDrawText(doc, opts.centerPill, cx, Space.md + 4, pillW, {
      font: 'Helvetica-Bold',
      size: PdfType.caption,
      color: PdfColor.brandDeep,
      align: 'center',
    });
  }

  const rightW = Math.min(210, Math.round(box.width * 0.36));
  pdfDrawText(doc, opts.rightLabel, box.right - rightW, Space.md, rightW, {
    size: PdfType.label,
    color: PdfColor.label,
    align: 'right',
  });
  pdfDrawText(doc, opts.rightValue, box.right - rightW, Space.md + 13, rightW, {
    font: 'Helvetica-Bold',
    size: PdfType.bodySm,
    color: PdfColor.ink,
    align: 'right',
    minSize: 6.5,
  });

  pdfStrokeHLine(doc, 0, pageW, h, PdfColor.brandLine);
}

/** Compact meta chips in equal columns with proportional gutters. */
export function pdfDrawMetaChips(
  doc: PDFKit.PDFDocument,
  box: PdfPageBox,
  y: number,
  chips: Array<{ label: string; value: string }>,
): number {
  const gap = Space.sm;
  const chipW = (box.width - gap * (chips.length - 1)) / chips.length;
  const chipH = 40;

  chips.forEach((chip, i) => {
    const x = box.left + i * (chipW + gap);
    pdfFillRoundRect(doc, x, y, chipW, chipH, PdfPage.radiusSm, PdfColor.surface);
    pdfDrawText(doc, chip.label.toUpperCase(), x + Space.md, y + Space.sm, chipW - Space.xl, {
      font: 'Helvetica-Bold',
      size: PdfType.micro,
      color: PdfColor.label,
    });
    pdfDrawText(doc, chip.value, x + Space.md, y + Space.md + 6, chipW - Space.xl, {
      font: 'Helvetica-Bold',
      size: PdfType.bodySm,
      color: PdfColor.ink,
      minSize: 6.5,
    });
  });

  return y + chipH + Space.lg;
}

export function pdfDrawSectionTitle(
  doc: PDFKit.PDFDocument,
  box: PdfPageBox,
  y: number,
  title: string,
  subtitle?: string,
): number {
  pdfDrawText(doc, title, box.left, y, box.width * 0.55, {
    font: 'Helvetica-Bold',
    size: PdfType.section,
    color: PdfColor.ink,
  });
  if (subtitle) {
    pdfDrawText(doc, subtitle, box.left + box.width * 0.4, y + 2, box.width * 0.6, {
      size: PdfType.caption,
      color: PdfColor.subtext,
      align: 'right',
    });
  }
  y += Space.lg;
  pdfStrokeHLine(doc, box.left, box.right, y, PdfColor.line);
  return y + Space.md;
}

export function pdfDrawFooterBar(
  doc: PDFKit.PDFDocument,
  note: string,
  pageLabel: string,
) {
  const savedBottom = doc.page.margins.bottom;
  doc.page.margins.bottom = 0;

  const pageW = doc.page.width;
  const pageH = doc.page.height;
  const footTop = pageH - PdfPageFooterH;
  const bodyH = PdfPage.footerBodyH;

  pdfFillRect(doc, 0, footTop, pageW, bodyH, PdfColor.brandTint);
  pdfStrokeHLine(doc, 0, pageW, footTop, PdfColor.brandLine);
  pdfFillRect(doc, 0, footTop + bodyH, pageW, PdfPage.footerAccentH, PdfColor.brandDeep);

  const textY = footTop + (bodyH - 7) / 2;
  pdfDrawText(doc, note, PdfPage.marginX, textY, pageW * 0.62, {
    size: PdfType.label,
    color: PdfColor.label,
  });
  pdfDrawText(
    doc,
    pageLabel,
    pageW * 0.62,
    textY,
    pageW - PdfPage.marginX - pageW * 0.62,
    {
      font: 'Helvetica-Bold',
      size: PdfType.caption,
      color: PdfColor.ink,
      align: 'right',
    },
  );

  doc.page.margins.bottom = savedBottom;
}
