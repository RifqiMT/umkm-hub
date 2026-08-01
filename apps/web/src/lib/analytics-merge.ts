import type { AnalyticsOverview } from '@/lib/types';

type AnalyticsMergeMode = 'core' | 'series' | 'tables';

/** Merge progressive analytics responses without wiping cached series/tables. */
export function mergeAnalyticsOverview(
  prev: AnalyticsOverview | null,
  next: AnalyticsOverview,
  mode: AnalyticsMergeMode,
): AnalyticsOverview {
  if (!prev) return next;

  if (mode === 'tables') {
    return {
      ...prev,
      products: next.products,
      customers: next.customers,
    };
  }

  if (mode === 'series') {
    return {
      ...prev,
      weekly: next.weekly.length > 0 ? next.weekly : prev.weekly,
      monthly: next.monthly.length > 0 ? next.monthly : prev.monthly,
      quarterly: next.quarterly.length > 0 ? next.quarterly : prev.quarterly,
      annual: next.annual.length > 0 ? next.annual : prev.annual,
    };
  }

  // core: replace summary + requested series; keep prior tables & other series
  return {
    ...next,
    weekly: next.weekly.length > 0 ? next.weekly : prev.weekly,
    monthly: next.monthly.length > 0 ? next.monthly : prev.monthly,
    quarterly: next.quarterly.length > 0 ? next.quarterly : prev.quarterly,
    annual: next.annual.length > 0 ? next.annual : prev.annual,
    products: prev.products.length > 0 ? prev.products : next.products,
    customers: prev.customers.length > 0 ? prev.customers : next.customers,
  };
}
