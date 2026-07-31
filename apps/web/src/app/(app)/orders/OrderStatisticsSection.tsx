'use client';

import { useCallback, useMemo } from 'react';
import {
  StatisticsBreakdownSection,
  coverageRows,
  filterBuckets,
  segmentColor,
  type BreakdownResult,
  type StatisticsCatalogItem,
} from '@/components/StatisticsBreakdownSection';
import { useOrderLabelHelpers } from '@/hooks/useOrderLabelHelpers';
import type { OrderStatistics } from '@/lib/types';

const GROUPS = ['Fulfillment', 'Payment', 'Documents'] as const;

const CATALOG: StatisticsCatalogItem[] = [
  {
    id: 'status',
    label: 'Order status',
    group: 'Fulfillment',
    subtitle: 'Pipeline stage across filtered orders',
  },
  {
    id: 'customerLinked',
    label: 'Customer link',
    group: 'Fulfillment',
    subtitle: 'Orders linked to CRM contacts',
  },
  {
    id: 'paymentStatus',
    label: 'Payment status',
    group: 'Payment',
    subtitle: 'Cash, consignment, and delayed terms',
  },
  {
    id: 'discountType',
    label: 'Discount type',
    group: 'Payment',
    subtitle: 'Percentage vs amount discounts',
  },
  {
    id: 'invoiceStatus',
    label: 'Invoice status',
    group: 'Documents',
    subtitle: 'Collection progress on invoices',
  },
  {
    id: 'billStatus',
    label: 'Bill status',
    group: 'Documents',
    subtitle: 'Customer bill document stage',
  },
];

const BUCKET_STATS = new Set([
  'status',
  'paymentStatus',
  'discountType',
  'invoiceStatus',
  'billStatus',
]);

type OrderStatisticsSectionProps = {
  statistics: OrderStatistics | null | undefined;
  orderCount: number;
  loading: boolean;
};

export function OrderStatisticsSection({
  statistics,
  orderCount,
  loading,
}: OrderStatisticsSectionProps) {
  const orderLabels = useOrderLabelHelpers();

  const entityCount = useMemo(() => {
    if (!statistics) return orderCount;
    const fromStatus = statistics.status.reduce((sum, row) => sum + row.count, 0);
    return fromStatus > 0 ? fromStatus : orderCount;
  }, [statistics, orderCount]);

  const labelForKey = useCallback(
    (statId: string, key: string) => {
      switch (statId) {
        case 'status':
          return orderLabels.orderStatusLabel(key);
        case 'paymentStatus':
          return orderLabels.paymentStatusLabel(key);
        case 'invoiceStatus':
          return orderLabels.invoiceStatusLabel(key);
        case 'billStatus':
          return orderLabels.billStatusLabel(key);
        case 'discountType':
          return (
            orderLabels.labels.discountType[
              key as keyof typeof orderLabels.labels.discountType
            ] ?? key
          );
        default:
          return key;
      }
    },
    [orderLabels],
  );

  const getBreakdown = useCallback(
    ({
      statId,
      statistics: stats,
      showEmpty,
      labelForKey: label,
    }: {
      statId: string;
      statistics: OrderStatistics;
      showEmpty: boolean;
      labelForKey: (statId: string, key: string) => string;
    }): BreakdownResult => {
      if (statId === 'customerLinked') {
        return {
          rows: coverageRows(stats.customerLinked).map((row) => ({
            ...row,
            label: row.key === 'with' ? 'Linked' : 'Unlinked',
          })),
          showRank: false,
        };
      }

      const buckets = stats[statId as keyof OrderStatistics];
      if (!Array.isArray(buckets)) {
        return { rows: [], showRank: true };
      }

      return {
        rows: filterBuckets(buckets, showEmpty).map((bucket, index) => ({
          key: bucket.key,
          label: label(statId, bucket.key),
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
      ariaLabel="Order statistics"
      groups={[...GROUPS]}
      catalog={CATALOG}
      statistics={statistics}
      entityCount={entityCount}
      entityLabelSingular="order"
      entityLabelPlural="orders"
      loading={loading}
      emptyTitle="No orders in this view yet."
      emptyDescription="Create orders or widen your filters to see breakdowns here."
      isBucketStat={(statId) => BUCKET_STATS.has(statId)}
      labelForKey={labelForKey}
      getBreakdown={getBreakdown}
    />
  );
}
