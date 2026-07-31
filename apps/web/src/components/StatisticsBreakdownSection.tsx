'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useTr } from '@/components/Tr';
import { formatRatePercent } from '@/lib/format-money';
import type { StatBucket, WithWithoutStats } from '@/lib/types';

export type StatisticsCatalogItem = {
  id: string;
  label: string;
  group: string;
  subtitle: string;
};

export type BreakdownRow = {
  key: string;
  label: string;
  count: number;
  rate: number | null;
  color: string;
};

export type BreakdownResult = {
  rows: BreakdownRow[];
  subsections?: Array<{ label: string; rows: BreakdownRow[] }>;
  showRank?: boolean;
};

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

export function segmentColor(index: number): string {
  return SEGMENT_COLORS[index % SEGMENT_COLORS.length];
}

function sortBuckets(buckets: StatBucket[]): StatBucket[] {
  return [...buckets].sort(
    (a, b) => b.count - a.count || a.key.localeCompare(b.key),
  );
}

export function filterBuckets(
  buckets: StatBucket[],
  showEmpty: boolean,
): StatBucket[] {
  const sorted = sortBuckets(buckets);
  if (showEmpty) return sorted;
  const visible = sorted.filter((bucket) => bucket.count > 0);
  return visible.length > 0 ? visible : sorted.slice(0, 1);
}

export function coverageRows(source: WithWithoutStats): BreakdownRow[] {
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

function rateWidth(value: number | null | undefined): CSSProperties {
  if (value == null || !Number.isFinite(value)) {
    return { ['--bar' as string]: '0%' };
  }
  const clamped = Math.max(0, Math.min(100, value));
  return { ['--bar' as string]: `${clamped}%` };
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
      <p className="umkm-cstats-no-data">
        {tr('No breakdown available for this view.')}
      </p>
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

export type StatisticsBreakdownSectionProps<TStats> = {
  ariaLabel: string;
  groups: string[];
  catalog: StatisticsCatalogItem[];
  statistics: TStats | null | undefined;
  entityCount: number;
  entityLabelSingular: string;
  entityLabelPlural: string;
  loading: boolean;
  emptyTitle: string;
  emptyDescription: string;
  isBucketStat: (statId: string) => boolean;
  getBreakdown: (args: {
    statId: string;
    statistics: TStats;
    showEmpty: boolean;
    labelForKey: (statId: string, key: string) => string;
  }) => BreakdownResult;
  labelForKey: (statId: string, key: string) => string;
};

export function StatisticsBreakdownSection<TStats>({
  ariaLabel,
  groups,
  catalog,
  statistics,
  entityCount,
  entityLabelSingular,
  entityLabelPlural,
  loading,
  emptyTitle,
  emptyDescription,
  isBucketStat,
  getBreakdown,
  labelForKey,
}: StatisticsBreakdownSectionProps<TStats>) {
  const tr = useTr();
  const [activeGroup, setActiveGroup] = useState(groups[0] ?? '');
  const [activeStat, setActiveStat] = useState(catalog[0]?.id ?? '');
  const [showEmpty, setShowEmpty] = useState(false);
  const shellRef = useRef<HTMLDivElement | null>(null);

  const isEmpty = !loading && entityCount === 0;
  const groupStats = catalog.filter((item) => item.group === activeGroup);
  const activeMeta = catalog.find((item) => item.id === activeStat) ?? catalog[0];
  const activeStatIndex = Math.max(
    0,
    groupStats.findIndex((item) => item.id === activeStat),
  );
  const bucketStat = isBucketStat(activeStat);

  const breakdown = useMemo(() => {
    if (!statistics) return null;
    return getBreakdown({
      statId: activeStat,
      statistics,
      showEmpty,
      labelForKey,
    });
  }, [statistics, activeStat, showEmpty, labelForKey, getBreakdown]);

  const leaderInsight = useMemo(() => {
    if (loading || !breakdown || !bucketStat || breakdown.rows.length === 0) {
      return null;
    }
    const top = breakdown.rows[0];
    if (!top || top.count <= 0) return null;
    return top;
  }, [loading, breakdown, bucketStat]);

  function selectGroup(group: string) {
    setActiveGroup(group);
    setActiveStat((current) => {
      const currentItem = catalog.find((item) => item.id === current);
      if (currentItem?.group === group) return current;
      return catalog.find((item) => item.group === group)?.id ?? current;
    });
  }

  function shiftStat(delta: number) {
    setActiveStat((current) => {
      const pool = catalog.filter((item) => item.group === activeGroup);
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

  function renderBody(): ReactNode {
    if (loading && !statistics) {
      return <StatBreakdownSkeleton rows={bucketStat ? 4 : 2} />;
    }
    if (!statistics || !breakdown) return null;

    return (
      <>
        <StatBreakdown
          loading={loading}
          showRank={breakdown.showRank ?? bucketStat}
          compact
          rows={breakdown.rows}
        />
        {breakdown.subsections?.map((section) => (
          <div key={section.label} className="umkm-cstats-subsection">
            <p className="umkm-cstats-subsection-label">{tr(section.label)}</p>
            <StatBreakdown
              loading={loading}
              showRank={false}
              compact
              rows={section.rows}
            />
          </div>
        ))}
      </>
    );
  }

  const entityLabel = loading
    ? tr('Loading…')
    : `${entityCount.toLocaleString('en-US')} ${tr(
        entityCount === 1 ? entityLabelSingular : entityLabelPlural,
      )}`;

  return (
    <div
      ref={shellRef}
      tabIndex={0}
      className={`umkm-cstats${loading ? ' is-loading' : ''}`}
      aria-label={tr(ariaLabel)}
    >
      <div className="umkm-cstats-shell">
        <div className="umkm-cstats-toolbar">
          <div
            className="umkm-cstats-segment"
            role="tablist"
            aria-label={tr('Statistic category')}
          >
            {groups.map((group) => (
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
                  onChange={(event) => setActiveStat(event.target.value)}
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
            <p className="umkm-cstats-toolbar-sub">
              {activeMeta ? tr(activeMeta.subtitle) : null}
            </p>
            <div className="umkm-cstats-toolbar-actions">
              <span className="umkm-cstats-count-pill">{entityLabel}</span>
              {leaderInsight ? (
                <span className="umkm-cstats-leader-pill">
                  {tr('Leading')}: {tr(leaderInsight.label)}
                  {leaderInsight.rate != null
                    ? ` · ${formatRatePercent(leaderInsight.rate)}`
                    : ''}
                </span>
              ) : null}
              {bucketStat ? (
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
            <p>{tr(emptyTitle)}</p>
            <p>{tr(emptyDescription)}</p>
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
