/** Full digit quantity / non-currency amounts (no magnitude abbreviation). */
export function formatQty(value: number) {
  if (!Number.isFinite(value)) return '—';
  return value.toLocaleString('en-US', {
    maximumFractionDigits: 4,
  });
}

function formatFullMoney(value: number) {
  return value.toLocaleString('en-US', {
    maximumFractionDigits: 0,
  });
}

/** Exact money digits for tooltips (no magnitude shortcut). */
export function formatMoneyExact(value: number) {
  if (!Number.isFinite(value)) return '—';
  return formatFullMoney(value);
}

const COMPACT_TIERS = [
  { abs: 1e18, word: 'quintillion', short: 'Qn' },
  { abs: 1e15, word: 'quadrillion', short: 'Qd' },
  { abs: 1e12, word: 'trillion', short: 'Tn' },
  { abs: 1e9, word: 'billion', short: 'Bn' },
  { abs: 1e6, word: 'million', short: 'Mn' },
] as const;

export type CompactParts = {
  figure: string;
  /** Plain-English magnitude for KPI chips (e.g. "million"). */
  unit: string | null;
  /** Short axis/table label (e.g. "Mn"). */
  unitShort: string | null;
};

const EMPTY_PARTS: CompactParts = {
  figure: '—',
  unit: null,
  unitShort: null,
};

function formatCompactParts(value: number, mode: 'money' | 'qty'): CompactParts {
  if (!Number.isFinite(value)) return EMPTY_PARTS;
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);
  for (const tier of COMPACT_TIERS) {
    if (abs >= tier.abs) {
      const scaled = abs / tier.abs;
      return {
        figure: `${sign}${scaled.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
        unit: tier.word,
        unitShort: tier.short,
      };
    }
  }
  return {
    figure: mode === 'money' ? formatFullMoney(value) : formatQty(value),
    unit: null,
    unitShort: null,
  };
}

function joinCompactParts(parts: CompactParts, style: 'word' | 'short') {
  const unit = style === 'short' ? parts.unitShort : parts.unit;
  return unit ? `${parts.figure} ${unit}` : parts.figure;
}

/**
 * Display money for tables, KPIs, and tooltips.
 * e.g. 1_532_000 → "1.53 million"
 * Under 1 million stays full digits.
 */
export function formatMoney(value: number) {
  return joinCompactParts(formatCompactParts(value, 'money'), 'word');
}

/** Split money into figure + plain-English magnitude for hero typography. */
export function formatMoneyParts(value: number): CompactParts {
  return formatCompactParts(value, 'money');
}

/**
 * Compact quantity for large KPI figures (packs sold, etc.).
 * Under 1 million stays full digits; otherwise million / billion / …
 */
export function formatCompactQty(value: number) {
  return joinCompactParts(formatCompactParts(value, 'qty'), 'word');
}

/** Split compact qty into figure + plain-English magnitude. */
export function formatCompactQtyParts(value: number): CompactParts {
  return formatCompactParts(value, 'qty');
}

/**
 * Short compact money label for chart axes (tight space).
 * e.g. 1_532_000 → "1.53 Mn"
 * Safe as a Recharts `tickFormatter` (ignores the index arg).
 */
export function formatCompactAxis(value: number) {
  return joinCompactParts(formatCompactParts(value, 'money'), 'short');
}

/**
 * Short compact quantity label for chart axes.
 * Keeps decimals under 1 million (basket / frequency ticks).
 */
export function formatCompactAxisQty(value: number) {
  return joinCompactParts(formatCompactParts(value, 'qty'), 'short');
}

/** Friendly UTC calendar label from YYYY-MM-DD. */
export function formatDateLabel(iso: string | null | undefined): string {
  if (!iso) return '—';
  const day = iso.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return iso;
  const date = new Date(`${day}T00:00:00.000Z`);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** Percent for KPI rates; null/non-finite → em dash. */
export function formatRatePercent(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${value.toLocaleString('en-US', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  })}%`;
}
