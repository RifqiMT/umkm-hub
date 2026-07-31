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
import type { WarehouseStatistics } from '@/lib/types';

const GROUPS = ['Inventory', 'Restocks'] as const;

const CATALOG: StatisticsCatalogItem[] = [
  {
    id: 'unit',
    label: 'Unit',
    group: 'Inventory',
    subtitle: 'PCS, gram, and liter mix in stock',
  },
  {
    id: 'stockStatus',
    label: 'Stock status',
    group: 'Inventory',
    subtitle: 'In-stock vs out-of-stock SKUs',
  },
  {
    id: 'costSet',
    label: 'Cost coverage',
    group: 'Inventory',
    subtitle: 'Products with unit cost on file',
  },
  {
    id: 'restockUnit',
    label: 'Restock unit',
    group: 'Restocks',
    subtitle: 'Units used in restock events',
  },
  {
    id: 'restockNotes',
    label: 'Restock notes',
    group: 'Restocks',
    subtitle: 'Restocks with notes captured',
  },
];

const BUCKET_STATS = new Set(['unit', 'stockStatus', 'costSet', 'restockUnit']);

function labelForWarehouseKey(
  statId: string,
  key: string,
  productUnit: (key: string) => string,
): string {
  if (statId === 'unit' || statId === 'restockUnit') return productUnit(key);
  const map: Record<string, string> = {
    in_stock: 'In stock',
    out_of_stock: 'Out of stock',
    set: 'Cost set',
    unset: 'Cost unset',
  };
  return map[key] ?? key;
}

type WarehouseStatisticsSectionProps = {
  statistics: WarehouseStatistics | null | undefined;
  productCount: number;
  loading: boolean;
};

export function WarehouseStatisticsSection({
  statistics,
  productCount,
  loading,
}: WarehouseStatisticsSectionProps) {
  const labels = useLabels();

  const getBreakdown = useCallback(
    ({
      statId,
      statistics: stats,
      showEmpty,
      labelForKey,
    }: {
      statId: string;
      statistics: WarehouseStatistics;
      showEmpty: boolean;
      labelForKey: (statId: string, key: string) => string;
    }): BreakdownResult => {
      if (statId === 'restockNotes') {
        return {
          rows: coverageRows(stats.restockNotes).map((row) => ({
            ...row,
            label: row.key === 'with' ? 'With notes' : 'Without notes',
          })),
          showRank: false,
        };
      }

      const buckets = stats[statId as keyof WarehouseStatistics];
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
      ariaLabel="Warehouse statistics"
      groups={[...GROUPS]}
      catalog={CATALOG}
      statistics={statistics}
      entityCount={productCount}
      entityLabelSingular="product"
      entityLabelPlural="products"
      loading={loading}
      emptyTitle="No inventory in this view yet."
      emptyDescription="Add products or widen your filters to see breakdowns here."
      isBucketStat={(statId) => BUCKET_STATS.has(statId)}
      labelForKey={(statId, key) =>
        labelForWarehouseKey(
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
