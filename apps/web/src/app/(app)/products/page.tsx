'use client';

import { FormEvent, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { api, ApiError } from '@/lib/api';
import { dedupeById } from '@/lib/dedupe-by-id';
import { confirmDelete } from '@/lib/confirm';
import { ContentSection, EmptyState, FieldLabel, FormSection, PageHeader } from '@/components/PageHeader';
import { ProductStatisticsSection } from '@/app/(app)/products/ProductStatisticsSection';
import {
  ProductStockSalesPerformanceView,
  ProductStockSalesSection,
} from '@/app/(app)/products/ProductStockSalesSection';
import { ListPager } from '@/components/ListPager';
import type { ListPageSize } from '@/lib/list-page-size';
import { OptionSelect } from '@/components/OptionSelect';
import { MultiSelectFilter } from '@/components/MultiSelectFilter';
import { CollapsibleFilters } from '@/components/CollapsibleFilters';
import {
  FeatureDataTransfer,
  FeatureDataTransferToggle,
} from '@/components/FeatureDataTransfer';
import { FeatureStage } from '@/components/FeatureStage';
import { ViewBlock, ViewChip, ViewIdentity, ViewSheetBody } from '@/components/ViewSheet';
import { EntityIdBadge, EntityIdDetail } from '@/components/EntityId';
import {
  PRODUCT_UNITS,
} from '@/lib/enums';
import type {
  Paginated,
  Product,
  ProductStockSales,
  ProductSummary,
} from '@/lib/types';
import { useLabels } from '@/hooks/useLabels';
import {
  formatCompactQtyParts,
  formatMoney,
  formatMoneyParts,
  formatQty,
  formatMoneyExact,
} from '@/lib/format-money';
import {
  clearedPackFormFields,
  emptyPackFormFields,
  getActivePack,
  GRAM_LITER_PACK_SIZES,
  type ActivePack,
  type GramLiterPackSize,
  type PackSizeOption,
} from '@/lib/product-pack';
import {
  COST_SET_FILTER_OPTIONS,
  PACK_READY_FILTER_OPTIONS,
  STOCK_STATUS_FILTER_OPTIONS,
} from '@/lib/product-readiness';
import {
  numberDraftToNumber,
  numberInputValue,
  parseNumberDraft,
  type NumberDraft,
} from '@/lib/number-draft';

type PackField = `price${GramLiterPackSize}`;
type CostField = `cost${GramLiterPackSize}`;
type SortKey = 'name' | 'pack' | 'sell' | 'cost' | 'profit' | 'margin';
type SortDir = 'asc' | 'desc';

const emptyForm = {
  name: '',
  unit: 'PCS' as (typeof PRODUCT_UNITS)[number],
  pricePerUnit: '' as NumberDraft,
  ...emptyPackFormFields(),
  priceCustom: '' as number | '',
  costPerUnit: '' as number | '',
  costCustom: '' as number | '',
  customSize: '' as number | '',
  details: '',
};

function unitShort(unit: string) {
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

function marginFromSellCost(sell: number, cost: number | null | undefined) {
  if (cost == null || sell <= 0) return null;
  return Math.round((((sell - cost) / sell) * 100 + Number.EPSILON) * 100) / 100;
}

function toOptionalNumber(value: number | ''): number | null {
  return value === '' ? null : Number(value);
}

const PACK_SIZES: Array<[Exclude<PackSizeOption, 'CUSTOM'>, PackField, CostField]> =
  GRAM_LITER_PACK_SIZES.map((size) => [
    String(size) as Exclude<PackSizeOption, 'CUSTOM'>,
    `price${size}` as PackField,
    `cost${size}` as CostField,
  ]);

function fieldForSize(size: Exclude<PackSizeOption, 'CUSTOM'>): PackField {
  return `price${size}` as PackField;
}

function costFieldForSize(size: Exclude<PackSizeOption, 'CUSTOM'>): CostField {
  return `cost${size}` as CostField;
}

function packEconomics(pack: ActivePack | null) {
  if (!pack) {
    return {
      sell: null as number | null,
      cost: null as number | null,
      profit: null as number | null,
      margin: null as number | null,
      sellRate: null as number | null,
      costRate: null as number | null,
      profitRate: null as number | null,
    };
  }
  const sellRate = pack.price / pack.size;
  const costRate = pack.cost != null ? pack.cost / pack.size : null;
  const profit = pack.cost != null ? pack.price - pack.cost : null;
  const profitRate = profit != null ? profit / pack.size : null;
  const margin = marginFromSellCost(pack.price, pack.cost);
  return {
    sell: pack.price,
    cost: pack.cost,
    profit,
    margin,
    sellRate,
    costRate,
    profitRate,
  };
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

function IconTrash() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 8h14M10 8V6.5A1.5 1.5 0 0 1 11.5 5h1A1.5 1.5 0 0 1 14 6.5V8M9 8v10.5A1.5 1.5 0 0 0 10.5 20h3a1.5 1.5 0 0 0 1.5-1.5V8"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MoneyCell({
  value,
  rate,
  unit,
}: {
  value: number | null;
  rate?: number | null;
  unit?: string;
}) {
  if (value == null) {
    return <span className="umkm-num is-empty">—</span>;
  }
  return (
    <div className="umkm-num-stack">
      <span className="umkm-num">{formatMoney(value)}</span>
      {rate != null && unit ? (
        <span className="umkm-num-sub">
          {formatMoney(rate)} / {unit}
        </span>
      ) : null}
    </div>
  );
}

function ProductEconStrip({
  pack,
  showHeader = true,
}: {
  pack: ActivePack | null;
  showHeader?: boolean;
}) {
  if (!pack) {
    return (
      <div className="umkm-econ-empty" role="status">
        Enter a selling price to see profit and margin.
      </div>
    );
  }

  const eco = packEconomics(pack);
  const tiles: Array<{
    key: string;
    label: string;
    value: ReactNode;
    sub?: string;
    accent?: 'margin' | 'profit';
  }> = [
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
      value:
        eco.margin != null ? (
          <span
            className={`umkm-margin-pill${eco.margin >= 0 ? ' is-good' : ' is-warn'}`}
          >
            {formatMarginPercent(eco.margin)}
          </span>
        ) : (
          '—'
        ),
      accent: 'margin',
    },
  ];

  return (
    <div
      className={`umkm-econ-strip${showHeader ? '' : ' is-inline'}`}
      aria-label={`Pack ${pack.sizeLabel} economics`}
    >
      {showHeader ? (
        <div className="umkm-econ-pack">
          <span className="umkm-econ-pack-label">Active pack</span>
          <span className="umkm-pack-size">{pack.sizeLabel}</span>
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
            {tile.sub ? <em className="umkm-econ-tile-sub">{tile.sub}</em> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ProductsPage() {
  const { productUnit } = useLabels();
  const unitLabel = (unit: string) =>
    productUnit[unit as keyof typeof productUnit] ?? unit;
  const [items, setItems] = useState<Product[]>([]);
  const [summary, setSummary] = useState<ProductSummary | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formOpen, setFormOpen] = useState(false);
  const [dataSyncOpen, setDataSyncOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewing, setViewing] = useState<Product | null>(null);
  const [performanceViewing, setPerformanceViewing] =
    useState<ProductStockSales | null>(null);
  const [search, setSearch] = useState('');
  const [unitFilters, setUnitFilters] = useState<string[]>([]);
  const [costSetFilters, setCostSetFilters] = useState<string[]>([]);
  const [packReadyFilters, setPackReadyFilters] = useState<string[]>([]);
  const [stockStatusFilters, setStockStatusFilters] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<ListPageSize>(20);
  const [listMeta, setListMeta] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  });
  const [packSize, setPackSize] = useState<PackSizeOption>('100');
  const [customSizeDraft, setCustomSizeDraft] = useState('');
  const loadSeq = useRef(0);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const isPcs = form.unit === 'PCS';

  /** One row per pack size that has a selling price (cost rides along). */
  const savedPacks = useMemo(() => {
    const packs: Array<{
      key: string;
      label: string;
      price: number;
      pricePerUnit: number;
      cost: number | null;
      costPerUnit: number | null;
    }> = [];

    for (const [sizeKey, priceField, costField] of PACK_SIZES) {
      const price = form[priceField];
      if (price === '') continue;
      const size = Number(sizeKey);
      const cost = form[costField];
      packs.push({
        key: sizeKey,
        label: `${size} ${unitShort(form.unit)}`,
        price: Number(price),
        pricePerUnit: Number(price) / size,
        cost: cost === '' ? null : Number(cost),
        costPerUnit: cost === '' ? null : Number(cost) / size,
      });
    }

    if (form.priceCustom !== '' && form.customSize !== '') {
      const size = Number(form.customSize);
      const cost =
        form.costCustom === '' ? null : Number(form.costCustom);
      packs.push({
        key: 'custom',
        label: `${formatQty(size)} ${unitShort(form.unit)} (custom)`,
        price: Number(form.priceCustom),
        pricePerUnit: Number(form.priceCustom) / size,
        cost,
        costPerUnit: cost == null ? null : cost / size,
      });
    }

    return packs;
  }, [form]);

  const formDraftPack = useMemo((): ActivePack | null => {
    if (form.unit === 'PCS') {
      return {
        sizeLabel: '1 pcs',
        size: 1,
        price: numberDraftToNumber(form.pricePerUnit, 0),
        cost: form.costPerUnit === '' ? null : Number(form.costPerUnit),
        shortUnit: 'pcs',
      };
    }
    const pack = savedPacks[0];
    if (!pack) return null;
    const size = pack.pricePerUnit > 0 ? pack.price / pack.pricePerUnit : 1;
    return {
      sizeLabel: pack.label.replace(/ \(custom\)$/, ''),
      size,
      price: pack.price,
      cost: pack.cost,
      shortUnit: unitShort(form.unit),
    };
  }, [form, savedPacks]);

  async function loadSummary(q = debouncedSearch) {
    const filterParams = {
      search: q.trim() || undefined,
      unit: unitFilters.length > 0 ? unitFilters : undefined,
      costSet: costSetFilters.length > 0 ? costSetFilters : undefined,
      packReady: packReadyFilters.length > 0 ? packReadyFilters : undefined,
      stockStatus:
        stockStatusFilters.length > 0 ? stockStatusFilters : undefined,
    };
    try {
      const productSummary = await api<ProductSummary>('/products/summary', {
        searchParams: filterParams,
      });
      setSummary(productSummary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products');
    }
  }

  async function loadList(q = debouncedSearch, nextPage = page) {
    const seq = ++loadSeq.current;
    setListLoading(true);
    const filterParams = {
      search: q.trim() || undefined,
      unit: unitFilters.length > 0 ? unitFilters : undefined,
      costSet: costSetFilters.length > 0 ? costSetFilters : undefined,
      packReady: packReadyFilters.length > 0 ? packReadyFilters : undefined,
      stockStatus:
        stockStatusFilters.length > 0 ? stockStatusFilters : undefined,
    };
    try {
      const data = await api<Paginated<Product>>('/products', {
        searchParams: {
          ...filterParams,
          page: nextPage,
          limit: pageSize,
        },
      });
      if (seq !== loadSeq.current) return;
      setItems(dedupeById(data.items));
      setListMeta(data.meta);
      setPage(data.meta.page);
      setError('');
    } catch (err) {
      if (seq !== loadSeq.current) return;
      setError(err instanceof Error ? err.message : 'Failed to load products');
    } finally {
      if (seq === loadSeq.current) setListLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 280);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    void loadSummary(debouncedSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, unitFilters, costSetFilters, packReadyFilters, stockStatusFilters]);

  useEffect(() => {
    void loadList(debouncedSearch, page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, debouncedSearch, unitFilters, costSetFilters, packReadyFilters, stockStatusFilters]);

  const catalog = useMemo(() => {
    // List is already filter-scoped by the API; only sort locally.
    const ranked = [...items].sort((a, b) => {
      const pa = getActivePack(a);
      const pb = getActivePack(b);
      const ea = packEconomics(pa);
      const eb = packEconomics(pb);

      let cmp = 0;
      switch (sortKey) {
        case 'name':
          cmp = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
          break;
        case 'pack':
          cmp = (pa?.size ?? -1) - (pb?.size ?? -1);
          break;
        case 'sell':
          cmp = (ea.sell ?? -1) - (eb.sell ?? -1);
          break;
        case 'cost':
          cmp = (ea.cost ?? -1) - (eb.cost ?? -1);
          break;
        case 'profit':
          cmp = (ea.profit ?? Number.NEGATIVE_INFINITY) - (eb.profit ?? Number.NEGATIVE_INFINITY);
          break;
        case 'margin':
          cmp =
            (ea.margin ?? Number.NEGATIVE_INFINITY) -
            (eb.margin ?? Number.NEGATIVE_INFINITY);
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return ranked;
  }, [items, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(key);
    setSortDir(key === 'name' || key === 'pack' ? 'asc' : 'desc');
  }

  function sortMark(key: SortKey) {
    if (sortKey !== key) return undefined;
    return sortDir;
  }

  function resetPackUi(size: PackSizeOption = '100', custom = '') {
    setPackSize(size);
    setCustomSizeDraft(custom);
  }

  function detectPackUi(product: Product): { size: PackSizeOption; custom: string } {
    if (product.unit === 'PCS') return { size: '100', custom: '' };
    for (const size of GRAM_LITER_PACK_SIZES) {
      const price = product[`price${size}` as keyof Product] as number | null;
      if (price != null) {
        return { size: String(size) as PackSizeOption, custom: '' };
      }
    }
    if (product.priceCustom != null && product.customSize != null) {
      return { size: 'CUSTOM', custom: String(product.customSize) };
    }
    return { size: '100', custom: '' };
  }

  function packSellValue(): string {
    if (packSize === 'CUSTOM') {
      return form.priceCustom === '' ? '' : String(form.priceCustom);
    }
    const value = form[fieldForSize(packSize)];
    return value === '' ? '' : String(value);
  }

  function packCostValue(): string {
    if (packSize === 'CUSTOM') {
      return form.costCustom === '' ? '' : String(form.costCustom);
    }
    const value = form[costFieldForSize(packSize)];
    return value === '' ? '' : String(value);
  }

  function writeLivePack(next: {
    size?: PackSizeOption;
    customSize?: string;
    sell?: string;
    cost?: string;
  }) {
    const size = next.size ?? packSize;
    const customSize = next.customSize ?? customSizeDraft;

    setForm((prev) => {
      const sellFromPrev = (): string => {
        if (size === 'CUSTOM') {
          return prev.priceCustom === '' ? '' : String(prev.priceCustom);
        }
        const value = prev[fieldForSize(size)];
        return value === '' ? '' : String(value);
      };
      const costFromPrev = (): string => {
        if (size === 'CUSTOM') {
          return prev.costCustom === '' ? '' : String(prev.costCustom);
        }
        const value = prev[costFieldForSize(size)];
        return value === '' ? '' : String(value);
      };

      const sellRaw = next.sell ?? sellFromPrev();
      const costRaw = next.cost ?? costFromPrev();

      const sell =
        sellRaw.trim() === '' || Number.isNaN(Number(sellRaw))
          ? ('' as number | '')
          : Number(sellRaw);
      const cost =
        costRaw.trim() === '' || Number.isNaN(Number(costRaw))
          ? ('' as number | '')
          : Number(costRaw);

      const cleared = clearAllPacks();

      if (sell === '') {
        return {
          ...prev,
          ...cleared,
          ...(size === 'CUSTOM' && customSize.trim() !== ''
            ? { customSize: Number(customSize) || ('' as number | '') }
            : {}),
        };
      }

      if (size === 'CUSTOM') {
        const sizeNum = Number(customSize);
        return {
          ...prev,
          ...cleared,
          customSize:
            customSize.trim() === '' || Number.isNaN(sizeNum) || sizeNum <= 0
              ? ('' as number | '')
              : sizeNum,
          priceCustom: sell,
          costCustom: cost,
        };
      }

      return {
        ...prev,
        ...cleared,
        [fieldForSize(size)]: sell,
        [costFieldForSize(size)]: cost,
      };
    });
  }

  function changePackSize(size: PackSizeOption) {
    const sell = packSellValue();
    const cost = packCostValue();
    setPackSize(size);
    if (size !== 'CUSTOM') setCustomSizeDraft('');
    writeLivePack({
      size,
      customSize: size === 'CUSTOM' ? customSizeDraft : '',
      sell,
      cost,
    });
  }

  function populateEditForm(product: Product) {
    setViewing(null);
    setPerformanceViewing(null);
    setFormOpen(true);
    setEditingId(product.id);

    // Keep only the first configured selling pack (legacy multi-pack → single).
    const cleared = clearedPackFormFields();
    let packFields = { ...cleared };
    if (product.unit !== 'PCS') {
      let found = false;
      for (const size of GRAM_LITER_PACK_SIZES) {
        const price = product[`price${size}` as keyof Product] as number | null;
        const cost = product[`cost${size}` as keyof Product] as number | null;
        if (price != null) {
          packFields = {
            ...cleared,
            [`price${size}`]: price,
            [`cost${size}`]: cost ?? '',
          } as typeof cleared;
          found = true;
          break;
        }
      }
      if (!found && product.priceCustom != null && product.customSize != null) {
        packFields = {
          ...cleared,
          priceCustom: product.priceCustom,
          costCustom: product.costCustom ?? '',
          customSize: product.customSize,
        };
      }
    }

    setForm({
      name: product.name,
      unit: product.unit,
      pricePerUnit:
        product.pricePerUnit === 0 ? '' : product.pricePerUnit,
      costPerUnit: product.costPerUnit ?? '',
      details: product.details,
      ...packFields,
    });
    const ui = detectPackUi(product);
    resetPackUi(ui.size, ui.custom);
  }

  async function startEdit(product: Product) {
    try {
      const full = await api<Product>(`/products/${product.id}`);
      populateEditForm(full);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load product');
    }
  }

  function startCreate() {
    setViewing(null);
    setPerformanceViewing(null);
    setEditingId(null);
    setForm(emptyForm);
    resetPackUi();
    setFormOpen(true);
  }

  async function startView(product: Product) {
    setFormOpen(false);
    setEditingId(null);
    setPerformanceViewing(null);
    try {
      const full = await api<Product>(`/products/${product.id}`);
      setViewing(full);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load product');
    }
  }

  function resetForm() {
    setFormOpen(false);
    setEditingId(null);
    setViewing(null);
    setPerformanceViewing(null);
    setForm(emptyForm);
    resetPackUi();
  }

  function closeView() {
    setViewing(null);
  }

  function openPerformanceView(row: ProductStockSales) {
    setFormOpen(false);
    setEditingId(null);
    setViewing(null);
    setPerformanceViewing(row);
  }

  function closePerformanceView() {
    setPerformanceViewing(null);
  }

  function clearAllPacks() {
    return clearedPackFormFields();
  }

  function removePack() {
    setForm({
      ...form,
      ...clearAllPacks(),
    });
    if (packSize === 'CUSTOM') setCustomSizeDraft('');
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (form.unit !== 'PCS') {
      if (!formDraftPack) {
        setError('Choose a pack size and enter a selling price before saving.');
        return;
      }
      if (packSize === 'CUSTOM' && !(form.customSize && Number(form.customSize) > 0)) {
        setError('Enter a custom pack size greater than 0.');
        return;
      }
    }
    setLoading(true);
    try {
      const costFields = Object.fromEntries(
        GRAM_LITER_PACK_SIZES.flatMap((size) => [
          [`cost${size}`, toOptionalNumber(form[`cost${size}` as CostField])],
        ]),
      ) as Record<CostField, number | null>;
      const packPriceFields = Object.fromEntries(
        GRAM_LITER_PACK_SIZES.map((size) => [
          `price${size}`,
          toOptionalNumber(form[`price${size}` as PackField]),
        ]),
      );
      const body =
        form.unit === 'PCS'
          ? {
              name: form.name,
              unit: form.unit,
              pricePerUnit: numberDraftToNumber(form.pricePerUnit, 0),
              costPerUnit: toOptionalNumber(form.costPerUnit),
              details: form.details,
            }
          : {
              name: form.name,
              unit: form.unit,
              ...packPriceFields,
              priceCustom: toOptionalNumber(form.priceCustom),
              customSize: toOptionalNumber(form.customSize),
              ...costFields,
              costCustom: toOptionalNumber(form.costCustom),
              details: form.details,
            };

      if (editingId) {
        await api(`/products/${editingId}`, { method: 'PATCH', body });
      } else {
        await api('/products', { method: 'POST', body });
      }
      resetForm();
      await Promise.all([
        loadSummary(debouncedSearch),
        loadList(debouncedSearch, page),
      ]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Save failed');
    } finally {
      setLoading(false);
    }
  }

  async function onDelete(id: string, name?: string) {
    if (!(await confirmDelete('product', name))) return;
    setError('');
    try {
      await api(`/products/${id}`, { method: 'DELETE' });
      if (viewing?.id === id) setViewing(null);
      if (performanceViewing?.id === id) setPerformanceViewing(null);
      await Promise.all([
        loadSummary(debouncedSearch),
        loadList(debouncedSearch, page),
      ]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Delete failed');
    }
  }

  const focusMode =
    formOpen || Boolean(viewing) || Boolean(performanceViewing);
  const viewingPack = viewing ? getActivePack(viewing) : null;
  const chipFiltersActive =
    unitFilters.length > 0 ||
    costSetFilters.length > 0 ||
    packReadyFilters.length > 0 ||
    stockStatusFilters.length > 0;
  const filtersActive =
    debouncedSearch.trim().length > 0 || chipFiltersActive;
  const stageSummary = summary;
  const statisticsLoading = listLoading && !stageSummary?.statistics;
  const searchPending = search.trim() !== debouncedSearch;
  const stageLoading = listLoading || searchPending;
  const pulseSell = stageSummary
    ? formatMoneyParts(stageSummary.inventorySellValue)
    : null;
  const pulseStock = stageSummary
    ? formatCompactQtyParts(stageSummary.totalStockQty)
    : null;

  return (
    <section>
      {!focusMode ? (
        <>
        <FeatureStage
          title="Products"
          loading={stageLoading && !stageSummary}
          subtitle={
            stageSummary
              ? `${stageSummary.productCount.toLocaleString('en-US')} SKU${stageSummary.productCount === 1 ? '' : 's'}${filtersActive ? ' in view' : ''} · Catalog value and stock health`
              : 'Define catalog items with selling price and optional cost.'
          }
          action={
            <>
              <FeatureDataTransferToggle
                open={dataSyncOpen}
                controlsId="feature-sync-products"
                onClick={() => setDataSyncOpen((open) => !open)}
              />
              <button type="button" className="umkm-btn" onClick={startCreate}>
                Add product
              </button>
            </>
          }
          stats={[
            {
              label: 'Inventory value',
              hero: true,
              tip: {
                value: stageSummary
                  ? formatMoneyExact(stageSummary.inventorySellValue)
                  : undefined,
                description:
                  'Sell value of stock on hand for products in view.',
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
              label: 'Products',
              tip: {
                description: 'Number of catalog SKUs in the current view.',
              },
              value: stageSummary
                ? stageSummary.productCount.toLocaleString('en-US')
                : '···',
            },
            {
              label: 'Stock on hand',
              tip: {
                value: stageSummary
                  ? formatQty(stageSummary.totalStockQty)
                  : undefined,
                description: 'Total pack quantity available across these SKUs.',
              },
              value: pulseStock ? (
                <>
                  <b>{pulseStock.figure}</b>
                  {pulseStock.unit ? <small>{pulseStock.unit}</small> : null}
                </>
              ) : (
                <b>···</b>
              ),
            },
          ]}
          ratesLabel="Product rates"
          rates={[
            {
              tone: 'tone-cancel',
              label: 'Out of stock',
              tip: {
                description: 'Share of products with zero stock left.',
                detail: 'Out-of-stock SKUs ÷ products in view',
              },
              value: stageSummary?.outOfStockRate,
            },
            {
              tone: 'tone-margin',
              label: 'Margin',
              tip: {
                description:
                  'Estimated inventory profit when unit cost is set.',
                detail: 'Profit ÷ sell value on SKUs with cost',
              },
              value: stageSummary?.profitMarginRate,
            },
            {
              tone: 'tone-discount',
              label: 'Cost set',
              tip: {
                description: 'Share of products that have a unit cost filled in.',
                detail: 'SKUs with cost ÷ products in view',
              },
              value: stageSummary?.costCoverageRate,
            },
            {
              tone: 'tone-paid',
              label: 'Pack ready',
              tip: {
                description:
                  'Share of products that already have at least one pack price.',
                detail: 'Pack-ready SKUs ÷ products in view',
              },
              value: stageSummary?.packReadyRate,
            },
          ]}
        />
        {dataSyncOpen ? (
          <FeatureDataTransfer
            entity="products"
            label="Products"
            onImported={() => {
              void loadSummary(debouncedSearch);
              void loadList(debouncedSearch, page);
            }}
          />
        ) : null}
        </>
      ) : (
        <PageHeader
          title="Products"
          description="Define catalog items with selling price and optional cost per piece or pack. Manage stock in Warehouse."
        />
      )}
      {error ? <div className="umkm-error">{error}</div> : null}

      {performanceViewing ? (
        <ProductStockSalesPerformanceView
          row={performanceViewing}
          onClose={closePerformanceView}
        />
      ) : null}

      {viewing ? (
        <ContentSection
          className="umkm-form-panel umkm-product-sheet umkm-view-sheet"
          eyebrow="Product"
          title={viewing.name}
          description={
            viewing.details?.trim()
              ? viewing.details
              : 'Catalog pricing and warehouse stock snapshot.'
          }
          actionsPlacement="foot"
          actions={
            <>
              <button
                type="button"
                className="umkm-btn"
                onClick={() => startEdit(viewing)}
              >
                Edit
              </button>
              <button
                type="button"
                className="umkm-btn danger"
                onClick={() => void onDelete(viewing.id, viewing.name)}
              >
                Delete
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
            <ViewIdentity
              contextLabel="Unit & pack"
              chips={
                <>
                  <ViewChip>{unitLabel(viewing.unit)}</ViewChip>
                  {viewingPack ? (
                    <ViewChip tone="accent">
                      Pack {viewingPack.sizeLabel}
                    </ViewChip>
                  ) : (
                    <ViewChip>No pack</ViewChip>
                  )}
                </>
              }
              metricLabel="On hand"
              metricValue={
                <>
                  {formatQty(viewing.stockQty)} {unitShort(viewing.unit)}
                </>
              }
              metricHint="Warehouse stock"
            />

            <EntityIdDetail id={viewing.productId || viewing.id} label="Product ID" />

            <ViewBlock
              title="Economics"
              description="Sell, cost, profit, and margin for the active pack."
            >
              <ProductEconStrip pack={viewingPack} showHeader={false} />
            </ViewBlock>

            <ViewBlock
              title="Notes"
              description="Optional catalog details and internal remarks."
            >
              <p className="umkm-sub" style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                {viewing.details?.trim() ? viewing.details : '—'}
              </p>
            </ViewBlock>
          </ViewSheetBody>
        </ContentSection>
      ) : null}

      {formOpen ? (
      <ContentSection
        className="umkm-form-panel umkm-product-sheet"
        eyebrow="Catalog"
        title={editingId ? 'Modify product' : 'Create product'}
        description="Set identity and pricing. Stock is managed in Warehouse."
      >
        <form onSubmit={onSubmit} className="umkm-product-sheet-body">
          <FormSection
            title="Identity"
            description="Name and unit define how packs and prices work."
          >
          <div className="umkm-grid two">
            <div className="umkm-field">
              <FieldLabel>Product name</FieldLabel>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="umkm-field">
              <FieldLabel>Unit</FieldLabel>
              <OptionSelect
                aria-label="Product unit"
                value={form.unit}
                onChange={(unit) => {
                  if (unit === '') return;
                  if (unit === 'PCS') {
                    setForm({ ...form, unit, ...clearAllPacks() });
                    resetPackUi();
                  } else {
                    setForm({ ...form, unit });
                  }
                }}
                options={PRODUCT_UNITS.map((u) => ({
                  value: u,
                  label: productUnit[u],
                }))}
              />
              <p className="umkm-sub" style={{ margin: '0.35rem 0 0' }}>
                Pcs: one price and optional cost. Gram/liter: exactly one pack
                (size + price + optional cost).
              </p>
            </div>
          </div>
          </FormSection>

          {isPcs ? (
            <FormSection
              title="Price & cost"
              description="One selling price per piece, with an optional purchase cost."
            >
              <div className="umkm-pack-composer">
                <div className="umkm-pack-composer-fields">
                  <div className="umkm-field" style={{ marginBottom: 0 }}>
                    <FieldLabel htmlFor="price-per-pcs">Selling price</FieldLabel>
                    <input
                      id="price-per-pcs"
                      type="number"
                      min={0}
                      step="0.0001"
                      value={numberInputValue(form.pricePerUnit)}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          pricePerUnit: parseNumberDraft(e.target.value),
                        })
                      }
                      required
                    />
                  </div>
                  <div className="umkm-field" style={{ marginBottom: 0 }}>
                    <FieldLabel htmlFor="cost-per-pcs">Cost (optional)</FieldLabel>
                    <input
                      id="cost-per-pcs"
                      type="number"
                      min={0}
                      step="0.0001"
                      value={form.costPerUnit}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          costPerUnit:
                            e.target.value === '' ? '' : Number(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>
                <ProductEconStrip pack={formDraftPack} showHeader={false} />
              </div>
            </FormSection>
          ) : (
            <FormSection
              title="Pack"
              description="Pick a size, then enter sell and optional cost. Preview updates as you type."
            >
              <div className="umkm-pack-composer">
                <div className="umkm-field" style={{ marginBottom: 0 }}>
                  <FieldLabel>Pack size</FieldLabel>
                  <OptionSelect
                    aria-label="Pack size"
                    value={packSize}
                    onChange={(size) => {
                      if (!size) return;
                      changePackSize(size);
                    }}
                    options={[
                      ...GRAM_LITER_PACK_SIZES.map((size) => ({
                        value: String(size) as PackSizeOption,
                        label: `${size} ${unitShort(form.unit)}`,
                      })),
                      { value: 'CUSTOM' as PackSizeOption, label: 'Custom' },
                    ]}
                  />
                </div>
                {packSize === 'CUSTOM' ? (
                  <div className="umkm-field umkm-pack-custom-size">
                    <FieldLabel htmlFor="custom-size">
                      Custom size ({unitShort(form.unit)})
                    </FieldLabel>
                    <input
                      id="custom-size"
                      type="number"
                      min={0.0001}
                      step="0.0001"
                      value={customSizeDraft}
                      onChange={(e) => {
                        setCustomSizeDraft(e.target.value);
                        writeLivePack({ customSize: e.target.value });
                      }}
                      placeholder="e.g. 75"
                    />
                  </div>
                ) : null}

                <div className="umkm-pack-composer-fields">
                  <div className="umkm-field" style={{ marginBottom: 0 }}>
                    <FieldLabel htmlFor="pack-price">Sell</FieldLabel>
                    <input
                      id="pack-price"
                      type="number"
                      min={0}
                      step="0.0001"
                      value={packSellValue()}
                      onChange={(e) => writeLivePack({ sell: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div className="umkm-field" style={{ marginBottom: 0 }}>
                    <FieldLabel htmlFor="pack-cost">Cost (optional)</FieldLabel>
                    <input
                      id="pack-cost"
                      type="number"
                      min={0}
                      step="0.0001"
                      value={packCostValue()}
                      onChange={(e) => writeLivePack({ cost: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  {formDraftPack ? (
                    <div className="umkm-pack-composer-clear">
                      <button
                        type="button"
                        className="umkm-btn secondary sm"
                        onClick={removePack}
                      >
                        Clear pack
                      </button>
                    </div>
                  ) : null}
                </div>

                <ProductEconStrip pack={formDraftPack} showHeader={false} />
              </div>
            </FormSection>
          )}

          <FormSection title="Notes" description="Optional product details for your team.">
          <div className="umkm-field">
            <FieldLabel>Details</FieldLabel>
            <input
              value={form.details}
              onChange={(e) => setForm({ ...form, details: e.target.value })}
            />
          </div>
          </FormSection>

          <div className="umkm-actions">
            <button className="umkm-btn" type="submit" disabled={loading}>
              {editingId ? 'Update product' : 'Add product'}
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
        eyebrow="Catalog"
        title="Products"
        description="Search and manage catalog items. Restock inventory in Warehouse."
      >
        <div className="umkm-catalog-toolbar">
          <div className="umkm-field umkm-catalog-search">
            <FieldLabel htmlFor="product-search">Search</FieldLabel>
            <input
              id="product-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by product name…"
              autoComplete="off"
            />
          </div>
          <CollapsibleFilters
            activeCount={
              (unitFilters.length > 0 ? 1 : 0) +
              (costSetFilters.length > 0 ? 1 : 0) +
              (packReadyFilters.length > 0 ? 1 : 0) +
              (stockStatusFilters.length > 0 ? 1 : 0)
            }
          >
            <MultiSelectFilter
              id="product-unit-filter"
              label="Unit"
              allLabel="All units"
              value={unitFilters}
              onChange={(next) => {
                setUnitFilters(next);
                setPage(1);
              }}
              options={PRODUCT_UNITS.map((unit) => ({
                value: unit,
                label: unitLabel(unit),
              }))}
            />
            <MultiSelectFilter
              id="product-cost-set-filter"
              label="Cost set"
              allLabel="Any cost"
              value={costSetFilters}
              onChange={(next) => {
                setCostSetFilters(next);
                setPage(1);
              }}
              options={COST_SET_FILTER_OPTIONS.map((option) => ({
                value: option.value,
                label: option.label,
              }))}
            />
            <MultiSelectFilter
              id="product-pack-ready-filter"
              label="Pack ready"
              allLabel="Any pack status"
              value={packReadyFilters}
              onChange={(next) => {
                setPackReadyFilters(next);
                setPage(1);
              }}
              options={PACK_READY_FILTER_OPTIONS.map((option) => ({
                value: option.value,
                label: option.label,
              }))}
            />
            <MultiSelectFilter
              id="product-stock-status-filter"
              label="Stock"
              allLabel="Any stock"
              value={stockStatusFilters}
              onChange={(next) => {
                setStockStatusFilters(next);
                setPage(1);
              }}
              options={STOCK_STATUS_FILTER_OPTIONS.map((option) => ({
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
                    : 'No products yet'
                  : items.length >= listMeta.total
                    ? `Showing all ${listMeta.total.toLocaleString('en-US')} products`
                    : `Showing ${(listMeta.page - 1) * listMeta.limit + 1}–${Math.min(listMeta.page * listMeta.limit, listMeta.total)} of ${listMeta.total.toLocaleString('en-US')}`}
          </p>
        </div>

        {listLoading && catalog.length === 0 ? null : listMeta.total === 0 ? (
          <EmptyState
            title={filtersActive ? 'No matches' : 'No products yet'}
            description={
              filtersActive
                ? 'Try another search or clear the filters.'
                : 'Add your first product catalog item, then restock it in Warehouse.'
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
                        onClick={() => toggleSort('name')}
                        data-dir={sortMark('name')}
                      >
                        Product
                      </button>
                    </th>
                    <th>
                      <button
                        type="button"
                        className="umkm-th-sort"
                        onClick={() => toggleSort('pack')}
                        data-dir={sortMark('pack')}
                      >
                        Pack
                      </button>
                    </th>
                    <th className="is-num">
                      <button
                        type="button"
                        className="umkm-th-sort"
                        onClick={() => toggleSort('sell')}
                        data-dir={sortMark('sell')}
                      >
                        Sell
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
                        onClick={() => toggleSort('margin')}
                        data-dir={sortMark('margin')}
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
                  {catalog.map((p) => {
                    const pack = getActivePack(p);
                    const eco = packEconomics(pack);
                    return (
                      <tr
                        key={p.id}
                        className="umkm-catalog-row"
                        tabIndex={0}
                        onClick={() => startView(p)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            startView(p);
                          }
                        }}
                      >
                        <td>
                          <div className="umkm-product-cell is-compact">
                            <span className="umkm-product-name">{p.name}</span>
                            <div className="umkm-product-identity-row">
                              <span className="umkm-unit-chip">
                                {unitLabel(p.unit)}
                              </span>
                              <EntityIdBadge
                                id={p.productId || p.id}
                                literal={Boolean(p.productId)}
                                compact
                                soft
                              />
                            </div>
                          </div>
                        </td>
                        <td>
                          {pack ? (
                            <span className="umkm-pack-size">{pack.sizeLabel}</span>
                          ) : (
                            <span className="umkm-pack-empty">No pack</span>
                          )}
                        </td>
                        <td className="is-num">
                          <MoneyCell
                            value={eco.sell}
                            rate={eco.sellRate}
                            unit={pack?.shortUnit}
                          />
                        </td>
                        <td className="is-num">
                          <MoneyCell
                            value={eco.cost}
                            rate={eco.costRate}
                            unit={pack?.shortUnit}
                          />
                        </td>
                        <td className="is-num">
                          <MoneyCell
                            value={eco.profit}
                            rate={eco.profitRate}
                            unit={pack?.shortUnit}
                          />
                        </td>
                        <td className="is-num">
                          {eco.margin != null ? (
                            <span
                              className={`umkm-margin-pill${eco.margin >= 0 ? ' is-good' : ' is-warn'}`}
                            >
                              {formatMarginPercent(eco.margin)}
                            </span>
                          ) : (
                            <span className="umkm-num is-empty">—</span>
                          )}
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
                              onClick={() => startView(p)}
                            >
                              <IconView />
                            </button>
                            <button
                              className="umkm-icon-btn"
                              type="button"
                              title="Edit"
                              aria-label={`Edit ${p.name}`}
                              onClick={() => startEdit(p)}
                            >
                              <IconEdit />
                            </button>
                            <button
                              className="umkm-icon-btn danger"
                              type="button"
                              title="Delete"
                              aria-label={`Delete ${p.name}`}
                              onClick={() => void onDelete(p.id, p.name)}
                            >
                              <IconTrash />
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
              {catalog.map((p) => {
                const pack = getActivePack(p);
                const eco = packEconomics(pack);
                return (
                  <li key={p.id} className="umkm-catalog-card">
                    <button
                      type="button"
                      className="umkm-catalog-card-main"
                      onClick={() => startView(p)}
                    >
                      <div className="umkm-catalog-card-identity">
                        <span className="umkm-product-name">{p.name}</span>
                        <div className="umkm-product-identity-row">
                          <span className="umkm-unit-chip">
                            {unitLabel(p.unit)}
                          </span>
                          {pack ? (
                            <span className="umkm-unit-chip is-pack">
                              {pack.sizeLabel}
                            </span>
                          ) : null}
                          <EntityIdBadge
                            id={p.productId || p.id}
                            literal={Boolean(p.productId)}
                            compact
                            soft
                          />
                        </div>
                      </div>
                      <div className="umkm-catalog-card-metrics">
                        <div>
                          <span>Sell</span>
                          <strong>
                            {eco.sell != null ? formatMoney(eco.sell) : '—'}
                          </strong>
                        </div>
                        <div>
                          <span>Cost</span>
                          <strong>
                            {eco.cost != null ? formatMoney(eco.cost) : '—'}
                          </strong>
                        </div>
                        <div>
                          <span>Profit</span>
                          <strong>
                            {eco.profit != null ? formatMoney(eco.profit) : '—'}
                          </strong>
                        </div>
                        <div>
                          <span>Margin</span>
                          <strong>
                            {eco.margin != null
                              ? formatMarginPercent(eco.margin)
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
                        onClick={() => startView(p)}
                      >
                        <IconView />
                      </button>
                      <button
                        className="umkm-icon-btn"
                        type="button"
                        title="Edit"
                        aria-label={`Edit ${p.name}`}
                        onClick={() => startEdit(p)}
                      >
                        <IconEdit />
                      </button>
                      <button
                        className="umkm-icon-btn danger"
                        type="button"
                        title="Delete"
                        aria-label={`Delete ${p.name}`}
                        onClick={() => void onDelete(p.id, p.name)}
                      >
                        <IconTrash />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
            <ListPager
              ariaLabel="Products pages"
              page={listMeta.page}
              totalPages={listMeta.totalPages}
              total={listMeta.total}
              loading={listLoading}
              pageSize={pageSize}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
              onPrev={() => setPage((p) => Math.max(1, p - 1))}
              onNext={() =>
                setPage((p) => Math.min(listMeta.totalPages, p + 1))
              }
            />
          </>
        )}
      </ContentSection>

      <ProductStockSalesSection
        filters={{
          search: debouncedSearch,
          unit: unitFilters,
          costSet: costSetFilters,
          packReady: packReadyFilters,
          stockStatus: stockStatusFilters,
        }}
        onView={openPerformanceView}
      />

      <ContentSection eyebrow="Statistics" quiet>
        <ProductStatisticsSection
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
