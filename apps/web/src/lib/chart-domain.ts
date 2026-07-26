/**
 * Value-axis domain from prior product rule:
 * - lower bound = minimum − 20% of |minimum|
 * - upper bound = maximum + 20% of |maximum|
 *
 * Examples: min 11 → 8.8; max 31 → 37.2.
 * Empty / all-zero → [0, 1].
 * When `nonNegative` and samples are ≥ 0, lower bound is floored at 0.
 */
export function paddedDomain(
  values: Array<number | null | undefined>,
  options?: { nonNegative?: boolean },
): [number, number] {
  const nums = values.filter(
    (v): v is number => typeof v === 'number' && Number.isFinite(v),
  );
  if (nums.length === 0) return [0, 1];

  const min = Math.min(...nums);
  const max = Math.max(...nums);
  if (min === 0 && max === 0) return [0, 1];

  let lo = min - Math.abs(min) * 0.2;
  let hi = max + Math.abs(max) * 0.2;

  if (options?.nonNegative && min >= 0) {
    lo = Math.max(0, lo);
  }

  if (!(hi > lo)) {
    const pad = Math.max(Math.abs(max || min) * 0.2, 1);
    lo = min - pad;
    hi = max + pad;
    if (options?.nonNegative && min >= 0) {
      lo = Math.max(0, lo);
    }
  }

  if (Object.is(lo, -0)) lo = 0;
  if (Object.is(hi, -0)) hi = 0;

  return [lo, hi];
}

/** Evenly spaced ticks between domain ends (avoids repeated/clumped labels). */
export function axisTicks(
  domain: [number, number],
  count = 5,
  options?: { integers?: boolean },
): number[] {
  const [lo, hi] = domain;
  if (!(hi > lo) || count < 2) {
    return [options?.integers ? Math.round(lo) : lo];
  }
  const ticks: number[] = [];
  for (let i = 0; i < count; i += 1) {
    const raw = lo + ((hi - lo) * i) / (count - 1);
    ticks.push(options?.integers ? Math.round(raw) : raw);
  }
  if (!options?.integers) return ticks;
  return [...new Set(ticks)];
}

/** Compact integer tick label for count axes. */
export function formatAxisInt(value: number) {
  return Math.round(value).toLocaleString('en-US');
}

/** Percent tick label — rounded, no float noise. */
export function formatAxisPct(value: number) {
  return `${Math.round(value)}%`;
}

/** Day tick label — one decimal when needed. */
export function formatAxisDays(value: number) {
  const rounded =
    Math.abs(value) >= 10 ? Math.round(value) : Math.round(value * 10) / 10;
  return `${rounded}d`;
}
