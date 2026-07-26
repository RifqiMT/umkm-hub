'use client';

import Link from 'next/link';
import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { api, ApiError } from '@/lib/api';
import { AppTooltip } from '@/components/AppTooltip';
import { FeatureStage } from '@/components/FeatureStage';
import { DashboardPeriodFilter } from '@/components/DashboardPeriodFilter';
import type {
  CustomerSummary,
  OrderSummary,
  ProductSummary,
} from '@/lib/types';
import {
  formatCompactQtyParts,
  formatMoney,
  formatMoneyParts,
  formatQty,
  formatRatePercent,
  formatMoneyExact,
} from '@/lib/format-money';
import {
  DASHBOARD_PERIOD_LABELS,
  dashboardPeriodRange,
  type DashboardPeriod,
} from '@/lib/dashboard-period';

type DashboardData = {
  orders: OrderSummary | null;
  products: ProductSummary | null;
  customers: CustomerSummary | null;
};

function rateMeterStyle(
  value: number | null | undefined,
  loading = false,
): CSSProperties | undefined {
  if (loading || value == null || !Number.isFinite(value)) {
    return { ['--rate' as string]: '0%' };
  }
  if (value < 0) {
    return { ['--rate' as string]: '8%' };
  }
  const clamped = Math.max(0, Math.min(100, value));
  return { ['--rate' as string]: `${clamped}%` };
}

function FigureValue({
  value,
  loading,
  money = false,
}: {
  value: number | null | undefined;
  loading: boolean;
  money?: boolean;
}) {
  if (loading) return <b>···</b>;
  if (value == null) return <b>—</b>;
  const parts = money
    ? formatMoneyParts(value)
    : formatCompactQtyParts(value);
  return (
    <>
      <b>{parts.figure}</b>
      {parts.unit ? <small>{parts.unit}</small> : null}
    </>
  );
}

function SpotlightRate({
  label,
  value,
  tone,
  description,
  detail,
  loading,
}: {
  label: string;
  value: number | null | undefined;
  tone: 'tone-paid' | 'tone-margin' | 'tone-discount' | 'tone-cancel';
  description: string;
  detail?: string;
  loading: boolean;
}) {
  return (
    <AppTooltip
      className="umkm-tip-block"
      embedded
      disabled={loading}
      tone={
        tone === 'tone-paid'
          ? 'paid'
          : tone === 'tone-margin'
            ? 'margin'
            : tone === 'tone-discount'
              ? 'discount'
              : 'cancel'
      }
      label={label}
      value={loading ? undefined : formatRatePercent(value)}
      description={description}
      detail={detail}
    >
      <div
        className={`umkm-dash-spotlight ${tone}`}
        style={rateMeterStyle(value, loading)}
      >
        <div className="umkm-dash-spotlight-row">
          <span>{label}</span>
          <strong>{loading ? '···' : formatRatePercent(value)}</strong>
        </div>
        <span className="umkm-dash-meter" aria-hidden>
          <i />
        </span>
      </div>
    </AppTooltip>
  );
}

function DomainPanel({
  href,
  eyebrow,
  title,
  caption,
  hero,
  side,
  spotlight,
  index,
  featured = false,
}: {
  href: string;
  eyebrow: string;
  title: string;
  caption: string;
  hero: {
    label: string;
    value: ReactNode;
    tipValue?: string;
    description?: string;
  };
  side: Array<{
    label: string;
    value: ReactNode;
    tipValue?: string;
    description?: string;
  }>;
  spotlight: ReactNode;
  index: number;
  featured?: boolean;
}) {
  return (
    <Link
      className={`umkm-dash-domain${featured ? ' is-featured' : ''}`}
      href={href}
      style={{ ['--i' as string]: String(index) }}
    >
      <header className="umkm-dash-domain-head">
        <div className="umkm-dash-domain-titles">
          <span className="umkm-dash-domain-eyebrow">{eyebrow}</span>
          <h2>{title}</h2>
        </div>
        <p className="umkm-dash-domain-cap">{caption}</p>
      </header>

      <AppTooltip
        embedded
        className="umkm-tip-block"
        label={hero.label}
        value={hero.tipValue}
        description={hero.description}
      >
        <div className="umkm-dash-domain-hero">
          <span>{hero.label}</span>
          <strong>{hero.value}</strong>
        </div>
      </AppTooltip>

      <dl className="umkm-dash-domain-side">
        {side.map((item) => (
          <div key={item.label}>
            <dt>{item.label}</dt>
            <dd>
              <AppTooltip
                embedded
                label={item.label}
                value={item.tipValue}
                description={item.description}
              >
                {item.value}
              </AppTooltip>
            </dd>
          </div>
        ))}
      </dl>

      {spotlight}

      <span className="umkm-dash-domain-go">
        View {eyebrow.toLowerCase()}
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
          <path
            d="M3.5 8h9M8.5 4l4 4-4 4"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </Link>
  );
}

export default function DashboardPage() {
  const [period, setPeriod] = useState<DashboardPeriod>('this_month');
  const [data, setData] = useState<DashboardData>({
    orders: null,
    products: null,
    customers: null,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const orderRange = useMemo(() => dashboardPeriodRange(period), [period]);
  const periodLabel = DASHBOARD_PERIOD_LABELS[period];

  // Product / customer tiles are period-independent — load once.
  useEffect(() => {
    let cancelled = false;
    async function loadCatalogSummaries() {
      try {
        const [products, customers] = await Promise.all([
          api<ProductSummary>('/products/summary'),
          api<CustomerSummary>('/customers/summary'),
        ]);
        if (!cancelled) {
          setData((prev) => ({ ...prev, products, customers }));
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : err instanceof Error
                ? err.message
                : 'Failed to load dashboard',
          );
        }
      }
    }
    void loadCatalogSummaries();
    return () => {
      cancelled = true;
    };
  }, []);

  // Orders summary follows the selected period — keep stale KPIs while refreshing.
  useEffect(() => {
    let cancelled = false;
    async function loadOrdersSummary() {
      setLoading(true);
      setError('');
      try {
        const orders = await api<OrderSummary>('/orders/summary', {
          searchParams: {
            orderDateFrom: orderRange.orderDateFrom,
            orderDateTo: orderRange.orderDateTo,
          },
        });
        if (!cancelled) {
          setData((prev) => ({ ...prev, orders }));
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : err instanceof Error
                ? err.message
                : 'Failed to load dashboard',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadOrdersSummary();
    return () => {
      cancelled = true;
    };
  }, [orderRange.orderDateFrom, orderRange.orderDateTo]);

  const orders = data.orders;
  const products = data.products;
  const customers = data.customers;
  const ordersLoading = loading && orders == null;
  const productsLoading = products == null;
  const customersLoading = customers == null;

  const revenueParts =
    !ordersLoading && orders != null
      ? formatMoneyParts(orders.totalRevenue)
      : null;
  const orderCountParts =
    !ordersLoading && orders != null
      ? formatCompactQtyParts(orders.orderCount)
      : null;
  const packsParts =
    !ordersLoading && orders != null
      ? formatCompactQtyParts(orders.productsSold)
      : null;

  const rangeCaption =
    period === 'all'
      ? 'All orders'
      : orderRange.orderDateFrom && orderRange.orderDateTo
        ? orderRange.orderDateFrom === orderRange.orderDateTo
          ? orderRange.orderDateFrom
          : `${orderRange.orderDateFrom} → ${orderRange.orderDateTo}`
        : periodLabel;

  return (
    <section className="umkm-dashboard">
      <FeatureStage
        title="Dashboard"
        loading={ordersLoading}
        subtitle={
          period === 'all'
            ? 'Order pulse across your workspace.'
            : `Order pulse · ${periodLabel.toLowerCase()}.`
        }
        action={
          <DashboardPeriodFilter
            value={period}
            onChange={setPeriod}
            caption={rangeCaption}
            disabled={loading}
          />
        }
        stats={[
          {
            label: 'Revenue',
            hero: true,
            tip: {
              value: orders ? formatMoneyExact(orders.totalRevenue) : undefined,
              description:
                'Total sales from non-cancelled orders in the selected period.',
            },
            value: revenueParts ? (
              <>
                <b>{revenueParts.figure}</b>
                {revenueParts.unit ? <small>{revenueParts.unit}</small> : null}
              </>
            ) : (
              <b>···</b>
            ),
          },
          {
            label: 'Orders',
            tip: {
              value: orders ? formatQty(orders.orderCount) : undefined,
              description:
                'How many orders were placed in the selected period.',
            },
            value: orderCountParts ? (
              <>
                <b>{orderCountParts.figure}</b>
                {orderCountParts.unit ? (
                  <small>{orderCountParts.unit}</small>
                ) : null}
              </>
            ) : (
              <b>···</b>
            ),
          },
          {
            label: 'Packs',
            tip: {
              value: orders ? formatQty(orders.productsSold) : undefined,
              description:
                'Total pack quantity sold across orders in this period.',
            },
            value: packsParts ? (
              <>
                <b>{packsParts.figure}</b>
                {packsParts.unit ? <small>{packsParts.unit}</small> : null}
              </>
            ) : (
              <b>···</b>
            ),
          },
        ]}
        ratesLabel="Order health"
        rates={[
          {
            tone: 'tone-margin',
            label: 'Margin',
            tip: {
              description:
                'Estimated profit as a share of revenue, when product cost is known.',
              detail: 'Profit ÷ revenue on orders with cost',
            },
            value: orders?.profitMarginRate,
          },
          {
            tone: 'tone-paid',
            label: 'Paid in full',
            tip: {
              description:
                'Share of active orders where installments already cover the total.',
              detail: 'Fully paid ÷ non-cancelled orders',
            },
            value: orders?.fullPaymentRate,
          },
          {
            tone: 'tone-discount',
            label: 'Discount',
            tip: {
              description:
                'How much of the list price was given away as discounts.',
              detail: 'Discount ÷ pre-discount line totals',
            },
            value: orders?.discountRate,
          },
          {
            tone: 'tone-cancel',
            label: 'Cancelled',
            tip: {
              description: 'Share of orders that were cancelled in this period.',
              detail: 'Cancelled ÷ all orders',
            },
            value: orders?.cancellationRate,
          },
        ]}
      />

      {error ? <div className="umkm-error">{error}</div> : null}

      <div className="umkm-dash-board">
        <div className="umkm-dash-board-head">
          <h2>Workspace</h2>
          <p>Open a domain for detail. Catalog and CRM stay live.</p>
        </div>

        <div className="umkm-dash-domains" aria-label="Domain snapshots">
          <DomainPanel
            href="/orders"
            index={0}
            featured
            eyebrow="Orders"
            title="Fulfillment"
            caption={periodLabel}
            hero={{
              label: 'Revenue',
              tipValue: orders ? formatMoneyExact(orders.totalRevenue) : undefined,
              description:
                'Sales from non-cancelled orders in the selected period.',
              value: (
                <FigureValue
                  value={orders?.totalRevenue}
                  loading={ordersLoading}
                  money
                />
              ),
            }}
            side={[
              {
                label: 'Orders',
                tipValue: orders ? formatQty(orders.orderCount) : undefined,
                description: 'Order count for the selected period.',
                value: (
                  <FigureValue value={orders?.orderCount} loading={ordersLoading} />
                ),
              },
              {
                label: 'Packs',
                tipValue: orders ? formatQty(orders.productsSold) : undefined,
                description: 'Pack quantity sold in the selected period.',
                value: (
                  <FigureValue value={orders?.productsSold} loading={ordersLoading} />
                ),
              },
            ]}
            spotlight={
              <SpotlightRate
                label="Paid in full"
                value={orders?.fullPaymentRate}
                tone="tone-paid"
                description="Share of active orders already paid in full."
                detail="Fully paid ÷ non-cancelled"
                loading={ordersLoading}
              />
            }
          />

          <DomainPanel
            href="/products"
            index={1}
            eyebrow="Products"
            title="Catalog"
            caption="Live stock"
            hero={{
              label: 'Inventory',
              tipValue: products
                ? formatMoneyExact(products.inventorySellValue)
                : undefined,
              description:
                'Catalog sell value of stock currently on hand.',
              value: (
                <FigureValue
                  value={products?.inventorySellValue}
                  loading={productsLoading}
                  money
                />
              ),
            }}
            side={[
              {
                label: 'SKUs',
                tipValue: products
                  ? formatQty(products.productCount)
                  : undefined,
                description: 'Number of products in your catalog.',
                value: (
                  <FigureValue
                    value={products?.productCount}
                    loading={productsLoading}
                  />
                ),
              },
              {
                label: 'On hand',
                tipValue: products
                  ? formatQty(products.totalStockQty)
                  : undefined,
                description:
                  'Total stock quantity available in warehouse (stock units, not packs).',
                value: (
                  <FigureValue
                    value={products?.totalStockQty}
                    loading={productsLoading}
                  />
                ),
              },
            ]}
            spotlight={
              <SpotlightRate
                label="In stock"
                value={products?.inStockRate}
                tone="tone-paid"
                description="Share of products that still have stock left."
                detail="Products with stock ÷ catalog"
                loading={productsLoading}
              />
            }
          />

          <DomainPanel
            href="/customers"
            index={2}
            eyebrow="Customers"
            title="Pipeline"
            caption="CRM"
            hero={{
              label: 'Customers',
              tipValue: customers
                ? formatQty(customers.customerCount)
                : undefined,
              description: 'People and companies in your CRM.',
              value: (
                <FigureValue
                  value={customers?.customerCount}
                  loading={customersLoading}
                />
              ),
            }}
            side={[
              {
                label: 'Interested',
                tipValue: customers
                  ? formatQty(customers.interestedCount)
                  : undefined,
                description: 'Contacts currently marked as Interested.',
                value: (
                  <FigureValue
                    value={customers?.interestedCount}
                    loading={customersLoading}
                  />
                ),
              },
              {
                label: 'Approval',
                tipValue:
                  customers?.avgApproval != null
                    ? formatRatePercent(customers.avgApproval)
                    : undefined,
                description: 'Average approval score across customers.',
                value: loading ? (
                  <b>···</b>
                ) : customers?.avgApproval != null ? (
                  <b>{formatRatePercent(customers.avgApproval)}</b>
                ) : (
                  <b>—</b>
                ),
              },
            ]}
            spotlight={
              <SpotlightRate
                label="Closing"
                value={customers?.closingRate}
                tone="tone-margin"
                description="Share of customers at Closing / first-order stage."
                detail="Closing ÷ all customers"
                loading={customersLoading}
              />
            }
          />
        </div>

        <nav className="umkm-dash-rail" aria-label="More workspaces">
          <Link href="/warehouse">Warehouse</Link>
          <Link href="/targets">Targets</Link>
          <Link href="/analytics">Analytics</Link>
        </nav>
      </div>
    </section>
  );
}
