'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useTr } from '@/components/Tr';
import { formatRatePercent } from '@/lib/format-money';
import type { CustomerStatBucket, CustomerStatistics } from '@/lib/types';

type StatKey =
  | 'companyType'
  | 'partnershipStage'
  | 'status'
  | 'relationshipLevel'
  | 'customerNeeds'
  | 'desiredStandards'
  | 'customerPromise'
  | 'remarks'
  | 'city'
  | 'province'
  | 'country';

type StatGroup = 'Pipeline' | 'Profile' | 'Location';

type StatCatalogItem = {
  id: StatKey;
  label: string;
  group: StatGroup;
  subtitle: string;
};

type LabeledBucket = CustomerStatBucket & { label: string };

type BreakdownRow = {
  key: string;
  label: string;
  count: number;
  rate: number | null;
  color: string;
};

const STAT_CATALOG: StatCatalogItem[] = [
  {
    id: 'companyType',
    label: 'Company type',
    group: 'Pipeline',
    subtitle: 'Restaurant, hotel, and store mix',
  },
  {
    id: 'status',
    label: 'Status',
    group: 'Pipeline',
    subtitle: 'Interest and engagement stage',
  },
  {
    id: 'partnershipStage',
    label: 'Partnership stage',
    group: 'Pipeline',
    subtitle: 'Outreach channel in use',
  },
  {
    id: 'relationshipLevel',
    label: 'Relationship level',
    group: 'Pipeline',
    subtitle: 'Deal progression across contacts',
  },
  {
    id: 'customerNeeds',
    label: 'Customer needs',
    group: 'Profile',
    subtitle: 'Contacts with needs documented',
  },
  {
    id: 'desiredStandards',
    label: 'Desired standards',
    group: 'Profile',
    subtitle: 'Quality expectations on file',
  },
  {
    id: 'customerPromise',
    label: 'Customer promise',
    group: 'Profile',
    subtitle: 'Commercial commitments recorded',
  },
  {
    id: 'remarks',
    label: 'Remarks',
    group: 'Profile',
    subtitle: 'Internal notes captured',
  },
  {
    id: 'city',
    label: 'City',
    group: 'Location',
    subtitle: 'Top cities in the current view',
  },
  {
    id: 'province',
    label: 'Province',
    group: 'Location',
    subtitle: 'Regional spread',
  },
  {
    id: 'country',
    label: 'Country',
    group: 'Location',
    subtitle: 'Market coverage',
  },
];

const STAT_GROUPS: StatGroup[] = ['Pipeline', 'Profile', 'Location'];

const SEGMENT_COLORS = [
  'var(--brand-deep)',
  'color-mix(in srgb, #2f6f8f 78%, var(--brand))',
  'color-mix(in srgb, #9a5b3c 78%, var(--brand))',
  'color-mix(in srgb, #8f4d62 72%, var(--brand))',
  'color-mix(in srgb, var(--brand) 65%, #fff)',
  'color-mix(in srgb, var(--muted) 35%, var(--brand-deep))',
];

const COVERAGE_COLORS = {
  with: 'var(--brand-deep)',
  without: 'color-mix(in srgb, var(--muted) 38%, var(--line))',
};

function rateWidth(value: number | null | undefined): CSSProperties {
  if (value == null || !Number.isFinite(value)) {
    return { ['--bar' as string]: '0%' };
  }
  const clamped = Math.max(0, Math.min(100, value));
  return { ['--bar' as string]: `${clamped}%` };
}

function sortBuckets(buckets: CustomerStatBucket[]): CustomerStatBucket[] {
  return [...buckets].sort(
    (a, b) => b.count - a.count || a.key.localeCompare(b.key),
  );
}

function filterBuckets(
  buckets: CustomerStatBucket[],
  showEmpty: boolean,
): CustomerStatBucket[] {
  const sorted = sortBuckets(buckets);
  if (showEmpty) return sorted;
  const visible = sorted.filter((bucket) => bucket.count > 0);
  return visible.length > 0 ? visible : sorted.slice(0, 1);
}

function segmentColor(index: number): string {
  return SEGMENT_COLORS[index % SEGMENT_COLORS.length];
}

function statsInGroup(group: StatGroup): StatCatalogItem[] {
  return STAT_CATALOG.filter((item) => item.group === group);
}

function IconChevron({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg viewBox="0 0 20 20" width={18} height={18} aria-hidden focusable="false">
      {dir === 'left' ? (
        <path
          d="M12.5 15 7.5 10l5-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <path
          d="m7.5 15 5-5-5-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}

function StatBarRow({
  label,
  count,
  rate,
  color,
  loading,
  isLeader = false,
  rank,
  compact = false,
}: {
  label: string;
  count: number;
  rate: number | null;
  color: string;
  loading: boolean;
  isLeader?: boolean;
  rank?: number;
  compact?: boolean;
}) {
  const tr = useTr();
  return (
    <div
      className={`umkm-cstats-row${isLeader ? ' is-leader' : ''}${
        compact ? ' is-compact' : ''
      }`}
      role="listitem"
    >
      {rank != null ? (
        <span className="umkm-cstats-row-rank" aria-hidden>
          {rank}
        </span>
      ) : (
        <span
          className="umkm-cstats-row-dot"
          style={{ background: color }}
          aria-hidden
        />
      )}
      <div className="umkm-cstats-row-core">
        <div className="umkm-cstats-row-head">
          <span className="umkm-cstats-row-label">{tr(label)}</span>
          <span className="umkm-cstats-row-meta">
            {loading ? (
              '···'
            ) : (
              <>
                <strong>{count.toLocaleString('en-US')}</strong>
                <em>{formatRatePercent(rate)}</em>
              </>
            )}
          </span>
        </div>
        <div
          className="umkm-cstats-row-track"
          style={rateWidth(loading ? null : rate)}
          aria-hidden
        >
          <span
            className="umkm-cstats-row-fill"
            style={{ background: color }}
          />
        </div>
      </div>
    </div>
  );
}

function StatBreakdown({
  rows,
  loading,
  showRank = true,
  compact = false,
}: {
  rows: BreakdownRow[];
  loading: boolean;
  showRank?: boolean;
  compact?: boolean;
}) {
  const tr = useTr();

  if (rows.length === 0 && !loading) {
    return (
      <p className="umkm-cstats-no-data">{tr('No breakdown available for this view.')}</p>
    );
  }

  return (
    <div className="umkm-cstats-rows" role="list">
      {rows.map((row, index) => (
        <StatBarRow
          key={row.key}
          label={row.label}
          count={row.count}
          rate={row.rate}
          color={row.color}
          loading={loading}
          isLeader={index === 0 && row.count > 0}
          rank={showRank ? index + 1 : undefined}
          compact={compact}
        />
      ))}
    </div>
  );
}

function StatBreakdownSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="umkm-cstats-rows is-skeleton" aria-hidden>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="umkm-cstats-row is-skeleton">
          <span className="umkm-cstats-row-rank" />
          <div className="umkm-cstats-row-core">
            <div className="umkm-cstats-row-head">
              <span className="umkm-cstats-skeleton-line is-label" />
              <span className="umkm-cstats-skeleton-line is-meta" />
            </div>
            <span className="umkm-cstats-skeleton-track" />
          </div>
        </div>
      ))}
    </div>
  );
}

type CustomerStatisticsSectionProps = {
  statistics: CustomerStatistics | null | undefined;
  customerCount: number;
  loading: boolean;
  labelForKey: {
    companyType: (key: string) => string;
    partnershipStage: (key: string) => string;
    status: (key: string) => string;
    relationshipLevel: (key: string) => string;
    geo: (key: string) => string;
  };
};

export function CustomerStatisticsSection({
  statistics,
  customerCount,
  loading,
  labelForKey,
}: CustomerStatisticsSectionProps) {
  const tr = useTr();
  const [activeGroup, setActiveGroup] = useState<StatGroup>('Pipeline');
  const [activeStat, setActiveStat] = useState<StatKey>('companyType');
  const [showEmpty, setShowEmpty] = useState(false);
  const shellRef = useRef<HTMLDivElement | null>(null);

  const stats = statistics;
  const isEmpty = !loading && customerCount === 0;
  const groupStats = statsInGroup(activeGroup);
  const activeMeta =
    STAT_CATALOG.find((item) => item.id === activeStat) ?? STAT_CATALOG[0];
  const activeStatIndex = Math.max(
    0,
    groupStats.findIndex((item) => item.id === activeStat),
  );

  const isBucketStat =
    activeStat !== 'customerNeeds' &&
    activeStat !== 'desiredStandards' &&
    activeStat !== 'remarks' &&
    activeStat !== 'customerPromise';

  const bucketData = useMemo((): LabeledBucket[] => {
    if (!stats) return [];
    const labelMap: Record<string, (key: string) => string> = {
      companyType: labelForKey.companyType,
      status: labelForKey.status,
      partnershipStage: labelForKey.partnershipStage,
      relationshipLevel: labelForKey.relationshipLevel,
      city: labelForKey.geo,
      province: labelForKey.geo,
      country: labelForKey.geo,
    };
    const sourceMap: Record<string, CustomerStatBucket[]> = {
      companyType: stats.companyType,
      status: stats.status,
      partnershipStage: stats.partnershipStage,
      relationshipLevel: stats.relationshipLevel,
      city: stats.city,
      province: stats.province,
      country: stats.country,
    };
    const buckets = sourceMap[activeStat];
    const label = labelMap[activeStat];
    if (!buckets || !label) return [];
    return filterBuckets(buckets, showEmpty).map((bucket) => ({
      ...bucket,
      label: label(bucket.key),
    }));
  }, [stats, activeStat, showEmpty, labelForKey]);

  const leaderInsight = useMemo(() => {
    if (loading || !stats || bucketData.length === 0 || !isBucketStat) return null;
    const top = bucketData[0];
    if (!top || top.count <= 0) return null;
    return {
      label: top.label,
      count: top.count,
      rate: top.rate,
    };
  }, [loading, stats, bucketData, isBucketStat]);

  const breakdownRows = useMemo((): BreakdownRow[] => {
    if (!stats) return [];

    if (
      activeStat === 'customerNeeds' ||
      activeStat === 'desiredStandards' ||
      activeStat === 'remarks'
    ) {
      const source =
        activeStat === 'customerNeeds'
          ? stats.customerNeeds
          : activeStat === 'desiredStandards'
            ? stats.desiredStandards
            : stats.remarks;
      return [
        {
          key: 'with',
          label: 'With',
          count: source.withCount,
          rate: source.withRate,
          color: COVERAGE_COLORS.with,
        },
        {
          key: 'without',
          label: 'Without',
          count: source.withoutCount,
          rate: source.withoutRate,
          color: COVERAGE_COLORS.without,
        },
      ];
    }

    if (activeStat === 'customerPromise') {
      return [];
    }

    return bucketData.map((bucket, index) => ({
      key: bucket.key,
      label: bucket.label,
      count: bucket.count,
      rate: bucket.rate,
      color: segmentColor(index),
    }));
  }, [stats, activeStat, bucketData]);

  function selectGroup(group: StatGroup) {
    setActiveGroup(group);
    setActiveStat((current) => {
      const currentItem = STAT_CATALOG.find((item) => item.id === current);
      if (currentItem?.group === group) return current;
      return statsInGroup(group)[0]?.id ?? current;
    });
  }

  function shiftStat(delta: number) {
    const pool = statsInGroup(activeGroup);
    setActiveStat((current) => {
      const idx = pool.findIndex((item) => item.id === current);
      const nextIdx =
        idx >= 0 ? (idx + delta + pool.length) % pool.length : 0;
      return pool[nextIdx]?.id ?? current;
    });
  }

  useEffect(() => {
    const node = shellRef.current;
    if (!node) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        shiftStat(-1);
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        shiftStat(1);
      }
    }

    node.addEventListener('keydown', onKeyDown);
    return () => node.removeEventListener('keydown', onKeyDown);
  }, [activeGroup]);

  function renderBody() {
    if (loading && !stats) {
      return <StatBreakdownSkeleton rows={isBucketStat ? 4 : 2} />;
    }

    if (!stats) return null;

    if (activeStat === 'customerPromise') {
      const promise = stats.customerPromise;
      return (
        <>
          <StatBreakdown
            loading={loading}
            showRank={false}
            compact
            rows={[
              {
                key: 'with',
                label: 'With promise',
                count: promise.withCount,
                rate: promise.withRate,
                color: COVERAGE_COLORS.with,
              },
              {
                key: 'without',
                label: 'Without promise',
                count: promise.withoutCount,
                rate: promise.withoutRate,
                color: COVERAGE_COLORS.without,
              },
            ]}
          />
          <div className="umkm-cstats-subsection">
            <p className="umkm-cstats-subsection-label">
              {tr('Promise breakdown')}
            </p>
            <StatBreakdown
              loading={loading}
              showRank={false}
              compact
              rows={[
                {
                  key: 'annualBonus',
                  label: 'Annual bonus',
                  count: promise.annualBonus,
                  rate: promise.annualBonusRate,
                  color: segmentColor(0),
                },
                {
                  key: 'onTimeDelivery',
                  label: 'On-time delivery',
                  count: promise.onTimeDelivery,
                  rate: promise.onTimeDeliveryRate,
                  color: segmentColor(1),
                },
                {
                  key: 'packagingBox',
                  label: 'Packaging box',
                  count: promise.packagingBox,
                  rate: promise.packagingBoxRate,
                  color: segmentColor(2),
                },
              ]}
            />
          </div>
        </>
      );
    }

    return (
      <StatBreakdown
        loading={loading}
        showRank={isBucketStat}
        compact
        rows={breakdownRows}
      />
    );
  }

  const contactLabel = loading
    ? tr('Loading…')
    : `${customerCount.toLocaleString('en-US')} ${tr(customerCount === 1 ? 'contact' : 'contacts')}`;

  return (
    <div
      ref={shellRef}
      tabIndex={0}
      className={`umkm-cstats${loading ? ' is-loading' : ''}`}
      aria-label={tr('Customer statistics')}
    >
      <div className="umkm-cstats-shell">
        <div className="umkm-cstats-toolbar">
          <div
            className="umkm-cstats-segment"
            role="tablist"
            aria-label={tr('Statistic category')}
          >
            {STAT_GROUPS.map((group) => (
              <button
                key={group}
                type="button"
                role="tab"
                className={`umkm-cstats-segment-btn${
                  activeGroup === group ? ' is-active' : ''
                }`}
                aria-selected={activeGroup === group}
                onClick={() => selectGroup(group)}
              >
                {tr(group)}
              </button>
            ))}
          </div>

          <div className="umkm-cstats-stat-chips" role="tablist" aria-label={tr('Statistic')}>
            {groupStats.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                className={`umkm-cstats-stat-chip${
                  activeStat === item.id ? ' is-active' : ''
                }`}
                aria-selected={activeStat === item.id}
                onClick={() => setActiveStat(item.id)}
              >
                {tr(item.label)}
              </button>
            ))}
          </div>

          <div className="umkm-cstats-stat-nav">
            <button
              type="button"
              className="umkm-cstats-nav-btn"
              aria-label={tr('Previous statistic')}
              onClick={() => shiftStat(-1)}
            >
              <IconChevron dir="left" />
            </button>

            <div className="umkm-cstats-stat-nav-core">
              <label className="umkm-cstats-stat-select-wrap">
                <span className="umkm-cstats-stat-select-label">{tr('Statistic')}</span>
                <select
                  className="umkm-cstats-stat-select"
                  value={activeStat}
                  onChange={(event) =>
                    setActiveStat(event.target.value as StatKey)
                  }
                >
                  {groupStats.map((item) => (
                    <option key={item.id} value={item.id}>
                      {tr(item.label)}
                    </option>
                  ))}
                </select>
              </label>
              <span className="umkm-cstats-stat-index">
                {activeStatIndex + 1}/{groupStats.length}
              </span>
            </div>

            <button
              type="button"
              className="umkm-cstats-nav-btn"
              aria-label={tr('Next statistic')}
              onClick={() => shiftStat(1)}
            >
              <IconChevron dir="right" />
            </button>
          </div>

          <div className="umkm-cstats-toolbar-meta">
            <p className="umkm-cstats-toolbar-sub">{tr(activeMeta.subtitle)}</p>
            <div className="umkm-cstats-toolbar-actions">
              <span className="umkm-cstats-count-pill">{contactLabel}</span>
              {leaderInsight ? (
                <span className="umkm-cstats-leader-pill">
                  {tr('Leading')}: {tr(leaderInsight.label)}
                  {leaderInsight.rate != null
                    ? ` · ${formatRatePercent(leaderInsight.rate)}`
                    : ''}
                </span>
              ) : null}
              {isBucketStat ? (
                <label className="umkm-cstats-toggle">
                  <input
                    type="checkbox"
                    checked={showEmpty}
                    onChange={(event) => setShowEmpty(event.target.checked)}
                  />
                  <span>{tr('Show empty')}</span>
                </label>
              ) : null}
            </div>
          </div>
        </div>

        {isEmpty ? (
          <div className="umkm-cstats-empty">
            <p>{tr('No customers in this view yet.')}</p>
            <p>
              {tr('Add contacts or widen your filters to see breakdowns here.')}
            </p>
          </div>
        ) : (
          <div className="umkm-cstats-content" key={activeStat}>
            {renderBody()}
          </div>
        )}
      </div>
    </div>
  );
}
