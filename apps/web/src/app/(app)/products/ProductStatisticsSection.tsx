'use client';

import { useCallback } from 'react';
import {
  StatisticsBreakdownSection,
  coverageRows,
  filterBuckets,
  segmentColor,
  type BreakdownResult,
  type StatisticsCatalogItem,
} from '@/components/StatisticsBreakdownSection';
import { useLabels } from '@/hooks/useLabels';
import type { ProductStatistics } from '@/lib/types';

const GROUPS = ['Catalog', 'Readiness', 'Content'] as const;

const CATALOG: StatisticsCatalogItem[] = [
  {
    id: 'unit',
    label: 'Unit',
    group: 'Catalog',
    subtitle: 'PCS, gram, and liter mix',
  },
  {
    id: 'stockStatus',
    label: 'Stock status',
    group: 'Catalog',
    subtitle: 'In-stock vs out-of-stock SKUs',
  },
  {
    id: 'costSet',
    label: 'Cost coverage',
    group: 'Readiness',
    subtitle: 'Products with unit cost on file',
  },
  {
    id: 'packReady',
    label: 'Pack readiness',
    group: 'Readiness',
    subtitle: 'SKUs with sellable pack prices',
  },
  {
    id: 'details',
    label: 'Product details',
    group: 'Content',
    subtitle: 'SKUs with details documented',
  },
];

const BUCKET_STATS = new Set(['unit', 'stockStatus', 'costSet', 'packReady']);

function labelForProductKey(statId: string, key: string, productUnit: (key: string) => string): string {
  if (statId === 'unit') return productUnit(key);
  const map: Record<string, string> = {
    in_stock: 'In stock',
    out_of_stock: 'Out of stock',
    set: 'Cost set',
    unset: 'Cost unset',
    ready: 'Pack ready',
    not_ready: 'Not pack ready',
  };
  return map[key] ?? key;
}

type ProductStatisticsSectionProps = {
  statistics: ProductStatistics | null | undefined;
  productCount: number;
  loading: boolean;
};

export function ProductStatisticsSection({
  statistics,
  productCount,
  loading,
}: ProductStatisticsSectionProps) {
  const labels = useLabels();

  const getBreakdown = useCallback(
    ({
      statId,
      statistics: stats,
      showEmpty,
      labelForKey,
    }: {
      statId: string;
      statistics: ProductStatistics;
      showEmpty: boolean;
      labelForKey: (statId: string, key: string) => string;
    }): BreakdownResult => {
      if (statId === 'details') {
        return {
          rows: coverageRows(stats.details).map((row) => ({
            ...row,
            label: row.key === 'with' ? 'With details' : 'Without details',
          })),
          showRank: false,
        };
      }

      const buckets = stats[statId as keyof ProductStatistics];
      if (!Array.isArray(buckets)) {
        return { rows: [], showRank: true };
      }

      return {
        rows: filterBuckets(buckets, showEmpty).map((bucket, index) => ({
          key: bucket.key,
          label: labelForKey(statId, bucket.key),
          count: bucket.count,
          rate: bucket.rate,
          color: segmentColor(index),
        })),
        showRank: true,
      };
    },
    [],
  );

  return (
    <StatisticsBreakdownSection
      ariaLabel="Product statistics"
      groups={[...GROUPS]}
      catalog={CATALOG}
      statistics={statistics}
      entityCount={productCount}
      entityLabelSingular="product"
      entityLabelPlural="products"
      loading={loading}
      emptyTitle="No products in this view yet."
      emptyDescription="Add SKUs or widen your filters to see breakdowns here."
      isBucketStat={(statId) => BUCKET_STATS.has(statId)}
      labelForKey={(statId, key) =>
        labelForProductKey(
          statId,
          key,
          (unitKey) =>
            labels.productUnit[unitKey as keyof typeof labels.productUnit] ??
            unitKey,
        )
      }
      getBreakdown={getBreakdown}
    />
  );
}
