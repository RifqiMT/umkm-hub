'use client';

import { FormEvent, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { api, ApiError } from '@/lib/api';
import { dedupeById } from '@/lib/dedupe-by-id';
import {
  ContentSection,
  EmptyState,
  FieldLabel,
  FormSection,
  PageHeader,
} from '@/components/PageHeader';
import { WarehouseStatisticsSection } from '@/app/(app)/warehouse/WarehouseStatisticsSection';
import { WarehouseSoldHistorySection } from '@/app/(app)/warehouse/WarehouseSoldHistorySection';
import { ListPager } from '@/components/ListPager';
import type { ListPageSize } from '@/lib/list-page-size';
import { ViewBlock, ViewChip, ViewIdentity, ViewSheetBody } from '@/components/ViewSheet';
import { OptionChips } from '@/components/OptionChips';
import { MultiSelectFilter } from '@/components/MultiSelectFilter';
import { CollapsibleFilters } from '@/components/CollapsibleFilters';
import {
  FeatureDataTransfer,
  FeatureDataTransferToggle,
} from '@/components/FeatureDataTransfer';
import { FeatureStage } from '@/components/FeatureStage';
import { PRODUCT_UNITS, todayDateInput } from '@/lib/enums';
import { useLabels } from '@/hooks/useLabels';
import {
  formatPacksOnHand,
  getActivePack,
  packEconomics,
  packsOnHand,
  qtyFromPackCount,
  type ActivePack,
} from '@/lib/product-pack';
import {
  COST_SET_FILTER_OPTIONS,
  PACK_READY_FILTER_OPTIONS,
  STOCK_STATUS_FILTER_OPTIONS,
} from '@/lib/product-readiness';
import type {
  Paginated,
  Product,
  WarehouseRestock,
  WarehouseSummary,
} from '@/lib/types';
import {
  formatMoney,
  formatMoneyParts,
  formatCompactQty,
  formatMoneyExact,
} from '@/lib/format-money';

type ProductUnitValue = (typeof PRODUCT_UNITS)[number];
type InvSortKey = 'name' | 'stock' | 'sell' | 'cost' | 'profit' | 'margin';
type HistSortKey = 'date' | 'product' | 'qty' | 'after';
type SortDir = 'asc' | 'desc';
type RestockEntryMode = 'QTY' | 'PACK';

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

function IconEdit() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 20h4.5L19 9.5 14.5 5 4 15.5V20Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path d="M12.5 7.5 16.5 11.5" stroke="currentColor" strokeWidth="1.75" />
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

function formFromRestock(
  restock: WarehouseRestock,
  product?: Product | null,
): RestockForm {
  const p = product ?? restock.product ?? undefined;
  const pack = p ? getActivePack(p) : null;
  const qtyAdded = restock.qtyAdded;
  const packsFromQty = pack ? packsOnHand(qtyAdded, pack) ?? 0 : 0;
  const entryMode =
    pack && pack.size > 1 && packsFromQty > 0 ? 'PACK' : 'QTY';
  return {
    productId: restock.productId,
    qtyAdded,
    packsAdded: entryMode === 'PACK' ? packsFromQty || 1 : packsFromQty,
    restockDate: restock.restockDate?.slice(0, 10) ?? todayDateInput(),
    notes: restock.notes ?? '',
    entryMode,
  };
}

export default function WarehousePage() {
  const { productUnit } = useLabels();
  const unitLabel = (unit?: string) => {
    if (!unit) return '';
    return productUnit[unit as keyof typeof productUnit] ?? unit;
  };
  const [items, setItems] = useState<WarehouseRestock[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [summary, setSummary] = useState<WarehouseSummary | null>(null);
  const [form, setForm] = useState<RestockForm>(emptyForm());
  const [formOpen, setFormOpen] = useState(false);
  const [editingRestockId, setEditingRestockId] = useState<string | null>(null);
  const [dataSyncOpen, setDataSyncOpen] = useState(false);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [viewingRestock, setViewingRestock] =
    useState<WarehouseRestock | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [invPage, setInvPage] = useState(1);
  const [invPageSize, setInvPageSize] = useState<ListPageSize>(20);
  const [listMeta, setListMeta] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  });
  const [histPage, setHistPage] = useState(1);
  const [histPageSize, setHistPageSize] = useState<ListPageSize>(20);
  const [histMeta, setHistMeta] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  });
  const [histLoading, setHistLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [unitFilters, setUnitFilters] = useState<string[]>([]);
  const [stockStatusFilters, setStockStatusFilters] = useState<string[]>([]);
  const [costSetFilters, setCostSetFilters] = useState<string[]>([]);
  const [packReadyFilters, setPackReadyFilters] = useState<string[]>([]);
  const [invSortKey, setInvSortKey] = useState<InvSortKey>('name');
  const [invSortDir, setInvSortDir] = useState<SortDir>('asc');
  const [histSortKey, setHistSortKey] = useState<HistSortKey>('date');
  const [histSortDir, setHistSortDir] = useState<SortDir>('desc');
  const invLoadSeq = useRef(0);
  const histLoadSeq = useRef(0);

  const selected = products.find((p) => p.id === form.productId);
  const editingRestock = editingRestockId
    ? items.find((r) => r.id === editingRestockId) ?? null
    : null;

  const inventory = useMemo(() => {
    // Products are already filter-scoped by the API; only sort locally.
    return [...products].sort((a, b) => {
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
  }, [products, invSortKey, invSortDir]);

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

  async function loadSummary(searchTerm = debouncedSearch) {
    const filterParams = {
      search: searchTerm.trim() || undefined,
      unit: unitFilters.length > 0 ? unitFilters : undefined,
      stockStatus:
        stockStatusFilters.length > 0 ? stockStatusFilters : undefined,
      costSet: costSetFilters.length > 0 ? costSetFilters : undefined,
      packReady: packReadyFilters.length > 0 ? packReadyFilters : undefined,
    };
    try {
      const warehouseSummary = await api<WarehouseSummary>('/warehouse/summary', {
        searchParams: filterParams,
      });
      setSummary(warehouseSummary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load warehouse');
    }
  }

  async function loadInventory(searchTerm = debouncedSearch, nextPage = invPage) {
    const seq = ++invLoadSeq.current;
    setListLoading(true);
    const filterParams = {
      search: searchTerm.trim() || undefined,
      unit: unitFilters.length > 0 ? unitFilters : undefined,
      stockStatus:
        stockStatusFilters.length > 0 ? stockStatusFilters : undefined,
      costSet: costSetFilters.length > 0 ? costSetFilters : undefined,
      packReady: packReadyFilters.length > 0 ? packReadyFilters : undefined,
    };
    try {
      const productList = await api<Paginated<Product>>('/products', {
        searchParams: {
          ...filterParams,
          page: nextPage,
          limit: invPageSize,
        },
      });
      if (seq !== invLoadSeq.current) return;
      setProducts(productList.items);
      setListMeta(productList.meta);
      setInvPage(productList.meta.page);
      setError('');
    } catch (err) {
      if (seq !== invLoadSeq.current) return;
      setError(err instanceof Error ? err.message : 'Failed to load warehouse');
    } finally {
      if (seq === invLoadSeq.current) setListLoading(false);
    }
  }

  /** Restock history is search-scoped only — skip on unit/stock filter changes. */
  async function loadRestocks(searchTerm = debouncedSearch, nextPage = histPage) {
    const seq = ++histLoadSeq.current;
    setHistLoading(true);
    try {
      const restocks = await api<Paginated<WarehouseRestock>>('/warehouse', {
        searchParams: {
          page: nextPage,
          limit: histPageSize,
          search: searchTerm.trim() || undefined,
        },
      });
      if (seq !== histLoadSeq.current) return;
      setItems(dedupeById(restocks.items));
      setHistMeta(restocks.meta);
      setHistPage(restocks.meta.page);
    } catch (err) {
      if (seq !== histLoadSeq.current) return;
      setError(err instanceof Error ? err.message : 'Failed to load warehouse');
    } finally {
      if (seq === histLoadSeq.current) setHistLoading(false);
    }
  }

  async function reloadAll(searchTerm = debouncedSearch) {
    await Promise.all([
      loadSummary(searchTerm),
      loadInventory(searchTerm, invPage),
      loadRestocks(searchTerm, histPage),
    ]);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search);
      setInvPage(1);
      setHistPage(1);
    }, 280);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    void loadSummary(debouncedSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, unitFilters, stockStatusFilters, costSetFilters, packReadyFilters]);

  useEffect(() => {
    void loadInventory(debouncedSearch, invPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invPage, invPageSize, debouncedSearch, unitFilters, stockStatusFilters, costSetFilters, packReadyFilters]);

  useEffect(() => {
    void loadRestocks(debouncedSearch, histPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [histPage, histPageSize, debouncedSearch]);

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
    setEditingRestockId(null);
    setForm(emptyForm(products[0]));
    setFormOpen(true);
  }

  function startRestock(product: Product) {
    setViewingProduct(null);
    setViewingRestock(null);
    setEditingRestockId(null);
    setForm(emptyForm(product));
    setFormOpen(true);
  }

  function startEditRestock(restock: WarehouseRestock) {
    const product =
      products.find((p) => p.id === restock.productId) ?? restock.product ?? null;
    setViewingProduct(null);
    setViewingRestock(null);
    setEditingRestockId(restock.id);
    setForm(formFromRestock(restock, product));
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
    setEditingRestockId(null);
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
      const body = {
        qtyAdded: form.qtyAdded,
        restockDate: form.restockDate,
        notes: form.notes.trim() || undefined,
      };
      if (editingRestockId) {
        await api(`/warehouse/${editingRestockId}`, {
          method: 'PATCH',
          body,
        });
      } else {
        await api('/warehouse', {
          method: 'POST',
          body: {
            productId: form.productId,
            ...body,
          },
        });
      }
      resetForm();
      await reloadAll();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Restock failed');
    } finally {
      setLoading(false);
    }
  }

  const focusMode = formOpen || Boolean(viewingProduct) || Boolean(viewingRestock);
  const filtersActive =
    debouncedSearch.trim().length > 0 ||
    unitFilters.length > 0 ||
    stockStatusFilters.length > 0 ||
    costSetFilters.length > 0 ||
    packReadyFilters.length > 0;
  const stageSummary = summary;
  const statisticsLoading = listLoading && !stageSummary?.statistics;
  const pulseSell = stageSummary
    ? formatMoneyParts(stageSummary.inventorySellValue)
    : null;
  const pulseCost = stageSummary
    ? formatMoneyParts(stageSummary.inventoryCostValue)
    : null;
  const pulseProfit = stageSummary
    ? formatMoneyParts(stageSummary.inventoryProfitValue)
    : null;

  return (
    <section>
      {!focusMode ? (
        <>
        <FeatureStage
          title="Warehouse"
          loading={listLoading && !stageSummary}
          subtitle={
            stageSummary
              ? filtersActive
                ? 'Filtered inventory value and stock health'
                : 'Inventory value and restock health'
              : 'Track stock by pack, inventory value, and restocks.'
          }
          action={
            <>
              <FeatureDataTransferToggle
                open={dataSyncOpen}
                controlsId="feature-sync-warehouse"
                onClick={() => setDataSyncOpen((open) => !open)}
              />
              <button
                type="button"
                className="umkm-btn"
                onClick={startCreate}
                disabled={products.length === 0}
              >
                Add restock
              </button>
            </>
          }
          stats={[
            {
              label: 'Sell value',
              hero: true,
              tip: {
                value: stageSummary
                  ? formatMoneyExact(stageSummary.inventorySellValue)
                  : undefined,
                description:
                  'What on-hand stock would sell for at catalog prices.',
              },
              value: pulseSell ? (
                <>
                  <b>{pulseSell.figure}</b>
                  {pulseSell.unit ? <small>{pulseSell.unit}</small> : null}
                </>
              ) : (
                <b>···</b>
              ),
            },
            {
              label: 'Cost value',
              tip: {
                value: stageSummary
                  ? formatMoneyExact(stageSummary.inventoryCostValue)
                  : undefined,
                description: 'Estimated cost of the stock you currently hold.',
              },
              value: pulseCost ? (
                <>
                  <b>{pulseCost.figure}</b>
                  {pulseCost.unit ? <small>{pulseCost.unit}</small> : null}
                </>
              ) : (
                <b>···</b>
              ),
            },
            {
              label: 'Profit',
              tip: {
                value: stageSummary
                  ? formatMoneyExact(stageSummary.inventoryProfitValue)
                  : undefined,
                description:
                  'Potential profit if on-hand stock sold at list price.',
              },
              value: pulseProfit ? (
                <>
                  <b>{pulseProfit.figure}</b>
                  {pulseProfit.unit ? <small>{pulseProfit.unit}</small> : null}
                </>
              ) : (
                <b>···</b>
              ),
            },
          ]}
          ratesLabel="Warehouse rates"
          rates={[
            {
              tone: 'tone-margin',
              label: 'Margin',
              tip: {
                description:
                  'Inventory profit margin when unit cost is available.',
                detail: 'Profit ÷ sell value on SKUs with cost',
              },
              value: stageSummary?.profitMarginRate,
            },
            {
              tone: 'tone-discount',
              label: 'Cost set',
              tip: {
                description: 'Share of SKUs that have a unit cost filled in.',
                detail: 'SKUs with cost ÷ products in view',
              },
              value: stageSummary?.costCoverageRate,
            },
            {
              tone: 'tone-paid',
              label: 'In stock',
              tip: {
                description: 'Share of products that still have stock on hand.',
                detail: 'In-stock SKUs ÷ products in view',
              },
              value: stageSummary?.inStockRate,
            },
            {
              tone: 'tone-cancel',
              label: 'Out of stock',
              tip: {
                description: 'Share of products with zero stock left.',
                detail: 'Out-of-stock SKUs ÷ products in view',
              },
              value: stageSummary?.outOfStockRate,
            },
          ]}
        />
        {dataSyncOpen ? (
          <FeatureDataTransfer
            entity="warehouse"
            label="Warehouse"
            onImported={() => void reloadAll()}
          />
        ) : null}
        </>
      ) : (
        <PageHeader
          title="Warehouse"
          description="Track on-hand stock by pack, inventory value, restocks, and sales drawn by orders."
        />
      )}
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
              const packsCount = packsOnHand(
                viewingProduct.stockQty,
                pack,
              );
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
                        {formatMoney(viewingProduct.stockQty)}{' '}
                        {unitShort(viewingProduct.unit)}
                      </>
                    }
                    metricHint={
                      pack && packsCount != null ? (
                        <>
                          Packs in stock:{' '}
                          <strong>{formatMoney(packsCount)}</strong>
                          {` × ${pack.sizeLabel}`}
                        </>
                      ) : (
                        'Current warehouse stock'
                      )
                    }
                  />

                  <ViewBlock
                    title="Pack"
                    description={
                      packsLabel
                        ? `${packsLabel} on hand · catalog rates below.`
                        : 'Catalog selling pack with unit rates packed underneath.'
                    }
                  >
                    {pack && packsCount != null ? (
                      <p className="umkm-wh-packs-in-stock">
                        <span className="umkm-view-metric-label">
                          Packs in stock
                        </span>
                        <strong>
                          {formatMoney(packsCount)}
                          <em>
                            {' '}
                            packs of {pack.sizeLabel}
                          </em>
                        </strong>
                      </p>
                    ) : null}
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
                        `${formatCompactQty(viewingProduct.stockQty)} ${unitShort(viewingProduct.unit)}`
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
                onClick={() => startEditRestock(viewingRestock)}
              >
                Edit
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
                          +{formatCompactQty(viewingRestock.qtyAdded)} {u}
                          {packsAdded ? ` · ${packsAdded}` : ''}
                        </ViewChip>
                      </>
                    }
                    metricLabel="Stock after"
                    metricValue={
                      <>
                        {formatCompactQty(viewingRestock.stockAfter)} {u}
                      </>
                    }
                    metricHint={
                      <>
                        From {formatCompactQty(viewingRestock.stockBefore)}
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
                          value: formatCompactQty(viewingRestock.stockBefore),
                          sub: packsBefore ?? u,
                        },
                        {
                          key: 'added',
                          label: 'Added',
                          value: `+${formatCompactQty(viewingRestock.qtyAdded)}`,
                          sub: packsAdded ? `+${packsAdded}` : u,
                          accent: 'added',
                        },
                        {
                          key: 'after',
                          label: 'After',
                          value: formatCompactQty(viewingRestock.stockAfter),
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
          title={editingRestockId ? 'Edit restock' : 'Restock product'}
          description={
            editingRestockId
              ? 'Update quantity, date, or notes. Product stays fixed; stock adjusts automatically.'
              : 'Restock by manual unit qty or by pack count.'
          }
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
              const stockAfter = editingRestock
                ? editingRestock.stockBefore + qty
                : selected
                  ? selected.stockQty + qty
                  : qty;
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
                        <FieldLabel>Product</FieldLabel>
                        {editingRestockId ? (
                          <input
                            value={
                              selected
                                ? `${selected.name} — ${formatCompactQty(selected.stockQty)} ${unitLabel(selected.unit).toLowerCase()}`
                                : form.productId
                            }
                            readOnly
                            aria-readonly
                          />
                        ) : (
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
                        )}
                      </div>
                      <div className="umkm-field">
                        <FieldLabel>Restock date</FieldLabel>
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
                        <FieldLabel>Entry mode</FieldLabel>
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
                            <FieldLabel>Packs to add</FieldLabel>
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
                            <FieldLabel>
                              Qty added ({unitShort(selected?.unit)})
                            </FieldLabel>
                            <input
                              value={`${formatCompactQty(qty)} ${unitShort(selected?.unit)} (= ${formatCompactQty(form.packsAdded)} × ${pack.sizeLabel})`}
                              readOnly
                              disabled
                            />
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="umkm-field">
                            <FieldLabel>
                              Qty to add
                              {selected
                                ? ` (${unitShort(selected.unit)})`
                                : ''}
                            </FieldLabel>
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
                            <FieldLabel>Pack equivalent</FieldLabel>
                            <input
                              value={
                                pack
                                  ? `${formatCompactQty(packsAdded)} × ${pack.sizeLabel}`
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
                        <FieldLabel>Notes</FieldLabel>
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
                              {formatCompactQty(selected.stockQty)}{' '}
                              {unitShort(selected.unit)}
                            </strong>
                            {packsNow ? (
                              <em className="umkm-num-sub">{packsNow}</em>
                            ) : null}
                          </div>
                          <div className="umkm-wh-kpi">
                            <span>Adding</span>
                            <strong className="umkm-wh-added">
                              +{formatCompactQty(qty)} {unitShort(selected.unit)}
                            </strong>
                            {pack && packsAdded > 0 ? (
                              <em className="umkm-num-sub">
                                +{formatCompactQty(packsAdded)} × {pack.sizeLabel}
                              </em>
                            ) : null}
                          </div>
                          <div className="umkm-wh-kpi">
                            <span>Stock after</span>
                            <strong>
                              {formatCompactQty(stockAfter)}{' '}
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
                {editingRestockId ? 'Update restock' : 'Save restock'}
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
            description="On-hand stock, active pack, and inventory value from catalog rates."
      >
            <div className="umkm-catalog-toolbar">
              <div className="umkm-field umkm-catalog-search">
                <FieldLabel htmlFor="wh-search">Search</FieldLabel>
                <input
                  id="wh-search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter by product name…"
                  autoComplete="off"
                />
              </div>
              <CollapsibleFilters
                activeCount={
                  (unitFilters.length > 0 ? 1 : 0) +
                  (stockStatusFilters.length > 0 ? 1 : 0) +
                  (costSetFilters.length > 0 ? 1 : 0) +
                  (packReadyFilters.length > 0 ? 1 : 0)
                }
              >
                <MultiSelectFilter
                  id="warehouse-unit-filter"
                  label="Unit"
                  allLabel="All units"
                  value={unitFilters}
                  onChange={(next) => {
                    setUnitFilters(next);
                    setInvPage(1);
                  }}
                  options={PRODUCT_UNITS.map((unit) => ({
                    value: unit,
                    label: unitLabel(unit),
                  }))}
                />
                <MultiSelectFilter
                  id="warehouse-stock-status-filter"
                  label="Stock"
                  allLabel="Any stock"
                  value={stockStatusFilters}
                  onChange={(next) => {
                    setStockStatusFilters(next);
                    setInvPage(1);
                  }}
                  options={STOCK_STATUS_FILTER_OPTIONS.map((option) => ({
                    value: option.value,
                    label: option.label,
                  }))}
                />
                <MultiSelectFilter
                  id="warehouse-cost-set-filter"
                  label="Cost set"
                  allLabel="Any cost"
                  value={costSetFilters}
                  onChange={(next) => {
                    setCostSetFilters(next);
                    setInvPage(1);
                  }}
                  options={COST_SET_FILTER_OPTIONS.map((option) => ({
                    value: option.value,
                    label: option.label,
                  }))}
                />
                <MultiSelectFilter
                  id="warehouse-pack-ready-filter"
                  label="Pack ready"
                  allLabel="Any pack status"
                  value={packReadyFilters}
                  onChange={(next) => {
                    setPackReadyFilters(next);
                    setInvPage(1);
                  }}
                  options={PACK_READY_FILTER_OPTIONS.map((option) => ({
                    value: option.value,
                    label: option.label,
                  }))}
                />
              </CollapsibleFilters>
              <p className="umkm-catalog-count">
                {listLoading
                  ? 'Loading…'
                    : listMeta.total === 0
                      ? filtersActive
                        ? 'No matches'
                        : 'No inventory yet'
                      : products.length >= listMeta.total
                        ? `Showing all ${listMeta.total.toLocaleString('en-US')} items`
                        : `Showing ${(listMeta.page - 1) * listMeta.limit + 1}–${Math.min(listMeta.page * listMeta.limit, listMeta.total)} of ${listMeta.total.toLocaleString('en-US')}`}
              </p>
            </div>

            {listLoading && inventory.length === 0 ? null : listMeta.total === 0 ? (
              <EmptyState
                title={filtersActive ? 'No matches' : 'No inventory yet'}
                description={
                  filtersActive
                    ? 'Try another search or clear the filters.'
                    : 'Create products first, then add stock here to see inventory sell, cost, profit, and margin.'
                }
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
                                {formatMoney(p.stockQty)}{' '}
                                {unitShort(p.unit)}
                              </span>
                              <span className="umkm-num-sub">
                                {packsLabel
                                  ? packsLabel
                                  : unitShort(p.unit)}
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
                              {formatMoney(p.stockQty)} {unitShort(p.unit)} on
                              hand
                            </span>
                            {packsLabel ? (
                              <span>Packs in stock · {packsLabel}</span>
                            ) : null}
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
                <ListPager
                  ariaLabel="Inventory pages"
                  page={listMeta.page}
                  totalPages={listMeta.totalPages}
                  total={listMeta.total}
                  loading={listLoading}
                  pageSize={invPageSize}
                  onPageSizeChange={(size) => {
                    setInvPageSize(size);
                    setInvPage(1);
                  }}
                  onPrev={() => setInvPage((p) => Math.max(1, p - 1))}
                  onNext={() =>
                    setInvPage((p) => Math.min(listMeta.totalPages, p + 1))
                  }
                />
              </>
            )}
          </ContentSection>

          <ContentSection
            eyebrow="History"
            title="Restock history"
            description="Review stock additions, including quantity before and after each restock and pack equivalents."
          >
            {histLoading && history.length === 0 ? null : histMeta.total === 0 ? (
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
                        const pack = r.product ? getActivePack(r.product) : null;
                        const packsAdded = formatPacksOnHand(r.qtyAdded, pack);
                        const packsBefore = formatPacksOnHand(
                          r.stockBefore,
                          pack,
                        );
                        const packsAfter = formatPacksOnHand(
                          r.stockAfter,
                          pack,
                        );
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
                              <div className="umkm-num-stack" style={{ alignItems: 'flex-start' }}>
                                <span className="umkm-product-name">
                                  {r.product?.name ?? r.productId}
                                </span>
                                {pack ? (
                                  <span className="umkm-num-sub">
                                    Pack {pack.sizeLabel}
                                  </span>
                                ) : null}
                              </div>
                            </td>
                            <td className="is-num">
                              <div className="umkm-num-stack">
                                <span className="umkm-num umkm-wh-added">
                                  +{formatCompactQty(r.qtyAdded)} {u}
                                </span>
                                {packsAdded ? (
                                  <span className="umkm-num-sub">
                                    +{packsAdded}
                                  </span>
                                ) : null}
                              </div>
                            </td>
                            <td className="is-num">
                              <div className="umkm-num-stack">
                                <span className="umkm-num">
                                  {formatCompactQty(r.stockAfter)} {u}
                                </span>
                                <span className="umkm-num-sub">
                                  from {formatCompactQty(r.stockBefore)}
                                  {packsAfter
                                    ? ` · ${packsAfter}`
                                    : packsBefore
                                      ? ` · was ${packsBefore}`
                                      : ''}
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
                                  title="Edit"
                                  aria-label="Edit restock"
                                  onClick={() => startEditRestock(r)}
                                >
                                  <IconEdit />
                                </button>
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
                    const pack = r.product ? getActivePack(r.product) : null;
                    const packsAdded = formatPacksOnHand(r.qtyAdded, pack);
                    const packsBefore = formatPacksOnHand(r.stockBefore, pack);
                    const packsAfter = formatPacksOnHand(r.stockAfter, pack);
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
                                +{formatCompactQty(r.qtyAdded)} {u}
                              </span>
                              {pack ? (
                                <span className="umkm-pack-size">
                                  Pack {pack.sizeLabel}
                                </span>
                              ) : null}
                            </div>
                            <div className="umkm-catalog-card-details">
                              <span>
                                {r.restockDate?.slice(0, 10) ?? '—'}
                              </span>
                              {packsAdded ? (
                                <span>Added {packsAdded}</span>
                              ) : null}
                              {r.notes ? <span>{r.notes}</span> : null}
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
                            title="Edit"
                            aria-label="Edit restock"
                            onClick={() => startEditRestock(r)}
                          >
                            <IconEdit />
                          </button>
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
                <ListPager
                  ariaLabel="Restock history pages"
                  page={histMeta.page}
                  totalPages={histMeta.totalPages}
                  total={histMeta.total}
                  loading={histLoading}
                  pageSize={histPageSize}
                  onPageSizeChange={(size) => {
                    setHistPageSize(size);
                    setHistPage(1);
                  }}
                  onPrev={() => setHistPage((p) => Math.max(1, p - 1))}
                  onNext={() =>
                    setHistPage((p) => Math.min(histMeta.totalPages, p + 1))
                  }
                />
              </>
            )}
          </ContentSection>

          <WarehouseSoldHistorySection search={debouncedSearch} />

          <ContentSection eyebrow="Statistics" quiet>
            <WarehouseStatisticsSection
              statistics={stageSummary?.statistics}
              productCount={stageSummary?.productCount ?? 0}
              loading={statisticsLoading}
            />
          </ContentSection>
        </>
      ) : null}
    </section>
  );
}
