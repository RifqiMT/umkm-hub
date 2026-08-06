const ANALYTICS_INCLUDE_PARTS = [
  'summary',
  'series',
  'products',
  'customers',
] as const;

type AnalyticsIncludePart = (typeof ANALYTICS_INCLUDE_PARTS)[number];

const ANALYTICS_GRANULARITIES = [
  'weekly',
  'monthly',
  'quarterly',
  'annual',
] as const;

type AnalyticsGranularity = (typeof ANALYTICS_GRANULARITIES)[number];

export type AnalyticsOverviewOptions = {
  include: ReadonlySet<AnalyticsIncludePart>;
  /** `all` builds every series (default / backward compatible). */
  granularity: AnalyticsGranularity | 'all';
};

const INCLUDE_SET = new Set<string>(ANALYTICS_INCLUDE_PARTS);
const GRANULARITY_SET = new Set<string>(ANALYTICS_GRANULARITIES);

/** Default: full overview (backward compatible). */
export function defaultAnalyticsOverviewOptions(): AnalyticsOverviewOptions {
  return {
    include: new Set(ANALYTICS_INCLUDE_PARTS),
    granularity: 'all',
  };
}

/**
 * Parse `include` query: comma-separated parts.
 * Omitted / empty → all parts.
 */
export function parseAnalyticsInclude(raw?: string): Set<AnalyticsIncludePart> {
  if (raw == null || raw.trim() === '') {
    return new Set(ANALYTICS_INCLUDE_PARTS);
  }
  const parts = raw
    .split(/[,+\s]+/)
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean);
  if (parts.length === 0) {
    return new Set(ANALYTICS_INCLUDE_PARTS);
  }
  const include = new Set<AnalyticsIncludePart>();
  for (const part of parts) {
    if (!INCLUDE_SET.has(part)) {
      throw new Error(
        `Invalid include "${part}". Use: ${ANALYTICS_INCLUDE_PARTS.join(', ')}`,
      );
    }
    include.add(part as AnalyticsIncludePart);
  }
  return include;
}

/**
 * Parse `granularity` query.
 * Omitted / `all` → build every series.
 */
export function parseAnalyticsGranularity(
  raw?: string,
): AnalyticsGranularity | 'all' {
  if (raw == null || raw.trim() === '') return 'all';
  const value = raw.trim().toLowerCase();
  if (value === 'all') return 'all';
  if (!GRANULARITY_SET.has(value)) {
    throw new Error(
      `Invalid granularity "${raw}". Use: all, ${ANALYTICS_GRANULARITIES.join(', ')}`,
    );
  }
  return value as AnalyticsGranularity;
}

export function parseAnalyticsOverviewOptions(
  includeRaw?: string,
  granularityRaw?: string,
): AnalyticsOverviewOptions {
  return {
    include: parseAnalyticsInclude(includeRaw),
    granularity: parseAnalyticsGranularity(granularityRaw),
  };
}

export function wantsSeriesGranularity(
  options: AnalyticsOverviewOptions,
  series: AnalyticsGranularity,
): boolean {
  if (!options.include.has('series')) return false;
  return options.granularity === 'all' || options.granularity === series;
}
