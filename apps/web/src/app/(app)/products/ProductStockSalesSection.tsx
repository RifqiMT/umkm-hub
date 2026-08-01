'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { dedupeById } from '@/lib/dedupe-by-id';
import { ContentSection, EmptyState } from '@/components/PageHeader';
import { ListPager } from '@/components/ListPager';
import { EntityIdBadge, EntityIdDetail } from '@/components/EntityId';
import {
  ViewBlock,
  ViewChip,
  ViewFacts,
  ViewIdentity,
  ViewSheetBody,
} from '@/components/ViewSheet';
import type { ListPageSize } from '@/lib/list-page-size';
import type { Paginated, ProductStockSales } from '@/lib/types';
import {
  formatCompactQty,
  formatMoney,
  formatRatePercent,
} from '@/lib/format-money';
import { useLabels } from '@/hooks/useLabels';

type SortKey =
  | 'name'
  | 'totalStocks'
  | 'soldStocks'
  | 'grossRevenue'
  | 'revenue'
  | 'discount'
  | 'cost'
  | 'profit'
  | 'sellThroughRate'
  | 'inventoryTurnover'
  | 'stockToSalesRatio'
  | 'orderCount'
  | 'avgOrderValue'
  | 'unitsPerTransaction';
type SortDir = 'asc' | 'desc';

type ProductStockSalesFilters = {
  search?: string;
  unit?: string[];
  costSet?: string[];
  packReady?: string[];
  stockStatus?: string[];
};

type ProductStockSalesSectionProps = {
  filters: ProductStockSalesFilters;
  onView: (row: ProductStockSales) => void;
};

type ProductStockSalesPerformanceViewProps = {
  row: ProductStockSales;
  onClose: () => void;
};

function compareNullable(a: number | null, b: number | null): number {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  return a - b;
}

function formatRatio(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return value.toLocaleString('en-US', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  });
}

function IconView() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2.75" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

export function ProductStockSalesPerformanceView({
  row,
  onClose,
}: ProductStockSalesPerformanceViewProps) {
  const labels = useLabels();
  const unitLabel =
    labels.productUnit[row.unit as keyof typeof labels.productUnit] ?? row.unit;

  return (
    <ContentSection
      className="umkm-form-panel umkm-product-sheet umkm-view-sheet"
      eyebrow="Product performance"
      title={row.name}
      description="Stock & sales performance for this product in the current catalog filters."
      actions={
        <button
          type="button"
          className="umkm-btn secondary"
          onClick={onClose}
        >
          Close
        </button>
      }
    >
      <ViewSheetBody onClose={onClose}>
        <ViewIdentity
          contextLabel="Unit"
          chips={<ViewChip>{unitLabel}</ViewChip>}
          metricLabel="Gross revenue"
          metricValue={formatMoney(row.grossRevenue)}
          metricHint={`Net ${formatMoney(row.revenue)}`}
        />

        <EntityIdDetail
          id={row.productId || row.id}
          label="Product ID"
        />

        <ViewBlock
          title="Stocks"
          description="Lifetime-available quantity with current on-hand and sold breakdown."
        >
          <ViewFacts
            columns={3}
            items={[
              {
                key: 'total',
                label: 'Total',
                value: formatCompactQty(row.totalStocks),
              },
              {
                key: 'current',
                label: 'Current',
                value: formatCompactQty(row.currentStocks),
              },
              {
                key: 'sold',
                label: 'Sold',
                value: formatCompactQty(row.soldStocks),
              },
            ]}
          />
        </ViewBlock>

        <ViewBlock
          title="Money"
          description="Gross is before discount; net is after. Cost and profit use catalog unit cost when set. Percents are shares of gross."
        >
          <ViewFacts
            columns={3}
            items={[
              {
                key: 'gross',
                label: 'Gross revenue',
                value: formatMoney(row.grossRevenue),
              },
              {
                key: 'net',
                label: 'Net revenue',
                value: formatMoney(row.revenue),
              },
              {
                key: 'discount',
                label: 'Discount',
                value: formatMoney(row.discount),
                sub:
                  row.discountPercent != null
                    ? formatRatePercent(row.discountPercent)
                    : undefined,
              },
              {
                key: 'cost',
                label: 'Cost',
                value: row.cost != null ? formatMoney(row.cost) : '—',
                sub:
                  row.costPercent != null
                    ? formatRatePercent(row.costPercent)
                    : undefined,
              },
              {
                key: 'profit',
                label: 'Profit',
                value: row.profit != null ? formatMoney(row.profit) : '—',
                sub:
                  row.marginPercent != null
                    ? formatRatePercent(row.marginPercent)
                    : undefined,
              },
            ]}
          />
        </ViewBlock>

        <ViewBlock
          title="Rates & volume"
          description="Sell-through, turnover, stock-to-sales, and order quality for this SKU."
        >
          <ViewFacts
            columns={3}
            items={[
              {
                key: 'str',
                label: 'STR',
                value: formatRatePercent(row.sellThroughRate),
              },
              {
                key: 'itr',
                label: 'ITR',
                value: formatRatio(row.inventoryTurnover),
              },
              {
                key: 'ssr',
                label: 'SSR',
                value: formatRatio(row.stockToSalesRatio),
              },
              {
                key: 'orders',
                label: 'Orders',
                value: row.orderCount.toLocaleString('en-US'),
              },
              {
                key: 'aov',
                label: 'AOV',
                value:
                  row.avgOrderValue != null
                    ? formatMoney(row.avgOrderValue)
                    : '—',
              },
              {
                key: 'upt',
                label: 'UPT',
                value:
                  row.unitsPerTransaction != null
                    ? formatCompactQty(row.unitsPerTransaction)
                    : '—',
              },
            ]}
          />
        </ViewBlock>
      </ViewSheetBody>
    </ContentSection>
  );
}

export function ProductStockSalesSection({
  filters,
  onView,
}: ProductStockSalesSectionProps) {
  const labels = useLabels();
  const [items, setItems] = useState<ProductStockSales[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<ListPageSize>(20);
  const [meta, setMeta] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('soldStocks');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const loadSeq = useRef(0);
  const filterKey = JSON.stringify(filters);

  function unitLabel(unit: string) {
    return labels.productUnit[unit as keyof typeof labels.productUnit] ?? unit;
  }

  useEffect(() => {
    setPage(1);
  }, [filterKey]);

  useEffect(() => {
    const seq = ++loadSeq.current;
    setLoading(true);
    void (async () => {
      try {
        const res = await api<Paginated<ProductStockSales>>(
          '/products/stock-sales',
          {
            searchParams: {
              page,
              limit: pageSize,
              search: filters.search?.trim() || undefined,
              unit: filters.unit?.length ? filters.unit : undefined,
              costSet: filters.costSet?.length ? filters.costSet : undefined,
              packReady: filters.packReady?.length
                ? filters.packReady
                : undefined,
              stockStatus: filters.stockStatus?.length
                ? filters.stockStatus
                : undefined,
            },
          },
        );
        if (seq !== loadSeq.current) return;
        setItems(dedupeById(res.items));
        setMeta(res.meta);
        setPage(res.meta.page);
        setError('');
      } catch (err) {
        if (seq !== loadSeq.current) return;
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to load product stock sales',
        );
      } finally {
        if (seq === loadSeq.current) setLoading(false);
      }
    })();
  }, [page, pageSize, filterKey, filters]);

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'name':
          cmp = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
          break;
        case 'totalStocks':
          cmp = a.totalStocks - b.totalStocks;
          break;
        case 'soldStocks':
          cmp = a.soldStocks - b.soldStocks;
          break;
        case 'grossRevenue':
          cmp = a.grossRevenue - b.grossRevenue;
          break;
        case 'revenue':
          cmp = a.revenue - b.revenue;
          break;
        case 'discount':
          cmp = a.discount - b.discount;
          break;
        case 'cost':
          cmp = compareNullable(a.cost, b.cost);
          break;
        case 'profit':
          cmp = compareNullable(a.profit, b.profit);
          break;
        case 'sellThroughRate':
          cmp = compareNullable(a.sellThroughRate, b.sellThroughRate);
          break;
        case 'inventoryTurnover':
          cmp = compareNullable(a.inventoryTurnover, b.inventoryTurnover);
          break;
        case 'stockToSalesRatio':
          cmp = compareNullable(a.stockToSalesRatio, b.stockToSalesRatio);
          break;
        case 'orderCount':
          cmp = a.orderCount - b.orderCount;
          break;
        case 'avgOrderValue':
          cmp = compareNullable(a.avgOrderValue, b.avgOrderValue);
          break;
        case 'unitsPerTransaction':
          cmp = compareNullable(a.unitsPerTransaction, b.unitsPerTransaction);
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [items, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(key);
    setSortDir(key === 'name' ? 'asc' : 'desc');
  }

  function sortMark(key: SortKey) {
    if (sortKey !== key) return undefined;
    return sortDir;
  }

  return (
    <ContentSection
      eyebrow="Sales"
      title="Stock & sales"
      description="Review stocks and revenue (gross primary, net on the subline), discount, cost, and profit for each product, with sell-through, turnover, stock-to-sales, orders, average order value, and units per transaction. Click a row or View to open product performance details."
    >
      {error ? (
        <p className="umkm-error" role="alert">
          {error}
        </p>
      ) : loading && sorted.length === 0 ? null : meta.total === 0 ? (
        <EmptyState
          title="No products in view"
          description="Add products to the catalog, or clear filters, to see stock and sales metrics."
        />
      ) : (
        <>
          <div className="umkm-table-wrap umkm-catalog-table-wrap">
            <table className="umkm-table umkm-catalog-table">
              <thead>
                <tr>
                  <th>
                    <button
                      type="button"
                      className="umkm-th-sort"
                      onClick={() => toggleSort('name')}
                      data-dir={sortMark('name')}
                    >
                      Product
                    </button>
                  </th>
                  <th className="is-num">
                    <button
                      type="button"
                      className="umkm-th-sort"
                      onClick={() => toggleSort('totalStocks')}
                      data-dir={sortMark('totalStocks')}
                    >
                      Stocks
                    </button>
                  </th>
                  <th className="is-num">
                    <button
                      type="button"
                      className="umkm-th-sort"
                      onClick={() => toggleSort('grossRevenue')}
                      data-dir={sortMark('grossRevenue')}
                    >
                      Revenue
                    </button>
                  </th>
                  <th className="is-num">
                    <button
                      type="button"
                      className="umkm-th-sort"
                      onClick={() => toggleSort('discount')}
                      data-dir={sortMark('discount')}
                    >
                      Discount
                    </button>
                  </th>
                  <th className="is-num">
                    <button
                      type="button"
                      className="umkm-th-sort"
                      onClick={() => toggleSort('cost')}
                      data-dir={sortMark('cost')}
                    >
                      Cost
                    </button>
                  </th>
                  <th className="is-num">
                    <button
                      type="button"
                      className="umkm-th-sort"
                      onClick={() => toggleSort('profit')}
                      data-dir={sortMark('profit')}
                    >
                      Profit
                    </button>
                  </th>
                  <th className="is-num">
                    <button
                      type="button"
                      className="umkm-th-sort"
                      onClick={() => toggleSort('sellThroughRate')}
                      data-dir={sortMark('sellThroughRate')}
                    >
                      STR
                    </button>
                  </th>
                  <th className="is-num">
                    <button
                      type="button"
                      className="umkm-th-sort"
                      onClick={() => toggleSort('inventoryTurnover')}
                      data-dir={sortMark('inventoryTurnover')}
                    >
                      ITR
                    </button>
                  </th>
                  <th className="is-num">
                    <button
                      type="button"
                      className="umkm-th-sort"
                      onClick={() => toggleSort('stockToSalesRatio')}
                      data-dir={sortMark('stockToSalesRatio')}
                    >
                      SSR
                    </button>
                  </th>
                  <th className="is-num">
                    <button
                      type="button"
                      className="umkm-th-sort"
                      onClick={() => toggleSort('orderCount')}
                      data-dir={sortMark('orderCount')}
                    >
                      Orders
                    </button>
                  </th>
                  <th className="is-num">
                    <button
                      type="button"
                      className="umkm-th-sort"
                      onClick={() => toggleSort('avgOrderValue')}
                      data-dir={sortMark('avgOrderValue')}
                    >
                      AOV
                    </button>
                  </th>
                  <th className="is-num">
                    <button
                      type="button"
                      className="umkm-th-sort"
                      onClick={() => toggleSort('unitsPerTransaction')}
                      data-dir={sortMark('unitsPerTransaction')}
                    >
                      UPT
                    </button>
                  </th>
                  <th className="is-actions">
                    <span className="umkm-th-label">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((row) => (
                  <tr
                    key={row.id}
                    className="umkm-catalog-row"
                    tabIndex={0}
                    onClick={() => onView(row)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onView(row);
                      }
                    }}
                  >
                    <td>
                      <div className="umkm-product-cell">
                        <span className="umkm-product-name">{row.name}</span>
                        <div className="umkm-product-meta">
                          <EntityIdBadge
                            id={row.productId || row.id}
                            literal={Boolean(row.productId)}
                            compact
                          />
                          <span className="umkm-badge sm">
                            {unitLabel(row.unit)}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="is-num">
                      <div className="umkm-num-stack">
                        <span className="umkm-num">
                          {formatCompactQty(row.totalStocks)}
                        </span>
                        <em className="umkm-num-sub">
                          Current {formatCompactQty(row.currentStocks)}
                          {' · '}
                          Sold {formatCompactQty(row.soldStocks)}
                        </em>
                      </div>
                    </td>
                    <td className="is-num">
                      <div className="umkm-num-stack">
                        <span className="umkm-num">
                          {formatMoney(row.grossRevenue)}
                        </span>
                        <em className="umkm-num-sub">
                          Gross
                          {' · '}
                          Net {formatMoney(row.revenue)}
                        </em>
                      </div>
                    </td>
                    <td className="is-num">
                      <div className="umkm-num-stack">
                        <span className="umkm-num">
                          {formatMoney(row.discount)}
                        </span>
                        {row.discountPercent != null ? (
                          <em className="umkm-num-sub">
                            {formatRatePercent(row.discountPercent)}
                          </em>
                        ) : null}
                      </div>
                    </td>
                    <td className="is-num">
                      <div className="umkm-num-stack">
                        <span className="umkm-num">
                          {row.cost != null ? formatMoney(row.cost) : '—'}
                        </span>
                        {row.costPercent != null ? (
                          <em className="umkm-num-sub">
                            {formatRatePercent(row.costPercent)}
                          </em>
                        ) : null}
                      </div>
                    </td>
                    <td className="is-num">
                      <div className="umkm-num-stack">
                        <span
                          className={`umkm-num${
                            row.profit != null && row.profit < 0 ? ' is-neg' : ''
                          }`}
                        >
                          {row.profit != null ? formatMoney(row.profit) : '—'}
                        </span>
                        {row.marginPercent != null ? (
                          <em className="umkm-num-sub">
                            {formatRatePercent(row.marginPercent)}
                          </em>
                        ) : null}
                      </div>
                    </td>
                    <td className="is-num">
                      <span className="umkm-num">
                        {formatRatePercent(row.sellThroughRate)}
                      </span>
                    </td>
                    <td className="is-num">
                      <span className="umkm-num">
                        {formatRatio(row.inventoryTurnover)}
                      </span>
                    </td>
                    <td className="is-num">
                      <span className="umkm-num">
                        {formatRatio(row.stockToSalesRatio)}
                      </span>
                    </td>
                    <td className="is-num">
                      <span className="umkm-num">
                        {row.orderCount.toLocaleString('en-US')}
                      </span>
                    </td>
                    <td className="is-num">
                      <span className="umkm-num">
                        {row.avgOrderValue != null
                          ? formatMoney(row.avgOrderValue)
                          : '—'}
                      </span>
                    </td>
                    <td className="is-num">
                      <span className="umkm-num">
                        {row.unitsPerTransaction != null
                          ? formatCompactQty(row.unitsPerTransaction)
                          : '—'}
                      </span>
                    </td>
                    <td className="is-actions">
                      <div
                        className="umkm-row-actions umkm-icon-actions"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      >
                        <button
                          className="umkm-icon-btn"
                          type="button"
                          title="View"
                          aria-label={`View performance for ${row.name}`}
                          onClick={() => onView(row)}
                        >
                          <IconView />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="umkm-catalog-cards">
            {sorted.map((row) => (
              <li key={row.id} className="umkm-catalog-card">
                <button
                  type="button"
                  className="umkm-catalog-card-main"
                  onClick={() => onView(row)}
                >
                  <div className="umkm-catalog-card-identity">
                    <span className="umkm-product-name">{row.name}</span>
                    <div className="umkm-product-meta">
                      <EntityIdBadge
                        id={row.productId || row.id}
                        literal={Boolean(row.productId)}
                        compact
                      />
                      <span className="umkm-badge sm">
                        {unitLabel(row.unit)}
                      </span>
                    </div>
                  </div>
                  <div className="umkm-catalog-card-metrics">
                    <div>
                      <span>Stocks</span>
                      <strong>{formatCompactQty(row.totalStocks)}</strong>
                      <em className="umkm-num-sub">
                        Current {formatCompactQty(row.currentStocks)}
                        {' · '}
                        Sold {formatCompactQty(row.soldStocks)}
                      </em>
                    </div>
                    <div>
                      <span>Revenue</span>
                      <strong>{formatMoney(row.grossRevenue)}</strong>
                      <em className="umkm-num-sub">
                        Gross
                        {' · '}
                        Net {formatMoney(row.revenue)}
                      </em>
                    </div>
                    <div>
                      <span>Discount</span>
                      <strong>{formatMoney(row.discount)}</strong>
                      {row.discountPercent != null ? (
                        <em className="umkm-num-sub">
                          {formatRatePercent(row.discountPercent)}
                        </em>
                      ) : null}
                    </div>
                    <div>
                      <span>Cost</span>
                      <strong>
                        {row.cost != null ? formatMoney(row.cost) : '—'}
                      </strong>
                      {row.costPercent != null ? (
                        <em className="umkm-num-sub">
                          {formatRatePercent(row.costPercent)}
                        </em>
                      ) : null}
                    </div>
                    <div>
                      <span>Profit</span>
                      <strong
                        className={
                          row.profit != null && row.profit < 0
                            ? 'is-neg'
                            : undefined
                        }
                      >
                        {row.profit != null ? formatMoney(row.profit) : '—'}
                      </strong>
                      {row.marginPercent != null ? (
                        <em className="umkm-num-sub">
                          {formatRatePercent(row.marginPercent)}
                        </em>
                      ) : null}
                    </div>
                    <div>
                      <span>STR</span>
                      <strong>
                        {formatRatePercent(row.sellThroughRate)}
                      </strong>
                    </div>
                    <div>
                      <span>ITR</span>
                      <strong>{formatRatio(row.inventoryTurnover)}</strong>
                    </div>
                    <div>
                      <span>SSR</span>
                      <strong>{formatRatio(row.stockToSalesRatio)}</strong>
                    </div>
                    <div>
                      <span>Orders</span>
                      <strong>
                        {row.orderCount.toLocaleString('en-US')}
                      </strong>
                    </div>
                    <div>
                      <span>AOV</span>
                      <strong>
                        {row.avgOrderValue != null
                          ? formatMoney(row.avgOrderValue)
                          : '—'}
                      </strong>
                    </div>
                    <div>
                      <span>UPT</span>
                      <strong>
                        {row.unitsPerTransaction != null
                          ? formatCompactQty(row.unitsPerTransaction)
                          : '—'}
                      </strong>
                    </div>
                  </div>
                </button>
                <div className="umkm-row-actions umkm-icon-actions">
                  <button
                    className="umkm-icon-btn"
                    type="button"
                    title="View performance"
                    aria-label={`View performance for ${row.name}`}
                    onClick={() => onView(row)}
                  >
                    <IconView />
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <ListPager
            ariaLabel="Product stock and sales pages"
            page={meta.page}
            totalPages={meta.totalPages}
            total={meta.total}
            loading={loading}
            pageSize={pageSize}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
            onPrev={() => setPage((p) => Math.max(1, p - 1))}
            onNext={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
          />
        </>
      )}
    </ContentSection>
  );
}
