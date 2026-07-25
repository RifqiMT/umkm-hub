'use client';

import { FormEvent, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, ApiError } from '@/lib/api';
import {
  ContentSection,
  EmptyState,
  FormSection,
  PageHeader,
} from '@/components/PageHeader';
import { ViewBlock, ViewChip, ViewIdentity, ViewSheetBody } from '@/components/ViewSheet';
import { OptionChips } from '@/components/OptionChips';
import { LABELS, PRODUCT_UNITS, todayDateInput } from '@/lib/enums';
import {
  formatPacksOnHand,
  getActivePack,
  packEconomics,
  packsOnHand,
  qtyFromPackCount,
  type ActivePack,
} from '@/lib/product-pack';
import type { Paginated, Product, WarehouseRestock } from '@/lib/types';
import { formatMoney, formatQty } from '@/lib/format-money';

type UnitFilter = 'ALL' | (typeof PRODUCT_UNITS)[number];
type InvSortKey = 'name' | 'stock' | 'sell' | 'cost' | 'profit' | 'margin';
type HistSortKey = 'date' | 'product' | 'qty' | 'after';
type SortDir = 'asc' | 'desc';
type RestockEntryMode = 'QTY' | 'PACK';

function unitLabel(unit?: string) {
  if (!unit) return '';
  return LABELS.productUnit[unit as keyof typeof LABELS.productUnit] ?? unit;
}

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


function formatMarginPercent(value: number) {
  return `${value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}%`;
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

function IconRestock() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 4v12m0 0 4-4m-4 4-4-4M5 20h14"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MoneyCell({ value }: { value: number | null | undefined }) {
  if (value == null) {
    return <span className="umkm-num is-empty">—</span>;
  }
  return <span className="umkm-num">{formatMoney(value)}</span>;
}

function PackChip({ pack }: { pack: ActivePack | null }) {
  if (!pack) {
    return <span className="umkm-pack-empty">No pack</span>;
  }
  return <span className="umkm-pack-size">Pack {pack.sizeLabel}</span>;
}

function PackEconomicsStrip({
  pack,
  showHeader = true,
}: {
  pack: ActivePack | null;
  showHeader?: boolean;
}) {
  if (!pack) {
    return (
      <div className="umkm-econ-empty" role="status">
        No selling pack on this product. Set one in Products.
      </div>
    );
  }

  const eco = packEconomics(pack);
  return (
    <EconStrip
      label="Active pack"
      badge={pack.sizeLabel}
      showHeader={showHeader}
      ariaLabel={`Pack ${pack.sizeLabel} economics`}
      tiles={[
        {
          key: 'sell',
          label: 'Sell',
          value: formatMoney(eco.sell!),
          sub: `${formatMoney(eco.sellRate!)} / ${pack.shortUnit}`,
        },
        {
          key: 'cost',
          label: 'Cost',
          value: eco.cost != null ? formatMoney(eco.cost) : '—',
          sub:
            eco.costRate != null
              ? `${formatMoney(eco.costRate)} / ${pack.shortUnit}`
              : undefined,
        },
        {
          key: 'profit',
          label: 'Profit',
          value: eco.profit != null ? formatMoney(eco.profit) : '—',
          sub:
            eco.profitRate != null
              ? `${formatMoney(eco.profitRate)} / ${pack.shortUnit}`
              : undefined,
          accent: 'profit',
        },
        {
          key: 'margin',
          label: 'Margin',
          value: <MarginPill value={eco.margin} />,
          accent: 'margin',
        },
      ]}
    />
  );
}

function MarginPill({ value }: { value: number | null | undefined }) {
  if (value == null) {
    return <span className="umkm-num is-empty">—</span>;
  }
  return (
    <span className={`umkm-margin-pill${value >= 0 ? ' is-good' : ' is-warn'}`}>
      {formatMarginPercent(value)}
    </span>
  );
}

type EconTile = {
  key: string;
  label: string;
  value: ReactNode;
  sub?: string;
  accent?: 'margin' | 'profit' | 'added';
};

function EconStrip({
  label,
  badge,
  tiles,
  showHeader = true,
  ariaLabel,
  className = '',
}: {
  label?: string;
  badge?: ReactNode;
  tiles: EconTile[];
  showHeader?: boolean;
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <div
      className={`umkm-econ-strip${showHeader ? '' : ' is-inline'}${className ? ` ${className}` : ''}`}
      aria-label={ariaLabel}
    >
      {showHeader ? (
        <div className="umkm-econ-pack">
          <span className="umkm-econ-pack-label">{label ?? 'Summary'}</span>
          {badge ? <span className="umkm-pack-size">{badge}</span> : null}
        </div>
      ) : null}
      <div className="umkm-econ-tiles">
        {tiles.map((tile) => (
          <div
            key={tile.key}
            className={`umkm-econ-tile${tile.accent ? ` is-${tile.accent}` : ''}`}
          >
            <span className="umkm-econ-tile-label">{tile.label}</span>
            <strong className="umkm-econ-tile-value">{tile.value}</strong>
            {tile.sub ? (
              <em className="umkm-econ-tile-sub">{tile.sub}</em>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

type RestockForm = {
  productId: string;
  qtyAdded: number;
  packsAdded: number;
  restockDate: string;
  notes: string;
  entryMode: RestockEntryMode;
};

function defaultRestockMode(product?: Product | null): RestockEntryMode {
  if (!product) return 'QTY';
  const pack = getActivePack(product);
  return pack && pack.size > 1 ? 'PACK' : 'QTY';
}

function emptyForm(product?: Product): RestockForm {
  const pack = product ? getActivePack(product) : null;
  const entryMode = defaultRestockMode(product);
  const packsAdded = entryMode === 'PACK' ? 1 : pack ? packsOnHand(1, pack) ?? 0 : 0;
  const qtyAdded =
    entryMode === 'PACK' && pack
      ? qtyFromPackCount(packsAdded, pack.size)
      : 1;
  return {
    productId: product?.id ?? '',
    qtyAdded,
    packsAdded: packsAdded || (pack ? packsOnHand(qtyAdded, pack) ?? 0 : 0),
    restockDate: todayDateInput(),
    notes: '',
    entryMode,
  };
}

export default function WarehousePage() {
  const [items, setItems] = useState<WarehouseRestock[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState<RestockForm>(emptyForm());
  const [formOpen, setFormOpen] = useState(false);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [viewingRestock, setViewingRestock] =
    useState<WarehouseRestock | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [unitFilter, setUnitFilter] = useState<UnitFilter>('ALL');
  const [invSortKey, setInvSortKey] = useState<InvSortKey>('name');
  const [invSortDir, setInvSortDir] = useState<SortDir>('asc');
  const [histSortKey, setHistSortKey] = useState<HistSortKey>('date');
  const [histSortDir, setHistSortDir] = useState<SortDir>('desc');

  const selected = products.find((p) => p.id === form.productId);

  const inventory = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = products;
    if (q) list = list.filter((p) => p.name.toLowerCase().includes(q));
    if (unitFilter !== 'ALL') {
      list = list.filter((p) => p.unit === unitFilter);
    }

    return [...list].sort((a, b) => {
      let cmp = 0;
      switch (invSortKey) {
        case 'name':
          cmp = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
          break;
        case 'stock':
          cmp = a.stockQty - b.stockQty;
          break;
        case 'sell':
          cmp = (a.potentialRevenue ?? 0) - (b.potentialRevenue ?? 0);
          break;
        case 'cost':
          cmp =
            (a.potentialCost ?? Number.NEGATIVE_INFINITY) -
            (b.potentialCost ?? Number.NEGATIVE_INFINITY);
          break;
        case 'profit':
          cmp =
            (a.potentialProfit ?? Number.NEGATIVE_INFINITY) -
            (b.potentialProfit ?? Number.NEGATIVE_INFINITY);
          break;
        case 'margin':
          cmp =
            (a.profitMarginPercent ?? Number.NEGATIVE_INFINITY) -
            (b.profitMarginPercent ?? Number.NEGATIVE_INFINITY);
          break;
      }
      return invSortDir === 'asc' ? cmp : -cmp;
    });
  }, [products, search, unitFilter, invSortKey, invSortDir]);

  const history = useMemo(() => {
    return [...items].sort((a, b) => {
      let cmp = 0;
      switch (histSortKey) {
        case 'date':
          cmp = (a.restockDate ?? '').localeCompare(b.restockDate ?? '');
          break;
        case 'product':
          cmp = (a.product?.name ?? a.productId).localeCompare(
            b.product?.name ?? b.productId,
            undefined,
            { sensitivity: 'base' },
          );
          break;
        case 'qty':
          cmp = a.qtyAdded - b.qtyAdded;
          break;
        case 'after':
          cmp = a.stockAfter - b.stockAfter;
          break;
      }
      return histSortDir === 'asc' ? cmp : -cmp;
    });
  }, [items, histSortKey, histSortDir]);

  const totalPotentialRevenue = useMemo(
    () => inventory.reduce((sum, p) => sum + (p.potentialRevenue ?? 0), 0),
    [inventory],
  );

  const totalPotentialCost = useMemo(
    () => inventory.reduce((sum, p) => sum + (p.potentialCost ?? 0), 0),
    [inventory],
  );

  const totalPotentialProfit = useMemo(
    () => inventory.reduce((sum, p) => sum + (p.potentialProfit ?? 0), 0),
    [inventory],
  );

  const productsWithCost = useMemo(
    () => inventory.filter((p) => p.potentialCost != null).length,
    [inventory],
  );

  /** Margin over sell value of products that have cost configured. */
  const inventoryMarginPercent = useMemo(() => {
    const priced = inventory.filter((p) => p.potentialCost != null);
    const revenue = priced.reduce(
      (sum, p) => sum + (p.potentialRevenue ?? 0),
      0,
    );
    const profit = priced.reduce(
      (sum, p) => sum + (p.potentialProfit ?? 0),
      0,
    );
    if (priced.length === 0 || revenue <= 0) return null;
    return (
      Math.round(((profit / revenue) * 100 + Number.EPSILON) * 100) / 100
    );
  }, [inventory]);

  async function load(searchTerm = search) {
    try {
      const [restocks, productList] = await Promise.all([
        api<Paginated<WarehouseRestock>>('/warehouse', {
          searchParams: { limit: 50, search: searchTerm || undefined },
        }),
        api<Paginated<Product>>('/products', { searchParams: { limit: 100 } }),
      ]);
      setItems(restocks.items);
      setProducts(productList.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load warehouse');
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleInvSort(key: InvSortKey) {
    if (invSortKey === key) {
      setInvSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setInvSortKey(key);
    setInvSortDir(key === 'name' ? 'asc' : 'desc');
  }

  function toggleHistSort(key: HistSortKey) {
    if (histSortKey === key) {
      setHistSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setHistSortKey(key);
    setHistSortDir(key === 'product' ? 'asc' : 'desc');
  }

  function invSortMark(key: InvSortKey) {
    if (invSortKey !== key) return undefined;
    return invSortDir;
  }

  function histSortMark(key: HistSortKey) {
    if (histSortKey !== key) return undefined;
    return histSortDir;
  }

  function startCreate() {
    setViewingProduct(null);
    setViewingRestock(null);
    setForm(emptyForm(products[0]));
    setFormOpen(true);
  }

  function startRestock(product: Product) {
    setViewingProduct(null);
    setViewingRestock(null);
    setForm(emptyForm(product));
    setFormOpen(true);
  }

  function startViewProduct(product: Product) {
    setFormOpen(false);
    setViewingRestock(null);
    setViewingProduct(product);
  }

  function startViewRestock(restock: WarehouseRestock) {
    setFormOpen(false);
    setViewingProduct(null);
    setViewingRestock(restock);
  }

  function resetForm() {
    setFormOpen(false);
    setViewingProduct(null);
    setViewingRestock(null);
    setForm(emptyForm(products[0]));
  }

  function closeView() {
    setViewingProduct(null);
    setViewingRestock(null);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api('/warehouse', {
        method: 'POST',
        body: {
          productId: form.productId,
          qtyAdded: form.qtyAdded,
          restockDate: form.restockDate,
          notes: form.notes.trim() || undefined,
        },
      });
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Restock failed');
    } finally {
      setLoading(false);
    }
  }

  const focusMode = formOpen || Boolean(viewingProduct) || Boolean(viewingRestock);

  return (
    <section>
      <PageHeader
        title="Warehouse"
        description="Track stock by pack, inventory value, and restocks."
        actions={
          !focusMode ? (
            <button
              type="button"
              className="umkm-btn"
              onClick={startCreate}
              disabled={products.length === 0}
            >
              Add restock
            </button>
          ) : null
        }
      />
      {error ? <div className="umkm-error">{error}</div> : null}

      {viewingProduct ? (
        <ContentSection
          className="umkm-form-panel umkm-product-sheet umkm-view-sheet"
          eyebrow="Inventory"
          title={viewingProduct.name}
          description={
            viewingProduct.details?.trim()
              ? viewingProduct.details
              : 'Stock on hand and inventory value for this product.'
          }
          actions={
            <>
              <button
                type="button"
                className="umkm-btn"
                onClick={() => startRestock(viewingProduct)}
              >
                Restock
              </button>
              <button
                type="button"
                className="umkm-btn secondary"
                onClick={closeView}
              >
                Close
              </button>
            </>
          }
        >
          <ViewSheetBody onClose={closeView}>
            {(() => {
              const pack = getActivePack(viewingProduct);
              const packsLabel = formatPacksOnHand(
                viewingProduct.stockQty,
                pack,
              );
              return (
                <>
                  <ViewIdentity
                    contextLabel="Unit & pack"
                    chips={
                      <>
                        <ViewChip>{unitLabel(viewingProduct.unit)}</ViewChip>
                        {pack ? (
                          <ViewChip tone="accent">
                            Pack {pack.sizeLabel}
                          </ViewChip>
                        ) : (
                          <ViewChip>No pack</ViewChip>
                        )}
                      </>
                    }
                    metricLabel="On hand"
                    metricValue={
                      <>
                        {formatQty(viewingProduct.stockQty)}{' '}
                        {unitShort(viewingProduct.unit)}
                      </>
                    }
                    metricHint={
                      packsLabel
                        ? `${packsLabel} in stock`
                        : 'Current warehouse stock'
                    }
                  />

                  <ViewBlock
                    title="Pack"
                    description="Catalog selling pack with unit rates packed underneath."
                  >
                    <PackEconomicsStrip pack={pack} showHeader={false} />
                  </ViewBlock>

                  <ViewBlock
                    title="Inventory value"
                    description={
                      packsLabel
                        ? `Stock × unit rates (${packsLabel}).`
                        : 'Stock × unit rates for everything on hand.'
                    }
                  >
                    <EconStrip
                      label="On hand value"
                      showHeader={false}
                      badge={
                        packsLabel ??
                        `${formatQty(viewingProduct.stockQty)} ${unitShort(viewingProduct.unit)}`
                      }
                      ariaLabel="Inventory value"
                      tiles={[
                        {
                          key: 'sell',
                          label: 'Sell',
                          value: formatMoney(viewingProduct.potentialRevenue),
                        },
                        {
                          key: 'cost',
                          label: 'Cost',
                          value:
                            viewingProduct.potentialCost != null
                              ? formatMoney(viewingProduct.potentialCost)
                              : '—',
                        },
                        {
                          key: 'profit',
                          label: 'Profit',
                          value:
                            viewingProduct.potentialProfit != null
                              ? formatMoney(viewingProduct.potentialProfit)
                              : '—',
                          accent: 'profit',
                        },
                        {
                          key: 'margin',
                          label: 'Margin',
                          value: (
                            <MarginPill
                              value={viewingProduct.profitMarginPercent}
                            />
                          ),
                          accent: 'margin',
                        },
                      ]}
                    />
                  </ViewBlock>
                </>
              );
            })()}
          </ViewSheetBody>
        </ContentSection>
      ) : null}

      {viewingRestock ? (
        <ContentSection
          className="umkm-form-panel umkm-product-sheet umkm-view-sheet"
          eyebrow="Restock"
          title={viewingRestock.product?.name ?? viewingRestock.productId}
          description={
            viewingRestock.notes?.trim()
              ? viewingRestock.notes
              : 'Stock movement for this restock event.'
          }
          actions={
            <>
              {(() => {
                const product = products.find(
                  (p) => p.id === viewingRestock.productId,
                );
                if (!product) return null;
                return (
                  <button
                    type="button"
                    className="umkm-btn"
                    onClick={() => startRestock(product)}
                  >
                    Restock again
                  </button>
                );
              })()}
              <button
                type="button"
                className="umkm-btn secondary"
                onClick={closeView}
              >
                Close
              </button>
            </>
          }
        >
          <ViewSheetBody onClose={closeView}>
            {(() => {
              const product =
                products.find((p) => p.id === viewingRestock.productId) ??
                viewingRestock.product ??
                null;
              const pack = product ? getActivePack(product) : null;
              const u = unitShort(
                viewingRestock.unit ?? viewingRestock.unitSnapshot,
              );
              const packsBefore = formatPacksOnHand(
                viewingRestock.stockBefore,
                pack,
              );
              const packsAdded = formatPacksOnHand(
                viewingRestock.qtyAdded,
                pack,
              );
              const packsAfter = formatPacksOnHand(
                viewingRestock.stockAfter,
                pack,
              );
              return (
                <>
                  <ViewIdentity
                    contextLabel="Restock"
                    chips={
                      <>
                        <ViewChip>
                          {viewingRestock.restockDate?.slice(0, 10) ?? 'No date'}
                        </ViewChip>
                        {pack ? (
                          <ViewChip tone="accent">
                            Pack {pack.sizeLabel}
                          </ViewChip>
                        ) : (
                          <ViewChip>No pack</ViewChip>
                        )}
                        <ViewChip tone="added">
                          +{formatQty(viewingRestock.qtyAdded)} {u}
                          {packsAdded ? ` · ${packsAdded}` : ''}
                        </ViewChip>
                      </>
                    }
                    metricLabel="Stock after"
                    metricValue={
                      <>
                        {formatQty(viewingRestock.stockAfter)} {u}
                      </>
                    }
                    metricHint={
                      <>
                        From {formatQty(viewingRestock.stockBefore)}
                        {packsAfter ? ` · ${packsAfter}` : ''}
                      </>
                    }
                  />

                  {pack ? (
                    <ViewBlock
                      title="Pack"
                      description="Catalog pack used to read this restock."
                    >
                      <PackEconomicsStrip pack={pack} showHeader={false} />
                    </ViewBlock>
                  ) : null}

                  <ViewBlock
                    title="Stock movement"
                    description={
                      pack
                        ? 'How this restock changed on-hand quantity and packs.'
                        : 'How this restock changed on-hand quantity.'
                    }
                  >
                    <EconStrip
                      className="umkm-econ-strip-3"
                      label="Movement"
                      showHeader={false}
                      badge={pack?.sizeLabel ?? u}
                      ariaLabel="Stock movement"
                      tiles={[
                        {
                          key: 'before',
                          label: 'Before',
                          value: formatQty(viewingRestock.stockBefore),
                          sub: packsBefore ?? u,
                        },
                        {
                          key: 'added',
                          label: 'Added',
                          value: `+${formatQty(viewingRestock.qtyAdded)}`,
                          sub: packsAdded ? `+${packsAdded}` : u,
                          accent: 'added',
                        },
                        {
                          key: 'after',
                          label: 'After',
                          value: formatQty(viewingRestock.stockAfter),
                          sub: packsAfter ?? u,
                          accent: 'profit',
                        },
                      ]}
                    />
                  </ViewBlock>
                </>
              );
            })()}
          </ViewSheetBody>
        </ContentSection>
      ) : null}

      {formOpen ? (
        <ContentSection
          className="umkm-form-panel"
          eyebrow="Stock"
          title="Restock product"
          description="Restock by manual unit qty or by pack count."
        >
          <form onSubmit={onSubmit}>
            {(() => {
              const pack = selected ? getActivePack(selected) : null;
              const packModeAvailable = Boolean(pack);
              const entryMode =
                form.entryMode === 'PACK' && !packModeAvailable
                  ? 'QTY'
                  : form.entryMode;
              const qty = Number(form.qtyAdded) || 0;
              const packsAdded =
                pack != null
                  ? entryMode === 'PACK'
                    ? form.packsAdded
                    : (packsOnHand(qty, pack) ?? 0)
                  : 0;
              const stockAfter = selected ? selected.stockQty + qty : qty;
              const packsAfter = selected
                ? formatPacksOnHand(stockAfter, pack)
                : null;
              const packsNow = selected
                ? formatPacksOnHand(selected.stockQty, pack)
                : null;

              function setProductId(productId: string) {
                const next = products.find((p) => p.id === productId);
                const nextPack = next ? getActivePack(next) : null;
                const nextMode =
                  form.entryMode === 'PACK' && nextPack
                    ? 'PACK'
                    : nextPack && nextPack.size > 1
                      ? form.entryMode
                      : 'QTY';
                const mode =
                  nextMode === 'PACK' && !nextPack ? 'QTY' : nextMode;
                if (mode === 'PACK' && nextPack) {
                  const packs = form.packsAdded > 0 ? form.packsAdded : 1;
                  setForm({
                    ...form,
                    productId,
                    entryMode: 'PACK',
                    packsAdded: packs,
                    qtyAdded: qtyFromPackCount(packs, nextPack.size),
                  });
                  return;
                }
                const nextQty = form.qtyAdded > 0 ? form.qtyAdded : 1;
                setForm({
                  ...form,
                  productId,
                  entryMode: 'QTY',
                  qtyAdded: nextQty,
                  packsAdded: nextPack
                    ? (packsOnHand(nextQty, nextPack) ?? 0)
                    : 0,
                });
              }

              function setEntryMode(mode: RestockEntryMode) {
                if (mode === 'PACK' && !pack) return;
                if (mode === 'PACK' && pack) {
                  const packs =
                    form.packsAdded > 0
                      ? form.packsAdded
                      : (packsOnHand(form.qtyAdded, pack) ?? 1);
                  setForm({
                    ...form,
                    entryMode: 'PACK',
                    packsAdded: packs,
                    qtyAdded: qtyFromPackCount(packs, pack.size),
                  });
                  return;
                }
                setForm({
                  ...form,
                  entryMode: 'QTY',
                  packsAdded: pack
                    ? (packsOnHand(form.qtyAdded, pack) ?? 0)
                    : 0,
                });
              }

              return (
                <>
                  <FormSection
                    title="Restock details"
                    description="Enter stock by manual unit qty or by pack count. Both resolve to the same warehouse quantity."
                  >
                    <div className="umkm-grid two">
                      <div className="umkm-field">
                        <label>Product</label>
                        <select
                          value={form.productId}
                          onChange={(e) => setProductId(e.target.value)}
                          required
                        >
                          {products.map((p) => {
                            const pPack = getActivePack(p);
                            return (
                              <option key={p.id} value={p.id}>
                                {p.name} — {p.stockQty}{' '}
                                {unitLabel(p.unit).toLowerCase()}
                                {pPack ? ` · ${pPack.sizeLabel}` : ''}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                      <div className="umkm-field">
                        <label>Restock date</label>
                        <input
                          type="date"
                          value={form.restockDate}
                          onChange={(e) =>
                            setForm({ ...form, restockDate: e.target.value })
                          }
                          required
                        />
                      </div>

                      <div
                        className="umkm-field"
                        style={{ gridColumn: '1 / -1' }}
                      >
                        <label>Entry mode</label>
                        <OptionChips
                          aria-label="Restock entry mode"
                          value={entryMode}
                          onChange={(mode) => {
                            if (!mode) return;
                            setEntryMode(mode);
                          }}
                          options={[
                            { value: 'QTY', label: 'Manual qty' },
                            {
                              value: 'PACK',
                              label: pack
                                ? `By pack (${pack.sizeLabel})`
                                : 'By pack',
                              disabled: !packModeAvailable,
                              title: packModeAvailable
                                ? 'Add by catalog pack count'
                                : 'Product has no pack — set one in Products',
                            },
                          ]}
                        />
                      </div>

                      {entryMode === 'PACK' && pack ? (
                        <>
                          <div className="umkm-field">
                            <label>Packs to add</label>
                            <input
                              type="number"
                              min={0.0001}
                              step="0.0001"
                              value={form.packsAdded}
                              onChange={(e) => {
                                const packs = Number(e.target.value);
                                if (Number.isNaN(packs) || packs < 0) return;
                                setForm({
                                  ...form,
                                  entryMode: 'PACK',
                                  packsAdded: packs,
                                  qtyAdded: qtyFromPackCount(packs, pack.size),
                                });
                              }}
                              required
                            />
                          </div>
                          <div className="umkm-field">
                            <label>
                              Qty added ({unitShort(selected?.unit)})
                            </label>
                            <input
                              value={`${formatQty(qty)} ${unitShort(selected?.unit)} (= ${formatQty(form.packsAdded)} × ${pack.sizeLabel})`}
                              readOnly
                              disabled
                            />
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="umkm-field">
                            <label>
                              Qty to add
                              {selected
                                ? ` (${unitShort(selected.unit)})`
                                : ''}
                            </label>
                            <input
                              type="number"
                              min={0.0001}
                              step="0.0001"
                              value={form.qtyAdded}
                              onChange={(e) => {
                                const nextQty = Number(e.target.value);
                                setForm({
                                  ...form,
                                  entryMode: 'QTY',
                                  qtyAdded: nextQty,
                                  packsAdded: pack
                                    ? (packsOnHand(nextQty, pack) ?? 0)
                                    : 0,
                                });
                              }}
                              required
                            />
                          </div>
                          <div className="umkm-field">
                            <label>Pack equivalent</label>
                            <input
                              value={
                                pack
                                  ? `${formatQty(packsAdded)} × ${pack.sizeLabel}`
                                  : 'No pack on product'
                              }
                              readOnly
                              disabled
                            />
                          </div>
                        </>
                      )}

                      <div
                        className="umkm-field"
                        style={{ gridColumn: '1 / -1' }}
                      >
                        <label>Notes</label>
                        <input
                          value={form.notes}
                          onChange={(e) =>
                            setForm({ ...form, notes: e.target.value })
                          }
                          placeholder="Optional supplier or batch note"
                        />
                      </div>
                    </div>
                  </FormSection>

                  {selected ? (
                    <>
                      <FormSection
                        title="Catalog pack"
                        description="Sell, cost, profit, and margin for the active pack (read-only from Products)."
                      >
                        <PackEconomicsStrip pack={pack} />
                      </FormSection>

                      <div className="umkm-wh-restock-pack">
                        <div className="umkm-wh-kpis">
                          <div className="umkm-wh-kpi">
                            <span>On hand now</span>
                            <strong>
                              {formatQty(selected.stockQty)}{' '}
                              {unitShort(selected.unit)}
                            </strong>
                            {packsNow ? (
                              <em className="umkm-num-sub">{packsNow}</em>
                            ) : null}
                          </div>
                          <div className="umkm-wh-kpi">
                            <span>Adding</span>
                            <strong className="umkm-wh-added">
                              +{formatQty(qty)} {unitShort(selected.unit)}
                            </strong>
                            {pack && packsAdded > 0 ? (
                              <em className="umkm-num-sub">
                                +{formatQty(packsAdded)} × {pack.sizeLabel}
                              </em>
                            ) : null}
                          </div>
                          <div className="umkm-wh-kpi">
                            <span>Stock after</span>
                            <strong>
                              {formatQty(stockAfter)}{' '}
                              {unitShort(selected.unit)}
                            </strong>
                            {packsAfter ? (
                              <em className="umkm-num-sub">{packsAfter}</em>
                            ) : null}
                          </div>
                          <div className="umkm-wh-kpi">
                            <span>Margin</span>
                            <strong>
                              {selected.profitMarginPercent != null ? (
                                <MarginPill
                                  value={selected.profitMarginPercent}
                                />
                              ) : (
                                '—'
                              )}
                            </strong>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : null}
                </>
              );
            })()}
            <div className="umkm-actions">
              <button
                className="umkm-btn"
                type="submit"
                disabled={loading || !form.productId}
              >
                Save restock
              </button>
              <button
                className="umkm-btn secondary"
                type="button"
                onClick={resetForm}
              >
                Cancel
              </button>
            </div>
          </form>
        </ContentSection>
      ) : null}

      {!focusMode ? (
        <>
          <ContentSection
            eyebrow="Inventory"
            title="Stock on hand"
            description="Stock, active pack, and inventory value from catalog rates."
          >
            <div className="umkm-catalog-toolbar">
              <div className="umkm-field umkm-catalog-search">
                <label htmlFor="wh-search">Search</label>
                <input
                  id="wh-search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter by product name…"
                  autoComplete="off"
                />
              </div>
              <div
                className="umkm-catalog-filters"
                role="group"
                aria-label="Filter by unit"
              >
                {(
                  [
                    ['ALL', 'All'],
                    ['PCS', 'Pcs'],
                    ['GRAM', 'Gram'],
                    ['LITER', 'Liter'],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={`umkm-filter-chip${unitFilter === value ? ' is-active' : ''}`}
                    onClick={() => setUnitFilter(value)}
                    aria-pressed={unitFilter === value}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="umkm-catalog-count">
                {inventory.length} item{inventory.length === 1 ? '' : 's'}
              </p>
            </div>

            <div className="umkm-wh-kpis">
              <div className="umkm-wh-kpi">
                <span>Sell value</span>
                <strong>{formatMoney(totalPotentialRevenue)}</strong>
              </div>
              <div className="umkm-wh-kpi">
                <span>Cost value</span>
                <strong>
                  {productsWithCost > 0 ? formatMoney(totalPotentialCost) : '—'}
                </strong>
              </div>
              <div className="umkm-wh-kpi">
                <span>Profit</span>
                <strong>
                  {productsWithCost > 0
                    ? formatMoney(totalPotentialProfit)
                    : '—'}
                </strong>
              </div>
              <div className="umkm-wh-kpi">
                <span>Margin</span>
                <strong>
                  {inventoryMarginPercent != null ? (
                    <MarginPill value={inventoryMarginPercent} />
                  ) : (
                    '—'
                  )}
                </strong>
              </div>
            </div>

            {products.length === 0 ? (
              <EmptyState
                title="No inventory yet"
                description="Create products first, then add stock here to see inventory sell, cost, profit, and margin."
              />
            ) : inventory.length === 0 ? (
              <EmptyState
                title="No matches"
                description="Try another search or clear the unit filter."
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
                            onClick={() => toggleInvSort('name')}
                        data-dir={invSortMark('name')}
                          >
                            Product
                          </button>
                        </th>
                        <th>
                          <span className="umkm-th-label">Pack</span>
                        </th>
                        <th className="is-num">
                          <button
                            type="button"
                            className="umkm-th-sort"
                            onClick={() => toggleInvSort('stock')}
                        data-dir={invSortMark('stock')}
                          >
                            Stock
                          </button>
                        </th>
                        <th className="is-num">
                          <button
                            type="button"
                            className="umkm-th-sort"
                            onClick={() => toggleInvSort('sell')}
                        data-dir={invSortMark('sell')}
                          >
                            Sell value
                          </button>
                        </th>
                        <th className="is-num">
                          <button
                            type="button"
                            className="umkm-th-sort"
                            onClick={() => toggleInvSort('cost')}
                        data-dir={invSortMark('cost')}
                          >
                            Cost value
                          </button>
                        </th>
                        <th className="is-num">
                          <button
                            type="button"
                            className="umkm-th-sort"
                            onClick={() => toggleInvSort('profit')}
                        data-dir={invSortMark('profit')}
                          >
                            Profit
                          </button>
                        </th>
                        <th className="is-num">
                          <button
                            type="button"
                            className="umkm-th-sort"
                            onClick={() => toggleInvSort('margin')}
                        data-dir={invSortMark('margin')}
                          >
                            Margin
                          </button>
                        </th>
                        <th className="is-actions">
                          <span className="umkm-th-label">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventory.map((p) => {
                        const pack = getActivePack(p);
                        const packsLabel = formatPacksOnHand(p.stockQty, pack);
                        return (
                        <tr
                          key={p.id}
                          className="umkm-catalog-row"
                          tabIndex={0}
                          onClick={() => startViewProduct(p)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              startViewProduct(p);
                            }
                          }}
                        >
                          <td>
                            <div className="umkm-product-cell">
                              <span className="umkm-product-name">{p.name}</span>
                              <div className="umkm-product-meta">
                                <span className="umkm-badge sm">
                                  {unitLabel(p.unit)}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <PackChip pack={pack} />
                          </td>
                          <td className="is-num">
                            <div className="umkm-num-stack">
                              <span className="umkm-num">
                                {formatQty(p.stockQty)}
                              </span>
                              <span className="umkm-num-sub">
                                {packsLabel ?? unitShort(p.unit)}
                              </span>
                            </div>
                          </td>
                          <td className="is-num">
                            <MoneyCell value={p.potentialRevenue} />
                          </td>
                          <td className="is-num">
                            <MoneyCell value={p.potentialCost} />
                          </td>
                          <td className="is-num">
                            <MoneyCell value={p.potentialProfit} />
                          </td>
                          <td className="is-num">
                            <MarginPill value={p.profitMarginPercent} />
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
                                aria-label={`View ${p.name}`}
                                onClick={() => startViewProduct(p)}
                              >
                                <IconView />
                              </button>
                              <button
                                className="umkm-icon-btn"
                                type="button"
                                title="Restock"
                                aria-label={`Restock ${p.name}`}
                                onClick={() => startRestock(p)}
                              >
                                <IconRestock />
                              </button>
                            </div>
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <ul className="umkm-catalog-cards umkm-wh-cards">
                  {inventory.map((p) => {
                    const pack = getActivePack(p);
                    const packsLabel = formatPacksOnHand(p.stockQty, pack);
                    return (
                    <li key={p.id} className="umkm-catalog-card">
                      <button
                        type="button"
                        className="umkm-catalog-card-main"
                        onClick={() => startViewProduct(p)}
                      >
                        <div className="umkm-catalog-card-identity">
                          <span className="umkm-product-name">{p.name}</span>
                          <div className="umkm-product-meta">
                            <span className="umkm-badge sm">
                              {unitLabel(p.unit)}
                            </span>
                            <PackChip pack={pack} />
                          </div>
                          <div className="umkm-catalog-card-details">
                            <span>
                              {formatQty(p.stockQty)} {unitShort(p.unit)}
                              {packsLabel ? ` on hand` : ''}
                            </span>
                            {packsLabel ? <span>{packsLabel}</span> : null}
                          </div>
                        </div>
                        <div className="umkm-catalog-card-metrics">
                          <div>
                            <span>Sell</span>
                            <strong>{formatMoney(p.potentialRevenue)}</strong>
                          </div>
                          <div>
                            <span>Cost</span>
                            <strong>
                              {p.potentialCost != null
                                ? formatMoney(p.potentialCost)
                                : '—'}
                            </strong>
                          </div>
                          <div>
                            <span>Profit</span>
                            <strong>
                              {p.potentialProfit != null
                                ? formatMoney(p.potentialProfit)
                                : '—'}
                            </strong>
                          </div>
                          <div>
                            <span>Margin</span>
                            <strong>
                              {p.profitMarginPercent != null
                                ? formatMarginPercent(p.profitMarginPercent)
                                : '—'}
                            </strong>
                          </div>
                        </div>
                      </button>
                      <div className="umkm-row-actions umkm-icon-actions">
                        <button
                          className="umkm-icon-btn"
                          type="button"
                          title="View"
                          aria-label={`View ${p.name}`}
                          onClick={() => startViewProduct(p)}
                        >
                          <IconView />
                        </button>
                        <button
                          className="umkm-icon-btn"
                          type="button"
                          title="Restock"
                          aria-label={`Restock ${p.name}`}
                          onClick={() => startRestock(p)}
                        >
                          <IconRestock />
                        </button>
                      </div>
                    </li>
                    );
                  })}
                </ul>
              </>
            )}
          </ContentSection>

          <ContentSection
            eyebrow="History"
            title="Restock history"
            description="Stock additions with before → after quantities."
          >
            {history.length === 0 ? (
              <EmptyState
                title="No restocks yet"
                description="Add stock to a product to start your warehouse history."
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
                            onClick={() => toggleHistSort('date')}
                        data-dir={histSortMark('date')}
                          >
                            Date
                          </button>
                        </th>
                        <th>
                          <button
                            type="button"
                            className="umkm-th-sort"
                            onClick={() => toggleHistSort('product')}
                        data-dir={histSortMark('product')}
                          >
                            Product
                          </button>
                        </th>
                        <th className="is-num">
                          <button
                            type="button"
                            className="umkm-th-sort"
                            onClick={() => toggleHistSort('qty')}
                        data-dir={histSortMark('qty')}
                          >
                            Added
                          </button>
                        </th>
                        <th className="is-num">
                          <button
                            type="button"
                            className="umkm-th-sort"
                            onClick={() => toggleHistSort('after')}
                        data-dir={histSortMark('after')}
                          >
                            Stock
                          </button>
                        </th>
                        <th>Notes</th>
                        <th className="is-actions">
                          <span className="umkm-th-label">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((r) => {
                        const u = unitShort(r.unit ?? r.unitSnapshot);
                        return (
                          <tr
                            key={r.id}
                            className="umkm-catalog-row"
                            tabIndex={0}
                            onClick={() => startViewRestock(r)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                startViewRestock(r);
                              }
                            }}
                          >
                            <td>
                              <span className="umkm-num">
                                {r.restockDate?.slice(0, 10) ?? '—'}
                              </span>
                            </td>
                            <td>
                              <span className="umkm-product-name">
                                {r.product?.name ?? r.productId}
                              </span>
                            </td>
                            <td className="is-num">
                              <span className="umkm-num umkm-wh-added">
                                +{formatQty(r.qtyAdded)} {u}
                              </span>
                            </td>
                            <td className="is-num">
                              <div className="umkm-num-stack">
                                <span className="umkm-num">
                                  {formatQty(r.stockAfter)} {u}
                                </span>
                                <span className="umkm-num-sub">
                                  from {formatQty(r.stockBefore)}
                                </span>
                              </div>
                            </td>
                            <td>
                              <span className="umkm-product-details">
                                {r.notes || '—'}
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
                                  aria-label="View restock"
                                  onClick={() => startViewRestock(r)}
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

                <ul className="umkm-catalog-cards umkm-wh-cards">
                  {history.map((r) => {
                    const u = unitShort(r.unit ?? r.unitSnapshot);
                    return (
                      <li key={r.id} className="umkm-catalog-card">
                        <button
                          type="button"
                          className="umkm-catalog-card-main"
                          onClick={() => startViewRestock(r)}
                        >
                          <div className="umkm-catalog-card-identity">
                            <span className="umkm-product-name">
                              {r.product?.name ?? r.productId}
                            </span>
                            <div className="umkm-product-meta">
                              <span className="umkm-wh-added">
                                +{formatQty(r.qtyAdded)} {u}
                              </span>
                            </div>
                            <div className="umkm-catalog-card-details">
                              <span>
                                {r.restockDate?.slice(0, 10) ?? '—'}
                              </span>
                              {r.notes ? <span>{r.notes}</span> : null}
                            </div>
                          </div>
                          <div className="umkm-catalog-card-metrics">
                            <div>
                              <span>Before</span>
                              <strong>
                                {formatQty(r.stockBefore)} {u}
                              </strong>
                            </div>
                            <div>
                              <span>After</span>
                              <strong>
                                {formatQty(r.stockAfter)} {u}
                              </strong>
                            </div>
                          </div>
                        </button>
                        <div className="umkm-row-actions umkm-icon-actions">
                          <button
                            className="umkm-icon-btn"
                            type="button"
                            title="View"
                            aria-label="View restock"
                            onClick={() => startViewRestock(r)}
                          >
                            <IconView />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </ContentSection>
        </>
      ) : null}
    </section>
  );
}
