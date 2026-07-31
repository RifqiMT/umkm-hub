/** Parsed display parts for order IDs like `2030_12_30_{uuid}`. */
export type OrderReferenceDisplay = {
  full: string;
  /** Calendar prefix e.g. `2030_12_30` */
  prefix: string;
  /** UUID or trailing segment */
  entityId: string;
  /** e.g. `30 Dec 2030` */
  dateLabel: string;
  /** Last 8 hex chars, uppercased e.g. `F6AE8A4` */
  shortId: string;
  /** One-line summary e.g. `30 Dec 2030 · …F6AE8A4` */
  summary: string;
};

const ORDER_REF_PATTERN = /^(\d{4})_(\d{2})_(\d{2})_(.+)$/;

function formatReferenceDate(year: string, month: string, day: string): string {
  const iso = `${year}-${month}-${day}`;
  const d = new Date(`${iso}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return `${year}_${month}_${day}`;
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(d);
}

function shortEntityId(entityId: string): string {
  const compact = entityId.replace(/-/g, '');
  const tail = compact.slice(-8).toUpperCase();
  return tail || entityId.slice(-8).toUpperCase();
}

/** Human-friendly breakdown of an order reference for invoice PDF/UI. */
export function formatOrderReferenceForInvoice(raw: string): OrderReferenceDisplay {
  const full = raw.trim();
  const match = full.match(ORDER_REF_PATTERN);

  if (!match) {
    const shortId = shortEntityId(full);
    return {
      full,
      prefix: '',
      entityId: full,
      dateLabel: '',
      shortId,
      summary: full.length > 24 ? `…${shortId}` : full,
    };
  }

  const [, year, month, day, entityId] = match;
  const dateLabel = formatReferenceDate(year!, month!, day!);
  const shortId = shortEntityId(entityId!);

  return {
    full,
    prefix: `${year}_${month}_${day}`,
    entityId: entityId!,
    dateLabel,
    shortId,
    summary: `${dateLabel} · …${shortId}`,
  };
}

/** One-line order reference for invoice headers, e.g. `30 Dec 2030 · Ref 1FA738A4`. */
export function formatOrderReferenceBrief(raw: string): string {
  const ref = formatOrderReferenceForInvoice(raw);
  if (ref.dateLabel && ref.shortId) {
    return `${ref.dateLabel} · Ref ${ref.shortId}`;
  }
  if (ref.full.length <= 40) return ref.full;
  return `Ref ${ref.shortId}`;
}

/** Split reference into copy-friendly lines: date/prefix on line 1, full entity ID on line 2. */
export function splitOrderReferenceLines(display: OrderReferenceDisplay): string[] {
  if (display.dateLabel && display.entityId) {
    return [display.dateLabel, display.entityId];
  }
  if (display.prefix && display.entityId && display.prefix !== display.entityId) {
    return [display.prefix, display.entityId];
  }
  if (display.full.length <= 56) return [display.full];

  const full = display.full;
  const mid = Math.ceil(full.length / 2);
  const breakAt = full.lastIndexOf('_', mid);
  if (breakAt > 0 && breakAt < full.length - 1) {
    return [full.slice(0, breakAt), full.slice(breakAt + 1)];
  }
  return [full.slice(0, mid), full.slice(mid)];
}
