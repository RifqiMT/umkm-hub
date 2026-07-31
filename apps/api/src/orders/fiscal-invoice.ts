/** Round money to 4 decimal places (matches order totals). */
export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 10000) / 10000;
}

export type FiscalBreakdown = {
  dpp: number;
  ppn: number;
  total: number;
  ppnRate: number;
  isPkp: boolean;
};

export function computeFiscalBreakdown(input: {
  orderTotal: number;
  isPkp: boolean;
  ppnPercent: number;
  taxInclusive: boolean;
}): FiscalBreakdown {
  const total = roundMoney(Number(input.orderTotal) || 0);
  const rate = input.isPkp ? Number(input.ppnPercent) / 100 : 0;

  if (!input.isPkp || rate <= 0) {
    return { dpp: total, ppn: 0, total, ppnRate: 0, isPkp: false };
  }

  if (input.taxInclusive) {
    const dpp = roundMoney(total / (1 + rate));
    const ppn = roundMoney(total - dpp);
    return {
      dpp,
      ppn,
      total,
      ppnRate: input.ppnPercent,
      isPkp: true,
    };
  }

  const dpp = total;
  const ppn = roundMoney(dpp * rate);
  return {
    dpp,
    ppn,
    total: roundMoney(dpp + ppn),
    ppnRate: input.ppnPercent,
    isPkp: true,
  };
}

/** Order-level PPN toggle: explicit override, else profile PKP flag. */
export function resolveIncludePpn(
  order: { includePpn: boolean | null },
  profile: { isPkp: boolean },
): boolean {
  if (order.includePpn != null) return order.includePpn;
  return profile.isPkp;
}

/** Invoice amount due (includes PPN when PKP tax-exclusive). */
export function resolveOrderAmountDue(input: {
  totalOrderValue: number;
  includePpn: boolean | null;
  profile: {
    isPkp: boolean;
    ppnPercent: number;
    taxInclusive: boolean;
  };
}): number {
  const isPkp = resolveIncludePpn(
    { includePpn: input.includePpn },
    { isPkp: input.profile.isPkp },
  );
  return computeFiscalBreakdown({
    orderTotal: input.totalOrderValue,
    isPkp,
    ppnPercent: input.profile.ppnPercent,
    taxInclusive: input.profile.taxInclusive,
  }).total;
}

export function formatNpwp(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 15) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}.${digits.slice(8, 9)}-${digits.slice(9, 12)}.${digits.slice(12, 15)}`;
  }
  if (digits.length === 16) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}.${digits.slice(8, 9)}-${digits.slice(9, 12)}.${digits.slice(12, 16)}`;
  }
  return raw.trim();
}

/** First 8 hex chars from an order SKU (`YYYY_MM_DD_{uuid}`) or raw id. */
function orderEntityHex(orderId: string, fallbackId?: string): string {
  const trimmed = orderId.trim();
  const match = trimmed.match(/^(\d{4})_(\d{2})_(\d{2})_(.+)$/);
  const entity = match?.[4]?.trim() ?? trimmed;
  const hex = entity.replace(/-/g, '').replace(/_/g, '');
  if (/^[0-9a-fA-F]{8,}$/.test(hex)) {
    return hex.slice(0, 8).toUpperCase();
  }

  const fallback = (fallbackId ?? '').replace(/-/g, '').replace(/_/g, '');
  if (/^[0-9a-fA-F]{8,}$/.test(fallback)) {
    return fallback.slice(0, 8).toUpperCase();
  }

  const digits = hex.replace(/[^0-9a-fA-F]/g, '');
  if (digits.length >= 8) return digits.slice(0, 8).toUpperCase();

  return (fallback || hex || '00000000').slice(0, 8).toUpperCase().padEnd(8, '0');
}

/** Canonical invoice numbers: PREFIX-YYYYMMDD-XXXXXXXX (8 uppercase hex, no underscores). */
export function isValidInvoiceNumber(value: string): boolean {
  return /^[A-Z0-9]{2,12}-\d{8}-[A-F0-9]{8}$/.test(value.trim());
}

export type InvoiceNumberParts = {
  prefix: string;
  dateIso: string;
  dateLabel: string;
  serial: string;
  canonical: string;
  heading: string;
  header: string;
};

function formatInvoiceDateLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(d);
}

/** Readable display parts for invoice numbers in PDF/UI. */
export function formatInvoiceNumberDisplay(raw: string): InvoiceNumberParts {
  const trimmed = raw.trim();
  const standard = trimmed.match(/^([A-Za-z0-9]{2,12})-(\d{4})(\d{2})(\d{2})-([A-Za-z0-9]+)$/);
  if (standard) {
    const [, prefix, year, month, day, serialRaw] = standard;
    const serial = serialRaw.replace(/[^A-Za-z0-9]/g, '').slice(0, 8).toUpperCase();
    const dateIso = `${year}-${month}-${day}`;
    const canonical = `${prefix.toUpperCase()}-${year}${month}${day}-${serial}`;
    return {
      prefix: prefix.toUpperCase(),
      dateIso,
      dateLabel: formatInvoiceDateLabel(dateIso),
      serial,
      canonical,
      heading: `${prefix.toUpperCase()}-${year}-${month}-${day} · ${serial}`,
      header: canonical,
    };
  }

  const dateMatch = trimmed.match(/(\d{4})[-_]?(\d{2})[-_]?(\d{2})/);
  const prefixMatch = trimmed.match(/^([A-Za-z0-9]{2,12})/);
  const hexTail = trimmed.replace(/[^a-fA-F0-9]/g, '').slice(-8).toUpperCase() || '00000000';
  const prefix = (prefixMatch?.[1] ?? 'INV').toUpperCase();
  const year = dateMatch?.[1] ?? new Date().toISOString().slice(0, 4);
  const month = dateMatch?.[2] ?? '01';
  const day = dateMatch?.[3] ?? '01';
  const dateIso = `${year}-${month}-${day}`;
  const canonical = `${prefix}-${year}${month}${day}-${hexTail.padStart(8, '0').slice(0, 8)}`;

  return {
    prefix,
    dateIso,
    dateLabel: formatInvoiceDateLabel(dateIso),
    serial: hexTail.padStart(8, '0').slice(0, 8),
    canonical,
    heading: `${prefix}-${year}-${month}-${day} · ${hexTail.padStart(8, '0').slice(0, 8)}`,
    header: canonical,
  };
}

export function buildInvoiceNumber(input: {
  prefix: string;
  orderId: string;
  orderDate: string;
  fiscalInvoiceNumber?: string;
  fallbackId?: string;
}): string {
  const custom = input.fiscalInvoiceNumber?.trim();
  if (custom && isValidInvoiceNumber(custom)) return custom;

  const prefix = (input.prefix.trim() || 'INV').toUpperCase().replace(/[^A-Z0-9]/g, '') || 'INV';
  const datePart = input.orderDate.slice(0, 10).replace(/-/g, '');
  const shortId = orderEntityHex(input.orderId, input.fallbackId);
  return `${prefix}-${datePart}-${shortId}`;
}

export type EFakturRow = {
  invoiceNumber: string;
  invoiceDate: string;
  sellerNpwp: string;
  sellerName: string;
  buyerNpwp: string;
  buyerName: string;
  buyerAddress: string;
  dpp: number;
  ppn: number;
  total: number;
  orderReference: string;
  paymentTerms: string;
};

export function buildEFakturCsv(rows: EFakturRow[]): string {
  const header = [
    'Nomor Faktur',
    'Tanggal Faktur',
    'NPWP Penjual',
    'Nama Penjual',
    'NPWP Pembeli',
    'Nama Pembeli',
    'Alamat Pembeli',
    'DPP',
    'PPN',
    'Total',
    'Referensi Order',
    'Syarat Pembayaran',
  ];
  const escape = (value: string | number) => {
    const text = String(value ?? '');
    if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
    return text;
  };
  const lines = [header.join(',')];
  for (const row of rows) {
    lines.push(
      [
        row.invoiceNumber,
        row.invoiceDate,
        row.sellerNpwp,
        row.sellerName,
        row.buyerNpwp,
        row.buyerName,
        row.buyerAddress,
        row.dpp.toFixed(2),
        row.ppn.toFixed(2),
        row.total.toFixed(2),
        row.orderReference,
        row.paymentTerms,
      ]
        .map(escape)
        .join(','),
    );
  }
  return `${lines.join('\n')}\n`;
}

export function buildEFakturXml(rows: EFakturRow[]): string {
  const esc = (value: string) =>
    value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const body = rows
    .map(
      (row) => `  <Faktur>
    <NomorFaktur>${esc(row.invoiceNumber)}</NomorFaktur>
    <TanggalFaktur>${esc(row.invoiceDate)}</TanggalFaktur>
    <NPWPPenjual>${esc(row.sellerNpwp)}</NPWPPenjual>
    <NamaPenjual>${esc(row.sellerName)}</NamaPenjual>
    <NPWPPembeli>${esc(row.buyerNpwp)}</NPWPPembeli>
    <NamaPembeli>${esc(row.buyerName)}</NamaPembeli>
    <AlamatPembeli>${esc(row.buyerAddress)}</AlamatPembeli>
    <DPP>${row.dpp.toFixed(2)}</DPP>
    <PPN>${row.ppn.toFixed(2)}</PPN>
    <Total>${row.total.toFixed(2)}</Total>
    <ReferensiOrder>${esc(row.orderReference)}</ReferensiOrder>
    <SyaratPembayaran>${esc(row.paymentTerms)}</SyaratPembayaran>
  </Faktur>`,
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<FakturPajak xmlns="urn:umkm-hub:efaktur-prep:1">\n${body}\n</FakturPajak>\n`;
}
