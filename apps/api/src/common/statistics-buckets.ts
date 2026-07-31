import { ratePercent } from './summary-rates';

export type CountBucketInput = { key: string; count: number };

export type WithWithoutInput = { withCount: number; withoutCount: number };

export type StatBucket = {
  key: string;
  count: number;
  rate: number | null;
};

export type WithWithoutStats = WithWithoutInput & {
  withRate: number | null;
  withoutRate: number | null;
};

function bucketRate(count: number, total: number): number | null {
  return ratePercent(count, total);
}

export function toStatBuckets(
  rows: CountBucketInput[],
  total: number,
): StatBucket[] {
  return rows.map((row) => ({
    key: row.key,
    count: row.count,
    rate: bucketRate(row.count, total),
  }));
}

export function toWithWithoutStats(
  input: WithWithoutInput,
  total: number,
): WithWithoutStats {
  return {
    withCount: input.withCount,
    withoutCount: input.withoutCount,
    withRate: bucketRate(input.withCount, total),
    withoutRate: bucketRate(input.withoutCount, total),
  };
}

export function normalizeEnumBuckets(
  keys: readonly string[],
  rows: CountBucketInput[],
): CountBucketInput[] {
  const map = new Map<string, number>();
  for (const key of keys) {
    map.set(key, 0);
  }
  for (const row of rows) {
    const key = row.key?.trim() ? row.key : 'UNSET';
    map.set(key, (map.get(key) ?? 0) + row.count);
  }
  return keys.map((key) => ({ key, count: map.get(key) ?? 0 }));
}

const GEO_EMPTY_KEY = 'EMPTY';
const GEO_OTHER_KEY = 'OTHER';
const GEO_TOP_N = 12;

export function normalizeGeoBuckets(
  rows: CountBucketInput[],
  total: number,
): CountBucketInput[] {
  const normalized = rows.map((row) => ({
    key: row.key.trim() === '' ? GEO_EMPTY_KEY : row.key.trim(),
    count: row.count,
  }));

  const merged = new Map<string, number>();
  for (const row of normalized) {
    merged.set(row.key, (merged.get(row.key) ?? 0) + row.count);
  }

  const emptyCount = merged.get(GEO_EMPTY_KEY) ?? 0;
  merged.delete(GEO_EMPTY_KEY);

  const ranked = [...merged.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));

  const buckets: CountBucketInput[] = [];
  if (emptyCount > 0) {
    buckets.push({ key: GEO_EMPTY_KEY, count: emptyCount });
  }

  if (ranked.length <= GEO_TOP_N) {
    buckets.push(...ranked);
    return buckets;
  }

  const top = ranked.slice(0, GEO_TOP_N);
  const otherCount = ranked
    .slice(GEO_TOP_N)
    .reduce((sum, row) => sum + row.count, 0);
  buckets.push(...top);
  if (otherCount > 0) {
    buckets.push({ key: GEO_OTHER_KEY, count: otherCount });
  }
  if (total <= 0 && buckets.length === 0) {
    return [{ key: GEO_EMPTY_KEY, count: 0 }];
  }
  return buckets;
}

export function syntheticPairBuckets(
  positiveKey: string,
  positiveCount: number,
  negativeKey: string,
  negativeCount: number,
): CountBucketInput[] {
  return [
    { key: positiveKey, count: Math.max(0, positiveCount) },
    { key: negativeKey, count: Math.max(0, negativeCount) },
  ];
}
