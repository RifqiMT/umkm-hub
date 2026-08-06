'use client';

import {
  createContext,
  type ReactNode,
  type TouchEvent as ReactTouchEvent,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import Link from 'next/link';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ComposedChart,
  ReferenceLine,
} from 'recharts';
import { api, ApiError } from '@/lib/api';
import {
  downloadChartPng,
  downloadCsv,
  slugExportName,
} from '@/lib/analytics-export';
import {
  ContentSection,
  EmptyState,
} from '@/components/PageHeader';
import { AppTooltip } from '@/components/AppTooltip';
import { FeatureStage } from '@/components/FeatureStage';
import { OptionChips } from '@/components/OptionChips';
import { CollapsibleFilters } from '@/components/CollapsibleFilters';
import {
  TimelineFilter,
  formatTimelineLabel,
  timelineToYearsParam,
  type TimelineFilterValue,
} from '@/components/TimelineFilter';
import type { AnalyticsOverview } from '@/lib/types';
import { mergeAnalyticsOverview } from '@/lib/analytics-merge';
import { LazyMount } from '@/components/analytics/LazyMount';
import { ORDER_STATUSES, PAYMENT_STATUSES } from '@/lib/enums';
import { useLabels } from '@/hooks/useLabels';
import { useTr } from '@/components/Tr';
import {
  formatMoney,
  formatMoneyParts,
  formatCompactQty,
  formatCompactQtyParts,
  formatCompactAxis,
  formatCompactAxisQty,
  formatMoneyExact,
} from '@/lib/format-money';
import {
  APP_ANNUAL_WINDOW,
  appYearOptions,
  annualWindowLabel,
} from '@/lib/app-timeline';
import {
  axisTicks,
  formatAxisDays,
  formatAxisInt,
  formatAxisPct,
  paddedDomain,
} from '@/lib/chart-domain';
import { buildAnalyticsStageMetrics } from '@/lib/feature-stage-metrics';
import { attachPeriodGrowthLabels } from '@/lib/period-growth';
import {
  abbreviateCustomerAxisLabel,
  abbreviateProductAxisLabel,
  uniqueAxisKeys,
} from '@/lib/rank-axis-label';

const CHART_GROWTH_SPECS = [
  { key: 'revenue', mode: 'pct' as const },
  { key: 'target', mode: 'pct' as const },
  { key: 'orders', mode: 'pct' as const },
  { key: 'aov', mode: 'pct' as const },
  { key: 'basket', mode: 'pct' as const },
  { key: 'frequency', mode: 'pct' as const },
  { key: 'ltv', mode: 'pct' as const },
  { key: 'productRevenue', mode: 'pct' as const },
  { key: 'attainment', mode: 'bps' as const },
  { key: 'margin', mode: 'bps' as const },
  { key: 'shipmentDays', mode: 'pct' as const },
  { key: 'invoiceDays', mode: 'pct' as const },
  { key: 'firstPaymentDays', mode: 'pct' as const },
  { key: 'paymentDays', mode: 'pct' as const },
] as const;

const STATUS_GROWTH_SPECS = [
  { key: 'PENDING', mode: 'bps' as const },
  { key: 'CONFIRMED', mode: 'bps' as const },
  { key: 'SHIPPED', mode: 'bps' as const },
  { key: 'DELIVERED', mode: 'bps' as const },
  { key: 'CANCELLED', mode: 'bps' as const },
  { key: 'orderCount', mode: 'pct' as const },
] as const;

const PAYMENT_GROWTH_SPECS = [
  { key: 'CASH', mode: 'bps' as const },
  { key: 'CONSIGNMENT', mode: 'bps' as const },
  { key: 'DELAYED_PAYMENT', mode: 'bps' as const },
  { key: 'KONTRA_BON', mode: 'bps' as const },
  { key: 'orderCount', mode: 'pct' as const },
] as const;

type Granularity = 'weekly' | 'monthly' | 'quarterly' | 'annual';

/** Chart series palette — each variable keeps a distinct hue. */
const REVENUE = '#0b6b58';
const REVENUE_SOFT = '#1a9a7e';
const TARGET = '#d97706';
const TARGET_SOFT = '#f59e0b';
const ORDERS = '#c45c28';
const AOV = '#2f8f6a';
const BASKET = '#6b9140';
const FREQUENCY = '#8b5e3c';
const LTV = '#3d6b8f';
const PRODUCT = '#0f7a6a';
const PRODUCT_LOW = '#6a9084';
const ATTAINMENT = '#0b6b58';
const MARGIN = '#2f6f8f';
const SHIPMENT = '#7a6540';
const INVOICE = '#5c7a6e';
const FIRST_PAY = '#b8864b';
const PAYMENT = '#9a4f3a';
const LTV_LOW = '#6b8499';
const GRID = 'color-mix(in srgb, #c5d4cc 55%, transparent)';
const AXIS = '#5a6f66';
const AXIS_LINE = '#c5d4cc';

/** Stacked mix — status (includes cancelled). */
const STATUS_COLORS: Record<(typeof ORDER_STATUSES)[number], string> = {
  PENDING: '#8a9b94',
  CONFIRMED: '#3d6b8f',
  SHIPPED: '#7a6540',
  DELIVERED: '#0b6b58',
  CANCELLED: '#9a4f3a',
};

/** Stacked mix — payment mode (non-cancelled orders). */
const PAYMENT_MODE_COLORS: Record<(typeof PAYMENT_STATUSES)[number], string> = {
  CASH: '#0b6b58',
  CONSIGNMENT: '#d97706',
  DELAYED_PAYMENT: '#3d6b8f',
  KONTRA_BON: '#7a4f8f',
};

function buildStatusSeries(
  orderStatus: Record<(typeof ORDER_STATUSES)[number], string>,
) {
  return ORDER_STATUSES.map((status) => ({
    label: orderStatus[status],
    color: STATUS_COLORS[status],
    style: 'bar' as const,
    dataKey: status,
  }));
}

function buildPaymentModeSeries(
  paymentStatus: Record<(typeof PAYMENT_STATUSES)[number], string>,
) {
  return PAYMENT_STATUSES.map((status) => ({
    label: paymentStatus[status],
    color: PAYMENT_MODE_COLORS[status],
    style: 'bar' as const,
    dataKey: status,
  }));
}

type ChartSeriesSwatch = { label: string; color: string; style?: 'bar' | 'line' };

/** Ranking charts show at most this many bars (products / customers). */
const RANK_LIMIT = 5;

type RankChartRow = {
  key: string;
  fullName: string;
  value: number;
  orderCount: number;
  packsSold: number;
  avgOrderValue: number | null;
  /** Packs ÷ orders for this product/customer (entity UPT). */
  avgBasketSize: number | null;
};

/** `rows` must already be sorted highest-first. */
function takeBottomRank<T>(rows: T[], n: number): T[] {
  if (rows.length === 0) return [];
  return rows.slice(-n).reverse();
}

function rankUpt(orderCount: number, packsSold: number): number | null {
  if (orderCount <= 0) return null;
  return packsSold / orderCount;
}

function toRankChartRows(
  rows: {
    name: string;
    revenue: number;
    orderCount: number;
    packsSold: number;
    avgOrderValue: number | null;
  }[],
  abbreviate: (name: string) => string,
): RankChartRow[] {
  const keys = uniqueAxisKeys(rows.map((r) => abbreviate(r.name)));
  return rows.map((r, i) => ({
    key: keys[i]!,
    fullName: r.name,
    value: r.revenue,
    orderCount: r.orderCount,
    packsSold: r.packsSold,
    avgOrderValue: r.avgOrderValue,
    avgBasketSize: rankUpt(r.orderCount, r.packsSold),
  }));
}

function RankTooltip({
  active,
  payload,
  caption,
  valueName,
}: {
  active?: boolean;
  payload?: ChartPayloadEntry[];
  caption?: string;
  valueName: string;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload as RankChartRow | undefined;
  if (!row) return null;
  const revenueRaw =
    typeof payload[0]?.value === 'number'
      ? payload[0].value
      : Number(payload[0]?.value);
  const revenue = Number.isFinite(revenueRaw) ? revenueRaw : row.value;
  const rows: TooltipRow[] = [
    {
      name: valueName,
      value: formatMoney(revenue),
      color: payload[0]?.color ?? REVENUE,
    },
    {
      name: 'Orders',
      value: formatCompactQty(row.orderCount),
      color: AXIS,
    },
    {
      name: 'Packs',
      value: formatCompactQty(row.packsSold),
      color: AXIS,
    },
    {
      name: 'AOV',
      value:
        row.avgOrderValue != null
          ? formatMoney(row.avgOrderValue)
          : '—',
      color: AXIS,
    },
    {
      name: 'UPT',
      value:
        row.avgBasketSize != null
          ? formatCompactQty(row.avgBasketSize)
          : '—',
      color: AXIS,
    },
  ];
  return (
    <ChartTooltipCard label={row.fullName} caption={caption} rows={rows} />
  );
}

function rankChartHeightRem(count: number): string {
  const n = Math.min(Math.max(count, 1), RANK_LIMIT);
  return `${(2.35 * n + 3.25).toFixed(2)}rem`;
}

function RankBarChart({
  data,
  fill,
  domain,
  valueName,
  caption,
  fullscreen = false,
}: {
  data: RankChartRow[];
  fill: string;
  domain: [number, number];
  valueName: string;
  caption: string;
  fullscreen?: boolean;
}) {
  const fsActive = useContext(AnalyticsPanelFullscreenContext);
  const isFullscreen = fullscreen ?? fsActive;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
        barCategoryGap={isFullscreen ? '12%' : '18%'}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke={GRID}
          horizontal={false}
        />
        <XAxis
          type="number"
          tickFormatter={formatCompactAxis}
          tick={{ fill: AXIS, fontSize: isFullscreen ? 12 : 11 }}
          axisLine={false}
          tickLine={false}
          domain={domain}
          ticks={axisTicks(domain)}
        />
        <YAxis
          type="category"
          dataKey="key"
          width={isFullscreen ? 112 : 78}
          interval={0}
          tick={{ fill: AXIS, fontSize: isFullscreen ? 12 : 11 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          content={
            <RankTooltip
              caption={caption}
              valueName={valueName}
            />
          }
        />
        <Bar
          dataKey="value"
          name={valueName}
          fill={fill}
          radius={[0, 7, 7, 0]}
          maxBarSize={isFullscreen ? 44 : 26}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

type ChartPanelView = 'chart' | 'table';

const AnalyticsChartViewContext = createContext<ChartPanelView>('chart');

const AnalyticsPanelFullscreenContext = createContext(false);

type AnalyticsLensControls = {
  granularity: Granularity;
  setGranularity: (value: Granularity) => void;
  chartView: ChartPanelView;
  setChartView: (value: ChartPanelView) => void;
  timeline: TimelineFilterValue;
  setTimeline: (value: TimelineFilterValue) => void;
  nowYear: number;
  timelineCaption: string | null;
};

const AnalyticsLensControlsContext =
  createContext<AnalyticsLensControls | null>(null);

/** Raw (unformatted) CSV payloads keyed by ChartPanel `panelKey`. */
type AnalyticsCsvExport = {
  columns: Array<{ key: string; label: string }>;
  rows: Array<Record<string, unknown>>;
};

const AnalyticsCsvExportContext = createContext<
  Record<string, AnalyticsCsvExport>
>({});

type ChartPanelTone =
  | 'brand'
  | 'orders'
  | 'aov'
  | 'basket'
  | 'frequency'
  | 'ltv'
  | 'product'
  | 'margin'
  | 'ship'
  | 'invoice'
  | 'firstPay'
  | 'pay';

type FsPanelKind = 'graph' | 'table';

type FsPanelMeta = {
  id: string;
  title: string;
  subtitle?: string;
  kind: FsPanelKind;
};

type FsPeek = {
  id: string;
  title: string;
  subtitle?: string;
  kind: FsPanelKind;
  index: number;
};

/**
 * Chart/table-only fullscreen for Analytics panels.
 * Native Fullscreen API targets a stable host wrapping all chart panels
 * (never <html> / app shell). Prev/next only swaps the active panel class —
 * no exit/enter — so navigation stays seamless.
 */
type FsNavDirection = 'forward' | 'back' | 'none';

type AnalyticsFullscreenApi = {
  activeId: string | null;
  panelCount: number;
  activeIndex: number;
  navDirection: FsNavDirection;
  prev: FsPeek | null;
  next: FsPeek | null;
  deck: FsPeek[];
  register: (
    id: string,
    el: HTMLElement | null,
    meta: Omit<FsPanelMeta, 'id'>,
  ) => void;
  unregister: (id: string) => void;
  open: (id: string) => void;
  close: () => void;
  goRelative: (delta: number) => void;
  goTo: (index: number) => void;
};

const AnalyticsFullscreenContext =
  createContext<AnalyticsFullscreenApi | null>(null);

function nudgeFullscreenCharts() {
  window.dispatchEvent(new Event('resize'));
}

/** Recharts needs a settled layout; nudge across frames + after motion. */
function scheduleFullscreenChartResize() {
  requestAnimationFrame(() => {
    nudgeFullscreenCharts();
    requestAnimationFrame(() => {
      nudgeFullscreenCharts();
      window.setTimeout(nudgeFullscreenCharts, 320);
    });
  });
}

/**
 * Enter native fullscreen on the Analytics charts host once.
 * Never targets documentElement — app chrome stays outside the FS tree.
 */
async function ensureHostFullscreen(hostEl: HTMLElement | null | undefined) {
  if (!hostEl) return;
  const active = activeFullscreenElement();
  try {
    if (active === hostEl) return;
    if (active && active !== hostEl) {
      await exitBrowserFullscreen();
    }
    if (activeFullscreenElement() !== hostEl) {
      await enterBrowserFullscreen(hostEl);
    }
  } catch {
    // Unsupported / blocked — CSS fixed cover still isolates the panel.
  }
}

function AnalyticsFullscreenProvider({ children }: { children: ReactNode }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const orderRef = useRef<string[]>([]);
  const elsRef = useRef(new Map<string, HTMLElement>());
  const metasRef = useRef(new Map<string, FsPanelMeta>());
  const activeIdRef = useRef<string | null>(null);
  const closingRef = useRef(false);
  /** Ignore transient fullscreenchange while entering native FS. */
  const enteringFsRef = useRef(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [navDirection, setNavDirection] = useState<FsNavDirection>('none');
  const [orderTick, setOrderTick] = useState(0);
  const [metaTick, setMetaTick] = useState(0);

  activeIdRef.current = activeId;

  const register = useCallback(
    (id: string, el: HTMLElement | null, meta: Omit<FsPanelMeta, 'id'>) => {
      if (el) elsRef.current.set(id, el);
      else elsRef.current.delete(id);
      const nextMeta: FsPanelMeta = { id, ...meta };
      const prevMeta = metasRef.current.get(id);
      metasRef.current.set(id, nextMeta);
      if (!orderRef.current.includes(id)) {
        orderRef.current.push(id);
        setOrderTick((t) => t + 1);
        return;
      }
      if (
        !prevMeta ||
        prevMeta.title !== nextMeta.title ||
        prevMeta.subtitle !== nextMeta.subtitle ||
        prevMeta.kind !== nextMeta.kind
      ) {
        setMetaTick((t) => t + 1);
      }
    },
    [],
  );

  const unregister = useCallback((id: string) => {
    elsRef.current.delete(id);
    metasRef.current.delete(id);
    if (!orderRef.current.includes(id)) return;
    orderRef.current = orderRef.current.filter((x) => x !== id);
    setOrderTick((t) => t + 1);
    // Defer close so React Strict Mode remount can re-register first.
    queueMicrotask(() => {
      if (
        activeIdRef.current === id &&
        !orderRef.current.includes(id)
      ) {
        setActiveId(null);
      }
    });
  }, []);

  const close = useCallback(() => {
    closingRef.current = true;
    setActiveId(null);
    setNavDirection('none');
    void exitBrowserFullscreen().finally(() => {
      closingRef.current = false;
    });
  }, []);

  const activate = useCallback((id: string, direction: FsNavDirection) => {
    closingRef.current = false;
    setNavDirection(direction);
    setActiveId(id);
    scheduleFullscreenChartResize();
  }, []);

  const open = useCallback(
    (id: string) => {
      if (!orderRef.current.includes(id) && !elsRef.current.has(id)) return;
      if (!orderRef.current.includes(id)) {
        orderRef.current.push(id);
        setOrderTick((t) => t + 1);
      }
      activate(id, 'none');
    },
    [activate],
  );

  // Keep native FS on the stable host. Prev/next must NOT exit/enter FS.
  useLayoutEffect(() => {
    if (!activeId) return;
    const host = hostRef.current;
    if (!host) return;
    if (activeFullscreenElement() === host) {
      scheduleFullscreenChartResize();
      return;
    }
    enteringFsRef.current = true;
    void ensureHostFullscreen(host).finally(() => {
      enteringFsRef.current = false;
      scheduleFullscreenChartResize();
    });
  }, [activeId]);

  const goRelative = useCallback(
    (delta: number) => {
      const order = orderRef.current;
      const current = activeIdRef.current;
      if (!current || order.length < 2) return;
      const idx = order.indexOf(current);
      if (idx < 0) return;
      activate(
        order[(idx + delta + order.length) % order.length]!,
        delta >= 0 ? 'forward' : 'back',
      );
    },
    [activate],
  );

  const goTo = useCallback(
    (index: number) => {
      const order = orderRef.current;
      if (index < 0 || index >= order.length) return;
      const id = order[index]!;
      const current = activeIdRef.current;
      if (id === current) return;
      const currentIdx = current ? order.indexOf(current) : -1;
      const direction: FsNavDirection =
        currentIdx < 0
          ? 'none'
          : index > currentIdx
            ? 'forward'
            : 'back';
      activate(id, direction);
    },
    [activate],
  );

  const isFsOpen = activeId != null;

  useEffect(() => {
    if (!isFsOpen) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.classList.add('umkm-analytics-fs-open');

    const syncExit = () => {
      // User left native fullscreen via browser UI / Esc.
      if (closingRef.current || enteringFsRef.current) return;
      const active = activeFullscreenElement();
      if (!active) {
        setActiveId(null);
        setNavDirection('none');
        return;
      }
      // Ignore FS on unrelated elements; only our host keeps cinema open.
      if (hostRef.current && active !== hostRef.current) {
        setActiveId(null);
        setNavDirection('none');
        return;
      }
      scheduleFullscreenChartResize();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goRelative(-1);
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        goRelative(1);
        return;
      }
      if (e.key !== 'Escape') return;
      // Native fullscreen consumes Esc; syncExit clears activeId after.
      if (activeFullscreenElement()) return;
      e.preventDefault();
      close();
    };

    document.addEventListener('fullscreenchange', syncExit);
    document.addEventListener('webkitfullscreenchange', syncExit);
    document.addEventListener('MSFullscreenChange', syncExit);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      document.documentElement.classList.remove('umkm-analytics-fs-open');
      document.removeEventListener('fullscreenchange', syncExit);
      document.removeEventListener('webkitfullscreenchange', syncExit);
      document.removeEventListener('MSFullscreenChange', syncExit);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isFsOpen, goRelative, close]);

  useEffect(() => {
    if (activeId) return;
    document.documentElement.classList.remove('umkm-analytics-fs-open');
    void exitBrowserFullscreen();
  }, [activeId]);

  void orderTick;
  void metaTick;
  const order = orderRef.current;
  const activeIndex = activeId ? order.indexOf(activeId) : -1;
  const deck: FsPeek[] = order.map((id, index) => {
    const meta = metasRef.current.get(id);
    return {
      id,
      title: meta?.title ?? 'Chart',
      subtitle: meta?.subtitle,
      kind: meta?.kind ?? 'graph',
      index,
    };
  });
  const prev =
    activeIndex >= 0 && deck.length > 1
      ? deck[(activeIndex - 1 + deck.length) % deck.length]!
      : null;
  const next =
    activeIndex >= 0 && deck.length > 1
      ? deck[(activeIndex + 1) % deck.length]!
      : null;

  const api = useMemo<AnalyticsFullscreenApi>(
    () => ({
      activeId,
      panelCount: order.length,
      activeIndex,
      navDirection,
      prev,
      next,
      deck,
      register,
      unregister,
      open,
      close,
      goRelative,
      goTo,
    }),
    [
      activeId,
      activeIndex,
      navDirection,
      order.length,
      prev,
      next,
      deck,
      register,
      unregister,
      open,
      close,
      goRelative,
      goTo,
    ],
  );

  return (
    <AnalyticsFullscreenContext.Provider value={api}>
      <div
        ref={hostRef}
        className={`umkm-analytics-fs-host${isFsOpen ? ' is-open' : ''}`}
        data-analytics-fs={isFsOpen ? 'open' : 'closed'}
      >
        {children}
      </div>
    </AnalyticsFullscreenContext.Provider>
  );
}

type SeriesTableColumn = {
  key: string;
  label: string;
  align?: 'start' | 'end';
};

type SeriesTableRow = {
  id: string;
  cells: Record<string, string>;
};

function SeriesTable({
  columns,
  rows,
  caption,
}: {
  columns: SeriesTableColumn[];
  rows: SeriesTableRow[];
  caption?: string;
}) {
  const tr = useTr();
  if (rows.length === 0) {
    return (
      <ChartState>{caption ? tr(caption) : tr('No data for this period')}</ChartState>
    );
  }

  return (
    <div className="umkm-analytics-series-table-wrap">
      <table className="umkm-analytics-series-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={col.align === 'end' ? 'is-num' : undefined}
              >
                {tr(col.label)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={col.align === 'end' ? 'is-num' : undefined}
                >
                  {row.cells[col.key] ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CsvIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M14 3v6h6M8 13h8M8 17h5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PngIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="3"
        y="5"
        width="18"
        height="14"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle cx="9" cy="10" r="1.6" fill="currentColor" />
      <path
        d="m7 16 3.2-3.2a1 1 0 0 1 1.4 0L15 16l1.3-1.3a1 1 0 0 1 1.4 0L21 16"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ExpandIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9 3H3v6M15 3h6v6M9 21H3v-6M21 15v6h-6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CollapseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9 9H3V3M15 9h6V3M9 15H3v6M21 15v6h-6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M15 5 8 12l7 7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="m9 5 7 7-7 7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

async function enterBrowserFullscreen(el: HTMLElement) {
  const anyEl = el as HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void> | void;
    msRequestFullscreen?: () => Promise<void> | void;
  };
  try {
    if (anyEl.requestFullscreen) {
      await anyEl.requestFullscreen({ navigationUI: 'hide' });
      return;
    }
    if (anyEl.webkitRequestFullscreen) {
      await anyEl.webkitRequestFullscreen();
      return;
    }
    if (anyEl.msRequestFullscreen) {
      await anyEl.msRequestFullscreen();
    }
  } catch {
    // Permission denied / unsupported — CSS viewport overlay still covers the app.
  }
}

function activeFullscreenElement(): Element | null {
  const doc = document as Document & {
    webkitFullscreenElement?: Element | null;
    msFullscreenElement?: Element | null;
  };
  return (
    document.fullscreenElement ??
    doc.webkitFullscreenElement ??
    doc.msFullscreenElement ??
    null
  );
}

async function exitBrowserFullscreen() {
  if (!activeFullscreenElement()) return;
  const doc = document as Document & {
    webkitExitFullscreen?: () => Promise<void> | void;
    msExitFullscreen?: () => Promise<void> | void;
  };
  try {
    if (document.exitFullscreen) {
      await document.exitFullscreen();
      return;
    }
    if (doc.webkitExitFullscreen) {
      await doc.webkitExitFullscreen();
      return;
    }
    if (doc.msExitFullscreen) {
      await doc.msExitFullscreen();
    }
  } catch {
    // Ignore exit race when already left fullscreen.
  }
}

function csvCell(value: unknown): string | number {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : '';
  }
  return String(value);
}

function downloadAnalyticsCsvExport(
  filename: string,
  exportData: AnalyticsCsvExport,
): void {
  const headers = exportData.columns.map((c) => c.label);
  const rows = exportData.rows.map((row) => {
    const out: Record<string, unknown> = {};
    for (const col of exportData.columns) {
      out[col.label] = csvCell(row[col.key]);
    }
    return out;
  });
  downloadCsv(filename, headers, rows);
}

function ChartPanel({
  panelKey,
  title,
  subtitle,
  tone = 'brand',
  series,
  chartHeight,
  table,
  children,
}: {
  /** Stable id so remounts (period change) keep fullscreen on this panel. */
  panelKey: string;
  title: string;
  subtitle?: string;
  tone?: ChartPanelTone;
  series?: ChartSeriesSwatch[];
  /** Optional fixed chart body height (e.g. ranking bars). */
  chartHeight?: string;
  /** Shown when the lens Graph | Table toggle is Table (falls back to chart if omitted). */
  table?: ReactNode;
  children: ReactNode;
}) {
  const tr = useTr();
  const view = useContext(AnalyticsChartViewContext);
  const lens = useContext(AnalyticsLensControlsContext);
  const fs = useContext(AnalyticsFullscreenContext);
  const csvByPanel = useContext(AnalyticsCsvExportContext);
  const csvExport = csvByPanel[panelKey];
  const showChart = view === 'chart' || table == null;
  const panelId = panelKey;
  const isFullscreenActive = fs?.activeId === panelId;
  const panelRef = useRef<HTMLElement>(null);
  const chartCaptureRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const stageFillRef = useRef<HTMLDivElement>(null);
  const register = fs?.register;
  const unregister = fs?.unregister;
  const kind: FsPanelKind = showChart ? 'graph' : 'table';
  /** Bump to remount Recharts after the FS stage has a real height. */
  const [chartEpoch, setChartEpoch] = useState(0);
  const [exportingPng, setExportingPng] = useState(false);
  const [exportError, setExportError] = useState('');

  const exportBasename = slugExportName(`${panelKey}-${title}`);
  const canExportCsv = Boolean(csvExport && csvExport.rows.length > 0);
  const panelTitle = tr(title);
  const panelSubtitle = subtitle ? tr(subtitle) : undefined;

  useLayoutEffect(() => {
    if (!register || !unregister) return;
    register(panelId, panelRef.current, { title, subtitle, kind });
    return () => unregister(panelId);
  }, [register, unregister, panelId, title, subtitle, kind]);

  const touchStartX = useRef<number | null>(null);
  const navDirection = fs?.navDirection ?? 'none';

  useLayoutEffect(() => {
    if (!isFullscreenActive) return;
    closeBtnRef.current?.focus({ preventScroll: true });
    // Remount once when this panel becomes active — not on every nav nudge.
    setChartEpoch((n) => n + 1);
    scheduleFullscreenChartResize();
  }, [isFullscreenActive]);

  useEffect(() => {
    if (!isFullscreenActive) return;
    const el = stageFillRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      nudgeFullscreenCharts();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [isFullscreenActive, chartEpoch]);

  function onDownloadCsv() {
    if (!csvExport || csvExport.rows.length === 0) return;
    setExportError('');
    downloadAnalyticsCsvExport(exportBasename, csvExport);
  }

  async function onDownloadPng() {
    const target = chartCaptureRef.current;
    if (!target || exportingPng) return;
    setExportError('');
    setExportingPng(true);
    try {
      // Let layout settle (esp. after fullscreen remount) before capture.
      await new Promise<void>((r) => requestAnimationFrame(() => r()));
      await downloadChartPng(target, exportBasename, {
        backgroundColor:
          getComputedStyle(document.documentElement)
            .getPropertyValue('--surface')
            .trim() || '#ffffff',
      });
    } catch (err) {
      console.error('Analytics chart PNG export failed', err);
      setExportError('PNG export failed—try again.');
    } finally {
      setExportingPng(false);
    }
  }

  const exportTools = (
    <>
      {!showChart && canExportCsv ? (
        <button
          type="button"
          className="umkm-analytics-export-btn is-tool"
          aria-label={`${tr('Download')} ${panelTitle} ${tr('as CSV')}`}
          title={tr('Download table as CSV')}
          onClick={onDownloadCsv}
        >
          <CsvIcon />
          <span>CSV</span>
        </button>
      ) : null}
      {showChart ? (
        <button
          type="button"
          className="umkm-analytics-export-btn is-tool"
          aria-label={`${tr('Download')} ${panelTitle} ${tr('as PNG')}`}
          title={tr('Download high-resolution PNG')}
          disabled={exportingPng}
          onClick={() => void onDownloadPng()}
        >
          <PngIcon />
          <span>{exportingPng ? '…' : 'PNG'}</span>
        </button>
      ) : null}
    </>
  );

  const panelBody = showChart ? (
    <LazyMount
      force={isFullscreenActive}
      minHeight={
        isFullscreenActive
          ? 0
          : chartHeight && !isFullscreenActive
            ? chartHeight
            : 220
      }
      className={isFullscreenActive ? 'umkm-analytics-lazy is-fs-fill' : undefined}
    >
      <div
        ref={chartCaptureRef}
        key={isFullscreenActive ? `fs-chart-${chartEpoch}` : 'chart'}
        className={`umkm-analytics-chart${chartHeight ? ' is-rank' : ''}${isFullscreenActive ? ' is-fs-fill' : ''}`}
        style={
          chartHeight && !isFullscreenActive
            ? { height: chartHeight, minHeight: chartHeight }
            : undefined
        }
      >
        <AnalyticsPanelFullscreenContext.Provider value={isFullscreenActive}>
          {children}
        </AnalyticsPanelFullscreenContext.Provider>
      </div>
    </LazyMount>
  ) : (
    <div
      key={isFullscreenActive ? `fs-table-${chartEpoch}` : 'table'}
      className={`umkm-analytics-chart is-table${isFullscreenActive ? ' is-fs-fill' : ''}`}
    >
      {table}
    </div>
  );

  const seriesLegend =
    showChart && series && series.length > 0 ? (
      <ul
        className={`umkm-analytics-chart-series${isFullscreenActive ? ' is-fs-compact' : ''}`}
        aria-label={tr('Series')}
      >
        {series.map((s) => (
          <li key={s.label}>
            <i
              className={`umkm-analytics-chart-swatch is-${s.style ?? 'bar'}`}
              style={{ ['--swatch' as string]: s.color }}
              aria-hidden
            />
            <span>{s.label}</span>
          </li>
        ))}
      </ul>
    ) : null;

  const prev = fs?.prev ?? null;
  const next = fs?.next ?? null;
  const deck = fs?.deck ?? [];
  const activeIndex = fs?.activeIndex ?? 0;
  const panelCount = fs?.panelCount ?? 1;
  const progressPct =
    panelCount > 0 ? ((activeIndex + 1) / panelCount) * 100 : 0;

  const onStageTouchStart = (e: ReactTouchEvent) => {
    touchStartX.current = e.changedTouches[0]?.clientX ?? null;
  };
  const onStageTouchEnd = (e: ReactTouchEvent) => {
    const start = touchStartX.current;
    const end = e.changedTouches[0]?.clientX;
    touchStartX.current = null;
    if (start == null || end == null || !fs || panelCount < 2) return;
    const delta = end - start;
    if (Math.abs(delta) < 56) return;
    fs.goRelative(delta < 0 ? 1 : -1);
  };

  const fsClass = isFullscreenActive
    ? ` is-fullscreen${navDirection === 'none' ? ' is-fs-enter' : ''}`
    : '';

  return (
    <article
      ref={panelRef}
      className={`umkm-analytics-chart-panel tone-${tone}${fsClass}`}
      aria-modal={isFullscreenActive || undefined}
      role={isFullscreenActive ? 'dialog' : undefined}
      aria-label={isFullscreenActive ? panelTitle : undefined}
    >
      {isFullscreenActive ? (
        <>
          <div className="umkm-analytics-fs-progress-track" aria-hidden>
            <i style={{ width: `${progressPct}%` }} />
          </div>

          <header className="umkm-analytics-fs-top">
            <div className="umkm-analytics-fs-identity">
              <div className="umkm-analytics-fs-identity-row">
                <span className={`umkm-analytics-fs-mode is-${kind}`}>
                  {kind === 'graph' ? tr('Graph') : tr('Table')}
                </span>
                <span className="umkm-analytics-fs-progress" aria-live="polite">
                  {activeIndex + 1} / {panelCount}
                </span>
              </div>
              <h3 className="umkm-analytics-fs-title">{panelTitle}</h3>
              {panelSubtitle ? (
                <p className="umkm-analytics-fs-sub">{panelSubtitle}</p>
              ) : null}
            </div>
            <div className="umkm-analytics-fs-top-tools">
              {seriesLegend}
              {exportTools}
              <button
                ref={closeBtnRef}
                type="button"
                className="umkm-analytics-fs-btn is-close"
                aria-label={`${tr('Exit fullscreen')} ${panelTitle}`}
                title={tr('Exit fullscreen (Esc)')}
                onClick={() => fs?.close()}
              >
                <CollapseIcon />
                <span className="umkm-analytics-fs-btn-label">{tr('Exit')}</span>
              </button>
            </div>
          </header>

          {lens ? (
            <div className="umkm-analytics-fs-lens" aria-label={tr('Chart controls')}>
              <OptionChips
                aria-label={tr('Chart period')}
                className="umkm-analytics-fs-lens-period"
                size="sm"
                value={lens.granularity}
                onChange={(v) => {
                  if (
                    v === 'weekly' ||
                    v === 'monthly' ||
                    v === 'quarterly' ||
                    v === 'annual'
                  ) {
                    lens.setGranularity(v);
                  }
                }}
                options={[
                  { value: 'weekly', label: tr('Weekly') },
                  { value: 'monthly', label: tr('Monthly') },
                  { value: 'quarterly', label: tr('Quarterly') },
                  { value: 'annual', label: tr('Annual') },
                ]}
              />
              <TimelineFilter
                id={`${panelId}-fs-timeline`}
                className="umkm-analytics-fs-lens-timeline"
                label=""
                aria-label={tr('Timeline')}
                value={lens.timeline}
                years={appYearOptions(lens.nowYear)}
                nowYear={lens.nowYear}
                allLabel={tr('All timelines')}
                caption={lens.timelineCaption}
                onChange={lens.setTimeline}
              />
              <OptionChips
                aria-label={tr('Chart view')}
                className="umkm-analytics-fs-lens-view"
                size="sm"
                value={lens.chartView}
                onChange={(v) => {
                  if (v === 'chart' || v === 'table') lens.setChartView(v);
                }}
                options={[
                  { value: 'chart', label: tr('Graph') },
                  { value: 'table', label: tr('Table') },
                ]}
              />
            </div>
          ) : null}

          <div
            className={`umkm-analytics-fs-stage is-nav-${navDirection}`}
            onTouchStart={onStageTouchStart}
            onTouchEnd={onStageTouchEnd}
          >
            <div className="umkm-analytics-fs-canvas">
              <div ref={stageFillRef} className="umkm-analytics-fs-canvas-fill">
                {panelBody}
              </div>
            </div>
          </div>

          <footer className="umkm-analytics-fs-dock">
            {panelCount > 1 ? (
              <div className="umkm-analytics-fs-nav" aria-label={tr('Chart navigation')}>
                <button
                  type="button"
                  className="umkm-analytics-fs-nav-btn is-prev"
                  aria-label={
                    prev
                      ? `${tr('Previous')}: ${tr(prev.title)}`
                      : tr('Previous chart')
                  }
                  disabled={!prev}
                  onClick={() => fs?.goRelative(-1)}
                >
                  <span className="umkm-analytics-fs-nav-icon" aria-hidden>
                    <ChevronLeftIcon />
                  </span>
                  <span className="umkm-analytics-fs-nav-copy">
                    <span className="umkm-analytics-fs-nav-kicker">{tr('Previous')}</span>
                    <span className="umkm-analytics-fs-nav-title">
                      {prev ? tr(prev.title) : '—'}
                    </span>
                    {prev ? (
                      <span className="umkm-analytics-fs-nav-meta">
                        {prev.index + 1}/{panelCount}
                        {prev.subtitle ? ` · ${tr(prev.subtitle)}` : ''}
                      </span>
                    ) : null}
                  </span>
                </button>

                <button
                  type="button"
                  className="umkm-analytics-fs-nav-btn is-next"
                  aria-label={
                    next ? `${tr('Next')}: ${tr(next.title)}` : tr('Next chart')
                  }
                  disabled={!next}
                  onClick={() => fs?.goRelative(1)}
                >
                  <span className="umkm-analytics-fs-nav-copy">
                    <span className="umkm-analytics-fs-nav-kicker">{tr('Next')}</span>
                    <span className="umkm-analytics-fs-nav-title">
                      {next ? tr(next.title) : '—'}
                    </span>
                    {next ? (
                      <span className="umkm-analytics-fs-nav-meta">
                        {next.index + 1}/{panelCount}
                        {next.subtitle ? ` · ${tr(next.subtitle)}` : ''}
                      </span>
                    ) : null}
                  </span>
                  <span className="umkm-analytics-fs-nav-icon" aria-hidden>
                    <ChevronRightIcon />
                  </span>
                </button>
              </div>
            ) : null}

            <div className="umkm-analytics-fs-dock-bar">
              {panelCount > 1 ? (
                <div
                  className="umkm-analytics-fs-dots"
                  role="tablist"
                  aria-label={tr('All charts')}
                >
                  {deck.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      role="tab"
                      aria-selected={item.index === activeIndex}
                      className={`umkm-analytics-fs-dot${item.index === activeIndex ? ' is-active' : ''}`}
                      title={tr(item.title)}
                      aria-label={`${tr('Show')} ${tr(item.title)}`}
                      onClick={() => fs?.goTo(item.index)}
                    />
                  ))}
                </div>
              ) : (
                <span />
              )}
              <p className="umkm-analytics-fs-hints">
                <kbd>←</kbd>
                <kbd>→</kbd>
                <span>{tr('switch')}</span>
                <span className="umkm-analytics-fs-hints-sep">·</span>
                <span>{tr('swipe')}</span>
                <span className="umkm-analytics-fs-hints-sep">·</span>
                <kbd>Esc</kbd>
                <span>{tr('exit')}</span>
              </p>
            </div>
          </footer>
        </>
      ) : (
        <>
          <header className="umkm-analytics-chart-head">
            <div className="umkm-analytics-chart-head-text">
              <h3 className="umkm-analytics-chart-title">{panelTitle}</h3>
              {panelSubtitle ? (
                <p className="umkm-analytics-chart-sub">{panelSubtitle}</p>
              ) : null}
            </div>
            <div className="umkm-analytics-chart-head-tools">
              {seriesLegend}
              {exportTools}
              {fs ? (
                <button
                  type="button"
                  className="umkm-analytics-fs-btn"
                  aria-label={`${tr('Open')} ${panelTitle} ${tr('in fullscreen')}`}
                  title={tr('Fullscreen')}
                  onClick={() => fs.open(panelId)}
                >
                  <ExpandIcon />
                </button>
              ) : null}
            </div>
          </header>
          {exportError ? (
            <p className="umkm-analytics-export-error" role="alert">
              {exportError}
            </p>
          ) : null}
          {panelBody}
        </>
      )}
    </article>
  );
}

function ChartState({ children }: { children: ReactNode }) {
  return <div className="umkm-analytics-chart-placeholder">{children}</div>;
}

function RankSeriesTable({
  rows,
  valueLabel,
  empty,
}: {
  rows: RankChartRow[];
  valueLabel: string;
  empty?: string;
}) {
  const tr = useTr();
  return (
    <SeriesTable
      caption={empty}
      columns={[
        { key: 'name', label: tr('Name') },
        { key: 'value', label: tr(valueLabel), align: 'end' },
        { key: 'orders', label: tr('Orders'), align: 'end' },
        { key: 'packs', label: tr('Packs'), align: 'end' },
        { key: 'aov', label: tr('AOV'), align: 'end' },
        { key: 'upt', label: tr('UPT'), align: 'end' },
      ]}
      rows={rows.map((row) => ({
        id: row.key,
        cells: {
          name: row.fullName,
          value: formatMoney(row.value),
          orders: formatCompactQty(row.orderCount),
          packs: formatCompactQty(row.packsSold),
          aov:
            row.avgOrderValue == null ? '—' : formatMoney(row.avgOrderValue),
          upt:
            row.avgBasketSize == null
              ? '—'
              : formatCompactQty(row.avgBasketSize),
        },
      }))}
    />
  );
}

function periodTableLabel(granularity: Granularity): string {
  if (granularity === 'weekly') return 'Week';
  if (granularity === 'monthly') return 'Month';
  if (granularity === 'quarterly') return 'Quarter';
  return 'Year';
}

function formatTablePct(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${value.toLocaleString(undefined, {
    maximumFractionDigits: 1,
  })}%`;
}

function formatTableDays(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${value.toLocaleString(undefined, {
    maximumFractionDigits: 1,
  })} d`;
}

function formatTableMoney(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return '—';
  return formatMoney(value);
}

function downloadProductPerformanceCsv(
  filename: string,
  products: Array<{
    name: string;
    unit: string;
    orderCount: number;
    packsSold: number;
    qtySold: number;
    grossRevenue: number;
    revenue: number;
    avgOrderValue: number | null;
    firstRepeatOrderDays: number | null;
    avgRepeatOrderDays: number | null;
    discount: number;
    discountPercent: number | null;
    cost: number | null;
    costPercent: number | null;
    profit: number | null;
    marginPercent: number | null;
  }>,
) {
  downloadCsv(
    filename,
    [
      'Product',
      'Unit',
      'Orders',
      'Packs sold',
      'Qty sold',
      'Gross revenue',
      'Discount',
      'Discount %',
      'Net revenue',
      'Avg order value',
      'First repeat days',
      'Avg repeat days',
      'Cost',
      'Cost %',
      'Profit',
      'Margin %',
    ],
    products.map((p) => ({
      Product: p.name,
      Unit: p.unit,
      Orders: p.orderCount,
      'Packs sold': p.packsSold,
      'Qty sold': p.qtySold,
      'Gross revenue': p.grossRevenue,
      Discount: p.discount,
      'Discount %': p.discountPercent,
      'Net revenue': p.revenue,
      'Avg order value': p.avgOrderValue,
      'First repeat days': p.firstRepeatOrderDays,
      'Avg repeat days': p.avgRepeatOrderDays,
      Cost: p.cost,
      'Cost %': p.costPercent,
      Profit: p.profit,
      'Margin %': p.marginPercent,
    })),
  );
}

function downloadCustomerPerformanceCsv(
  filename: string,
  customers: Array<{
    name: string;
    companyName: string;
    companyType: string;
    orderCount: number;
    packsSold: number;
    grossRevenue: number;
    revenue: number;
    avgOrderValue: number | null;
    firstRepeatOrderDays: number | null;
    avgRepeatOrderDays: number | null;
    discount: number;
    discountPercent: number | null;
    cost: number | null;
    costPercent: number | null;
    profit: number | null;
    marginPercent: number | null;
  }>,
) {
  downloadCsv(
    filename,
    [
      'Customer',
      'Company',
      'Company type',
      'Orders',
      'Packs sold',
      'Gross revenue',
      'Discount',
      'Discount %',
      'Net revenue',
      'Avg order value',
      'First repeat days',
      'Avg repeat days',
      'Cost',
      'Cost %',
      'Profit',
      'Margin %',
    ],
    customers.map((c) => ({
      Customer: c.name,
      Company: c.companyName,
      'Company type': c.companyType,
      Orders: c.orderCount,
      'Packs sold': c.packsSold,
      'Gross revenue': c.grossRevenue,
      Discount: c.discount,
      'Discount %': c.discountPercent,
      'Net revenue': c.revenue,
      'Avg order value': c.avgOrderValue,
      'First repeat days': c.firstRepeatOrderDays,
      'Avg repeat days': c.avgRepeatOrderDays,
      Cost: c.cost,
      'Cost %': c.costPercent,
      Profit: c.profit,
      'Margin %': c.marginPercent,
    })),
  );
}

function formatTableQty(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return '—';
  return formatCompactQty(value);
}

type TooltipRow = {
  name: string;
  value: string;
  color: string;
  /** Period-over-period growth, e.g. +12.5% or +200 bps. */
  growth?: string | null;
};

function growthToneClass(growth: string | null | undefined): string | undefined {
  if (!growth) return undefined;
  if (growth.startsWith('+')) return 'is-up';
  if (growth.startsWith('-')) return 'is-down';
  return undefined;
}

function ChartTooltipCard({
  label,
  caption,
  rows,
}: {
  label?: string;
  caption?: string;
  rows: TooltipRow[];
}) {
  if (rows.length === 0) return null;
  return (
    <div className="umkm-chart-tooltip">
      {label ? <p className="umkm-chart-tooltip-label">{label}</p> : null}
      {caption ? <p className="umkm-chart-tooltip-caption">{caption}</p> : null}
      <ul className="umkm-chart-tooltip-rows">
        {rows.map((row) => (
          <li key={row.name}>
            <i style={{ background: row.color }} aria-hidden />
            <span>{row.name}</span>
            <strong>
              {row.value}
              {row.growth ? (
                <em
                  className={`umkm-chart-tooltip-growth ${growthToneClass(row.growth) ?? ''}`.trim()}
                >
                  {row.growth}
                </em>
              ) : null}
            </strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

function growthFromPayload(
  payload: Record<string, unknown> | undefined,
  dataKey: string,
): string | null {
  const labels = payload?.growthLabels;
  if (!labels || typeof labels !== 'object') return null;
  const value = (labels as Record<string, unknown>)[dataKey];
  return typeof value === 'string' ? value : null;
}

type ChartPayloadEntry = {
  dataKey?: string | number;
  value?: number | string;
  name?: string;
  color?: string;
  payload?: Record<string, unknown>;
};

function SeriesTooltip({
  active,
  payload,
  label,
  caption,
  formatValue,
  labelFromPayload,
  hideZero = false,
}: {
  active?: boolean;
  payload?: ChartPayloadEntry[];
  label?: string;
  caption?: string;
  formatValue?: (value: number, dataKey: string, name: string) => string;
  labelFromPayload?: (payload: ChartPayloadEntry[]) => string | undefined;
  /** Omit 0-valued series (useful for stacked mix tooltips). */
  hideZero?: boolean;
}) {
  if (!active || !payload?.length) return null;
  const rows: TooltipRow[] = [];
  const seen = new Set<string>();
  for (const entry of payload) {
    const key = String(entry.dataKey ?? entry.name ?? '');
    if (!key || seen.has(key)) continue;
    const raw =
      typeof entry.value === 'number' ? entry.value : Number(entry.value);
    if (!Number.isFinite(raw)) continue;
    if (hideZero && raw === 0) continue;
    seen.add(key);
    const name = String(entry.name ?? key);
    rows.push({
      name,
      value: formatValue ? formatValue(raw, key, name) : String(raw),
      color: entry.color ?? REVENUE,
      growth: growthFromPayload(entry.payload, key),
    });
  }
  const resolvedLabel = labelFromPayload?.(payload) ?? label;
  return (
    <ChartTooltipCard label={resolvedLabel} caption={caption} rows={rows} />
  );
}

function RevenueTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: ChartPayloadEntry[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const rows: TooltipRow[] = [];
  const seen = new Set<string>();
  for (const entry of payload) {
    const key = String(entry.dataKey ?? entry.name ?? '');
    if (seen.has(key)) continue;
    const raw =
      typeof entry.value === 'number' ? entry.value : Number(entry.value);
    if (!Number.isFinite(raw)) continue;
    if (key === 'revenue') {
      seen.add(key);
      rows.push({
        name: 'Revenue',
        value: formatMoney(raw),
        color: REVENUE,
        growth: growthFromPayload(entry.payload, key),
      });
    } else if (key === 'target') {
      seen.add(key);
      rows.push({
        name: 'Target',
        value: formatMoney(raw),
        color: TARGET,
        growth: growthFromPayload(entry.payload, key),
      });
    }
  }
  return (
    <ChartTooltipCard
      label={label}
      caption="Actual sales versus your revenue plan for this period. Growth is vs the prior period."
      rows={rows}
    />
  );
}

function formatPct(value: number | null | undefined) {
  if (value == null) return '—';
  return `${value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  })}%`;
}

/** Product-table rate labels — always one decimal for scannable consistency. */
function formatRatePct(value: number | null | undefined) {
  if (value == null) return '—';
  return `${value.toLocaleString(undefined, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;
}

function formatDays(value: number | null | undefined) {
  if (value == null) return '—';
  return `${value.toLocaleString(undefined, {
    maximumFractionDigits: 1,
  })} d`;
}

/** First + avg repeat stacked in one table cell. */
function RepeatDaysCell({
  first,
  avg,
}: {
  first: number | null | undefined;
  avg: number | null | undefined;
}) {
  if (first == null && avg == null) {
    return <span className="umkm-num is-empty">—</span>;
  }
  return (
    <div className="umkm-num-stack">
      <span className="umkm-num">{formatDays(first)}</span>
      <span className="umkm-num-sub">avg {formatDays(avg)}</span>
    </div>
  );
}

function LensMetric({
  label,
  hint,
  tone,
  loading,
  tipValue,
  description,
  detail,
  children,
}: {
  label: string;
  hint: string;
  tone: string;
  loading?: boolean;
  tipValue?: string;
  description?: string;
  detail?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`umkm-analytics-lens-metric tone-${tone}${loading ? ' is-loading' : ''}`}
    >
      <dt>{label}</dt>
      <dd>
        <AppTooltip
          label={label}
          value={tipValue}
          description={description}
          detail={detail ?? (hint || undefined)}
        >
          {children}
        </AppTooltip>
      </dd>
      <em>{hint}</em>
    </div>
  );
}

function LensMoney({
  value,
  loading,
}: {
  value: number | null | undefined;
  loading: boolean;
}) {
  if (loading) return <>···</>;
  if (value == null) return <>—</>;
  const parts = formatMoneyParts(value);
  return (
    <>
      <b>{parts.figure}</b>
      {parts.unit ? <small>{parts.unit}</small> : null}
    </>
  );
}

function LensQty({
  value,
  loading,
}: {
  value: number | null | undefined;
  loading: boolean;
}) {
  if (loading) return <>···</>;
  if (value == null) return <>—</>;
  const parts = formatCompactQtyParts(value);
  return (
    <>
      <b>{parts.figure}</b>
      {parts.unit ? <small>{parts.unit}</small> : null}
    </>
  );
}

export default function AnalyticsWorkspace() {
  const tr = useTr();
  const { orderStatus, paymentStatus, companyType } = useLabels();
  const statusSeries = useMemo(
    () => buildStatusSeries(orderStatus),
    [orderStatus],
  );
  const paymentModeSeries = useMemo(
    () => buildPaymentModeSeries(paymentStatus),
    [paymentStatus],
  );
  const nowYear = new Date().getUTCFullYear();
  const [timeline, setTimeline] = useState<TimelineFilterValue>([nowYear]);
  const [granularity, setGranularity] = useState<Granularity>('monthly');
  const [chartView, setChartView] = useState<ChartPanelView>('chart');
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tablesLoading, setTablesLoading] = useState(false);
  const timelineKey = timelineToYearsParam(timeline);
  const loadedSeriesRef = useRef<Set<Granularity>>(new Set());

  // Progressive core load: summary + active granularity series first.
  useEffect(() => {
    let cancelled = false;
    loadedSeriesRef.current = new Set();
    async function load() {
      setLoading(true);
      setError('');
      setTablesLoading(true);
      try {
        const overview = await api<AnalyticsOverview>('/analytics', {
          searchParams: {
            years: timelineKey,
            include: 'summary,series',
            granularity,
          },
        });
        if (cancelled) return;
        loadedSeriesRef.current.add(granularity);
        // Timeline change replaces prior overview (do not keep old tables/series).
        setData(overview);
        setLoading(false);

        const tables = await api<AnalyticsOverview>('/analytics', {
          searchParams: {
            years: timelineKey,
            include: 'products,customers',
          },
        });
        if (cancelled) return;
        setData((prev) => mergeAnalyticsOverview(prev, tables, 'tables'));
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : err instanceof Error
                ? err.message
                : 'Failed to load analytics',
          );
          setLoading(false);
        }
      } finally {
        if (!cancelled) setTablesLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
    // Granularity changes are handled by the series effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- timeline-driven core load
  }, [timelineKey]);

  // Fetch missing series when the user switches Weekly/Monthly/Quarterly/Annual.
  useEffect(() => {
    if (loading) return;
    if (loadedSeriesRef.current.has(granularity)) return;
    let cancelled = false;
    async function loadSeries() {
      try {
        const partial = await api<AnalyticsOverview>('/analytics', {
          searchParams: {
            years: timelineKey,
            include: 'series',
            granularity,
          },
        });
        if (cancelled) return;
        loadedSeriesRef.current.add(granularity);
        setData((prev) => mergeAnalyticsOverview(prev, partial, 'series'));
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : err instanceof Error
                ? err.message
                : 'Failed to load analytics series',
          );
        }
      }
    }
    void loadSeries();
    return () => {
      cancelled = true;
    };
  }, [granularity, timelineKey, loading]);

  const chartData = useMemo(() => {
    if (!data) return [];
    const mapPoint = (row: {
      label?: string;
      key?: string;
      year?: number;
      revenue: number;
      target?: number | null;
      orderCount: number;
      avgOrderValue: number | null;
      avgBasketSize: number | null;
      avgPurchaseFrequency: number | null;
      avgLtv: number | null;
      avgProductRevenue: number | null;
      attainmentPercent: number | null;
      marginPercent: number | null;
      avgShipmentDays: number | null;
      avgInvoiceDays: number | null;
      avgFirstPaymentDays: number | null;
      avgPaymentDays: number | null;
    }, key: string) => ({
      key,
      revenue: row.revenue,
      // Use null (not undefined) so Recharts Line/Area keep the series aligned.
      target:
        row.target == null || !Number.isFinite(row.target) ? null : row.target,
      orders: row.orderCount,
      aov: row.avgOrderValue ?? null,
      basket: row.avgBasketSize ?? null,
      frequency: row.avgPurchaseFrequency ?? null,
      ltv: row.avgLtv ?? null,
      productRevenue: row.avgProductRevenue ?? null,
      attainment: row.attainmentPercent ?? null,
      margin: row.marginPercent ?? null,
      shipmentDays: row.avgShipmentDays ?? null,
      invoiceDays: row.avgInvoiceDays ?? null,
      firstPaymentDays: row.avgFirstPaymentDays ?? null,
      paymentDays: row.avgPaymentDays ?? null,
    });

    // Charts omit timeline slots with no orders (keeps axes dense and readable).
    const points =
      granularity === 'weekly'
        ? (data.weekly ?? [])
            .filter((w) => w.orderCount > 0)
            .map((w) => mapPoint(w, w.label))
        : granularity === 'monthly'
          ? data.monthly
              .filter((m) => m.orderCount > 0)
              .map((m) => mapPoint(m, m.label))
          : granularity === 'quarterly'
            ? (data.quarterly ?? [])
                .filter((q) => q.orderCount > 0)
                .map((q) => mapPoint(q, q.label))
            : data.annual
                .filter((y) => y.orderCount > 0)
                .map((y) => mapPoint(y, String(y.year)));

    return attachPeriodGrowthLabels(points, CHART_GROWTH_SPECS);
  }, [data, granularity]);

  const statusChartData = useMemo(() => {
    if (!data) return [];
    const rows =
      granularity === 'weekly'
        ? (data.weekly ?? []).map((w) => ({ key: w.label, ...w }))
        : granularity === 'monthly'
          ? data.monthly.map((m) => ({ key: m.label, ...m }))
          : granularity === 'quarterly'
            ? (data.quarterly ?? []).map((q) => ({ key: q.label, ...q }))
            : data.annual.map((y) => ({ key: String(y.year), ...y }));
    const points = rows
      .filter((row) => (row.statusOrderCount ?? 0) > 0)
      .map((row) => ({
        key: row.key,
        orderCount: row.statusOrderCount ?? 0,
        PENDING: row.statusShares?.PENDING ?? 0,
        CONFIRMED: row.statusShares?.CONFIRMED ?? 0,
        SHIPPED: row.statusShares?.SHIPPED ?? 0,
        DELIVERED: row.statusShares?.DELIVERED ?? 0,
        CANCELLED: row.statusShares?.CANCELLED ?? 0,
      }));
    return attachPeriodGrowthLabels(points, STATUS_GROWTH_SPECS);
  }, [data, granularity]);

  const paymentChartData = useMemo(() => {
    if (!data) return [];
    const rows =
      granularity === 'weekly'
        ? (data.weekly ?? []).map((w) => ({ key: w.label, ...w }))
        : granularity === 'monthly'
          ? data.monthly.map((m) => ({ key: m.label, ...m }))
          : granularity === 'quarterly'
            ? (data.quarterly ?? []).map((q) => ({ key: q.label, ...q }))
            : data.annual.map((y) => ({ key: String(y.year), ...y }));
    const points = rows
      .filter((row) => (row.paymentOrderCount ?? 0) > 0)
      .map((row) => ({
        key: row.key,
        orderCount: row.paymentOrderCount ?? 0,
        CASH: row.paymentShares?.CASH ?? 0,
        CONSIGNMENT: row.paymentShares?.CONSIGNMENT ?? 0,
        DELAYED_PAYMENT: row.paymentShares?.DELAYED_PAYMENT ?? 0,
        KONTRA_BON: row.paymentShares?.KONTRA_BON ?? 0,
      }));
    return attachPeriodGrowthLabels(points, PAYMENT_GROWTH_SPECS);
  }, [data, granularity]);

  const hasStatusMix = statusChartData.length > 0;
  const hasPaymentMix = paymentChartData.length > 0;

  const hasChartTarget = useMemo(
    () =>
      chartData.some(
        (row) => typeof row.target === 'number' && Number.isFinite(row.target),
      ),
    [chartData],
  );

  const axisPeriodLabel = periodTableLabel(granularity);

  const seriesTables = useMemo(() => {
    const periodRows = (
      cellsFor: (row: (typeof chartData)[number]) => Record<string, string>,
    ): SeriesTableRow[] =>
      chartData.map((row) => ({
        id: row.key,
        cells: { period: row.key, ...cellsFor(row) },
      }));

    return {
      revenue: periodRows((row) => ({
        revenue: formatTableMoney(row.revenue),
        ...(hasChartTarget ? { target: formatTableMoney(row.target) } : {}),
      })),
      orders: periodRows((row) => ({
        orders: formatTableQty(row.orders),
      })),
      aov: periodRows((row) => ({
        aov: formatTableMoney(row.aov),
      })),
      basket: periodRows((row) => ({
        basket: formatTableQty(row.basket),
      })),
      frequency: periodRows((row) => ({
        frequency: formatTableQty(row.frequency),
      })),
      attainment: periodRows((row) => ({
        attainment: formatTablePct(row.attainment),
      })),
      margin: periodRows((row) => ({
        margin: formatTablePct(row.margin),
      })),
      shipment: periodRows((row) => ({
        days: formatTableDays(row.shipmentDays),
      })),
      invoice: periodRows((row) => ({
        days: formatTableDays(row.invoiceDays),
      })),
      firstPayment: periodRows((row) => ({
        days: formatTableDays(row.firstPaymentDays),
      })),
      payment: periodRows((row) => ({
        days: formatTableDays(row.paymentDays),
      })),
      ltv: periodRows((row) => ({
        ltv: formatTableMoney(row.ltv),
      })),
      productRevenue: periodRows((row) => ({
        productRevenue: formatTableMoney(row.productRevenue),
      })),
      status: statusChartData.map((row) => ({
        id: row.key,
        cells: {
          period: row.key,
          PENDING: formatTablePct(row.PENDING),
          CONFIRMED: formatTablePct(row.CONFIRMED),
          SHIPPED: formatTablePct(row.SHIPPED),
          DELIVERED: formatTablePct(row.DELIVERED),
          CANCELLED: formatTablePct(row.CANCELLED),
          orders: formatTableQty(row.orderCount),
        },
      })),
      paymentMode: paymentChartData.map((row) => ({
        id: row.key,
        cells: {
          period: row.key,
          CASH: formatTablePct(row.CASH),
          CONSIGNMENT: formatTablePct(row.CONSIGNMENT),
          DELAYED_PAYMENT: formatTablePct(row.DELAYED_PAYMENT),
          KONTRA_BON: formatTablePct(row.KONTRA_BON),
          orders: formatTableQty(row.orderCount),
        },
      })),
    };
  }, [chartData, hasChartTarget, statusChartData, paymentChartData]);

  const scopeLabel = formatTimelineLabel(timeline);
  const isAll = timeline === 'all';
  const isMulti = timeline !== 'all' && timeline.length > 1;
  const singleYear =
    timeline !== 'all' && timeline.length === 1 ? timeline[0]! : null;
  const periodHint = isAll
    ? granularity === 'weekly'
      ? 'Charts show every ISO week across all timelines.'
      : granularity === 'monthly'
        ? 'Charts show every month across all timelines.'
        : granularity === 'quarterly'
          ? 'Charts show every quarter across all timelines.'
          : 'Charts show every year in the app timeline.'
    : isMulti
      ? granularity === 'weekly'
        ? `Charts show every ISO week across ${scopeLabel}.`
        : granularity === 'monthly'
          ? `Charts show every month across ${scopeLabel}.`
          : granularity === 'quarterly'
            ? `Charts show every quarter across ${scopeLabel}.`
            : `Charts show annual totals for ${scopeLabel}.`
      : granularity === 'weekly'
        ? `Charts break ${scopeLabel} into ISO weeks.`
        : granularity === 'monthly'
          ? `Charts break ${scopeLabel} into months.`
          : granularity === 'quarterly'
            ? `Charts break ${scopeLabel} into quarters.`
            : `Charts span the rolling ${APP_ANNUAL_WINDOW}-year window through ${scopeLabel}.`;
  const timelineCaption =
    granularity === 'annual' && singleYear != null
      ? `Rolling ${APP_ANNUAL_WINDOW}-year window · ${annualWindowLabel(singleYear)}`
      : isMulti
        ? 'Selected years combined'
        : isAll
          ? 'Entire app timeline in range'
          : null;
  const lensControls = useMemo<AnalyticsLensControls>(
    () => ({
      granularity,
      setGranularity,
      chartView,
      setChartView,
      timeline,
      setTimeline,
      nowYear,
      timelineCaption,
    }),
    [granularity, chartView, timeline, nowYear, timelineCaption],
  );
  const barMax =
    granularity === 'weekly'
      ? 14
      : granularity === 'monthly'
        ? 26
        : granularity === 'quarterly'
          ? 36
          : 44;
  const ltvTopChartData = useMemo(() => {
    if (!data?.customers?.length) return [];
    return toRankChartRows(
      data.customers.slice(0, RANK_LIMIT),
      abbreviateCustomerAxisLabel,
    );
  }, [data]);

  const ltvBottomChartData = useMemo(() => {
    if (!data?.customers?.length) return [];
    return toRankChartRows(
      takeBottomRank(data.customers, RANK_LIMIT),
      abbreviateCustomerAxisLabel,
    );
  }, [data]);

  const productTopChartData = useMemo(() => {
    if (!data?.products?.length) return [];
    return toRankChartRows(
      data.products.slice(0, RANK_LIMIT),
      abbreviateProductAxisLabel,
    );
  }, [data]);

  const productBottomChartData = useMemo(() => {
    if (!data?.products?.length) return [];
    return toRankChartRows(
      takeBottomRank(data.products, RANK_LIMIT),
      abbreviateProductAxisLabel,
    );
  }, [data]);

  /** Raw numeric CSV payloads for panel header export (matches Graph|Table panels). */
  const seriesCsvExports = useMemo((): Record<string, AnalyticsCsvExport> => {
    const periodCol = { key: 'period', label: axisPeriodLabel };
    const periodRows = (
      pick: (row: (typeof chartData)[number]) => Record<string, unknown>,
    ) =>
      chartData.map((row) => ({
        period: row.key,
        ...pick(row),
      }));

    const rankExport = (
      rows: RankChartRow[],
      valueLabel: string,
    ): AnalyticsCsvExport => ({
      columns: [
        { key: 'name', label: 'Name' },
        { key: 'value', label: valueLabel },
        { key: 'orders', label: 'Orders' },
        { key: 'packs', label: 'Packs' },
        { key: 'aov', label: 'AOV' },
        { key: 'upt', label: 'UPT' },
      ],
      rows: rows.map((row) => ({
        name: row.fullName,
        value: row.value,
        orders: row.orderCount,
        packs: row.packsSold,
        aov: row.avgOrderValue,
        upt: row.avgBasketSize,
      })),
    });

    return {
      revenue: {
        columns: [
          periodCol,
          { key: 'revenue', label: 'Revenue' },
          ...(hasChartTarget ? [{ key: 'target', label: 'Target' }] : []),
        ],
        rows: periodRows((row) => ({
          revenue: row.revenue,
          ...(hasChartTarget ? { target: row.target } : {}),
        })),
      },
      orders: {
        columns: [periodCol, { key: 'orders', label: 'Orders' }],
        rows: periodRows((row) => ({ orders: row.orders })),
      },
      aov: {
        columns: [periodCol, { key: 'aov', label: 'AOV' }],
        rows: periodRows((row) => ({ aov: row.aov })),
      },
      upt: {
        columns: [periodCol, { key: 'basket', label: 'UPT' }],
        rows: periodRows((row) => ({ basket: row.basket })),
      },
      apf: {
        columns: [periodCol, { key: 'frequency', label: 'APF' }],
        rows: periodRows((row) => ({ frequency: row.frequency })),
      },
      attainment: {
        columns: [periodCol, { key: 'attainment', label: '% of target' }],
        rows: periodRows((row) => ({ attainment: row.attainment })),
      },
      margin: {
        columns: [periodCol, { key: 'margin', label: 'Margin' }],
        rows: periodRows((row) => ({ margin: row.margin })),
      },
      'order-status-mix': {
        columns: [
          periodCol,
          ...ORDER_STATUSES.map((status) => ({
            key: status,
            label: orderStatus[status],
          })),
          { key: 'orders', label: 'Orders' },
        ],
        rows: statusChartData.map((row) => ({
          period: row.key,
          PENDING: row.PENDING,
          CONFIRMED: row.CONFIRMED,
          SHIPPED: row.SHIPPED,
          DELIVERED: row.DELIVERED,
          CANCELLED: row.CANCELLED,
          orders: row.orderCount,
        })),
      },
      'payment-mode-mix': {
        columns: [
          periodCol,
          ...PAYMENT_STATUSES.map((status) => ({
            key: status,
            label: paymentStatus[status],
          })),
          { key: 'orders', label: 'Orders' },
        ],
        rows: paymentChartData.map((row) => ({
          period: row.key,
          CASH: row.CASH,
          CONSIGNMENT: row.CONSIGNMENT,
          DELAYED_PAYMENT: row.DELAYED_PAYMENT,
          KONTRA_BON: row.KONTRA_BON,
          orders: row.orderCount,
        })),
      },
      shipment: {
        columns: [periodCol, { key: 'days', label: 'Avg days' }],
        rows: periodRows((row) => ({ days: row.shipmentDays })),
      },
      invoice: {
        columns: [periodCol, { key: 'days', label: 'Avg days' }],
        rows: periodRows((row) => ({ days: row.invoiceDays })),
      },
      'first-payment': {
        columns: [periodCol, { key: 'days', label: 'Avg days' }],
        rows: periodRows((row) => ({ days: row.firstPaymentDays })),
      },
      'last-payment': {
        columns: [periodCol, { key: 'days', label: 'Avg days' }],
        rows: periodRows((row) => ({ days: row.paymentDays })),
      },
      'avg-product-revenue': {
        columns: [periodCol, { key: 'productRevenue', label: 'Avg product revenue' }],
        rows: periodRows((row) => ({ productRevenue: row.productRevenue })),
      },
      'top-products': rankExport(productTopChartData, 'Revenue'),
      'bottom-products': rankExport(productBottomChartData, 'Revenue'),
      'avg-ltv': {
        columns: [periodCol, { key: 'ltv', label: 'Avg LTV' }],
        rows: periodRows((row) => ({ ltv: row.ltv })),
      },
      'top-customers': rankExport(ltvTopChartData, 'LTV'),
      'bottom-customers': rankExport(ltvBottomChartData, 'LTV'),
    };
  }, [
    axisPeriodLabel,
    chartData,
    hasChartTarget,
    statusChartData,
    paymentChartData,
    productTopChartData,
    productBottomChartData,
    ltvTopChartData,
    ltvBottomChartData,
    orderStatus,
    paymentStatus,
  ]);

  const revenueDomain = useMemo(
    () =>
      paddedDomain(chartData.flatMap((r) => [r.revenue, r.target ?? null]), {
        nonNegative: true,
      }),
    [chartData],
  );
  const ordersDomain = useMemo(
    () => paddedDomain(chartData.map((r) => r.orders), { nonNegative: true }),
    [chartData],
  );
  const aovDomain = useMemo(
    () =>
      paddedDomain(
        chartData.map((r) => r.aov ?? null),
        { nonNegative: true },
      ),
    [chartData],
  );
  const basketDomain = useMemo(
    () =>
      paddedDomain(
        chartData.map((r) => r.basket ?? null),
        { nonNegative: true },
      ),
    [chartData],
  );
  const frequencyDomain = useMemo(
    () =>
      paddedDomain(
        chartData.map((r) => r.frequency ?? null),
        { nonNegative: true },
      ),
    [chartData],
  );
  const attainmentDomain = useMemo(() => {
    const vals = chartData.map((r) => r.attainment ?? null);
    if (vals.some((v) => v != null)) {
      return paddedDomain([...vals, 100], { nonNegative: true });
    }
    return paddedDomain(vals, { nonNegative: true });
  }, [chartData]);
  const marginDomain = useMemo(
    () => paddedDomain(chartData.map((r) => r.margin ?? null)),
    [chartData],
  );
  const shipmentDomain = useMemo(
    () =>
      paddedDomain(
        chartData.map((r) => r.shipmentDays ?? null),
        { nonNegative: true },
      ),
    [chartData],
  );
  const invoiceDomain = useMemo(
    () =>
      paddedDomain(
        chartData.map((r) => r.invoiceDays ?? null),
        { nonNegative: true },
      ),
    [chartData],
  );
  const firstPaymentDomain = useMemo(
    () =>
      paddedDomain(
        chartData.map((r) => r.firstPaymentDays ?? null),
        { nonNegative: true },
      ),
    [chartData],
  );
  const paymentDomain = useMemo(
    () =>
      paddedDomain(
        chartData.map((r) => r.paymentDays ?? null),
        { nonNegative: true },
      ),
    [chartData],
  );
  const avgLtvDomain = useMemo(
    () =>
      paddedDomain(
        chartData.map((r) => r.ltv ?? null),
        { nonNegative: true },
      ),
    [chartData],
  );
  const topLtvDomain = useMemo(
    () =>
      paddedDomain(
        ltvTopChartData.map((r) => r.value),
        { nonNegative: true },
      ),
    [ltvTopChartData],
  );
  const bottomLtvDomain = useMemo(
    () =>
      paddedDomain(
        ltvBottomChartData.map((r) => r.value),
        { nonNegative: true },
      ),
    [ltvBottomChartData],
  );
  const avgProductRevenueDomain = useMemo(
    () =>
      paddedDomain(
        chartData.map((r) => r.productRevenue ?? null),
        { nonNegative: true },
      ),
    [chartData],
  );
  const topProductDomain = useMemo(
    () =>
      paddedDomain(
        productTopChartData.map((r) => r.value),
        { nonNegative: true },
      ),
    [productTopChartData],
  );
  const bottomProductDomain = useMemo(
    () =>
      paddedDomain(
        productBottomChartData.map((r) => r.value),
        { nonNegative: true },
      ),
    [productBottomChartData],
  );

  const hasRevenue = chartData.some((row) => row.revenue > 0);
  const hasOrders = chartData.some((row) => row.orders > 0);
  const hasAov = chartData.some((row) => row.aov != null);
  const hasBasket = chartData.some((row) => row.basket != null);
  const hasFrequency = chartData.some((row) => row.frequency != null);
  const hasLtv = chartData.some((row) => row.ltv != null);
  const hasTopLtv = ltvTopChartData.some((row) => row.value > 0);
  const hasBottomLtv = ltvBottomChartData.some((row) => row.value > 0);
  const hasProductRevenue = chartData.some((row) => row.productRevenue != null);
  const hasTopProducts = productTopChartData.some((row) => row.value > 0);
  const hasBottomProducts = productBottomChartData.some(
    (row) => row.value > 0,
  );
  const hasAttainment = chartData.some((row) => row.attainment != null);
  const hasMargin = chartData.some((row) => row.margin != null);
  const hasShipment = chartData.some((row) => row.shipmentDays != null);
  const hasInvoice = chartData.some((row) => row.invoiceDays != null);
  const hasFirstPayment = chartData.some((row) => row.firstPaymentDays != null);
  const hasPayment = chartData.some((row) => row.paymentDays != null);
  const empty = !loading && !error && !hasRevenue && !hasOrders;
  const stage = useMemo(() => buildAnalyticsStageMetrics(data), [data]);
  const pulseRevenue = stage ? formatMoneyParts(stage.revenue) : null;
  const pulseTarget =
    stage?.target != null ? formatMoneyParts(stage.target) : null;
  const pulseProfit =
    stage?.profit != null ? formatMoneyParts(stage.profit) : null;
  const granularityLabel =
    granularity === 'weekly'
      ? tr('Weekly')
      : granularity === 'monthly'
        ? tr('Monthly')
        : granularity === 'quarterly'
          ? tr('Quarterly')
          : tr('Annual');

  return (
    <section className="umkm-analytics-page">
      <FeatureStage
        title={tr('Analytics')}
        loading={loading}
        subtitle={
          data
            ? `${granularityLabel} · ${scopeLabel} · ${tr('Non-cancelled outcomes and plan health')}`
            : tr('Trends for revenue, targets, margins, and fulfillment lead times.')
        }
        action={
          <Link className="umkm-btn secondary" href="/targets">
            {tr('Edit targets')}
          </Link>
        }
        stats={[
          {
            label: tr('Net revenue'),
            hero: true,
            tip: {
              value: stage ? formatMoneyExact(stage.revenue) : undefined,
              description: tr(
                'Post-discount sales from non-cancelled orders for the selected analytics scope.',
              ),
            },
            value: pulseRevenue ? (
              <>
                <b>{pulseRevenue.figure}</b>
                {pulseRevenue.unit ? <small>{pulseRevenue.unit}</small> : null}
              </>
            ) : (
              <b>···</b>
            ),
          },
          {
            label: tr('Target'),
            tip: {
              value:
              stage?.target != null ? formatMoneyExact(stage.target) : undefined,
              description: tr('Planned revenue for the same scope, when set.'),
            },
            value: pulseTarget ? (
              <>
                <b>{pulseTarget.figure}</b>
                {pulseTarget.unit ? <small>{pulseTarget.unit}</small> : null}
              </>
            ) : stage ? (
              '—'
            ) : (
              <b>···</b>
            ),
          },
          {
            label: tr('Profit'),
            tip: {
              value:
              stage?.profit != null ? formatMoneyExact(stage.profit) : undefined,
              description: tr(
                'Estimated profit after cost of goods for this scope.',
              ),
            },
            value: pulseProfit ? (
              <>
                <b>{pulseProfit.figure}</b>
                {pulseProfit.unit ? <small>{pulseProfit.unit}</small> : null}
              </>
            ) : stage ? (
              '—'
            ) : (
              <b>···</b>
            ),
          },
        ]}
        ratesLabel={tr('Analytics rates')}
        rates={[
          {
            tone: 'tone-paid',
            label: tr('Attainment'),
            tip: {
              description: tr(
                'How close actual revenue is to the target for the same Analytics period (week, month, quarter, or year).',
              ),
              detail: tr('Actual revenue ÷ period target × 100'),
            },
            value: stage?.attainmentRate,
          },
          {
            tone: 'tone-margin',
            label: tr('Margin'),
            tip: {
              description: tr('Profit as a share of revenue using catalog costs.'),
              detail: tr('Profit ÷ revenue on orders with cost'),
            },
            value: stage?.marginRate,
          },
          {
            tone: 'tone-discount',
            label: tr('YoY'),
            tip: {
              description: tr('Revenue growth compared with the prior year.'),
              detail: tr('This year ÷ prior year − 100%'),
            },
            value: stage?.yoyGrowthRate,
          },
          {
            tone: 'tone-cancel',
            label: tr('Pace'),
            tip: {
              description: tr(
                'Year-to-date progress versus targets for months so far.',
              ),
              detail: tr('YTD revenue ÷ elapsed monthly targets'),
            },
            value: stage?.paceRate,
          },
        ]}
      />

      {error ? <div className="umkm-error">{error}</div> : null}

      <section
        className={`umkm-analytics-lens${loading ? ' is-loading' : ''}`}
        aria-label="Chart period and snapshot"
        aria-busy={loading || undefined}
      >
        <div className="umkm-analytics-lens-toolbar">
          <div className="umkm-analytics-lens-controls">
            <CollapsibleFilters
              label="Period"
              bodyClassName="umkm-analytics-lens-filter-body"
              idleHint={granularityLabel}
              activeCount={granularity !== 'monthly' ? 1 : 0}
            >
              <OptionChips
                aria-label="Chart period"
                className="umkm-analytics-lens-chips"
                size="sm"
                value={granularity}
                onChange={(v) => {
                  if (v) setGranularity(v);
                }}
                options={[
                  { value: 'weekly', label: 'Weekly' },
                  { value: 'monthly', label: 'Monthly' },
                  { value: 'quarterly', label: 'Quarterly' },
                  { value: 'annual', label: 'Annual' },
                ]}
              />
            </CollapsibleFilters>
            <TimelineFilter
              id="analytics-year"
              className="umkm-analytics-lens-timeline"
              label="Timeline"
              value={timeline}
              years={appYearOptions(nowYear)}
              nowYear={nowYear}
              allLabel="All timelines"
              caption={timelineCaption}
              onChange={setTimeline}
            />
            <OptionChips
              aria-label="Chart view"
              className="umkm-analytics-lens-view umkm-analytics-view-toggle"
              size="sm"
              value={chartView}
              onChange={(v) => {
                if (v === 'chart' || v === 'table') setChartView(v);
              }}
              options={[
                { value: 'chart', label: 'Graph' },
                { value: 'table', label: 'Table' },
              ]}
            />
          </div>
          <p className="umkm-analytics-lens-status" role="status">
            <span className="umkm-analytics-lens-status-label">
              {granularityLabel}
            </span>
            <span aria-hidden>·</span>
            <span>{scopeLabel}</span>
            <span aria-hidden>·</span>
            <span className="umkm-analytics-lens-status-hint">{periodHint}</span>
          </p>
        </div>

        <div className="umkm-analytics-lens-body">
          <div className="umkm-analytics-lens-group">
            <p className="umkm-analytics-lens-group-label">Order quality</p>
            <dl className="umkm-analytics-lens-metrics is-quad">
              <LensMetric
                label="Orders"
                hint="Non-cancelled"
                tone="orders"
                loading={loading}
                description="How many active orders fall in this chart period."
              >
                <LensQty
                  value={data?.summary.orderCount}
                  loading={loading}
                />
              </LensMetric>
              <LensMetric
                label="Avg order"
                hint="Revenue / orders"
                tone="aov"
                loading={loading}
                tipValue={
                  data?.summary.avgOrderValue != null
                    ? formatMoney(data.summary.avgOrderValue)
                    : undefined
                }
                description="Average revenue collected per non-cancelled order."
                detail="Revenue ÷ orders"
              >
                <LensMoney
                  value={data?.summary.avgOrderValue}
                  loading={loading}
                />
              </LensMetric>
              <LensMetric
                label="UPT"
                hint="Packs / order"
                tone="basket"
                loading={loading}
                tipValue={
                  data?.summary.avgBasketSize != null
                    ? `${formatCompactQty(data.summary.avgBasketSize)} packs per transaction`
                    : undefined
                }
                description="Average pack quantity sold in each order."
                detail="Packs ÷ orders"
              >
                <LensQty
                  value={data?.summary.avgBasketSize}
                  loading={loading}
                />
              </LensMetric>
              <LensMetric
                label="APF"
                hint="Orders / buyers"
                tone="frequency"
                loading={loading}
                tipValue={
                  data?.summary.avgPurchaseFrequency != null
                    ? `${formatCompactQty(data.summary.avgPurchaseFrequency)} orders per unique customer${
                        data.summary.purchaseFrequencyCustomerCount
                          ? ` · ${formatCompactQty(data.summary.purchaseFrequencyCustomerCount)} buyers`
                          : ''
                      }`
                    : undefined
                }
                description="How often each unique buyer places an order."
                detail="Orders ÷ unique buyers"
              >
                <LensQty
                  value={data?.summary.avgPurchaseFrequency}
                  loading={loading}
                />
              </LensMetric>
            </dl>
          </div>

          <div className="umkm-analytics-lens-group">
            <p className="umkm-analytics-lens-group-label">Lifetime value</p>
            <dl className="umkm-analytics-lens-metrics is-duo">
              <LensMetric
                label="Avg LTV"
                hint={
                  data?.summary.ltvCustomerCount
                    ? `${data.summary.ltvCustomerCount} buyers`
                    : 'Linked buyers'
                }
                tone="ltv"
                loading={loading}
                tipValue={
                  data?.summary.avgLtv != null
                    ? formatMoney(data.summary.avgLtv)
                    : undefined
                }
                description="Average lifetime revenue linked to each buyer."
              >
                <LensMoney value={data?.summary.avgLtv} loading={loading} />
              </LensMetric>
              <LensMetric
                label="Avg product"
                hint={
                  data?.summary.productSaleCount
                    ? `${data.summary.productSaleCount} SKUs`
                    : 'Products sold'
                }
                tone="product"
                loading={loading}
                tipValue={
                  data?.summary.avgProductRevenue != null
                    ? formatMoney(data.summary.avgProductRevenue)
                    : undefined
                }
                description="Average revenue earned per product sold in scope."
              >
                <LensMoney
                  value={data?.summary.avgProductRevenue}
                  loading={loading}
                />
              </LensMetric>
            </dl>
          </div>

          <div className="umkm-analytics-lens-group">
            <p className="umkm-analytics-lens-group-label">Lead times</p>
            <dl className="umkm-analytics-lens-metrics is-quad">
              <LensMetric
                label="Ship"
                hint="Order → ship"
                tone="ship"
                loading={loading}
                description="Average days from order date to shipment."
              >
                {loading ? '···' : formatDays(data?.summary.avgShipmentDays)}
              </LensMetric>
              <LensMetric
                label="Invoice"
                hint="Order → invoice"
                tone="invoice"
                loading={loading}
                description="Average days from order date to invoice date."
              >
                {loading ? '···' : formatDays(data?.summary.avgInvoiceDays)}
              </LensMetric>
              <LensMetric
                label="First pay"
                hint="Order → first"
                tone="firstPay"
                loading={loading}
                description="Average days until the first installment is paid."
              >
                {loading
                  ? '···'
                  : formatDays(data?.summary.avgFirstPaymentDays)}
              </LensMetric>
              <LensMetric
                label="Last pay"
                hint="Order → last"
                tone="pay"
                loading={loading}
                description="Average days until the final installment is paid."
              >
                {loading ? '···' : formatDays(data?.summary.avgPaymentDays)}
              </LensMetric>
            </dl>
          </div>
        </div>
      </section>

      <AnalyticsFullscreenProvider>
      <AnalyticsLensControlsContext.Provider value={lensControls}>
      <AnalyticsChartViewContext.Provider value={chartView}>
      <AnalyticsCsvExportContext.Provider value={seriesCsvExports}>
      {empty ? (
        <ContentSection
          eyebrow="Charts"
          title="No activity yet"
          description="Create orders in this period to unlock performance graphs."
        >
          <EmptyState
            title="No order activity yet"
            description="Revenue, rates, and lead-time charts appear once orders exist."
          />
        </ContentSection>
      ) : (
        <>
          <ContentSection
            eyebrow="Performance"
            title="Revenue & volume"
            description={
              hasChartTarget
                ? 'Bars are net revenue (after discount); the amber line is the revenue target. Ticket size and Units Per Transaction track order quality.'
                : 'Bars are net revenue (after discount). Ticket size and Units Per Transaction track order quality. Set Targets to overlay goals.'
            }
          >
            <div
              className="umkm-analytics-charts"
              key={`perf-${granularity}-${timelineKey}`}
            >
              <ChartPanel
                panelKey="revenue"
                title="Net revenue"
                subtitle="Actual vs plan (post-discount)"
                tone="brand"
                series={[
                  { label: 'Net revenue', color: REVENUE, style: 'bar' },
                  ...(hasChartTarget
                    ? [{ label: 'Target', color: TARGET, style: 'line' as const }]
                    : []),
                ]}
                table={
                  loading ? (
                    <ChartState>Loading…</ChartState>
                  ) : (
                    <SeriesTable
                      columns={[
                        { key: 'period', label: axisPeriodLabel },
                        { key: 'revenue', label: 'Net revenue', align: 'end' },
                        ...(hasChartTarget
                          ? [
                              {
                                key: 'target',
                                label: 'Target',
                                align: 'end' as const,
                              },
                            ]
                          : []),
                      ]}
                      rows={seriesTables.revenue}
                    />
                  )
                }
              >
                {loading ? (
                  <ChartState>Loading…</ChartState>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={chartData}
                      margin={{ top: 12, right: 10, left: 2, bottom: 4 }}
                      barCategoryGap="18%"
                    >
                      <defs>
                        <linearGradient
                          id="analytics-rev-bar"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop offset="0%" stopColor={REVENUE_SOFT} />
                          <stop offset="55%" stopColor={REVENUE} />
                          <stop offset="100%" stopColor="#064f41" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="4 6"
                        stroke={GRID}
                        vertical={false}
                      />
                      <XAxis
                        dataKey="key"
                        tick={{ fill: AXIS, fontSize: 11, fontWeight: 600 }}
                        axisLine={{ stroke: AXIS_LINE }}
                        tickLine={false}
                        dy={4}
                      />
                      <YAxis
                        tickFormatter={formatCompactAxis}
                        tick={{ fill: AXIS, fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        width={52}
                        domain={revenueDomain}
                        ticks={axisTicks(revenueDomain)}
                      />
                      <Tooltip
                        cursor={{
                          fill: 'color-mix(in srgb, var(--brand-soft) 55%, transparent)',
                        }}
                        content={<RevenueTooltip />}
                      />
                      <Bar
                        dataKey="revenue"
                        name="Revenue"
                        fill="url(#analytics-rev-bar)"
                        radius={[8, 8, 3, 3]}
                        maxBarSize={barMax}
                        animationDuration={720}
                        animationEasing="ease-out"
                      />
                      {hasChartTarget ? (
                        <Line
                          type="monotone"
                          dataKey="target"
                          name="Target"
                          stroke={TARGET}
                          strokeWidth={3}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          dot={{
                            r: 4.5,
                            fill: '#fff',
                            stroke: TARGET,
                            strokeWidth: 2.5,
                          }}
                          activeDot={{
                            r: 6.5,
                            fill: TARGET_SOFT,
                            stroke: '#fff',
                            strokeWidth: 2,
                          }}
                          connectNulls
                          isAnimationActive={false}
                        />
                      ) : null}
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </ChartPanel>

              <ChartPanel
                panelKey="orders"
                title="Orders"
                subtitle="Count of orders"
                tone="orders"
                series={[{ label: 'Orders', color: ORDERS, style: 'bar' }]}
                table={
                  loading ? (
                    <ChartState>Loading…</ChartState>
                  ) : (
                    <SeriesTable
                      columns={[
                        { key: 'period', label: axisPeriodLabel },
                        { key: 'orders', label: 'Orders', align: 'end' },
                      ]}
                      rows={seriesTables.orders}
                    />
                  )
                }
              >
                {loading ? (
                  <ChartState>Loading…</ChartState>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      margin={{ top: 12, right: 10, left: 2, bottom: 4 }}
                      barCategoryGap="18%"
                    >
                      <defs>
                        <linearGradient
                          id="analytics-orders-bar"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop offset="0%" stopColor="#e07a45" />
                          <stop offset="100%" stopColor={ORDERS} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="4 6"
                        stroke={GRID}
                        vertical={false}
                      />
                      <XAxis
                        dataKey="key"
                        tick={{ fill: AXIS, fontSize: 11, fontWeight: 600 }}
                        axisLine={{ stroke: AXIS_LINE }}
                        tickLine={false}
                        dy={4}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fill: AXIS, fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        width={44}
                        domain={ordersDomain}
                        ticks={axisTicks(ordersDomain, 5, { integers: true })}
                        tickFormatter={formatAxisInt}
                      />
                      <Tooltip
                        cursor={{
                          fill: 'color-mix(in srgb, #c45c28 12%, transparent)',
                        }}
                        content={
                          <SeriesTooltip
                            caption="Order count for each period in the chart."
                            formatValue={(v) => v.toLocaleString('en-US')}
                          />
                        }
                      />
                      <Bar
                        dataKey="orders"
                        name="Orders"
                        fill="url(#analytics-orders-bar)"
                        radius={[8, 8, 3, 3]}
                        maxBarSize={barMax}
                        animationDuration={720}
                        animationEasing="ease-out"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartPanel>

              <ChartPanel
                panelKey="aov"
                title="Average order value"
                subtitle="Revenue / order count"
                tone="aov"
                series={[{ label: 'AOV', color: AOV, style: 'line' }]}
                table={
                  loading ? (
                    <ChartState>Loading…</ChartState>
                  ) : !hasAov ? (
                    <ChartState>Create orders to see average order value</ChartState>
                  ) : (
                    <SeriesTable
                      columns={[
                        { key: 'period', label: axisPeriodLabel },
                        { key: 'aov', label: 'AOV', align: 'end' },
                      ]}
                      rows={seriesTables.aov}
                    />
                  )
                }
              >
                {loading ? (
                  <ChartState>Loading…</ChartState>
                ) : !hasAov ? (
                  <ChartState>Create orders to see average order value</ChartState>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={chartData}
                      margin={{ top: 12, right: 10, left: 2, bottom: 4 }}
                    >
                      <CartesianGrid
                        strokeDasharray="4 6"
                        stroke={GRID}
                        vertical={false}
                      />
                      <XAxis
                        dataKey="key"
                        tick={{ fill: AXIS, fontSize: 11, fontWeight: 600 }}
                        axisLine={{ stroke: AXIS_LINE }}
                        tickLine={false}
                        dy={4}
                      />
                      <YAxis
                        tickFormatter={(v) => formatCompactAxis(v)}
                        tick={{ fill: AXIS, fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        width={48}
                        domain={aovDomain}
                        ticks={axisTicks(aovDomain)}
                      />
                      <Tooltip
                        content={
                          <SeriesTooltip
                            caption="Average revenue per order across the period."
                            formatValue={(v) => formatMoney(v)}
                          />
                        }
                      />
                      <Line
                        type="monotone"
                        dataKey="aov"
                        name="Avg order value"
                        stroke={AOV}
                        strokeWidth={2.75}
                        strokeLinecap="round"
                        dot={{
                          r: 4,
                          fill: '#fff',
                          stroke: AOV,
                          strokeWidth: 2.25,
                        }}
                        activeDot={{
                          r: 6,
                          fill: AOV,
                          stroke: '#fff',
                          strokeWidth: 2,
                        }}
                        connectNulls={false}
                        animationDuration={800}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </ChartPanel>

              <ChartPanel
                panelKey="upt"
                title="Units Per Transaction"
                subtitle="Average packs sold per order"
                tone="basket"
                series={[{ label: 'UPT', color: BASKET, style: 'line' }]}
                table={
                  loading ? (
                    <ChartState>Loading…</ChartState>
                  ) : !hasBasket ? (
                    <ChartState>
                      Create orders to see units per transaction
                    </ChartState>
                  ) : (
                    <SeriesTable
                      columns={[
                        { key: 'period', label: axisPeriodLabel },
                        { key: 'basket', label: 'UPT', align: 'end' },
                      ]}
                      rows={seriesTables.basket}
                    />
                  )
                }
              >
                {loading ? (
                  <ChartState>Loading…</ChartState>
                ) : !hasBasket ? (
                  <ChartState>
                    Create orders to see units per transaction
                  </ChartState>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={chartData}
                      margin={{ top: 12, right: 10, left: 2, bottom: 4 }}
                    >
                      <CartesianGrid
                        strokeDasharray="4 6"
                        stroke={GRID}
                        vertical={false}
                      />
                      <XAxis
                        dataKey="key"
                        tick={{ fill: AXIS, fontSize: 11, fontWeight: 600 }}
                        axisLine={{ stroke: AXIS_LINE }}
                        tickLine={false}
                        dy={4}
                      />
                      <YAxis
                        tickFormatter={formatCompactAxisQty}
                        tick={{ fill: AXIS, fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        width={48}
                        domain={basketDomain}
                        ticks={axisTicks(basketDomain)}
                      />
                      <Tooltip
                        content={
                          <SeriesTooltip
                            caption="Average packs sold per transaction."
                            formatValue={(v) => formatCompactQty(v)}
                          />
                        }
                      />
                      <Line
                        type="monotone"
                        dataKey="basket"
                        name="Units Per Transaction"
                        stroke={BASKET}
                        strokeWidth={2.75}
                        strokeLinecap="round"
                        dot={{
                          r: 4,
                          fill: '#fff',
                          stroke: BASKET,
                          strokeWidth: 2.25,
                        }}
                        activeDot={{
                          r: 6,
                          fill: BASKET,
                          stroke: '#fff',
                          strokeWidth: 2,
                        }}
                        connectNulls={false}
                        animationDuration={800}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </ChartPanel>

              <ChartPanel
                panelKey="apf"
                title="Average purchase frequency"
                subtitle="Orders ÷ unique customers"
                tone="frequency"
                series={[{ label: 'APF', color: FREQUENCY, style: 'line' }]}
                table={
                  loading ? (
                    <ChartState>Loading…</ChartState>
                  ) : !hasFrequency ? (
                    <ChartState>
                      Link customers on orders to see purchase frequency
                    </ChartState>
                  ) : (
                    <SeriesTable
                      columns={[
                        { key: 'period', label: axisPeriodLabel },
                        { key: 'frequency', label: 'APF', align: 'end' },
                      ]}
                      rows={seriesTables.frequency}
                    />
                  )
                }
              >
                {loading ? (
                  <ChartState>Loading…</ChartState>
                ) : !hasFrequency ? (
                  <ChartState>
                    Link customers on orders to see purchase frequency
                  </ChartState>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={chartData}
                      margin={{ top: 12, right: 10, left: 2, bottom: 4 }}
                    >
                      <CartesianGrid
                        strokeDasharray="4 6"
                        stroke={GRID}
                        vertical={false}
                      />
                      <XAxis
                        dataKey="key"
                        tick={{ fill: AXIS, fontSize: 11, fontWeight: 600 }}
                        axisLine={{ stroke: AXIS_LINE }}
                        tickLine={false}
                        dy={4}
                      />
                      <YAxis
                        tickFormatter={formatCompactAxisQty}
                        tick={{ fill: AXIS, fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        width={48}
                        domain={frequencyDomain}
                        ticks={axisTicks(frequencyDomain)}
                      />
                      <Tooltip
                        content={
                          <SeriesTooltip
                            caption="Average orders placed per unique buyer."
                            formatValue={(v) => formatCompactQty(v)}
                          />
                        }
                      />
                      <Line
                        type="monotone"
                        dataKey="frequency"
                        name="Avg purchase frequency"
                        stroke={FREQUENCY}
                        strokeWidth={2.75}
                        strokeLinecap="round"
                        dot={{
                          r: 4,
                          fill: '#fff',
                          stroke: FREQUENCY,
                          strokeWidth: 2.25,
                        }}
                        activeDot={{
                          r: 6,
                          fill: FREQUENCY,
                          stroke: '#fff',
                          strokeWidth: 2,
                        }}
                        connectNulls={false}
                        animationDuration={800}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </ChartPanel>
            </div>
          </ContentSection>

          <ContentSection
            eyebrow="Rates"
            title="Target progress & margin"
            description="How much of the revenue target you have reached (actual versus target), plus estimated profit margin."
      >
            <div
              className="umkm-analytics-charts"
              key={`rates-${granularity}-${timelineKey}`}
            >
              <ChartPanel
                panelKey="attainment"
                title="% of revenue target"
                subtitle="Actual revenue / target (100% = on plan)"
                tone="brand"
                table={
                  loading ? (
                    <ChartState>Loading…</ChartState>
                  ) : !hasAttainment ? (
                    <ChartState>
                      Set Targets to see how revenue tracks against plan
                    </ChartState>
                  ) : (
                    <SeriesTable
                      columns={[
                        { key: 'period', label: axisPeriodLabel },
                        {
                          key: 'attainment',
                          label: '% of target',
                          align: 'end',
                        },
                      ]}
                      rows={seriesTables.attainment}
                    />
                  )
                }
              >
                {loading ? (
                  <ChartState>Loading…</ChartState>
                ) : !hasAttainment ? (
                  <ChartState>
                    Set Targets to see how revenue tracks against plan
                  </ChartState>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={chartData}
                      margin={{ top: 10, right: 8, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={GRID}
                        vertical={false}
                      />
                      <XAxis
                        dataKey="key"
                        tick={{ fill: AXIS, fontSize: 12 }}
                        axisLine={{ stroke: AXIS_LINE }}
                        tickLine={false}
                      />
                      <YAxis
                        tickFormatter={formatAxisPct}
                        tick={{ fill: AXIS, fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        width={52}
                        domain={attainmentDomain}
                        ticks={axisTicks(attainmentDomain)}
                      />
                      <Tooltip
                        content={
                          <SeriesTooltip
                            caption="How close actual revenue is to the target for each period."
                            formatValue={(v) => formatPct(v)}
                          />
                        }
                      />
                      <ReferenceLine
                        y={100}
                        stroke={TARGET}
                        strokeDasharray="4 4"
                        label={{
                          value: '100%',
                          fill: TARGET,
                          fontSize: 11,
                          position: 'insideTopRight',
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="attainment"
                        name="Sales target rate"
                        stroke={ATTAINMENT}
                        strokeWidth={2.6}
                        dot={{ r: 3.5, fill: ATTAINMENT }}
                        activeDot={{ r: 5 }}
                        connectNulls={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </ChartPanel>

              <ChartPanel
                panelKey="margin"
                title="Profit margin rate"
                subtitle="(Revenue - cost) / revenue"
                tone="margin"
                table={
                  loading ? (
                    <ChartState>Loading…</ChartState>
                  ) : !hasMargin ? (
                    <ChartState>Add product costs to see margin over time</ChartState>
                  ) : (
                    <SeriesTable
                      columns={[
                        { key: 'period', label: axisPeriodLabel },
                        { key: 'margin', label: 'Margin', align: 'end' },
                      ]}
                      rows={seriesTables.margin}
                    />
                  )
                }
              >
                {loading ? (
                  <ChartState>Loading…</ChartState>
                ) : !hasMargin ? (
                  <ChartState>Add product costs to see margin over time</ChartState>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={chartData}
                      margin={{ top: 10, right: 8, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={GRID}
                        vertical={false}
                      />
                      <XAxis
                        dataKey="key"
                        tick={{ fill: AXIS, fontSize: 12 }}
                        axisLine={{ stroke: AXIS_LINE }}
                        tickLine={false}
                      />
                      <YAxis
                        tickFormatter={formatAxisPct}
                        tick={{ fill: AXIS, fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        width={52}
                        domain={marginDomain}
                        ticks={axisTicks(marginDomain)}
                      />
                      <Tooltip
                        content={
                          <SeriesTooltip
                            caption="Estimated profit margin across the period."
                            formatValue={(v) => formatPct(v)}
                          />
                        }
                      />
                      <Line
                        type="monotone"
                        dataKey="margin"
                        name="Margin"
                        stroke={MARGIN}
                        strokeWidth={2.6}
                        dot={{ r: 3.5, fill: MARGIN }}
                        activeDot={{ r: 5 }}
                        connectNulls={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </ChartPanel>
            </div>
          </ContentSection>

          <ContentSection
            eyebrow="Mix"
            title="Order status & payment mode"
            description="Share of orders by fulfillment status (including cancelled) and by payment mode (active orders only). The timeline follows Weekly, Monthly, Quarterly, or Annual."
          >
            <div
              className="umkm-analytics-charts"
              key={`mix-${granularity}-${timelineKey}`}
            >
              <ChartPanel
                panelKey="order-status-mix"
                title="Order status mix"
                subtitle="% of orders by status"
                tone="orders"
                series={statusSeries}
                table={
                  loading ? (
                    <ChartState>Loading…</ChartState>
                  ) : !hasStatusMix ? (
                    <ChartState>No orders in this period</ChartState>
                  ) : (
                    <SeriesTable
                      columns={[
                        { key: 'period', label: axisPeriodLabel },
                        ...ORDER_STATUSES.map((status) => ({
                          key: status,
                          label: orderStatus[status],
                          align: 'end' as const,
                        })),
                        { key: 'orders', label: 'Orders', align: 'end' },
                      ]}
                      rows={seriesTables.status}
                    />
                  )
                }
              >
                {loading ? (
                  <ChartState>Loading…</ChartState>
                ) : !hasStatusMix ? (
                  <ChartState>No orders in this period</ChartState>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={statusChartData}
                      margin={{ top: 10, right: 8, left: 0, bottom: 0 }}
                      stackOffset="none"
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={GRID}
                        vertical={false}
                      />
                      <XAxis
                        dataKey="key"
                        tick={{ fill: AXIS, fontSize: 12 }}
                        axisLine={{ stroke: AXIS_LINE }}
                        tickLine={false}
                      />
                      <YAxis
                        tickFormatter={formatAxisPct}
                        tick={{ fill: AXIS, fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        width={44}
                        domain={[0, 100]}
                        ticks={[0, 25, 50, 75, 100]}
                      />
                      <Tooltip
                        content={
                          <SeriesTooltip
                            caption="Share of orders in each status for this period (includes cancelled)."
                            formatValue={(v) => formatPct(v)}
                            hideZero
                          />
                        }
                      />
                      {ORDER_STATUSES.map((status) => (
                        <Bar
                          key={status}
                          dataKey={status}
                          name={orderStatus[status]}
                          stackId="status"
                          fill={STATUS_COLORS[status]}
                          maxBarSize={36}
                          animationDuration={700}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartPanel>

              <ChartPanel
                panelKey="payment-mode-mix"
                title="Payment mode mix"
                subtitle="% of active orders by payment"
                tone="pay"
                series={paymentModeSeries}
                table={
                  loading ? (
                    <ChartState>Loading…</ChartState>
                  ) : !hasPaymentMix ? (
                    <ChartState>No active orders in this period</ChartState>
                  ) : (
                    <SeriesTable
                      columns={[
                        { key: 'period', label: axisPeriodLabel },
                        ...PAYMENT_STATUSES.map((status) => ({
                          key: status,
                          label: paymentStatus[status],
                          align: 'end' as const,
                        })),
                        { key: 'orders', label: 'Orders', align: 'end' },
                      ]}
                      rows={seriesTables.paymentMode}
                    />
                  )
                }
              >
                {loading ? (
                  <ChartState>Loading…</ChartState>
                ) : !hasPaymentMix ? (
                  <ChartState>No active orders in this period</ChartState>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={paymentChartData}
                      margin={{ top: 10, right: 8, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={GRID}
                        vertical={false}
                      />
                      <XAxis
                        dataKey="key"
                        tick={{ fill: AXIS, fontSize: 12 }}
                        axisLine={{ stroke: AXIS_LINE }}
                        tickLine={false}
                      />
                      <YAxis
                        tickFormatter={formatAxisPct}
                        tick={{ fill: AXIS, fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        width={44}
                        domain={[0, 100]}
                        ticks={[0, 25, 50, 75, 100]}
                      />
                      <Tooltip
                        content={
                          <SeriesTooltip
                            caption="Share of non-cancelled orders by payment mode for this period."
                            formatValue={(v) => formatPct(v)}
                            hideZero
                          />
                        }
                      />
                      {PAYMENT_STATUSES.map((status) => (
                        <Bar
                          key={status}
                          dataKey={status}
                          name={paymentStatus[status]}
                          stackId="payment"
                          fill={PAYMENT_MODE_COLORS[status]}
                          maxBarSize={36}
                          animationDuration={700}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartPanel>
            </div>
          </ContentSection>

          <ContentSection
            eyebrow="Lead times"
            title="Shipment, invoice & payment"
            description="Average days from order date to shipment, invoice, first installment, and last installment."
          >
            <div
              className="umkm-analytics-charts umkm-analytics-charts-lead"
              key={`lead-${granularity}-${timelineKey}`}
            >
              <ChartPanel
                panelKey="shipment"
                title="Shipment duration"
                subtitle="Order → shipment"
                tone="ship"
                table={
                  loading ? (
                    <ChartState>Loading…</ChartState>
                  ) : !hasShipment ? (
                    <ChartState>
                      Set shipment dates on orders to see lead time
                    </ChartState>
                  ) : (
                    <SeriesTable
                      columns={[
                        { key: 'period', label: axisPeriodLabel },
                        { key: 'days', label: 'Avg days', align: 'end' },
                      ]}
                      rows={seriesTables.shipment}
                    />
                  )
                }
              >
                {loading ? (
                  <ChartState>Loading…</ChartState>
                ) : !hasShipment ? (
                  <ChartState>
                    Set shipment dates on orders to see lead time
                  </ChartState>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={chartData}
                      margin={{ top: 10, right: 8, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={GRID}
                        vertical={false}
                      />
                      <XAxis
                        dataKey="key"
                        tick={{ fill: AXIS, fontSize: 12 }}
                        axisLine={{ stroke: AXIS_LINE }}
                        tickLine={false}
                      />
                      <YAxis
                        tickFormatter={formatAxisDays}
                        tick={{ fill: AXIS, fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        width={40}
                        domain={shipmentDomain}
                        ticks={axisTicks(shipmentDomain)}
                      />
                      <Tooltip
                        content={
                          <SeriesTooltip
                            caption="Average days from order to shipment."
                            formatValue={(v) => formatDays(v)}
                          />
                        }
                      />
                      <Line
                        type="monotone"
                        dataKey="shipmentDays"
                        name="Avg shipment days"
                        stroke={SHIPMENT}
                        strokeWidth={2.6}
                        dot={{ r: 3.5, fill: SHIPMENT }}
                        activeDot={{ r: 5 }}
                        connectNulls={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </ChartPanel>

              <ChartPanel
                panelKey="invoice"
                title="Invoice duration"
                subtitle="Order → invoice"
                tone="invoice"
                table={
                  loading ? (
                    <ChartState>Loading…</ChartState>
                  ) : !hasInvoice ? (
                    <ChartState>
                      Set invoice dates on orders to see lead time
                    </ChartState>
                  ) : (
                    <SeriesTable
                      columns={[
                        { key: 'period', label: axisPeriodLabel },
                        { key: 'days', label: 'Avg days', align: 'end' },
                      ]}
                      rows={seriesTables.invoice}
                    />
                  )
                }
              >
                {loading ? (
                  <ChartState>Loading…</ChartState>
                ) : !hasInvoice ? (
                  <ChartState>
                    Set invoice dates on orders to see lead time
                  </ChartState>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={chartData}
                      margin={{ top: 10, right: 8, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={GRID}
                        vertical={false}
                      />
                      <XAxis
                        dataKey="key"
                        tick={{ fill: AXIS, fontSize: 12 }}
                        axisLine={{ stroke: AXIS_LINE }}
                        tickLine={false}
                      />
                      <YAxis
                        tickFormatter={formatAxisDays}
                        tick={{ fill: AXIS, fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        width={40}
                        domain={invoiceDomain}
                        ticks={axisTicks(invoiceDomain)}
                      />
                      <Tooltip
                        content={
                          <SeriesTooltip
                            caption="Average days from order to invoice."
                            formatValue={(v) => formatDays(v)}
                          />
                        }
                      />
                      <Line
                        type="monotone"
                        dataKey="invoiceDays"
                        name="Avg invoice days"
                        stroke={INVOICE}
                        strokeWidth={2.6}
                        dot={{ r: 3.5, fill: INVOICE }}
                        activeDot={{ r: 5 }}
                        connectNulls={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </ChartPanel>

              <ChartPanel
                panelKey="first-payment"
                title="First payment duration"
                subtitle="Order → first installment"
                tone="firstPay"
                table={
                  loading ? (
                    <ChartState>Loading…</ChartState>
                  ) : !hasFirstPayment ? (
                    <ChartState>
                      Add installments to see first payment lead time
                    </ChartState>
                  ) : (
                    <SeriesTable
                      columns={[
                        { key: 'period', label: axisPeriodLabel },
                        { key: 'days', label: 'Avg days', align: 'end' },
                      ]}
                      rows={seriesTables.firstPayment}
                    />
                  )
                }
              >
                {loading ? (
                  <ChartState>Loading…</ChartState>
                ) : !hasFirstPayment ? (
                  <ChartState>
                    Add installments to see first payment lead time
                  </ChartState>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={chartData}
                      margin={{ top: 10, right: 8, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={GRID}
                        vertical={false}
                      />
                      <XAxis
                        dataKey="key"
                        tick={{ fill: AXIS, fontSize: 12 }}
                        axisLine={{ stroke: AXIS_LINE }}
                        tickLine={false}
                      />
                      <YAxis
                        tickFormatter={formatAxisDays}
                        tick={{ fill: AXIS, fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        width={40}
                        domain={firstPaymentDomain}
                        ticks={axisTicks(firstPaymentDomain)}
                      />
                      <Tooltip
                        content={
                          <SeriesTooltip
                            caption="Average days until the first payment."
                            formatValue={(v) => formatDays(v)}
                          />
                        }
                      />
                      <Line
                        type="monotone"
                        dataKey="firstPaymentDays"
                        name="Avg first payment days"
                        stroke={FIRST_PAY}
                        strokeWidth={2.6}
                        dot={{ r: 3.5, fill: FIRST_PAY }}
                        activeDot={{ r: 5 }}
                        connectNulls={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </ChartPanel>

              <ChartPanel
                panelKey="last-payment"
                title="Last payment duration"
                subtitle="Order → last installment"
                tone="pay"
                table={
                  loading ? (
                    <ChartState>Loading…</ChartState>
                  ) : !hasPayment ? (
                    <ChartState>
                      Add installments to see payment lead time
                    </ChartState>
                  ) : (
                    <SeriesTable
                      columns={[
                        { key: 'period', label: axisPeriodLabel },
                        { key: 'days', label: 'Avg days', align: 'end' },
                      ]}
                      rows={seriesTables.payment}
                    />
                  )
                }
              >
                {loading ? (
                  <ChartState>Loading…</ChartState>
                ) : !hasPayment ? (
                  <ChartState>
                    Add installments to see payment lead time
                  </ChartState>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={chartData}
                      margin={{ top: 10, right: 8, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={GRID}
                        vertical={false}
                      />
                      <XAxis
                        dataKey="key"
                        tick={{ fill: AXIS, fontSize: 12 }}
                        axisLine={{ stroke: AXIS_LINE }}
                        tickLine={false}
                      />
                      <YAxis
                        tickFormatter={formatAxisDays}
                        tick={{ fill: AXIS, fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        width={40}
                        domain={paymentDomain}
                        ticks={axisTicks(paymentDomain)}
                      />
                      <Tooltip
                        content={
                          <SeriesTooltip
                            caption="Average days until the last payment."
                            formatValue={(v) => formatDays(v)}
                          />
                        }
                      />
                      <Line
                        type="monotone"
                        dataKey="paymentDays"
                        name="Avg last payment days"
                        stroke={PAYMENT}
                        strokeWidth={2.6}
                        dot={{ r: 3.5, fill: PAYMENT }}
                        activeDot={{ r: 5 }}
                        connectNulls={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </ChartPanel>
            </div>
          </ContentSection>
        </>
      )}

      <ContentSection
        eyebrow="Product value"
        title={`${scopeLabel} product revenue`}
        description="Average product revenue is net sales divided by products with sales. Rankings show the top five and bottom five products by revenue in this timeline."
      >
        {!loading &&
        !hasProductRevenue &&
        !hasTopProducts &&
        !hasBottomProducts ? (
          <EmptyState
            title="No product sales yet"
            description="Orders in this timeline unlock average product revenue trends and product rankings."
          />
        ) : (
          <div
            className="umkm-analytics-stack"
            key={`product-rev-${granularity}-${timelineKey}`}
          >
            <div className="umkm-analytics-charts">
              <ChartPanel
                panelKey="avg-product-revenue"
                title="Average product revenue"
                subtitle={
                  granularity === 'weekly'
                    ? 'Week product revenue / products sold'
                    : granularity === 'monthly'
                      ? 'Month product revenue / products sold'
                      : granularity === 'quarterly'
                        ? 'Quarter product revenue / products sold'
                        : 'Year product revenue / products sold'
                }
                tone="product"
                table={
                  loading ? (
                    <ChartState>Loading…</ChartState>
                  ) : !hasProductRevenue ? (
                    <ChartState>No product sales in this window</ChartState>
                  ) : (
                    <SeriesTable
                      columns={[
                        { key: 'period', label: axisPeriodLabel },
                        {
                          key: 'productRevenue',
                          label: 'Avg product revenue',
                          align: 'end',
                        },
                      ]}
                      rows={seriesTables.productRevenue}
                    />
                  )
                }
              >
                {loading ? (
                  <ChartState>Loading…</ChartState>
                ) : !hasProductRevenue ? (
                  <ChartState>No product sales in this window</ChartState>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={chartData}
                      margin={{ top: 10, right: 8, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={GRID}
                        vertical={false}
                      />
                      <XAxis
                        dataKey="key"
                        tick={{ fill: AXIS, fontSize: 12 }}
                        axisLine={{ stroke: AXIS_LINE }}
                        tickLine={false}
                      />
                      <YAxis
                        tickFormatter={formatCompactAxis}
                        tick={{ fill: AXIS, fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        width={48}
                        domain={avgProductRevenueDomain}
                        ticks={axisTicks(avgProductRevenueDomain)}
                      />
                      <Tooltip
                        content={
                          <SeriesTooltip
                            caption="Average product revenue for the period."
                            formatValue={(v) => formatMoney(v)}
                          />
                        }
                      />
                      <Line
                        type="monotone"
                        dataKey="productRevenue"
                        name="Avg product revenue"
                        stroke={PRODUCT}
                        strokeWidth={2.6}
                        dot={{ r: 3.5, fill: PRODUCT }}
                        activeDot={{ r: 5 }}
                        connectNulls={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </ChartPanel>
            </div>

            <div className="umkm-analytics-charts umkm-analytics-charts-rank">
              <ChartPanel
                panelKey="top-products"
                title="Top 5 products by revenue"
                subtitle={`Highest product revenue in ${scopeLabel}`}
                tone="product"
                chartHeight={
                  hasTopProducts
                    ? rankChartHeightRem(productTopChartData.length)
                    : undefined
                }
                table={
                  loading ? (
                    <ChartState>Loading…</ChartState>
                  ) : (
                    <RankSeriesTable
                      rows={productTopChartData}
                      valueLabel="Revenue"
                      empty="No product ranking yet"
                    />
                  )
                }
              >
                {loading ? (
                  <ChartState>Loading…</ChartState>
                ) : !hasTopProducts ? (
                  <ChartState>No product ranking yet</ChartState>
                ) : (
                  <RankBarChart
                    data={productTopChartData}
                    fill={PRODUCT}
                    domain={topProductDomain}
                    valueName="Revenue"
                    caption="Revenue contributed by this product."
                  />
                )}
              </ChartPanel>

              <ChartPanel
                panelKey="bottom-products"
                title="Bottom 5 products by revenue"
                subtitle={`Lowest product revenue in ${scopeLabel}`}
                tone="product"
                chartHeight={
                  hasBottomProducts
                    ? rankChartHeightRem(productBottomChartData.length)
                    : undefined
                }
                table={
                  loading ? (
                    <ChartState>Loading…</ChartState>
                  ) : (
                    <RankSeriesTable
                      rows={productBottomChartData}
                      valueLabel="Revenue"
                      empty="No product ranking yet"
                    />
                  )
                }
              >
                {loading ? (
                  <ChartState>Loading…</ChartState>
                ) : !hasBottomProducts ? (
                  <ChartState>No product ranking yet</ChartState>
                ) : (
                  <RankBarChart
                    data={productBottomChartData}
                    fill={PRODUCT_LOW}
                    domain={bottomProductDomain}
                    valueName="Revenue"
                    caption="Revenue contributed by this product."
                  />
                )}
              </ChartPanel>
            </div>
          </div>
        )}
      </ContentSection>

      <ContentSection
        eyebrow="Products"
        title={`${scopeLabel} product performance`}
        description="Revenue shows gross (primary) and net (subline). Discount %, cost %, and margin % are shares of gross revenue, so they add up to about 100%."
        actions={
          data?.products?.length ? (
            <button
              type="button"
              className="umkm-analytics-export-btn is-tool"
              onClick={() =>
                downloadProductPerformanceCsv(
                  slugExportName(
                    `${scopeLabel}-product-performance`,
                    'product-performance',
                  ),
                  data.products,
                )
              }
              title="Download table as CSV"
              aria-label="Download product performance as CSV"
            >
              <CsvIcon />
              <span>CSV</span>
            </button>
          ) : null
        }
      >
        {loading || tablesLoading ? (
          <p className="umkm-catalog-count">Loading products…</p>
        ) : !data?.products.length ? (
          <EmptyState
            title="No product sales yet"
            description="Orders in this timeline will appear here with gross revenue, net revenue, discount, cost, and margin."
          />
        ) : (
          <>
            <div className="umkm-table-wrap umkm-catalog-table-wrap umkm-analytics-products">
              <table className="umkm-table umkm-catalog-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th className="is-num">Orders</th>
                    <th className="is-num">Repeat</th>
                    <th className="is-num">Revenue</th>
                    <th className="is-num">Discount</th>
                    <th className="is-num">Cost</th>
                    <th className="is-num">Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {data.products.map((p) => (
                    <tr key={p.productId}>
                      <td>
                        <div className="umkm-product-cell is-compact">
                          <span className="umkm-product-name">{p.name}</span>
                          <div className="umkm-product-identity-row">
                            <span className="umkm-unit-chip">{p.unit}</span>
                            <span className="umkm-num-sub">
                              {formatCompactQty(p.packsSold)} packs
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="is-num">
                        {formatCompactQty(p.orderCount)}
                      </td>
                      <td className="is-num">
                        <RepeatDaysCell
                          first={p.firstRepeatOrderDays}
                          avg={p.avgRepeatOrderDays}
                        />
                      </td>
                      <td className="is-num">
                        <div className="umkm-num-stack">
                          <span className="umkm-num">
                            {formatMoney(p.grossRevenue)}
                          </span>
                          <span className="umkm-num-sub">
                            Gross
                            {' · '}
                            Net {formatMoney(p.revenue)}
                            {p.avgOrderValue != null
                              ? ` · avg ${formatMoney(p.avgOrderValue)}`
                              : ''}
                          </span>
                        </div>
                      </td>
                      <td className="is-num">
                        {p.discount > 0 ? (
                          <div className="umkm-num-stack">
                            <span className="umkm-num">
                              {formatMoney(p.discount)}
                            </span>
                            {p.discountPercent != null ? (
                              <span className="umkm-num-sub">
                                {formatRatePct(p.discountPercent)} off
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          <span className="umkm-num is-empty">—</span>
                        )}
                      </td>
                      <td className="is-num">
                        {p.cost != null ? (
                          <div className="umkm-num-stack">
                            <span className="umkm-num">
                              {formatMoney(p.cost)}
                            </span>
                            {p.costPercent != null ? (
                              <span className="umkm-num-sub">
                                {formatRatePct(p.costPercent)} COGS
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          <span className="umkm-num is-empty">—</span>
                        )}
                      </td>
                      <td
                        className={`is-num${
                          p.profit != null && p.profit < 0
                            ? ' is-neg'
                            : p.marginPercent != null && p.marginPercent >= 0
                              ? ' is-pos'
                              : ''
                        }`}
                      >
                        {p.profit != null ? (
                          <div className="umkm-num-stack">
                            <span className="umkm-num">
                              {formatMoney(p.profit)}
                            </span>
                            {p.marginPercent != null ? (
                              <span className="umkm-num-sub">
                                {formatRatePct(p.marginPercent)} margin
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          <span className="umkm-num is-empty">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="umkm-catalog-cards">
              {data.products.map((p) => (
                <li key={p.productId} className="umkm-catalog-card">
                  <div
                    className="umkm-catalog-card-main"
                    style={{ cursor: 'default' }}
                  >
                    <div className="umkm-catalog-card-identity">
                      <span className="umkm-product-name">{p.name}</span>
                      <div className="umkm-product-identity-row">
                        <span className="umkm-unit-chip">{p.unit}</span>
                        <span className="umkm-unit-chip">
                          {formatCompactQty(p.orderCount)} orders
                        </span>
                      </div>
                      <div className="umkm-catalog-card-details">
                        <span>
                          {formatCompactQty(p.packsSold)} packs sold
                        </span>
                        <span>
                          Repeat {formatDays(p.firstRepeatOrderDays)}
                          {p.avgRepeatOrderDays != null
                            ? ` · avg ${formatDays(p.avgRepeatOrderDays)}`
                            : ''}
                        </span>
                      </div>
                    </div>
                    <div className="umkm-catalog-card-metrics umkm-catalog-card-metrics--analytics">
                      <div>
                        <span>Revenue</span>
                        <strong>{formatMoney(p.grossRevenue)}</strong>
                        <em className="umkm-num-sub">
                          Gross
                          {' · '}
                          Net {formatMoney(p.revenue)}
                          {p.avgOrderValue != null
                            ? ` · avg ${formatMoney(p.avgOrderValue)}`
                            : ''}
                        </em>
                      </div>
                      <div>
                        <span>Discount</span>
                        <strong>
                          {p.discount > 0
                            ? p.discountPercent != null
                              ? `${formatMoney(p.discount)} · ${formatRatePct(p.discountPercent)} off`
                              : formatMoney(p.discount)
                            : '—'}
                        </strong>
                      </div>
                      <div>
                        <span>Cost</span>
                        <strong>
                          {p.cost != null
                            ? p.costPercent != null
                              ? `${formatMoney(p.cost)} · ${formatRatePct(p.costPercent)}`
                              : formatMoney(p.cost)
                            : '—'}
                        </strong>
                      </div>
                      <div>
                        <span>Profit</span>
                        <strong
                          className={
                            p.profit != null && p.profit < 0
                              ? 'is-neg'
                              : p.marginPercent != null
                                ? 'is-pos'
                                : undefined
                          }
                        >
                          {p.profit != null
                            ? p.marginPercent != null
                              ? `${formatMoney(p.profit)} · ${formatRatePct(p.marginPercent)}`
                              : formatMoney(p.profit)
                            : '—'}
                        </strong>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </ContentSection>

      <ContentSection
        eyebrow="Lifetime value"
        title={`${scopeLabel} customer LTV`}
        description="Lifetime value is net revenue from linked customers. Average lifetime value tracks revenue per active buyer. Rankings show the top five and bottom five customers in this timeline."
      >
        {!loading && !hasLtv && !hasTopLtv && !hasBottomLtv ? (
          <EmptyState
            title="No LTV data yet"
            description="Assign customers on orders to unlock average LTV trends and customer rankings."
          />
        ) : (
          <div
            className="umkm-analytics-stack"
            key={`ltv-${granularity}-${timelineKey}`}
          >
            <div className="umkm-analytics-charts">
              <ChartPanel
                panelKey="avg-ltv"
                title="Average LTV"
                subtitle={
                  granularity === 'weekly'
                    ? 'Week linked revenue / active customers'
                    : granularity === 'monthly'
                      ? 'Month linked revenue / active customers'
                      : granularity === 'quarterly'
                        ? 'Quarter linked revenue / active customers'
                        : 'Year linked revenue / customers'
                }
                tone="ltv"
                table={
                  loading ? (
                    <ChartState>Loading…</ChartState>
                  ) : !hasLtv ? (
                    <ChartState>
                      No linked customer orders in this window
                    </ChartState>
                  ) : (
                    <SeriesTable
                      columns={[
                        { key: 'period', label: axisPeriodLabel },
                        { key: 'ltv', label: 'Avg LTV', align: 'end' },
                      ]}
                      rows={seriesTables.ltv}
                    />
                  )
                }
              >
                {loading ? (
                  <ChartState>Loading…</ChartState>
                ) : !hasLtv ? (
                  <ChartState>
                    No linked customer orders in this window
                  </ChartState>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={chartData}
                      margin={{ top: 10, right: 8, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={GRID}
                        vertical={false}
                      />
                      <XAxis
                        dataKey="key"
                        tick={{ fill: AXIS, fontSize: 12 }}
                        axisLine={{ stroke: AXIS_LINE }}
                        tickLine={false}
                      />
                      <YAxis
                        tickFormatter={formatCompactAxis}
                        tick={{ fill: AXIS, fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        width={48}
                        domain={avgLtvDomain}
                        ticks={axisTicks(avgLtvDomain)}
                      />
                      <Tooltip
                        content={
                          <SeriesTooltip
                            caption="Average customer lifetime value for the period."
                            formatValue={(v) => formatMoney(v)}
                          />
                        }
                      />
                      <Line
                        type="monotone"
                        dataKey="ltv"
                        name="Avg LTV"
                        stroke={LTV}
                        strokeWidth={2.6}
                        dot={{ r: 3.5, fill: LTV }}
                        activeDot={{ r: 5 }}
                        connectNulls={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </ChartPanel>
            </div>

            <div className="umkm-analytics-charts umkm-analytics-charts-rank">
              <ChartPanel
                panelKey="top-customers"
                title="Top 5 customers by LTV"
                subtitle={`Highest linked revenue in ${scopeLabel}`}
                tone="ltv"
                chartHeight={
                  hasTopLtv
                    ? rankChartHeightRem(ltvTopChartData.length)
                    : undefined
                }
                table={
                  loading ? (
                    <ChartState>Loading…</ChartState>
                  ) : (
                    <RankSeriesTable
                      rows={ltvTopChartData}
                      valueLabel="LTV"
                      empty="No customer ranking yet"
                    />
                  )
                }
              >
                {loading ? (
                  <ChartState>Loading…</ChartState>
                ) : !hasTopLtv ? (
                  <ChartState>No customer ranking yet</ChartState>
                ) : (
                  <RankBarChart
                    data={ltvTopChartData}
                    fill={LTV}
                    domain={topLtvDomain}
                    valueName="LTV"
                    caption="Lifetime revenue linked to this customer."
                  />
                )}
              </ChartPanel>

              <ChartPanel
                panelKey="bottom-customers"
                title="Bottom 5 customers by LTV"
                subtitle={`Lowest linked revenue in ${scopeLabel}`}
                tone="ltv"
                chartHeight={
                  hasBottomLtv
                    ? rankChartHeightRem(ltvBottomChartData.length)
                    : undefined
                }
                table={
                  loading ? (
                    <ChartState>Loading…</ChartState>
                  ) : (
                    <RankSeriesTable
                      rows={ltvBottomChartData}
                      valueLabel="LTV"
                      empty="No customer ranking yet"
                    />
                  )
                }
              >
                {loading ? (
                  <ChartState>Loading…</ChartState>
                ) : !hasBottomLtv ? (
                  <ChartState>No customer ranking yet</ChartState>
                ) : (
                  <RankBarChart
                    data={ltvBottomChartData}
                    fill={LTV_LOW}
                    domain={bottomLtvDomain}
                    valueName="LTV"
                    caption="Lifetime revenue linked to this customer."
                  />
                )}
              </ChartPanel>
            </div>
          </div>
        )}
      </ContentSection>

      <ContentSection
        eyebrow="Customers"
        title={`${scopeLabel} customer performance`}
        description="The same performance metrics as products, grouped by CRM customer. Only orders with an assigned customer appear here. Revenue shows gross (primary) and net (subline). Rates are shares of gross revenue."
        actions={
          data?.customers?.length ? (
            <button
              type="button"
              className="umkm-analytics-export-btn is-tool"
              onClick={() =>
                downloadCustomerPerformanceCsv(
                  slugExportName(
                    `${scopeLabel}-customer-performance`,
                    'customer-performance',
                  ),
                  data.customers,
                )
              }
              title="Download table as CSV"
              aria-label="Download customer performance as CSV"
            >
              <CsvIcon />
              <span>CSV</span>
            </button>
          ) : null
        }
      >
        {loading || tablesLoading ? (
          <p className="umkm-catalog-count">Loading customers…</p>
        ) : !(data?.customers?.length ?? 0) ? (
          <EmptyState
            title="No customer sales yet"
            description="Assign a customer on orders to see gross revenue, net revenue, discount, cost, and profit here."
          />
        ) : (
          <>
            <div className="umkm-table-wrap umkm-catalog-table-wrap umkm-analytics-products">
              <table className="umkm-table umkm-catalog-table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th className="is-num">Orders</th>
                    <th className="is-num">Repeat</th>
                    <th className="is-num">Revenue</th>
                    <th className="is-num">Discount</th>
                    <th className="is-num">Cost</th>
                    <th className="is-num">Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.customers ?? []).map((c) => (
                    <tr key={c.customerId}>
                      <td>
                        <div className="umkm-product-cell is-compact">
                          <span className="umkm-product-name">{c.name}</span>
                          <div className="umkm-product-identity-row">
                            <span className="umkm-unit-chip">
                              {companyType[
                                c.companyType as keyof typeof companyType
                              ] ?? c.companyType}
                            </span>
                            {c.companyName ? (
                              <span className="umkm-num-sub">
                                {c.companyName}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="is-num">
                        <div className="umkm-num-stack">
                          <span className="umkm-num">
                            {formatCompactQty(c.orderCount)}
                          </span>
                          <span className="umkm-num-sub">
                            {formatCompactQty(c.packsSold)} packs
                          </span>
                        </div>
                      </td>
                      <td className="is-num">
                        <RepeatDaysCell
                          first={c.firstRepeatOrderDays}
                          avg={c.avgRepeatOrderDays}
                        />
                      </td>
                      <td className="is-num">
                        <div className="umkm-num-stack">
                          <span className="umkm-num">
                            {formatMoney(c.grossRevenue)}
                          </span>
                          <span className="umkm-num-sub">
                            Gross
                            {' · '}
                            Net {formatMoney(c.revenue)}
                            {c.avgOrderValue != null
                              ? ` · avg ${formatMoney(c.avgOrderValue)}`
                              : ''}
                          </span>
                        </div>
                      </td>
                      <td className="is-num">
                        {c.discount > 0 ? (
                          <div className="umkm-num-stack">
                            <span className="umkm-num">
                              {formatMoney(c.discount)}
                            </span>
                            {c.discountPercent != null ? (
                              <span className="umkm-num-sub">
                                {formatRatePct(c.discountPercent)} off
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          <span className="umkm-num is-empty">—</span>
                        )}
                      </td>
                      <td className="is-num">
                        {c.cost != null ? (
                          <div className="umkm-num-stack">
                            <span className="umkm-num">
                              {formatMoney(c.cost)}
                            </span>
                            {c.costPercent != null ? (
                              <span className="umkm-num-sub">
                                {formatRatePct(c.costPercent)} COGS
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          <span className="umkm-num is-empty">—</span>
                        )}
                      </td>
                      <td
                        className={`is-num${
                          c.profit != null && c.profit < 0
                            ? ' is-neg'
                            : c.marginPercent != null && c.marginPercent >= 0
                              ? ' is-pos'
                              : ''
                        }`}
                      >
                        {c.profit != null ? (
                          <div className="umkm-num-stack">
                            <span className="umkm-num">
                              {formatMoney(c.profit)}
                            </span>
                            {c.marginPercent != null ? (
                              <span className="umkm-num-sub">
                                {formatRatePct(c.marginPercent)} margin
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          <span className="umkm-num is-empty">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="umkm-catalog-cards">
              {(data?.customers ?? []).map((c) => (
                <li key={c.customerId} className="umkm-catalog-card">
                  <div
                    className="umkm-catalog-card-main"
                    style={{ cursor: 'default' }}
                  >
                    <div className="umkm-catalog-card-identity">
                      <span className="umkm-product-name">{c.name}</span>
                      <div className="umkm-product-identity-row">
                        <span className="umkm-unit-chip">
                          {companyType[
                            c.companyType as keyof typeof companyType
                          ] ?? c.companyType}
                        </span>
                        <span className="umkm-unit-chip">
                          {formatCompactQty(c.orderCount)} orders
                        </span>
                      </div>
                      <div className="umkm-catalog-card-details">
                        {c.companyName ? <span>{c.companyName}</span> : null}
                        <span>
                          {formatCompactQty(c.packsSold)} packs sold
                        </span>
                        <span>
                          Repeat {formatDays(c.firstRepeatOrderDays)}
                          {c.avgRepeatOrderDays != null
                            ? ` · avg ${formatDays(c.avgRepeatOrderDays)}`
                            : ''}
                        </span>
                      </div>
                    </div>
                    <div className="umkm-catalog-card-metrics umkm-catalog-card-metrics--analytics">
                      <div>
                        <span>Revenue</span>
                        <strong>{formatMoney(c.grossRevenue)}</strong>
                        <em className="umkm-num-sub">
                          Gross
                          {' · '}
                          Net {formatMoney(c.revenue)}
                          {c.avgOrderValue != null
                            ? ` · avg ${formatMoney(c.avgOrderValue)}`
                            : ''}
                        </em>
                      </div>
                      <div>
                        <span>Discount</span>
                        <strong>
                          {c.discount > 0
                            ? c.discountPercent != null
                              ? `${formatMoney(c.discount)} · ${formatRatePct(c.discountPercent)} off`
                              : formatMoney(c.discount)
                            : '—'}
                        </strong>
                      </div>
                      <div>
                        <span>Cost</span>
                        <strong>
                          {c.cost != null
                            ? c.costPercent != null
                              ? `${formatMoney(c.cost)} · ${formatRatePct(c.costPercent)}`
                              : formatMoney(c.cost)
                            : '—'}
                        </strong>
                      </div>
                      <div>
                        <span>Profit</span>
                        <strong
                          className={
                            c.profit != null && c.profit < 0
                              ? 'is-neg'
                              : c.marginPercent != null
                                ? 'is-pos'
                                : undefined
                          }
                        >
                          {c.profit != null
                            ? c.marginPercent != null
                              ? `${formatMoney(c.profit)} · ${formatRatePct(c.marginPercent)}`
                              : formatMoney(c.profit)
                            : '—'}
                        </strong>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </ContentSection>
      </AnalyticsCsvExportContext.Provider>
      </AnalyticsChartViewContext.Provider>
      </AnalyticsLensControlsContext.Provider>
      </AnalyticsFullscreenProvider>
    </section>
  );
}
