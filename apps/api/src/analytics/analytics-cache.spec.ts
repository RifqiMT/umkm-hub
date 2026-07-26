import {
  ANALYTICS_WINDOW_CACHE_TTL_MS,
  analyticsWindowCacheKey,
  readCacheEntry,
  writeCacheEntry,
  type AnalyticsWindowCacheEntry,
} from './analytics-cache';

describe('analytics-cache', () => {
  it('builds a stable key', () => {
    expect(analyticsWindowCacheKey('p1', [2024, 2025])).toBe('p1:2024,2025');
  });

  it('returns cached value within TTL', () => {
    const map = new Map<string, AnalyticsWindowCacheEntry<number>>();
    writeCacheEntry(map, 'k', 42, ANALYTICS_WINDOW_CACHE_TTL_MS, 1_000);
    expect(readCacheEntry(map, 'k', 1_000 + 1_000)).toBe(42);
  });

  it('expires after TTL', () => {
    const map = new Map<string, AnalyticsWindowCacheEntry<number>>();
    writeCacheEntry(map, 'k', 42, 100, 1_000);
    expect(readCacheEntry(map, 'k', 1_200)).toBeNull();
  });

  it('evicts when over max entries', () => {
    const map = new Map<string, AnalyticsWindowCacheEntry<number>>();
    writeCacheEntry(map, 'a', 1, 10_000, 1, 2);
    writeCacheEntry(map, 'b', 2, 10_000, 2, 2);
    writeCacheEntry(map, 'c', 3, 10_000, 3, 2);
    expect(map.size).toBeLessThanOrEqual(2);
    expect(readCacheEntry(map, 'c', 3)).toBe(3);
  });
});
