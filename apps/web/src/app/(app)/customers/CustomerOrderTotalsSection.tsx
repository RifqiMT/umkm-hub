'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { dedupeById } from '@/lib/dedupe-by-id';
import { ContentSection, EmptyState } from '@/components/PageHeader';
import { ListPager } from '@/components/ListPager';
import { EntityIdBadge } from '@/components/EntityId';
import type { ListPageSize } from '@/lib/list-page-size';
import type { CustomerOrderTotals, Paginated } from '@/lib/types';
import {
  formatCompactQty,
  formatMoney,
  formatRatePercent,
} from '@/lib/format-money';
import { useCustomerLabelHelpers } from '@/hooks/useCustomerLabelHelpers';

type SortKey =
  | 'name'
  | 'company'
  | 'totals'
  | 'discount'
  | 'orderTotal'
  | 'orderCount'
  | 'packsSold'
  | 'cancelledCount'
  | 'avgOrderValue'
  | 'unitsPerTransaction';
type SortDir = 'asc' | 'desc';

type CustomerOrderTotalsFilters = {
  search?: string;
  status?: string[];
  companyType?: string[];
  relationshipLevel?: string[];
  partnershipStage?: string[];
};

type CustomerOrderTotalsSectionProps = {
  filters: CustomerOrderTotalsFilters;
};

function compareNullable(a: number | null, b: number | null): number {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  return a - b;
}

export function CustomerOrderTotalsSection({
  filters,
}: CustomerOrderTotalsSectionProps) {
  const { companyTypeLabel } = useCustomerLabelHelpers();
  const [items, setItems] = useState<CustomerOrderTotals[]>([]);
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
  const [sortKey, setSortKey] = useState<SortKey>('orderTotal');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const loadSeq = useRef(0);
  const filterKey = JSON.stringify(filters);

  useEffect(() => {
    setPage(1);
  }, [filterKey]);

  useEffect(() => {
    const seq = ++loadSeq.current;
    setLoading(true);
    void (async () => {
      try {
        const res = await api<Paginated<CustomerOrderTotals>>(
          '/customers/order-totals',
          {
            searchParams: {
              page,
              limit: pageSize,
              search: filters.search?.trim() || undefined,
              status: filters.status?.length ? filters.status : undefined,
              companyType: filters.companyType?.length
                ? filters.companyType
                : undefined,
              relationshipLevel: filters.relationshipLevel?.length
                ? filters.relationshipLevel
                : undefined,
              partnershipStage: filters.partnershipStage?.length
                ? filters.partnershipStage
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
            : 'Failed to load customer order totals',
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
        case 'company':
          cmp = a.companyName.localeCompare(b.companyName, undefined, {
            sensitivity: 'base',
          });
          break;
        case 'totals':
          cmp = a.totals - b.totals;
          break;
        case 'discount':
          cmp = a.discount - b.discount;
          break;
        case 'orderTotal':
          cmp = a.orderTotal - b.orderTotal;
          break;
        case 'orderCount':
          cmp = a.orderCount - b.orderCount;
          break;
        case 'packsSold':
          cmp = a.packsSold - b.packsSold;
          break;
        case 'cancelledCount':
          cmp = a.cancelledCount - b.cancelledCount;
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
    setSortDir(key === 'name' || key === 'company' ? 'asc' : 'desc');
  }

  function sortMark(key: SortKey) {
    if (sortKey !== key) return undefined;
    return sortDir;
  }

  return (
    <ContentSection
      eyebrow="Orders"
      title="Order totals"
      description="Summarize linked orders for each customer, including revenue, discounts, volume, cancellations, average order value, and units per transaction."
    >
      {error ? (
        <p className="umkm-error" role="alert">
          {error}
        </p>
      ) : loading && sorted.length === 0 ? null : meta.total === 0 ? (
        <EmptyState
          title="No linked order totals yet"
          description="Only customers linked to orders appear here. Link a customer on an order to include them in these totals."
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
                      Customer name
                    </button>
                  </th>
                  <th>
                    <button
                      type="button"
                      className="umkm-th-sort"
                      onClick={() => toggleSort('company')}
                      data-dir={sortMark('company')}
                    >
                      Customer company
                    </button>
                  </th>
                  <th className="is-num">
                    <button
                      type="button"
                      className="umkm-th-sort"
                      onClick={() => toggleSort('totals')}
                      data-dir={sortMark('totals')}
                    >
                      Totals
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
                      onClick={() => toggleSort('orderTotal')}
                      data-dir={sortMark('orderTotal')}
                    >
                      Order total
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
                      onClick={() => toggleSort('packsSold')}
                      data-dir={sortMark('packsSold')}
                    >
                      Packs
                    </button>
                  </th>
                  <th className="is-num">
                    <button
                      type="button"
                      className="umkm-th-sort"
                      onClick={() => toggleSort('cancelledCount')}
                      data-dir={sortMark('cancelledCount')}
                    >
                      Cancelled
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
                {sorted.map((row) => {
                  const contact =
                    [row.email, row.phone].filter(Boolean).join(' · ') ||
                    'No contact yet';
                  return (
                    <tr key={row.id} className="umkm-catalog-row">
                      <td>
                        <div className="umkm-product-cell">
                          <span className="umkm-product-name">{row.name}</span>
                          <div className="umkm-product-meta">
                            <EntityIdBadge
                              id={row.customerId || row.id}
                              literal={Boolean(row.customerId)}
                              compact
                            />
                            {row.title ? (
                              <span className="umkm-badge sm">{row.title}</span>
                            ) : null}
                            <span className="umkm-muted">{contact}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="umkm-product-cell">
                          <span className="umkm-product-name">
                            {row.companyName || '—'}
                          </span>
                          <div className="umkm-product-meta">
                            <span className="umkm-badge sm">
                              {companyTypeLabel(row.companyType)}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="is-num">
                        <span className="umkm-num">{formatMoney(row.totals)}</span>
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
                          {formatMoney(row.orderTotal)}
                        </span>
                      </td>
                      <td className="is-num">
                        <span className="umkm-num">
                          {row.orderCount.toLocaleString('en-US')}
                        </span>
                      </td>
                      <td className="is-num">
                        <span className="umkm-num">
                          {formatCompactQty(row.packsSold)}
                        </span>
                      </td>
                      <td className="is-num">
                        <div className="umkm-num-stack">
                          <span className="umkm-num">
                            {row.cancelledCount.toLocaleString('en-US')}
                          </span>
                          {row.cancelRate != null ? (
                            <em className="umkm-num-sub">
                              {formatRatePercent(row.cancelRate)}
                            </em>
                          ) : null}
                        </div>
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
                  );
                })}
              </tbody>
            </table>
          </div>

          <ul className="umkm-catalog-cards">
            {sorted.map((row) => {
              const contact =
                [row.email, row.phone].filter(Boolean).join(' · ') ||
                'No contact yet';
              return (
                <li key={row.id} className="umkm-catalog-card">
                  <div className="umkm-catalog-card-main">
                    <div className="umkm-catalog-card-identity">
                      <span className="umkm-product-name">{row.name}</span>
                      <div className="umkm-product-meta">
                        <EntityIdBadge
                          id={row.customerId || row.id}
                          literal={Boolean(row.customerId)}
                          compact
                        />
                        {row.title ? (
                          <span className="umkm-badge sm">{row.title}</span>
                        ) : null}
                      </div>
                      <div className="umkm-catalog-card-details">
                        <span>{row.companyName || '—'}</span>
                        <span>{companyTypeLabel(row.companyType)}</span>
                        <span>{contact}</span>
                      </div>
                    </div>
                    <div className="umkm-catalog-card-metrics">
                      <div>
                        <span>Order total</span>
                        <strong>{formatMoney(row.orderTotal)}</strong>
                      </div>
                      <div>
                        <span>Orders</span>
                        <strong>{row.orderCount.toLocaleString('en-US')}</strong>
                      </div>
                      <div>
                        <span>Packs</span>
                        <strong>{formatCompactQty(row.packsSold)}</strong>
                      </div>
                      <div>
                        <span>Cancelled</span>
                        <strong>
                          {row.cancelledCount.toLocaleString('en-US')}
                        </strong>
                        {row.cancelRate != null ? (
                          <em className="umkm-num-sub">
                            {formatRatePercent(row.cancelRate)}
                          </em>
                        ) : null}
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
              );
            })}
          </ul>
          <ListPager
            ariaLabel="Customer order totals pages"
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
