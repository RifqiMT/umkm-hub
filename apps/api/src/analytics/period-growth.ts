export type GrowthMode = 'pct' | 'bps';

/**
 * Period-over-period change.
 * - `pct`: relative change ((cur − prev) / |prev|) × 100
 * - `bps`: absolute change in percentage points × 100 (1 pp = 100 bps)
 */
export function periodGrowthValue(
  current: number | null | undefined,
  previous: number | null | undefined,
  mode: GrowthMode,
): number | null {
  if (current == null || previous == null) return null;
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return null;
  if (mode === 'bps') {
    return (current - previous) * 100;
  }
  if (previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export function formatPeriodGrowth(
  value: number | null,
  mode: GrowthMode,
): string | null {
  if (value == null || !Number.isFinite(value)) return null;
  if (mode === 'bps') {
    const rounded = Math.round(value);
    const sign = rounded > 0 ? '+' : '';
    return `${sign}${rounded.toLocaleString('en-US')} bps`;
  }
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toLocaleString(undefined, {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  })}%`;
}

export type GrowthSpec = { key: string; mode: GrowthMode };

/** Attach formatted vs-prior labels onto each timeline row (first period has none). */
export function attachPeriodGrowthLabels<T extends Record<string, unknown>>(
  rows: T[],
  specs: readonly GrowthSpec[],
): Array<T & { growthLabels: Record<string, string> }> {
  return rows.map((row, index) => {
    const prev = index > 0 ? rows[index - 1] : undefined;
    const growthLabels: Record<string, string> = {};
    for (const { key, mode } of specs) {
      const cur = row[key];
      const prv = prev?.[key];
      const curN = typeof cur === 'number' ? cur : null;
      const prvN = typeof prv === 'number' ? prv : null;
      const formatted = formatPeriodGrowth(
        periodGrowthValue(curN, prvN, mode),
        mode,
      );
      if (formatted) growthLabels[key] = formatted;
    }
    return { ...row, growthLabels };
  });
}
