/** In-process short TTL for analytics window loads (progressive requests). */
export const ANALYTICS_WINDOW_CACHE_TTL_MS = 45_000;

/** Cap entries to avoid unbounded growth in long-lived API processes. */
const ANALYTICS_WINDOW_CACHE_MAX_ENTRIES = 64;

export type AnalyticsWindowCacheEntry<T> = {
  exp: number;
  value: T;
};

export function analyticsWindowCacheKey(
  profileId: string,
  years: number[],
): string {
  return `${profileId}:${years.join(',')}`;
}

export function readCacheEntry<T>(
  map: Map<string, AnalyticsWindowCacheEntry<T>>,
  key: string,
  now = Date.now(),
): T | null {
  const hit = map.get(key);
  if (!hit) return null;
  if (hit.exp <= now) {
    map.delete(key);
    return null;
  }
  return hit.value;
}

export function writeCacheEntry<T>(
  map: Map<string, AnalyticsWindowCacheEntry<T>>,
  key: string,
  value: T,
  ttlMs = ANALYTICS_WINDOW_CACHE_TTL_MS,
  now = Date.now(),
  maxEntries = ANALYTICS_WINDOW_CACHE_MAX_ENTRIES,
): void {
  map.set(key, { exp: now + ttlMs, value });
  if (map.size <= maxEntries) return;
  // Drop oldest expired first, then oldest inserted.
  for (const [k, entry] of map) {
    if (entry.exp <= now) map.delete(k);
    if (map.size <= maxEntries) return;
  }
  const oldest = map.keys().next().value;
  if (oldest != null) map.delete(oldest);
}
