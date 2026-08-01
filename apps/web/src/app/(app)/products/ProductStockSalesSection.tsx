'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { dedupeById } from '@/lib/dedupe-by-id';
import { ContentSection, EmptyState } from '@/components/PageHeader';
import { ListPager } from '@/components/ListPager';
import { EntityIdBadge } from '@/components/EntityId';
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

export function ProductStockSalesSection({
  filters,
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
      description="Review stocks, revenue, discount, cost, and profit for each product, with sell-through, turnover, stock-to-sales, orders, average order value, and units per transaction."
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
                      onClick={() => toggleSort('revenue')}
                      data-dir={sortMark('revenue')}
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
                </tr>
              </thead>
              <tbody>
                {sorted.map((row) => (
                  <tr key={row.id} className="umkm-catalog-row">
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
                      <span className="umkm-num">
                        {formatMoney(row.revenue)}
                      </span>
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
                      <span className="umkm-num">
                        {row.cost != null ? formatMoney(row.cost) : '—'}
                      </span>
                    </td>
                    <td className="is-num">
                      <span
                        className={`umkm-num${
                          row.profit != null && row.profit < 0 ? ' is-neg' : ''
                        }`}
                      >
                        {row.profit != null ? formatMoney(row.profit) : '—'}
                      </span>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="umkm-catalog-cards">
            {sorted.map((row) => (
              <li key={row.id} className="umkm-catalog-card">
                <div className="umkm-catalog-card-main">
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
                      <strong>{formatMoney(row.revenue)}</strong>
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
