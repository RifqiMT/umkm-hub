'use client';

import { type ReactNode, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
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
  ContentSection,
  EmptyState,
  PageHeader,
} from '@/components/PageHeader';
import { OptionChips } from '@/components/OptionChips';
import { YearSelect } from '@/components/YearSelect';
import type { AnalyticsOverview } from '@/lib/types';
import { LABELS } from '@/lib/enums';
import { formatMoney, formatQty } from '@/lib/format-money';

type Granularity = 'monthly' | 'annual';

const BRAND = '#0b6b58';
const TARGET = '#5a6f66';
const ORDERS = '#c4783a';
const AOV = '#3d7a5c';
const LTV = '#5c6bc0';
const ATTAINMENT = '#0b6b58';
const MARGIN = '#2f6f8f';
const SHIPMENT = '#6b5b3e';
const FIRST_PAY = '#a67c52';
const PAYMENT = '#8a4f3d';
const GRID = 'color-mix(in srgb, #c5d4cc 70%, transparent)';
const AXIS = '#5a6f66';
const AXIS_LINE = '#c5d4cc';

const tooltipStyle = {
  borderRadius: 12,
  border: '1px solid color-mix(in srgb, #c5d4cc 80%, transparent)',
  background: 'color-mix(in srgb, #fbfefc 94%, #fff)',
  boxShadow: '0 10px 28px color-mix(in srgb, #14241e 8%, transparent)',
  padding: '0.55rem 0.75rem',
  fontSize: 12,
};

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

function yearOptions(center: number) {
  const years: number[] = [];
  for (let y = center + 1; y >= center - 5; y -= 1) {
    years.push(y);
  }
  return years;
}

function ChartPanel({
  title,
  subtitle,
  tone = 'brand',
  children,
}: {
  title: string;
  subtitle?: string;
  tone?:
    | 'brand'
    | 'orders'
    | 'aov'
    | 'ltv'
    | 'margin'
    | 'ship'
    | 'firstPay'
    | 'pay';
  children: ReactNode;
}) {
  return (
    <article className={`umkm-analytics-chart-panel tone-${tone}`}>
      <header className="umkm-analytics-chart-head">
        <h3 className="umkm-analytics-chart-title">{title}</h3>
        {subtitle ? (
          <p className="umkm-analytics-chart-sub">{subtitle}</p>
        ) : null}
      </header>
      <div className="umkm-analytics-chart">{children}</div>
    </article>
  );
}

function ChartState({ children }: { children: ReactNode }) {
  return <div className="umkm-analytics-chart-placeholder">{children}</div>;
}

function KpiTile({
  label,
  value,
  hint,
  tone = 'neutral',
  loading = false,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?:
    | 'neutral'
    | 'brand'
    | 'orders'
    | 'aov'
    | 'ltv'
    | 'margin'
    | 'ship'
    | 'firstPay'
    | 'pay';
  loading?: boolean;
}) {
  return (
    <div
      className={`umkm-analytics-kpi tone-${tone}${loading ? ' is-loading' : ''}`}
      aria-busy={loading || undefined}
    >
      <span>{label}</span>
      <strong>{loading ? '···' : value}</strong>
      {hint ? <em>{hint}</em> : null}
    </div>
  );
}

export default function AnalyticsPage() {
  const nowYear = new Date().getUTCFullYear();
  const [year, setYear] = useState(nowYear);
  const [granularity, setGranularity] = useState<Granularity>('monthly');
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const overview = await api<AnalyticsOverview>('/analytics', {
          searchParams: { year: String(year) },
        });
        if (!cancelled) setData(overview);
      } catch (err) {
        if (!cancelled) {
          setData(null);
          setError(
            err instanceof ApiError
              ? err.message
              : err instanceof Error
                ? err.message
                : 'Failed to load analytics',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [year]);

  const hasTarget =
    granularity === 'monthly'
      ? Boolean(data?.monthly.some((m) => m.target != null))
      : Boolean(data?.annual.some((y) => y.target != null));

  const chartData = useMemo(() => {
    if (!data) return [];
    if (granularity === 'monthly') {
      return data.monthly.map((m) => ({
        key: m.label,
        revenue: m.revenue,
        target: m.target ?? undefined,
        orders: m.orderCount,
        aov: m.avgOrderValue ?? undefined,
        ltv: m.avgLtv ?? undefined,
        attainment: m.attainmentPercent ?? undefined,
        margin: m.marginPercent ?? undefined,
        shipmentDays: m.avgShipmentDays ?? undefined,
        firstPaymentDays: m.avgFirstPaymentDays ?? undefined,
        paymentDays: m.avgPaymentDays ?? undefined,
      }));
    }
    return data.annual.map((y) => ({
      key: String(y.year),
      revenue: y.revenue,
      target: y.target ?? undefined,
      orders: y.orderCount,
      aov: y.avgOrderValue ?? undefined,
      ltv: y.avgLtv ?? undefined,
      attainment: y.attainmentPercent ?? undefined,
      margin: y.marginPercent ?? undefined,
      shipmentDays: y.avgShipmentDays ?? undefined,
      firstPaymentDays: y.avgFirstPaymentDays ?? undefined,
      paymentDays: y.avgPaymentDays ?? undefined,
    }));
  }, [data, granularity]);

  const ltvChartData = useMemo(() => {
    if (!data?.customers?.length) return [];
    return data.customers.slice(0, 8).map((c) => ({
      key: c.name.length > 14 ? `${c.name.slice(0, 12)}…` : c.name,
      fullName: c.name,
      ltv: c.revenue,
      orders: c.orderCount,
    }));
  }, [data]);

  const hasRevenue = chartData.some((row) => row.revenue > 0);
  const hasOrders = chartData.some((row) => row.orders > 0);
  const hasAov = chartData.some((row) => row.aov != null);
  const hasLtv = chartData.some((row) => row.ltv != null);
  const hasTopLtv = ltvChartData.some((row) => row.ltv > 0);
  const hasAttainment = chartData.some((row) => row.attainment != null);
  const hasMargin = chartData.some((row) => row.margin != null);
  const hasShipment = chartData.some((row) => row.shipmentDays != null);
  const hasFirstPayment = chartData.some((row) => row.firstPaymentDays != null);
  const hasPayment = chartData.some((row) => row.paymentDays != null);
  const empty = !loading && !error && !hasRevenue && !hasOrders;
  const periodLabel =
    granularity === 'monthly' ? `Monthly · ${year}` : `Annual · ${year - 4}–${year}`;
  const barMax = granularity === 'monthly' ? 26 : 44;

  return (
    <section className="umkm-analytics-page">
      <PageHeader
        title="Analytics"
        description="Trends for revenue, targets, margins, and fulfillment lead times."
        actions={
          <Link className="umkm-btn secondary" href="/targets">
            Edit targets
          </Link>
        }
      />

      {error ? <div className="umkm-error">{error}</div> : null}

      <div className="umkm-analytics-toolbar">
        <div className="umkm-analytics-toolbar-copy">
          <p className="umkm-field-label">Focus</p>
          <p className="umkm-analytics-toolbar-title">{periodLabel}</p>
          <p className="umkm-analytics-toolbar-sub">
            {granularity === 'monthly'
              ? 'Break the selected year into months.'
              : 'Compare the rolling five-year window.'}
          </p>
        </div>
        <div className="umkm-analytics-period">
          <div className="umkm-analytics-period-group">
            <p className="umkm-field-label">View</p>
            <OptionChips
              aria-label="Analytics granularity"
              value={granularity}
              onChange={(v) => {
                if (v) setGranularity(v);
              }}
              options={[
                { value: 'monthly', label: 'Monthly' },
                { value: 'annual', label: 'Annual' },
              ]}
            />
          </div>
          {granularity === 'monthly' ? (
            <div
              className="umkm-analytics-period-group umkm-analytics-period-year"
              key="year-filter"
            >
              <YearSelect
                id="analytics-year"
                label="Year"
                value={year}
                years={yearOptions(nowYear)}
                onChange={setYear}
              />
            </div>
          ) : (
            <div
              className="umkm-analytics-period-group umkm-analytics-period-hint"
              key="annual-hint"
              role="status"
            >
              <p className="umkm-field-label">Window</p>
              <p className="umkm-analytics-period-hint-value">
                {year - 4}–{year}
              </p>
            </div>
          )}
        </div>
      </div>

      <ContentSection
        eyebrow="Snapshot"
        title={`${year} at a glance`}
        description="Key outcomes for the selected year from non-cancelled orders."
        quiet
      >
        <div className="umkm-analytics-kpis">
          <KpiTile
            label="Revenue"
            value={data ? formatMoney(data.summary.revenue) : '—'}
            hint="Order totals"
            tone="brand"
            loading={loading}
          />
          <KpiTile
            label="Orders"
            value={data ? String(data.summary.orderCount) : '—'}
            hint="Non-cancelled"
            tone="orders"
            loading={loading}
          />
          <KpiTile
            label="Avg order"
            value={
              data?.summary.avgOrderValue != null
                ? formatMoney(data.summary.avgOrderValue)
                : '—'
            }
            hint="Revenue ÷ orders"
            tone="aov"
            loading={loading}
          />
          <KpiTile
            label="Avg LTV"
            value={
              data?.summary.avgLtv != null
                ? formatMoney(data.summary.avgLtv)
                : '—'
            }
            hint={
              data?.summary.ltvCustomerCount
                ? `${data.summary.ltvCustomerCount} customers`
                : 'Linked customers'
            }
            tone="ltv"
            loading={loading}
          />
          <KpiTile
            label="Attainment"
            value={formatPct(data?.summary.attainmentPercent)}
            hint="Vs annual target"
            tone="brand"
            loading={loading}
          />
          <KpiTile
            label="Margin"
            value={formatPct(data?.summary.marginPercent)}
            hint="Catalog COGS"
            tone="margin"
            loading={loading}
          />
          <KpiTile
            label="Avg ship"
            value={formatDays(data?.summary.avgShipmentDays)}
            hint="Order → ship"
            tone="ship"
            loading={loading}
          />
          <KpiTile
            label="First pay"
            value={formatDays(data?.summary.avgFirstPaymentDays)}
            hint="Order → first pay"
            tone="firstPay"
            loading={loading}
          />
          <KpiTile
            label="Last pay"
            value={formatDays(data?.summary.avgPaymentDays)}
            hint="Order → last pay"
            tone="pay"
            loading={loading}
          />
        </div>
      </ContentSection>

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
              hasTarget
                ? 'Bars are actuals; the line marks revenue targets when set. Average order value tracks ticket size.'
                : 'Bars are actuals. Average order value tracks ticket size. Set Targets to overlay goals.'
            }
          >
            <div
              className="umkm-analytics-charts"
              key={`perf-${granularity}-${year}`}
            >
              <ChartPanel
                title="Revenue"
                subtitle="Total order value"
                tone="brand"
              >
                {loading ? (
                  <ChartState>Loading…</ChartState>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
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
                        tickFormatter={formatMoney}
                        tick={{ fill: AXIS, fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        width={48}
                      />
                      <Tooltip
                        formatter={(value: number, name: string) => [
                          formatMoney(value),
                          name === 'revenue' ? 'Revenue' : 'Target',
                        ]}
                        contentStyle={tooltipStyle}
                      />
                      <Legend />
                      <Bar
                        dataKey="revenue"
                        name="Revenue"
                        fill={BRAND}
                        radius={[7, 7, 0, 0]}
                        maxBarSize={barMax}
                      />
                      {hasTarget ? (
                        <Line
                          type="monotone"
                          dataKey="target"
                          name="Target"
                          stroke={TARGET}
                          strokeWidth={2}
                          dot={{ r: 3, fill: TARGET }}
                          connectNulls={false}
                        />
                      ) : null}
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </ChartPanel>

              <ChartPanel title="Orders" subtitle="Count of orders" tone="orders">
                {loading ? (
                  <ChartState>Loading…</ChartState>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
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
                        allowDecimals={false}
                        tick={{ fill: AXIS, fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        width={36}
                      />
                      <Tooltip
                        formatter={(value: number) => [value, 'Orders']}
                        contentStyle={tooltipStyle}
                      />
                      <Bar
                        dataKey="orders"
                        name="Orders"
                        fill={ORDERS}
                        radius={[7, 7, 0, 0]}
                        maxBarSize={barMax}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartPanel>

              <ChartPanel
                title="Average order value"
                subtitle="Revenue ÷ order count"
                tone="aov"
              >
                {loading ? (
                  <ChartState>Loading…</ChartState>
                ) : !hasAov ? (
                  <ChartState>Create orders to see average order value</ChartState>
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
                        tickFormatter={(v) => formatMoney(v)}
                        tick={{ fill: AXIS, fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        width={48}
                        domain={['auto', 'auto']}
                      />
                      <Tooltip
                        formatter={(value: number) => [
                          formatMoney(value),
                          'Avg order',
                        ]}
                        contentStyle={tooltipStyle}
                      />
                      <Line
                        type="monotone"
                        dataKey="aov"
                        name="Avg order value"
                        stroke={AOV}
                        strokeWidth={2.6}
                        dot={{ r: 3.5, fill: AOV }}
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
            eyebrow="Rates"
            title="Attainment & margin"
            description="Percent trends versus target and estimated profit margin."
          >
            <div
              className="umkm-analytics-charts"
              key={`rates-${granularity}-${year}`}
            >
              <ChartPanel
                title="Attainment rate"
                subtitle="Actual ÷ target"
                tone="brand"
              >
                {loading ? (
                  <ChartState>Loading…</ChartState>
                ) : !hasAttainment ? (
                  <ChartState>Set Targets to see attainment over time</ChartState>
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
                        tickFormatter={(v) => `${v}%`}
                        tick={{ fill: AXIS, fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        width={44}
                        domain={[0, 'auto']}
                      />
                      <Tooltip
                        formatter={(value: number) => [
                          formatPct(value),
                          'Attainment',
                        ]}
                        contentStyle={tooltipStyle}
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
                        name="Attainment"
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
                title="Profit margin rate"
                subtitle="(Revenue − cost) ÷ revenue"
                tone="margin"
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
                        tickFormatter={(v) => `${v}%`}
                        tick={{ fill: AXIS, fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        width={44}
                        domain={['auto', 'auto']}
                      />
                      <Tooltip
                        formatter={(value: number) => [
                          formatPct(value),
                          'Margin',
                        ]}
                        contentStyle={tooltipStyle}
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
            eyebrow="Lead times"
            title="Shipment & payment"
            description="Average days from order date to shipment, first installment, and last installment."
          >
            <div
              className="umkm-analytics-charts umkm-analytics-charts-lead"
              key={`lead-${granularity}-${year}`}
            >
              <ChartPanel
                title="Shipment duration"
                subtitle="Order → shipment"
                tone="ship"
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
                        tickFormatter={(v) => `${v}d`}
                        tick={{ fill: AXIS, fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        width={40}
                        domain={['auto', 'auto']}
                      />
                      <Tooltip
                        formatter={(value: number) => [
                          formatDays(value),
                          'Avg ship',
                        ]}
                        contentStyle={tooltipStyle}
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
                title="First payment duration"
                subtitle="Order → first installment"
                tone="firstPay"
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
                        tickFormatter={(v) => `${v}d`}
                        tick={{ fill: AXIS, fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        width={40}
                        domain={['auto', 'auto']}
                      />
                      <Tooltip
                        formatter={(value: number) => [
                          formatDays(value),
                          'First pay',
                        ]}
                        contentStyle={tooltipStyle}
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
                title="Last payment duration"
                subtitle="Order → last installment"
                tone="pay"
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
                        tickFormatter={(v) => `${v}d`}
                        tick={{ fill: AXIS, fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        width={40}
                        domain={['auto', 'auto']}
                      />
                      <Tooltip
                        formatter={(value: number) => [
                          formatDays(value),
                          'Last pay',
                        ]}
                        contentStyle={tooltipStyle}
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
        eyebrow="Products"
        title={`${year} product performance`}
        description="Revenue is after discount. Discount, COGS, and margin % are shares of the pre-discount total (Discount + Cost + Profit), so they add up to ~100%."
      >
        {loading ? (
          <p className="umkm-catalog-count">Loading products…</p>
        ) : !data?.products.length ? (
          <EmptyState
            title="No product sales yet"
            description="Orders in this year will appear here with revenue, discount, cost, and margin."
          />
        ) : (
          <>
            <div className="umkm-table-wrap umkm-catalog-table-wrap umkm-analytics-products">
              <table className="umkm-table umkm-catalog-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th className="is-num">Orders</th>
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
                              Qty {formatQty(p.qtySold)}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="is-num">{p.orderCount}</td>
                      <td className="is-num">
                        <div className="umkm-num-stack">
                          <span className="umkm-num">
                            {formatMoney(p.revenue)}
                          </span>
                          {p.avgOrderValue != null ? (
                            <span className="umkm-num-sub">
                              avg {formatMoney(p.avgOrderValue)}
                            </span>
                          ) : null}
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
                          {p.orderCount} orders
                        </span>
                      </div>
                      <div className="umkm-catalog-card-details">
                        <span>Qty sold {formatQty(p.qtySold)}</span>
                      </div>
                    </div>
                    <div className="umkm-catalog-card-metrics umkm-catalog-card-metrics--analytics">
                      <div>
                        <span>Revenue</span>
                        <strong>
                          {p.avgOrderValue != null
                            ? `${formatMoney(p.revenue)} · avg ${formatMoney(p.avgOrderValue)}`
                            : formatMoney(p.revenue)}
                        </strong>
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
        title={`${year} customer LTV`}
        description="LTV is net revenue from linked customers. Average LTV tracks ticket size per active buyer; the ranking shows top customers in this year."
      >
        {!loading && !hasLtv && !hasTopLtv ? (
          <EmptyState
            title="No LTV data yet"
            description="Assign customers on orders to unlock average LTV trends and the top-customer chart."
          />
        ) : (
          <div
            className="umkm-analytics-charts"
            key={`ltv-${granularity}-${year}`}
          >
            <ChartPanel
              title="Average LTV"
              subtitle={
                granularity === 'monthly'
                  ? 'Month linked revenue ÷ active customers'
                  : 'Year linked revenue ÷ customers'
              }
              tone="ltv"
            >
              {loading ? (
                <ChartState>Loading…</ChartState>
              ) : !hasLtv ? (
                <ChartState>No linked customer orders in this window</ChartState>
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
                      tickFormatter={formatMoney}
                      tick={{ fill: AXIS, fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      width={48}
                    />
                    <Tooltip
                      formatter={(value: number) => [
                        formatMoney(value),
                        'Avg LTV',
                      ]}
                      contentStyle={tooltipStyle}
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

            <ChartPanel
              title="Top customers by LTV"
              subtitle={`Highest linked revenue in ${year}`}
              tone="ltv"
            >
              {loading ? (
                <ChartState>Loading…</ChartState>
              ) : !hasTopLtv ? (
                <ChartState>No customer ranking yet</ChartState>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={ltvChartData}
                    layout="vertical"
                    margin={{ top: 8, right: 12, left: 8, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={GRID}
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      tickFormatter={formatMoney}
                      tick={{ fill: AXIS, fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="key"
                      width={88}
                      tick={{ fill: AXIS, fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(value: number) => [
                        formatMoney(value),
                        'LTV',
                      ]}
                      labelFormatter={(_, payload) => {
                        const row = payload?.[0]?.payload as
                          | { fullName?: string }
                          | undefined;
                        return row?.fullName ?? '';
                      }}
                      contentStyle={tooltipStyle}
                    />
                    <Bar
                      dataKey="ltv"
                      name="LTV"
                      fill={LTV}
                      radius={[0, 7, 7, 0]}
                      maxBarSize={22}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartPanel>
          </div>
        )}
      </ContentSection>

      <ContentSection
        eyebrow="Customers"
        title={`${year} customer performance`}
        description="Same metrics as products, grouped by CRM customer. Only orders with a customer assigned appear here. Rates are shares of the pre-discount total."
      >
        {loading ? (
          <p className="umkm-catalog-count">Loading customers…</p>
        ) : !(data?.customers?.length ?? 0) ? (
          <EmptyState
            title="No customer sales yet"
            description="Assign a customer on orders to see revenue, discount, cost, and profit here."
          />
        ) : (
          <>
            <div className="umkm-table-wrap umkm-catalog-table-wrap umkm-analytics-products">
              <table className="umkm-table umkm-catalog-table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th className="is-num">Orders</th>
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
                              {LABELS.companyType[
                                c.companyType as keyof typeof LABELS.companyType
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
                      <td className="is-num">{c.orderCount}</td>
                      <td className="is-num">
                        <div className="umkm-num-stack">
                          <span className="umkm-num">
                            {formatMoney(c.revenue)}
                          </span>
                          {c.avgOrderValue != null ? (
                            <span className="umkm-num-sub">
                              avg {formatMoney(c.avgOrderValue)}
                            </span>
                          ) : null}
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
                          {LABELS.companyType[
                            c.companyType as keyof typeof LABELS.companyType
                          ] ?? c.companyType}
                        </span>
                        <span className="umkm-unit-chip">
                          {c.orderCount} orders
                        </span>
                      </div>
                      {c.companyName ? (
                        <div className="umkm-catalog-card-details">
                          <span>{c.companyName}</span>
                        </div>
                      ) : null}
                    </div>
                    <div className="umkm-catalog-card-metrics umkm-catalog-card-metrics--analytics">
                      <div>
                        <span>Revenue</span>
                        <strong>
                          {c.avgOrderValue != null
                            ? `${formatMoney(c.revenue)} · avg ${formatMoney(c.avgOrderValue)}`
                            : formatMoney(c.revenue)}
                        </strong>
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
    </section>
  );
}
