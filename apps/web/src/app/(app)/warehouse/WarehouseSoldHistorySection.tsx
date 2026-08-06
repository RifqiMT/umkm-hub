'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { dedupeById } from '@/lib/dedupe-by-id';
import {
  ContentSection,
  EmptyState,
} from '@/components/PageHeader';
import { ListPager } from '@/components/ListPager';
import type { ListPageSize } from '@/lib/list-page-size';
import {
  ViewBlock,
  ViewChip,
  ViewFacts,
  ViewIdentity,
  ViewSheetBody,
} from '@/components/ViewSheet';
import {
  formatPacksOnHand,
  getActivePack,
} from '@/lib/product-pack';
import type { Paginated, WarehouseSale } from '@/lib/types';
import { formatCompactQty } from '@/lib/format-money';

type SortKey = 'date' | 'product' | 'qty' | 'after';
type SortDir = 'asc' | 'desc';

function unitShort(unit?: string) {
  switch (unit) {
    case 'GRAM':
      return 'g';
    case 'LITER':
      return 'L';
    default:
      return 'pcs';
  }
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

type WarehouseSoldHistorySectionProps = {
  search: string;
  onView: (row: WarehouseSale) => void;
};

type WarehouseSoldHistoryViewProps = {
  row: WarehouseSale;
  onClose: () => void;
};

export function WarehouseSoldHistoryView({
  row,
  onClose,
}: WarehouseSoldHistoryViewProps) {
  const router = useRouter();
  const u = unitShort(row.unit ?? row.unitSnapshot);
  const pack = row.product ? getActivePack(row.product) : null;
  const packsSold = formatPacksOnHand(row.qtySold, pack);
  const packsBefore = formatPacksOnHand(row.stockBefore, pack);
  const packsAfter = formatPacksOnHand(row.stockAfter, pack);

  return (
    <ContentSection
      className="umkm-form-panel umkm-product-sheet umkm-view-sheet"
      eyebrow="Sold"
      title={row.product?.name ?? row.productId}
      description={
        row.orderRef
          ? `Stock drawn by order ${row.orderRef}.`
          : 'Stock drawn when this order line was fulfilled.'
      }
      actionsPlacement="foot"
      actions={
        <>
          {row.order?.id || row.orderId ? (
            <button
              type="button"
              className="umkm-btn secondary"
              onClick={() => {
                const orderUuid = row.order?.id ?? row.orderId;
                onClose();
                router.push(`/orders?view=${orderUuid}`);
              }}
            >
              Open order
            </button>
          ) : null}
          <button
            type="button"
            className="umkm-btn secondary"
            onClick={onClose}
          >
            Close
          </button>
        </>
      }
    >
      <ViewSheetBody onClose={onClose}>
        <ViewIdentity
          contextLabel="Sold"
          chips={
            <>
              <ViewChip>
                {row.soldDate?.slice(0, 10) ?? 'No date'}
              </ViewChip>
              {pack ? (
                <ViewChip tone="accent">
                  Pack {pack.sizeLabel}
                </ViewChip>
              ) : (
                <ViewChip>No pack</ViewChip>
              )}
              <ViewChip>
                −{formatCompactQty(row.qtySold)} {u}
                {packsSold ? ` · ${packsSold}` : ''}
              </ViewChip>
              {row.orderRef ? <ViewChip>{row.orderRef}</ViewChip> : null}
            </>
          }
          metricLabel="Stock after"
          metricValue={
            <>
              {formatCompactQty(row.stockAfter)} {u}
            </>
          }
          metricHint={
            <>
              From {formatCompactQty(row.stockBefore)}
              {packsAfter ? ` · ${packsAfter}` : ''}
            </>
          }
        />
        <ViewBlock
          title="Stock movement"
          description="How this sale changed on-hand quantity."
        >
          <ViewFacts
            columns={3}
            items={[
              {
                key: 'before',
                label: 'Before',
                value: formatCompactQty(row.stockBefore),
                sub: packsBefore ?? u,
              },
              {
                key: 'sold',
                label: 'Sold',
                value: `−${formatCompactQty(row.qtySold)}`,
                sub: packsSold ? `−${packsSold}` : u,
              },
              {
                key: 'after',
                label: 'After',
                value: formatCompactQty(row.stockAfter),
                sub: packsAfter ?? u,
              },
            ]}
          />
        </ViewBlock>
        {row.notes ? (
          <ViewBlock title="Notes">
            <p style={{ margin: 0 }}>{row.notes}</p>
          </ViewBlock>
        ) : null}
      </ViewSheetBody>
    </ContentSection>
  );
}

export function WarehouseSoldHistorySection({
  search,
  onView,
}: WarehouseSoldHistorySectionProps) {
  const [items, setItems] = useState<WarehouseSale[]>([]);
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
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const loadSeq = useRef(0);

  useEffect(() => {
    setPage(1);
  }, [search]);

  useEffect(() => {
    const seq = ++loadSeq.current;
    setLoading(true);
    void (async () => {
      try {
        const res = await api<Paginated<WarehouseSale>>('/warehouse/sales', {
          searchParams: {
            page,
            limit: pageSize,
            search: search.trim() || undefined,
          },
        });
        if (seq !== loadSeq.current) return;
        setItems(dedupeById(res.items));
        setMeta(res.meta);
        setPage(res.meta.page);
        setError('');
      } catch (err) {
        if (seq !== loadSeq.current) return;
        setError(
          err instanceof Error ? err.message : 'Failed to load sold history',
        );
      } finally {
        if (seq === loadSeq.current) setLoading(false);
      }
    })();
  }, [page, pageSize, search]);

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'date':
          cmp = (a.soldDate ?? '').localeCompare(b.soldDate ?? '');
          break;
        case 'product':
          cmp = (a.product?.name ?? a.productId).localeCompare(
            b.product?.name ?? b.productId,
            undefined,
            { sensitivity: 'base' },
          );
          break;
        case 'qty':
          cmp = a.qtySold - b.qtySold;
          break;
        case 'after':
          cmp = a.stockAfter - b.stockAfter;
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
    setSortDir(key === 'date' || key === 'after' || key === 'qty' ? 'desc' : 'asc');
  }

  function sortMark(key: SortKey) {
    if (sortKey !== key) return undefined;
    return sortDir;
  }

  return (
    <>
      <ContentSection
        eyebrow="History"
        title="Sold history"
        description="Review stock drawn by orders, including quantity before and after each sale and pack equivalents."
      >
        {error ? (
          <p className="umkm-error" role="alert">
            {error}
          </p>
        ) : loading && sorted.length === 0 ? null : meta.total === 0 ? (
          <EmptyState
            title="No sales recorded yet"
            description="New orders appear here automatically. If older sales are missing, run the warehouse sales backfill on the API."
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
                        onClick={() => toggleSort('date')}
                        data-dir={sortMark('date')}
                      >
                        Date
                      </button>
                    </th>
                    <th>
                      <button
                        type="button"
                        className="umkm-th-sort"
                        onClick={() => toggleSort('product')}
                        data-dir={sortMark('product')}
                      >
                        Product
                      </button>
                    </th>
                    <th className="is-num">
                      <button
                        type="button"
                        className="umkm-th-sort"
                        onClick={() => toggleSort('qty')}
                        data-dir={sortMark('qty')}
                      >
                        Sold
                      </button>
                    </th>
                    <th className="is-num">
                      <button
                        type="button"
                        className="umkm-th-sort"
                        onClick={() => toggleSort('after')}
                        data-dir={sortMark('after')}
                      >
                        Stock
                      </button>
                    </th>
                    <th>Order</th>
                    <th className="is-actions">
                      <span className="umkm-th-label">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((r) => {
                    const u = unitShort(r.unit ?? r.unitSnapshot);
                    const pack = r.product ? getActivePack(r.product) : null;
                    const packsSold = formatPacksOnHand(r.qtySold, pack);
                    const packsBefore = formatPacksOnHand(r.stockBefore, pack);
                    const packsAfter = formatPacksOnHand(r.stockAfter, pack);
                    return (
                      <tr
                        key={r.id}
                        className="umkm-catalog-row"
                        tabIndex={0}
                        onClick={() => onView(r)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onView(r);
                          }
                        }}
                      >
                        <td>
                          <span className="umkm-num">
                            {r.soldDate?.slice(0, 10) ?? '—'}
                          </span>
                        </td>
                        <td>
                          <div
                            className="umkm-num-stack"
                            style={{ alignItems: 'flex-start' }}
                          >
                            <span className="umkm-product-name">
                              {r.product?.name ?? r.productId}
                            </span>
                            {pack ? (
                              <span className="umkm-pack-size">
                                Pack {pack.sizeLabel}
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="is-num">
                          <div className="umkm-num-stack">
                            <span className="umkm-wh-sold">
                              −{formatCompactQty(r.qtySold)} {u}
                            </span>
                            {packsSold ? (
                              <em className="umkm-num-sub">{packsSold}</em>
                            ) : null}
                          </div>
                        </td>
                        <td className="is-num">
                          <div className="umkm-num-stack">
                            <span>
                              {formatCompactQty(r.stockAfter)} {u}
                            </span>
                            <em className="umkm-num-sub">
                              from {formatCompactQty(r.stockBefore)}
                              {packsBefore || packsAfter
                                ? ` · ${packsBefore ?? '—'} → ${packsAfter ?? '—'}`
                                : ''}
                            </em>
                          </div>
                        </td>
                        <td>
                          <span className="umkm-num">
                            {r.orderRef || r.notes || '—'}
                          </span>
                        </td>
                        <td className="is-actions">
                          <div className="umkm-row-actions umkm-icon-actions">
                            <button
                              className="umkm-icon-btn"
                              type="button"
                              title="View"
                              aria-label="View sale"
                              onClick={(e) => {
                                e.stopPropagation();
                                onView(r);
                              }}
                            >
                              <IconView />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <ul className="umkm-catalog-cards">
              {sorted.map((r) => {
                const u = unitShort(r.unit ?? r.unitSnapshot);
                const pack = r.product ? getActivePack(r.product) : null;
                const packsSold = formatPacksOnHand(r.qtySold, pack);
                const packsBefore = formatPacksOnHand(r.stockBefore, pack);
                const packsAfter = formatPacksOnHand(r.stockAfter, pack);
                return (
                  <li key={r.id} className="umkm-catalog-card">
                    <button
                      type="button"
                      className="umkm-catalog-card-main"
                      onClick={() => onView(r)}
                    >
                      <div className="umkm-catalog-card-identity">
                        <span className="umkm-product-name">
                          {r.product?.name ?? r.productId}
                        </span>
                        <div className="umkm-product-meta">
                          <span className="umkm-wh-sold">
                            −{formatCompactQty(r.qtySold)} {u}
                          </span>
                          {pack ? (
                            <span className="umkm-pack-size">
                              Pack {pack.sizeLabel}
                            </span>
                          ) : null}
                        </div>
                        <div className="umkm-catalog-card-details">
                          <span>{r.soldDate?.slice(0, 10) ?? '—'}</span>
                          {packsSold ? <span>Sold {packsSold}</span> : null}
                          {r.orderRef ? <span>{r.orderRef}</span> : null}
                        </div>
                      </div>
                      <div className="umkm-catalog-card-metrics">
                        <div>
                          <span>Before</span>
                          <strong>
                            {formatCompactQty(r.stockBefore)} {u}
                          </strong>
                          {packsBefore ? (
                            <em className="umkm-num-sub">{packsBefore}</em>
                          ) : null}
                        </div>
                        <div>
                          <span>After</span>
                          <strong>
                            {formatCompactQty(r.stockAfter)} {u}
                          </strong>
                          {packsAfter ? (
                            <em className="umkm-num-sub">{packsAfter}</em>
                          ) : null}
                        </div>
                      </div>
                    </button>
                    <div className="umkm-row-actions umkm-icon-actions">
                      <button
                        className="umkm-icon-btn"
                        type="button"
                        title="View"
                        aria-label="View sale"
                        onClick={() => onView(r)}
                      >
                        <IconView />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
            <ListPager
              ariaLabel="Sold history pages"
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
    </>
  );
}
