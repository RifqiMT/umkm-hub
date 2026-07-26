'use client';

import {
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { api, ApiError } from '@/lib/api';
import { ContentSection, EmptyState, FormSection, PageHeader } from '@/components/PageHeader';
import { OptionChips } from '@/components/OptionChips';
import { MultiSelectFilter } from '@/components/MultiSelectFilter';
import { CollapsibleFilters } from '@/components/CollapsibleFilters';
import {
  DateRangeFilter,
  type DateRangeValue,
} from '@/components/DateRangeFilter';
import { EMPTY_DATE_RANGE, isDateRangeActive } from '@/lib/date-range-filter';
import {
  ViewBlock,
  ViewChip,
  ViewFacts,
  ViewIdentity,
  ViewSheetBody,
} from '@/components/ViewSheet';
import { AppTooltip } from '@/components/AppTooltip';
import { EntityIdBadge, EntityIdDetail } from '@/components/EntityId';
import {
  DISCOUNT_TYPES,
  INVOICE_STATUSES,
  LABELS,
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  calculateMultiLineOrderTotals,
  listProductPacks,
  todayDateInput,
  type ProductPackOption,
} from '@/lib/enums';
import type {
  Customer,
  Order,
  OrderLine,
  OrderSummary,
  Paginated,
  Product,
} from '@/lib/types';
import {
  formatCompactQtyParts,
  formatDateLabel,
  formatMoney,
  formatMoneyParts,
  formatRatePercent,
  formatMoneyExact,
} from '@/lib/format-money';
import {
  orderPaidAmount,
  orderPaymentRatePercent,
} from '@/lib/order-payment-rate';

type SortKey = 'date' | 'product' | 'status' | 'total' | 'payment';
type SortDir = 'asc' | 'desc';

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

/** Currency amounts — whole units (IDR-style), no trailing decimals. */

/** Pack sizes / stock qty — keep fractional units when present. */
function formatQty(value: number) {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  });
}

/** Percents in order UI — always one decimal for consistent width. */
function formatPct(value: number) {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

/** CSS variable for Order pulse rate meters (0–100). */
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

function orderStatusLabel(status?: string | null) {
  if (!status) return '—';
  return LABELS.orderStatus[status as keyof typeof LABELS.orderStatus] ?? status;
}

function paymentStatusLabel(status?: string | null) {
  if (!status) return '—';
  return (
    LABELS.paymentStatus[status as keyof typeof LABELS.paymentStatus] ?? status
  );
}

function invoiceStatusLabel(status?: string | null) {
  if (!status) return '—';
  return (
    LABELS.invoiceStatus[status as keyof typeof LABELS.invoiceStatus] ?? status
  );
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 10000) / 10000;
}

function discountOffAmount(lineTotal: number, orderTotal: number) {
  return roundMoney(Math.max(0, lineTotal - orderTotal));
}

function discountRateLabel(
  discountType: string,
  discountValue: number,
  off: number,
) {
  if (off <= 0 && !(discountValue > 0)) return 'No discount';
  if (discountType === 'PERCENTAGE') {
    return `${formatQty(discountValue)}%`;
  }
  return 'Fixed';
}

function OrderTotalsReceipt({
  lineTotal,
  orderTotal,
  discountType,
  discountValue,
}: {
  lineTotal: number;
  orderTotal: number;
  discountType: string;
  discountValue: number;
}) {
  const off = discountOffAmount(lineTotal, orderTotal);
  const rate = discountRateLabel(discountType, discountValue, off);
  return (
    <div className="umkm-order-totals-receipt" aria-live="polite">
      <div className="umkm-order-totals-row">
        <span>Subtotal</span>
        <strong>{formatMoney(lineTotal)}</strong>
      </div>
      <div className="umkm-order-totals-row is-discount">
        <span>
          Discount
          {rate !== 'No discount' ? (
            <em className="umkm-order-totals-rate"> ({rate})</em>
          ) : null}
        </span>
        <strong>{off > 0 ? `−${formatMoney(off)}` : formatMoney(0)}</strong>
      </div>
      <div className="umkm-order-totals-row is-total">
        <span>Order total</span>
        <strong>{formatMoney(orderTotal)}</strong>
      </div>
    </div>
  );
}

function remainingFromInstallments(
  total: number,
  installments: Array<{ amount: number }>,
) {
  const paid = roundMoney(
    installments.reduce((sum, row) => sum + (Number(row.amount) || 0), 0),
  );
  return roundMoney(Math.max(0, total - paid));
}

type InstallmentEntryMode = 'AMOUNT' | 'PERCENTAGE';

type InstallmentFormRow = {
  amount: number;
  percentValue: number;
  entryMode: InstallmentEntryMode;
  installmentDate: string;
};

function emptyInstallmentRow(minDate?: string): InstallmentFormRow {
  const today = todayDateInput();
  const installmentDate = minDate
    ? today > minDate
      ? today
      : minDate
    : today;
  return {
    amount: 0,
    percentValue: 0,
    entryMode: 'AMOUNT',
    installmentDate,
  };
}

function cascadeInstallmentDates(
  rows: InstallmentFormRow[],
  fromIndex: number,
): InstallmentFormRow[] {
  const next = rows.map((row) => ({ ...row }));
  for (let i = Math.max(1, fromIndex); i < next.length; i++) {
    const minDate = next[i - 1].installmentDate;
    if (next[i].installmentDate < minDate) {
      next[i] = { ...next[i], installmentDate: minDate };
    }
  }
  return next;
}

function assertFormInstallmentsChronological(rows: InstallmentFormRow[]) {
  for (let i = 1; i < rows.length; i++) {
    if (rows[i].installmentDate < rows[i - 1].installmentDate) {
      throw new Error(
        `Payment ${i + 1} date cannot be before payment ${i} (${rows[i - 1].installmentDate}).`,
      );
    }
  }
}

function resolveInstallmentAmount(row: InstallmentFormRow, total: number) {
  if (row.entryMode === 'PERCENTAGE') {
    return roundMoney(((Number(row.percentValue) || 0) * total) / 100);
  }
  return roundMoney(Number(row.amount) || 0);
}

function resolvedInstallmentRows(
  rows: InstallmentFormRow[],
  total: number,
): Array<{ amount: number; installmentDate: string }> {
  return rows.map((row) => ({
    amount: resolveInstallmentAmount(row, total),
    installmentDate: row.installmentDate,
  }));
}

function percentOfTotal(amount: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((amount / total) * 1000) / 10;
}

function PaidRateCell({
  rate,
  paidLabel,
  totalLabel,
}: {
  rate: number | null;
  paidLabel?: string;
  totalLabel?: string;
}) {
  const width =
    rate == null || !Number.isFinite(rate)
      ? '0%'
      : `${Math.max(0, Math.min(100, rate))}%`;
  return (
    <AppTooltip
      className="umkm-tip-block"
      embedded
      tone="paid"
      label="Paid"
      value={rate == null ? undefined : formatRatePercent(rate)}
      description="How much of this order’s total has been collected so far."
      detail={
        paidLabel && totalLabel ? `${paidLabel} of ${totalLabel}` : undefined
      }
    >
      <div
        className="umkm-paid-rate"
        style={{ ['--rate' as string]: width }}
      >
        <strong>{rate == null ? '—' : formatRatePercent(rate)}</strong>
        <span className="umkm-paid-rate-meter" aria-hidden>
          <i />
        </span>
      </div>
    </AppTooltip>
  );
}

/** Running remaining after each payment, chronologically by date. */
function installmentProgressRows(
  total: number,
  installments: Array<{ amount: number; installmentDate: string }>,
) {
  const ordered = installments
    .map((row, index) => ({
      amount: Number(row.amount) || 0,
      installmentDate: row.installmentDate,
      index,
    }))
    .sort((a, b) => {
      const byDate = a.installmentDate.localeCompare(b.installmentDate);
      return byDate !== 0 ? byDate : a.index - b.index;
    });

  let paid = 0;
  return ordered.map((row, seq) => {
    paid = roundMoney(paid + row.amount);
    const remaining = roundMoney(Math.max(0, total - paid));
    const remainingPct =
      total > 0 ? Math.round((remaining / total) * 1000) / 10 : 0;
    return {
      ...row,
      seq: seq + 1,
      remaining,
      remainingPct,
    };
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

type OrderLineForm = {
  key: string;
  productId: string;
  packKey: string;
  packSize: number;
  packCount: number;
};

type OrderForm = {
  lines: OrderLineForm[];
  customerId: string;
  orderDate: string;
  shipmentDate: string;
  status: string;
  discountType: 'PERCENTAGE' | 'AMOUNT';
  discountValue: number;
  paymentStatus: string;
  invoiceStatus: string;
  invoiceDate: string;
  installments: InstallmentFormRow[];
};

let lineKeySeq = 0;

function newLineKey() {
  lineKeySeq += 1;
  return `line-${Date.now()}-${lineKeySeq}`;
}

function defaultPack(product?: Product): ProductPackOption | null {
  if (!product) return null;
  return listProductPacks(product)[0] ?? null;
}

function emptyLine(product?: Product): OrderLineForm {
  const pack = defaultPack(product);
  return {
    key: newLineKey(),
    productId: product?.id ?? '',
    packKey: pack?.key ?? '',
    packSize: pack?.size ?? 1,
    packCount: 1,
  };
}

function emptyForm(product?: Product): OrderForm {
  const today = todayDateInput();
  return {
    lines: [emptyLine(product)],
    customerId: '',
    orderDate: today,
    shipmentDate: '',
    status: 'PENDING',
    discountType: 'PERCENTAGE',
    discountValue: 0,
    paymentStatus: 'CASH',
    invoiceStatus: 'CREATED',
    invoiceDate: today,
    installments: [],
  };
}

function orderLineCount(order: Order) {
  if (order.lines && order.lines.length > 0) return order.lines.length;
  return order.lineCount ?? 1;
}

function orderExtraLineCount(order: Order) {
  return Math.max(0, orderLineCount(order) - 1);
}

function resolvePackForLine(
  product: Product | undefined,
  line: Pick<OrderLineForm, 'packKey' | 'packSize'>,
): ProductPackOption | null {
  if (!product) return null;
  const packs = listProductPacks(product);
  return (
    packs.find((p) => p.key === line.packKey) ??
    packs.find((p) => Math.abs(p.size - line.packSize) < 1e-9) ??
    packs[0] ??
    null
  );
}

function lineFormFromSnapshot(
  snapshot: Pick<
    Order | OrderLine,
    'productId' | 'packSizeSnapshot' | 'packCount' | 'unitSnapshot' | 'product'
  >,
  products: Product[],
): OrderLineForm {
  const product =
    products.find((p) => p.id === snapshot.productId) ?? snapshot.product;
  const packSize = snapshot.packSizeSnapshot ?? 1;
  const matched = resolvePackForLine(product, {
    packKey: '',
    packSize,
  });
  return {
    key: newLineKey(),
    productId: snapshot.productId,
    packKey:
      matched?.key ?? (snapshot.unitSnapshot === 'PCS' ? 'PCS' : ''),
    packSize,
    packCount: snapshot.packCount ?? 1,
  };
}

export default function OrdersPage() {
  const [items, setItems] = useState<Order[]>([]);
  const [summary, setSummary] = useState<OrderSummary | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [form, setForm] = useState<OrderForm>(emptyForm());
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewing, setViewing] = useState<Order | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const listSeq = useRef(0);
  const summarySeq = useRef(0);
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [paymentFilters, setPaymentFilters] = useState<string[]>([]);
  const [orderDateRange, setOrderDateRange] =
    useState<DateRangeValue>(EMPTY_DATE_RANGE);
  const [shipmentDateRange, setShipmentDateRange] =
    useState<DateRangeValue>(EMPTY_DATE_RANGE);
  const [invoiceDateRange, setInvoiceDateRange] =
    useState<DateRangeValue>(EMPTY_DATE_RANGE);
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);
  const [listMeta, setListMeta] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  });

  const hasDateFilters =
    isDateRangeActive(orderDateRange) ||
    isDateRangeActive(shipmentDateRange) ||
    isDateRangeActive(invoiceDateRange);

  const resolvedLines = useMemo(() => {
    return form.lines.map((line) => {
      const product = products.find((p) => p.id === line.productId);
      const packs = product ? listProductPacks(product) : [];
      const pack = resolvePackForLine(product, line);
      const packPrice = pack?.price ?? 0;
      const packSize = pack?.size ?? line.packSize;
      const stockQty = packSize * line.packCount;
      const unitPrice = packSize > 0 ? packPrice / packSize : 0;
      return {
        key: line.key,
        product,
        packs,
        pack,
        packPrice,
        packSize,
        packCount: line.packCount,
        stockQty,
        unitPrice,
        lineSubtotal: roundMoney(unitPrice * stockQty),
      };
    });
  }, [form.lines, products]);

  /** When editing, prior draws are already out of catalog stock — credit them back. */
  const editingStockCredit = useMemo(() => {
    const credit = new Map<string, number>();
    if (!editingId) return credit;
    const order = items.find((o) => o.id === editingId);
    if (!order || order.status === 'CANCELLED') return credit;
    const lines =
      order.lines && order.lines.length > 0 ? order.lines : [order];
    for (const line of lines) {
      const id = line.productId;
      const qty =
        'productQty' in line && typeof line.productQty === 'number'
          ? line.productQty
          : order.productQty;
      credit.set(id, (credit.get(id) ?? 0) + (Number(qty) || 0));
    }
    return credit;
  }, [editingId, items]);

  const productStockStatus = useMemo(() => {
    const demand = new Map<string, number>();
    for (const line of resolvedLines) {
      if (!line.product) continue;
      demand.set(
        line.product.id,
        (demand.get(line.product.id) ?? 0) + line.stockQty,
      );
    }
    const status = new Map<
      string,
      { available: number; demand: number; ok: boolean }
    >();
    for (const [id, dem] of demand) {
      const product = products.find((p) => p.id === id);
      if (!product) continue;
      const available =
        product.stockQty + (editingStockCredit.get(id) ?? 0);
      status.set(id, {
        available,
        demand: dem,
        ok: dem <= available + 1e-9,
      });
    }
    return status;
  }, [resolvedLines, products, editingStockCredit]);

  const hasStockShortage = useMemo(
    () =>
      [...productStockStatus.values()].some((row) => !row.ok),
    [productStockStatus],
  );

  const allLinesReady =
    resolvedLines.length > 0 &&
    resolvedLines.every((line) => Boolean(line.product && line.pack));

  const fulfillment = items;

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(
        key === 'product' || key === 'status' || key === 'payment'
          ? 'asc'
          : 'desc',
      );
    }
    setPage(1);
  }

  function sortMark(key: SortKey) {
    if (sortKey !== key) return undefined;
    return sortDir;
  }

  const preview = useMemo(() => {
    if (!allLinesReady) return null;
    return calculateMultiLineOrderTotals({
      lines: resolvedLines.map((line) => ({
        unitPrice: line.unitPrice,
        productQty: line.stockQty,
      })),
      discountType: form.discountType,
      discountValue: form.discountValue,
    });
  }, [
    allLinesReady,
    resolvedLines,
    form.discountType,
    form.discountValue,
  ]);

  async function loadCatalog() {
    const [productList, customerList] = await Promise.all([
      api<Paginated<Product>>('/products', { searchParams: { limit: 100 } }),
      api<Paginated<Customer>>('/customers', {
        searchParams: { limit: 100 },
      }),
    ]);
    setProducts(productList.items);
    setCustomers(customerList.items);
    return {
      products: productList.items,
      customers: customerList.items,
    };
  }

  /** Catalog is only needed for create/edit — not for browsing the list. */
  async function ensureCatalog() {
    if (products.length > 0 && customers.length > 0) {
      return { products, customers };
    }
    return loadCatalog();
  }

  async function loadSummary() {
    const seq = ++summarySeq.current;
    setSummaryLoading(true);
    try {
      const orderSummary = await api<OrderSummary>('/orders/summary', {
        searchParams: {
          search: debouncedSearch.trim() || undefined,
          status: statusFilters.length > 0 ? statusFilters : undefined,
          paymentStatus: paymentFilters.length > 0 ? paymentFilters : undefined,
          orderDateFrom: orderDateRange.from || undefined,
          orderDateTo: orderDateRange.to || undefined,
          shipmentDateFrom: shipmentDateRange.from || undefined,
          shipmentDateTo: shipmentDateRange.to || undefined,
          invoiceDateFrom: invoiceDateRange.from || undefined,
          invoiceDateTo: invoiceDateRange.to || undefined,
        },
      });
      if (seq !== summarySeq.current) return;
      setSummary(orderSummary);
    } catch (err) {
      if (seq !== summarySeq.current) return;
      setError(err instanceof Error ? err.message : 'Failed to load orders');
    } finally {
      if (seq === summarySeq.current) setSummaryLoading(false);
    }
  }

  async function loadOrders(nextPage = page) {
    const seq = ++listSeq.current;
    setListLoading(true);
    try {
      const orders = await api<Paginated<Order>>('/orders', {
        searchParams: {
          page: nextPage,
          limit: listMeta.limit || 20,
          search: debouncedSearch.trim() || undefined,
          status: statusFilters.length > 0 ? statusFilters : undefined,
          paymentStatus: paymentFilters.length > 0 ? paymentFilters : undefined,
          orderDateFrom: orderDateRange.from || undefined,
          orderDateTo: orderDateRange.to || undefined,
          shipmentDateFrom: shipmentDateRange.from || undefined,
          shipmentDateTo: shipmentDateRange.to || undefined,
          invoiceDateFrom: invoiceDateRange.from || undefined,
          invoiceDateTo: invoiceDateRange.to || undefined,
          sort: sortKey,
          dir: sortDir,
        },
      });
      if (seq !== listSeq.current) return;
      setItems(orders.items);
      setListMeta(orders.meta);
      setPage(orders.meta.page);
      setError('');
    } catch (err) {
      if (seq !== listSeq.current) return;
      setError(err instanceof Error ? err.message : 'Failed to load orders');
    } finally {
      if (seq === listSeq.current) setListLoading(false);
    }
  }

  async function load() {
    await Promise.all([loadSummary(), loadOrders(page)]);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 280);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    void loadSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional summary filter deps
  }, [
    debouncedSearch,
    statusFilters,
    paymentFilters,
    orderDateRange,
    shipmentDateRange,
    invoiceDateRange,
  ]);

  useEffect(() => {
    void loadOrders(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional list query deps
  }, [page, debouncedSearch, statusFilters, paymentFilters, orderDateRange, shipmentDateRange, invoiceDateRange, sortKey, sortDir]);

  function updateLine(
    key: string,
    patch: Partial<Omit<OrderLineForm, 'key'>>,
  ) {
    setForm((f) => ({
      ...f,
      lines: f.lines.map((line) =>
        line.key === key ? { ...line, ...patch } : line,
      ),
    }));
  }

  function onLineProductChange(key: string, productId: string) {
    const product = products.find((p) => p.id === productId);
    const pack = defaultPack(product);
    updateLine(key, {
      productId,
      packKey: pack?.key ?? '',
      packSize: pack?.size ?? 1,
      packCount: 1,
    });
  }

  function onLinePackChange(key: string, packKey: string) {
    const line = form.lines.find((l) => l.key === key);
    if (!line) return;
    const product = products.find((p) => p.id === line.productId);
    const packs = product ? listProductPacks(product) : [];
    const pack = packs.find((p) => p.key === packKey);
    if (!pack) return;
    updateLine(key, {
      packKey: pack.key,
      packSize: pack.size,
    });
  }

  function addLine() {
    setForm((f) => ({
      ...f,
      lines: [...f.lines, emptyLine(products[0])],
    }));
  }

  function removeLine(key: string) {
    setForm((f) => {
      if (f.lines.length <= 1) return f;
      return {
        ...f,
        lines: f.lines.filter((line) => line.key !== key),
      };
    });
  }

  async function startEdit(order: Order) {
    setError('');
    try {
      const [catalog, full] = await Promise.all([
        ensureCatalog(),
        api<Order>(`/orders/${order.id}`),
      ]);
      setViewing(null);
      const lines =
        full.lines && full.lines.length > 0
          ? full.lines.map((line) =>
              lineFormFromSnapshot(line, catalog.products),
            )
          : [lineFormFromSnapshot(full, catalog.products)];
      setFormOpen(true);
      setEditingId(full.id);
      setForm({
        lines,
        customerId: full.customerId ?? full.customer?.id ?? '',
        orderDate: full.orderDate?.slice(0, 10) ?? todayDateInput(),
        shipmentDate: full.shipmentDate?.slice(0, 10) ?? '',
        status: full.status ?? 'PENDING',
        discountType: full.discountType as 'PERCENTAGE' | 'AMOUNT',
        discountValue: full.discountValue,
        paymentStatus: full.paymentStatus,
        invoiceStatus: full.invoiceStatus ?? 'CREATED',
        invoiceDate:
          full.invoiceDate?.slice(0, 10) ??
          full.orderDate?.slice(0, 10) ??
          todayDateInput(),
        installments: cascadeInstallmentDates(
          (full.installments ?? []).map((row) => ({
            amount: row.amount,
            percentValue: 0,
            entryMode: 'AMOUNT' as const,
            installmentDate: row.installmentDate.slice(0, 10),
          })),
          0,
        ),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load order');
    }
  }

  async function startCreate() {
    setError('');
    try {
      const catalog = await ensureCatalog();
      setViewing(null);
      setEditingId(null);
      setForm(emptyForm(catalog.products[0]));
      setFormOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load catalog');
    }
  }

  async function startView(order: Order) {
    setFormOpen(false);
    setEditingId(null);
    setViewing(order);
    setError('');
    try {
      const full = await api<Order>(`/orders/${order.id}`);
      setViewing(full);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load order');
    }
  }

  function resetForm() {
    setFormOpen(false);
    setEditingId(null);
    setViewing(null);
    setForm(emptyForm(products[0]));
  }

  function closeView() {
    setViewing(null);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!allLinesReady) {
      setError('Select a product pack for every product before saving.');
      return;
    }
    if (hasStockShortage) {
      setError(
        'Not enough stock for one or more products. Reduce quantity on the highlighted rows.',
      );
      return;
    }
    try {
      assertFormInstallmentsChronological(form.installments);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid installment dates');
      return;
    }
    setLoading(true);
    try {
      const body = {
        lines: resolvedLines.map((line) => ({
          productId: line.product!.id,
          packSize:
            line.product!.unit === 'PCS' ? undefined : line.packSize,
          packCount: line.packCount,
        })),
        customerId: form.customerId || null,
        orderDate: form.orderDate,
        shipmentDate: form.shipmentDate || null,
        status: form.status,
        discountType: form.discountType,
        discountValue: form.discountValue,
        paymentStatus: form.paymentStatus,
        invoiceStatus: form.invoiceStatus,
        invoiceDate: form.invoiceDate || null,
        installments: resolvedInstallmentRows(
          form.installments,
          preview?.totalOrderValue ?? 0,
        )
          .filter((row) => row.amount > 0 && row.installmentDate)
          .map((row) => ({
            amount: row.amount,
            installmentDate: row.installmentDate,
          })),
      };
      if (editingId) {
        await api(`/orders/${editingId}`, { method: 'PATCH', body });
      } else {
        await api('/orders', { method: 'POST', body });
      }
      resetForm();
      await load();
    } catch (err) {
      const raw =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Save failed';
      setError(
        raw.startsWith('Insufficient stock')
          ? 'Not enough stock for one or more products. Reduce quantity on the highlighted rows.'
          : raw,
      );
    } finally {
      setLoading(false);
    }
  }

  const pulseRevenue = summary
    ? formatMoneyParts(summary.totalRevenue)
    : null;
  const pulsePacks = summary
    ? formatCompactQtyParts(summary.productsSold)
    : null;

  return (
    <section>
      {formOpen || viewing ? (
        <PageHeader
          title="Orders"
          description="Create orders from catalog packs, track invoices, and record installment payments."
        />
      ) : (
        <header
          className={`umkm-stage${summaryLoading && !summary ? ' is-loading' : ''}`}
          aria-busy={(summaryLoading && !summary) || undefined}
        >
          <div className="umkm-stage-top">
            <div className="umkm-stage-copy">
              <h1>Orders</h1>
              <p>
                {summary ? (
                  <>
                    <time dateTime={summary.earliestOrderDate ?? undefined}>
                      {formatDateLabel(summary.earliestOrderDate)}
                    </time>
                    <span className="umkm-stage-dash" aria-hidden>
                      –
                    </span>
                    <time dateTime={summary.latestOrderDate ?? undefined}>
                      {formatDateLabel(summary.latestOrderDate)}
                    </time>
                    <span className="umkm-stage-sep" aria-hidden>
                      ·
                    </span>
                    Non-cancelled volume and health
                  </>
                ) : (
                  'Create orders from catalog packs, track invoices, and payments.'
                )}
              </p>
            </div>
            <button
              type="button"
              className="umkm-btn"
              onClick={startCreate}
              disabled={products.length === 0}
            >
              Add order
            </button>
          </div>

          <div className="umkm-stage-body">
            <dl className="umkm-stage-volume">
              <div className="umkm-stage-stat is-hero">
                <dt>Revenue</dt>
                <dd>
                  <AppTooltip
                    label="Revenue"
                    value={
                      summary ? formatMoneyExact(summary.totalRevenue) : undefined
                    }
                    description="Total sales from non-cancelled orders in the current filter."
                  >
                    {pulseRevenue ? (
                      <>
                        <b>{pulseRevenue.figure}</b>
                        {pulseRevenue.unit ? (
                          <small>{pulseRevenue.unit}</small>
                        ) : null}
                      </>
                    ) : (
                      <b>···</b>
                    )}
                  </AppTooltip>
                </dd>
              </div>
              <div className="umkm-stage-stat">
                <dt>Orders</dt>
                <dd>
                  <AppTooltip
                    label="Orders"
                    description="How many non-cancelled orders match the current filter. Cancelled orders still appear in the list and Cancel rate."
                  >
                    {summary
                      ? summary.orderCount.toLocaleString('en-US')
                      : '···'}
                  </AppTooltip>
                </dd>
              </div>
              <div className="umkm-stage-stat">
                <dt>Packs sold</dt>
                <dd>
                  <AppTooltip
                    label="Packs sold"
                    value={
                      summary
                        ? formatQty(summary.productsSold)
                        : undefined
                    }
                    description="Total pack quantity sold across non-cancelled orders in the current filter."
                  >
                    {pulsePacks ? (
                      <>
                        <b>{pulsePacks.figure}</b>
                        {pulsePacks.unit ? (
                          <small>{pulsePacks.unit}</small>
                        ) : null}
                      </>
                    ) : (
                      <b>···</b>
                    )}
                  </AppTooltip>
                </dd>
              </div>
            </dl>

            <dl className="umkm-stage-rates" aria-label="Order rates">
              {(
                [
                  [
                    'tone-cancel',
                    'Cancel',
                    'Share of filtered orders that were cancelled.',
                    'Cancelled ÷ all orders in the current filter',
                    summary?.cancellationRate,
                  ],
                  [
                    'tone-margin',
                    'Margin',
                    'Estimated profit as a share of revenue when cost is known.',
                    'Profit ÷ revenue on non-cancelled orders with cost',
                    summary?.profitMarginRate,
                  ],
                  [
                    'tone-discount',
                    'Discount',
                    'How much of the list price was given away as discounts.',
                    'Discount ÷ pre-discount line totals on non-cancelled orders',
                    summary?.discountRate,
                  ],
                  [
                    'tone-paid',
                    'Paid in full',
                    'Share of active filtered orders already paid in full.',
                    'Fully paid ÷ non-cancelled orders in the current filter',
                    summary?.fullPaymentRate,
                  ],
                ] as const
              ).map(([tone, shortLabel, description, detail, value]) => (
                <AppTooltip
                  key={tone}
                  className="umkm-tip-block"
                  disabled={!summary}
                  tone={
                    tone === 'tone-paid'
                      ? 'paid'
                      : tone === 'tone-margin'
                        ? 'margin'
                        : tone === 'tone-discount'
                          ? 'discount'
                          : 'cancel'
                  }
                  label={shortLabel}
                  value={
                    summary ? formatRatePercent(value) : undefined
                  }
                  description={description}
                  detail={detail}
                >
                  <div
                    className={`umkm-stage-rate ${tone}`}
                    style={rateMeterStyle(value, summaryLoading)}
                  >
                    <div className="umkm-stage-rate-row">
                      <dt>{shortLabel}</dt>
                      <dd>
                        {summary ? formatRatePercent(value) : '···'}
                      </dd>
                    </div>
                    <span className="umkm-stage-meter" aria-hidden>
                      <i />
                    </span>
                  </div>
                </AppTooltip>
              ))}
            </dl>
          </div>
        </header>
      )}
      {error ? <div className="umkm-error">{error}</div> : null}

      {viewing ? (
        <ContentSection
          className="umkm-form-panel umkm-view-sheet umkm-order-sheet"
          eyebrow="Order"
          title={viewing.product?.name ?? viewing.productId}
          description={
            orderExtraLineCount(viewing) > 0
              ? `+${orderExtraLineCount(viewing)} more · Fulfillment, invoice, and payment progress for this order.`
              : 'Fulfillment, invoice, and payment progress for this order.'
          }
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
              const viewLines =
                viewing.lines && viewing.lines.length > 0
                  ? viewing.lines
                  : [
                      {
                        productId: viewing.productId,
                        product: viewing.product,
                        productQty: viewing.productQty,
                        qty: viewing.qty,
                        packSizeSnapshot: viewing.packSizeSnapshot,
                        packPriceSnapshot: viewing.packPriceSnapshot,
                        packCount: viewing.packCount,
                        unit: viewing.unit,
                        unitSnapshot: viewing.unitSnapshot,
                        price: viewing.price,
                        unitPriceSnapshot: viewing.unitPriceSnapshot,
                        stockQtySnapshot: viewing.stockQtySnapshot,
                        lineTotal: viewing.lineTotal,
                      } satisfies OrderLine,
                    ];
              const paid =
                viewing.paidAmount ??
                (viewing.installments ?? []).reduce(
                  (sum, row) => sum + row.amount,
                  0,
                );
              const remaining =
                viewing.remainingAmount ??
                remainingFromInstallments(
                  viewing.totalOrderValue,
                  viewing.installments ?? [],
                );
              const paidPct =
                viewing.totalOrderValue > 0
                  ? Math.min(
                      100,
                      Math.round((paid / viewing.totalOrderValue) * 1000) / 10,
                    )
                  : 0;
              const extra = orderExtraLineCount(viewing);
              return (
                <>
                  <ViewIdentity
                    contextLabel="Status"
                    chips={
                      <>
                        <ViewChip tone="accent">
                          {orderStatusLabel(viewing.status)}
                        </ViewChip>
                        <ViewChip>
                          {paymentStatusLabel(viewing.paymentStatus)}
                        </ViewChip>
                        <ViewChip>
                          {invoiceStatusLabel(viewing.invoiceStatus)}
                        </ViewChip>
                        {extra > 0 ? (
                          <ViewChip>+{extra} more</ViewChip>
                        ) : null}
                      </>
                    }
                    metricLabel="Remaining to pay"
                    metricValue={formatMoney(remaining)}
                    metricHint={`${formatMoney(paid)} paid of ${formatMoney(viewing.totalOrderValue)}`}
                  />

                  <EntityIdDetail
                    id={viewing.sku || viewing.id}
                    label="Order ID"
                  />

                  {viewing.customer ? (
                    <ViewBlock
                      title="Customer"
                      description="CRM contact on this order."
                    >
                      <ViewFacts
                        columns={2}
                        items={[
                          {
                            key: 'name',
                            label: 'Name',
                            value: viewing.customer.name,
                          },
                          {
                            key: 'company',
                            label: 'Company',
                            value: viewing.customer.companyName || '—',
                          },
                        ]}
                      />
                    </ViewBlock>
                  ) : null}

                  <div
                    className="umkm-order-pay-progress"
                    role="meter"
                    aria-valuenow={paidPct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${formatPct(paidPct)}% paid`}
                  >
                    <div className="umkm-order-pay-progress-meta">
                      <span>Payment progress</span>
                      <strong>{formatPct(paidPct)}%</strong>
                    </div>
                    <div className="umkm-progress umkm-order-pay-bar">
                      <div
                        className="umkm-progress-bar"
                        style={{ width: `${paidPct}%` }}
                      />
                    </div>
                  </div>

                  <ViewBlock
                    title={viewLines.length > 1 ? 'Products' : 'Product'}
                    description="Pack sizes locked when this order was saved."
                  >
                    <ul className="umkm-order-installment-view">
                      {viewLines.map((line, index) => {
                        const u = unitShort(line.unit ?? line.unitSnapshot);
                        const packSize = line.packSizeSnapshot ?? 1;
                        const packCount = line.packCount ?? 1;
                        const packLabel =
                          packSize === 1 &&
                          (line.unit ?? line.unitSnapshot) === 'PCS'
                            ? '1 pcs'
                            : `${formatQty(packSize)} ${u}`;
                        return (
                          <li key={line.id ?? `${line.productId}-${index}`}>
                            <span className="umkm-order-installment-idx">
                              {index + 1}
                            </span>
                            <div className="umkm-order-installment-main">
                              <strong>
                                {line.product?.name ?? line.productId}
                              </strong>
                              <span>
                                {packLabel} × {packCount}
                              </span>
                            </div>
                            <div className="umkm-order-installment-remain">
                              <strong>{formatMoney(line.lineTotal)}</strong>
                              <span>Subtotal</span>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </ViewBlock>

                  <ViewBlock
                    title="Timeline"
                    description="Key dates for this order."
                  >
                    <ViewFacts
                      columns={3}
                      items={[
                        {
                          key: 'order',
                          label: 'Ordered',
                          value: viewing.orderDate?.slice(0, 10) ?? '—',
                        },
                        {
                          key: 'ship',
                          label: 'Shipment',
                          value: viewing.shipmentDate?.slice(0, 10) ?? '—',
                        },
                        {
                          key: 'invoice',
                          label: 'Invoice',
                          value: viewing.invoiceDate?.slice(0, 10) ?? '—',
                        },
                      ]}
                    />
                  </ViewBlock>

                  <ViewBlock title="Totals">
                    <OrderTotalsReceipt
                      lineTotal={viewing.lineTotal}
                      orderTotal={viewing.totalOrderValue}
                      discountType={viewing.discountType}
                      discountValue={viewing.discountValue}
                    />
                  </ViewBlock>

                  <ViewBlock
                    title="Installments"
                    description={
                      (viewing.installments ?? []).length > 0
                        ? 'Each payment shows balance left after it clears.'
                        : 'No installments yet — add them when editing.'
                    }
                  >
                    {(viewing.installments ?? []).length > 0 ? (
                      <ul className="umkm-order-installment-view">
                        {installmentProgressRows(
                          viewing.totalOrderValue,
                          viewing.installments ?? [],
                        ).map((row) => (
                          <li key={`${row.installmentDate}-${row.index}`}>
                            <span className="umkm-order-installment-idx">
                              {row.seq}
                            </span>
                            <div className="umkm-order-installment-main">
                              <strong>{formatMoney(row.amount)}</strong>
                              <span>
                                {row.installmentDate.slice(0, 10)}
                                {' · '}
                                {formatPct(
                                  percentOfTotal(
                                    row.amount,
                                    viewing.totalOrderValue,
                                  ),
                                )}
                                % of total
                              </span>
                            </div>
                            <div className="umkm-order-installment-remain">
                              <strong>{formatMoney(row.remaining)}</strong>
                              <span>
                                {formatPct(row.remainingPct)}% remaining
                              </span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="umkm-sub" style={{ margin: 0 }}>
                        Remaining balance equals the full order total.
                      </p>
                    )}
                  </ViewBlock>
                </>
              );
            })()}
          </ViewSheetBody>
        </ContentSection>
      ) : null}

      {formOpen ? (
        <ContentSection
          className="umkm-form-panel umkm-order-sheet"
          eyebrow="Order"
          title={editingId ? 'Modify order' : 'Create order'}
          description="Lock a pack, set fulfillment, then track invoice and payments."
          actions={
            <button
              type="button"
              className="umkm-btn secondary"
              onClick={resetForm}
            >
              Cancel
            </button>
          }
        >
          <form onSubmit={onSubmit} className="umkm-order-form">
            {preview ? (
              <div className="umkm-order-summary" aria-live="polite">
                <div>
                  <span>Subtotal</span>
                  <strong>{formatMoney(preview.lineTotal)}</strong>
                </div>
                <div>
                  <span>Total</span>
                  <strong>{formatMoney(preview.totalOrderValue)}</strong>
                </div>
                <div>
                  <span>Paid</span>
                  <strong>
                    {formatMoney(
                      roundMoney(
                        resolvedInstallmentRows(
                          form.installments,
                          preview.totalOrderValue,
                        ).reduce((sum, row) => sum + row.amount, 0),
                      ),
                    )}
                  </strong>
                </div>
                <div className="is-accent">
                  <span>Remaining</span>
                  <strong>
                    {formatMoney(
                      remainingFromInstallments(
                        preview.totalOrderValue,
                        resolvedInstallmentRows(
                          form.installments,
                          preview.totalOrderValue,
                        ),
                      ),
                    )}
                  </strong>
                </div>
              </div>
            ) : null}

            <FormSection
              title="Products"
              description="Pick a product, set quantity. Prices lock when you save."
            >
              <div className="umkm-order-product-list">
                {form.lines.map((line, index) => {
                  const resolved = resolvedLines[index];
                  const product = resolved?.product;
                  const packs = resolved?.packs ?? [];
                  const activePack = resolved?.pack ?? null;
                  const u = unitShort(product?.unit);
                  const showSizePicker =
                    product?.unit !== 'PCS' && packs.length > 1;
                  const stock = product
                    ? productStockStatus.get(product.id)
                    : undefined;
                  const stockShort = Boolean(stock && !stock.ok);
                  const maxPacks =
                    activePack && stock && activePack.size > 0
                      ? Math.floor(
                          (stock.available + 1e-9) / activePack.size,
                        )
                      : null;
                  const qtyAmount = packs.length > 0 ? (
                    <div className="umkm-order-buy-end">
                      <label
                        className={`umkm-order-qty${stockShort ? ' is-stock-short' : ''}`}
                      >
                        <span className="umkm-order-qty-label" aria-hidden>
                          Qty
                        </span>
                        <span className="umkm-sr-only">Quantity</span>
                        <input
                          type="number"
                          min={0.0001}
                          step="any"
                          value={line.packCount}
                          aria-invalid={stockShort}
                          onChange={(e) =>
                            updateLine(line.key, {
                              packCount: Number(e.target.value),
                            })
                          }
                          required
                        />
                      </label>
                      <strong
                        className={`umkm-order-product-amount${activePack && resolved ? '' : ' is-empty'}`}
                      >
                        {activePack && resolved
                          ? formatMoney(resolved.lineSubtotal)
                          : '—'}
                      </strong>
                    </div>
                  ) : null;
                  const meta =
                    packs.length === 0 ? (
                      <p className="umkm-order-product-hint umkm-order-product-hint-warn">
                        No pack prices — set them on the product first.
                      </p>
                    ) : product && activePack && resolved ? (
                      <div
                        className="umkm-order-product-meta"
                        role="group"
                        aria-label={`Details for ${product.name}`}
                      >
                        {product.unit !== 'PCS' ? (
                          <div className="umkm-order-product-fact">
                            <span className="umkm-order-product-fact-label">
                              Pack
                            </span>
                            <span className="umkm-order-product-fact-value">
                              {formatQty(activePack.size)}
                              {u}
                            </span>
                          </div>
                        ) : null}
                        <div className="umkm-order-product-fact">
                          <span className="umkm-order-product-fact-label">
                            Price
                          </span>
                          <span className="umkm-order-product-fact-value is-price">
                            {formatMoney(resolved.packPrice)}
                            <span className="umkm-order-product-fact-unit">
                              {' '}
                              each
                            </span>
                          </span>
                        </div>
                        <div
                          className={`umkm-order-product-fact${stockShort ? ' is-stock-short' : ''}`}
                        >
                          <span className="umkm-order-product-fact-label">
                            Stock
                          </span>
                          <span className="umkm-order-product-fact-value">
                            {formatQty(stock?.available ?? product.stockQty)}
                            {u ? (
                              <span className="umkm-order-product-fact-unit">
                                {' '}
                                {u}
                              </span>
                            ) : null}
                          </span>
                        </div>
                      </div>
                    ) : product ? (
                      <div
                        className="umkm-order-product-meta"
                        role="group"
                        aria-label={`Stock for ${product.name}`}
                      >
                        <div className="umkm-order-product-fact">
                          <span className="umkm-order-product-fact-label">
                            Stock
                          </span>
                          <span className="umkm-order-product-fact-value">
                            {formatQty(product.stockQty)}
                            {u ? (
                              <span className="umkm-order-product-fact-unit">
                                {' '}
                                {u}
                              </span>
                            ) : null}
                          </span>
                        </div>
                      </div>
                    ) : null;
                  return (
                    <div
                      key={line.key}
                      className={`umkm-order-product-row${stockShort ? ' is-stock-short' : ''}`}
                    >
                      <div className="umkm-order-product-row-main">
                        <span className="umkm-order-product-idx" aria-hidden>
                          {index + 1}
                        </span>
                        <div className="umkm-order-product-block">
                          <div className="umkm-field umkm-order-product-select">
                            <label className="umkm-sr-only">
                              Product {index + 1}
                            </label>
                            <select
                              value={line.productId}
                              onChange={(e) =>
                                onLineProductChange(line.key, e.target.value)
                              }
                              required
                            >
                              {products.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        {!showSizePicker ? qtyAmount : null}
                        {form.lines.length > 1 ? (
                          <button
                            type="button"
                            className="umkm-icon-btn danger umkm-order-product-remove"
                            onClick={() => removeLine(line.key)}
                            title="Remove product"
                            aria-label={`Remove product ${index + 1}`}
                          >
                            <IconTrash />
                          </button>
                        ) : null}
                      </div>

                      {showSizePicker && packs.length > 0 ? (
                        <div className="umkm-order-product-buy">
                          <div
                            className="umkm-order-size-chips"
                            role="radiogroup"
                            aria-label={`Size for ${product?.name ?? `product ${index + 1}`}`}
                          >
                            {packs.map((p) => (
                              <button
                                key={p.key}
                                type="button"
                                role="radio"
                                aria-checked={activePack?.key === p.key}
                                className={`umkm-order-size-chip${activePack?.key === p.key ? ' is-active' : ''}`}
                                onClick={() =>
                                  onLinePackChange(line.key, p.key)
                                }
                              >
                                {formatQty(p.size)}
                                {u}
                              </button>
                            ))}
                          </div>
                          {qtyAmount}
                        </div>
                      ) : null}
                      {meta}
                      {stockShort && stock ? (
                        <p
                          className="umkm-order-product-stock-alert"
                          role="alert"
                        >
                          Not enough stock — need {formatQty(stock.demand)}
                          {u ? ` ${u}` : ''} but only{' '}
                          {formatQty(stock.available)}
                          {u ? ` ${u}` : ''} available
                          {maxPacks != null && maxPacks >= 0
                            ? ` (max qty ${formatQty(maxPacks)})`
                            : ''}
                          .
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                className="umkm-btn secondary umkm-order-add-product"
                onClick={addLine}
                disabled={products.length === 0}
              >
                + Add product
              </button>
            </FormSection>

            <FormSection
              title="Fulfillment"
              description="Customer, dates, and how this order is progressing."
            >
              <div className="umkm-grid two">
                <div className="umkm-field" style={{ gridColumn: '1 / -1' }}>
                  <label>Customer</label>
                  <select
                    value={form.customerId}
                    onChange={(e) =>
                      setForm({ ...form, customerId: e.target.value })
                    }
                    aria-label="Customer"
                  >
                    <option value="">No customer</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                        {c.companyName ? ` · ${c.companyName}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="umkm-field">
                  <label>Order date</label>
                  <input
                    type="date"
                    value={form.orderDate}
                    onChange={(e) =>
                      setForm({ ...form, orderDate: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="umkm-field">
                  <label>Shipment date</label>
                  <input
                    type="date"
                    value={form.shipmentDate}
                    onChange={(e) =>
                      setForm({ ...form, shipmentDate: e.target.value })
                    }
                  />
                </div>
                <div className="umkm-field">
                  <label>Order status</label>
                  <OptionChips
                    aria-label="Order status"
                    value={form.status as (typeof ORDER_STATUSES)[number]}
                    onChange={(status) => setForm({ ...form, status })}
                    options={ORDER_STATUSES.map((t) => ({
                      value: t,
                      label: LABELS.orderStatus[t],
                    }))}
                  />
                </div>
                <div className="umkm-field">
                  <label>Payment mode</label>
                  <OptionChips
                    aria-label="Payment mode"
                    value={
                      form.paymentStatus as (typeof PAYMENT_STATUSES)[number]
                    }
                    onChange={(paymentStatus) =>
                      setForm({ ...form, paymentStatus })
                    }
                    options={PAYMENT_STATUSES.map((t) => ({
                      value: t,
                      label: LABELS.paymentStatus[t],
                    }))}
                  />
                </div>
              </div>
            </FormSection>

            <FormSection
              title="Pricing"
              description="Optional discount on the whole order."
            >
              <div className="umkm-grid two">
                <div className="umkm-field">
                  <label>Discount type</label>
                  <OptionChips
                    aria-label="Discount type"
                    value={form.discountType as (typeof DISCOUNT_TYPES)[number]}
                    onChange={(discountType) => {
                      if (!discountType) return;
                      setForm({ ...form, discountType });
                    }}
                    options={DISCOUNT_TYPES.map((t) => ({
                      value: t,
                      label: LABELS.discountType[t],
                    }))}
                  />
                </div>
                <div className="umkm-field">
                  <label>
                    {form.discountType === 'PERCENTAGE'
                      ? 'Discount %'
                      : 'Discount amount'}
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.0001"
                    value={form.discountValue}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        discountValue: Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>
              {preview ? (
                <OrderTotalsReceipt
                  lineTotal={preview.lineTotal}
                  orderTotal={preview.totalOrderValue}
                  discountType={form.discountType}
                  discountValue={form.discountValue}
                />
              ) : null}
            </FormSection>

            <FormSection
              title="Invoice & payments"
              description="Invoice and payments. Use Amt or % for each installment — remaining updates live."
            >
              <div className="umkm-grid two">
                <div className="umkm-field">
                  <label>Invoice status</label>
                  <OptionChips
                    aria-label="Invoice status"
                    value={
                      form.invoiceStatus as (typeof INVOICE_STATUSES)[number]
                    }
                    onChange={(invoiceStatus) =>
                      setForm({ ...form, invoiceStatus })
                    }
                    options={INVOICE_STATUSES.map((t) => ({
                      value: t,
                      label: LABELS.invoiceStatus[t],
                    }))}
                  />
                </div>
                <div className="umkm-field">
                  <label>Invoice date</label>
                  <input
                    type="date"
                    value={form.invoiceDate}
                    onChange={(e) =>
                      setForm({ ...form, invoiceDate: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="umkm-order-installment-head">
                <h4>Installments</h4>
                <button
                  type="button"
                  className="umkm-btn secondary"
                  onClick={() => {
                    const lastDate =
                      form.installments[form.installments.length - 1]
                        ?.installmentDate;
                    setForm({
                      ...form,
                      installments: [
                        ...form.installments,
                        emptyInstallmentRow(lastDate),
                      ],
                    });
                  }}
                >
                  Add payment
                </button>
              </div>

              {form.installments.length === 0 ? (
                <p className="umkm-sub" style={{ margin: '0.35rem 0 0' }}>
                  No payments yet. Remaining equals the order total.
                </p>
              ) : (
                <ul className="umkm-installment-list">
                  {(() => {
                    const orderTotal = preview?.totalOrderValue ?? 0;
                    const resolved = resolvedInstallmentRows(
                      form.installments,
                      orderTotal,
                    );
                    const progressByIndex = new Map(
                      installmentProgressRows(orderTotal, resolved).map(
                        (row) => [row.index, row],
                      ),
                    );

                    function setEntryMode(
                      index: number,
                      entryMode: InstallmentEntryMode,
                    ) {
                      const next = [...form.installments];
                      if (entryMode === 'PERCENTAGE') {
                        next[index] = {
                          ...next[index],
                          entryMode,
                          percentValue:
                            orderTotal > 0
                              ? percentOfTotal(
                                  Number(next[index].amount) || 0,
                                  orderTotal,
                                )
                              : next[index].percentValue,
                        };
                      } else {
                        next[index] = {
                          ...next[index],
                          entryMode,
                          amount: resolveInstallmentAmount(
                            { ...next[index], entryMode: 'PERCENTAGE' },
                            orderTotal,
                          ),
                        };
                      }
                      setForm({ ...form, installments: next });
                    }

                    return form.installments.map((row, index) => {
                      const progress = progressByIndex.get(index);
                      const resolvedAmount = resolved[index]?.amount ?? 0;
                      const isPct = row.entryMode === 'PERCENTAGE';
                      const sharePct = percentOfTotal(resolvedAmount, orderTotal);
                      const valueShown = isPct
                        ? row.percentValue === 0
                          ? ''
                          : row.percentValue
                        : row.amount === 0
                          ? ''
                          : row.amount;
                      return (
                        <li key={index} className="umkm-installment-row">
                          <div className="umkm-installment-card">
                            <div className="umkm-installment-card-head">
                              <span className="umkm-order-installment-idx">
                                {index + 1}
                              </span>
                              <div className="umkm-installment-card-title">
                                <strong>Payment {index + 1}</strong>
                                <span>
                                  {isPct ? 'Percent of total' : 'Fixed amount'}
                                </span>
                              </div>
                              <button
                                type="button"
                                className="umkm-installment-remove"
                                aria-label={`Remove payment ${index + 1}`}
                                onClick={() =>
                                  setForm({
                                    ...form,
                                    installments: form.installments.filter(
                                      (_, i) => i !== index,
                                    ),
                                  })
                                }
                              >
                                <svg
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  aria-hidden
                                >
                                  <path
                                    d="M6 6l12 12M18 6 6 18"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                    strokeLinecap="round"
                                  />
                                </svg>
                              </button>
                            </div>

                            <div
                              className="umkm-installment-mode umkm-installment-mode-block"
                              role="radiogroup"
                              aria-label={`Payment ${index + 1} mode`}
                            >
                              <button
                                type="button"
                                role="radio"
                                aria-checked={!isPct}
                                className={!isPct ? 'is-active' : undefined}
                                onClick={() => setEntryMode(index, 'AMOUNT')}
                              >
                                Amount
                              </button>
                              <button
                                type="button"
                                role="radio"
                                aria-checked={isPct}
                                className={isPct ? 'is-active' : undefined}
                                onClick={() =>
                                  setEntryMode(index, 'PERCENTAGE')
                                }
                              >
                                Percent
                              </button>
                            </div>

                            <label className="umkm-installment-field umkm-installment-value-field">
                              <span>
                                {isPct ? 'Percent of total' : 'Amount'}
                              </span>
                              <div className="umkm-installment-input-group">
                                <input
                                  type="number"
                                  min={0}
                                  max={isPct ? 100 : undefined}
                                  step={isPct ? '0.01' : '0.0001'}
                                  inputMode="decimal"
                                  placeholder="0"
                                  aria-label={
                                    isPct
                                      ? `Payment ${index + 1} percent of total`
                                      : `Payment ${index + 1} amount`
                                  }
                                  value={valueShown}
                                  onChange={(e) => {
                                    const next = [...form.installments];
                                    const raw = e.target.value;
                                    const n =
                                      raw === '' ? 0 : Number(raw) || 0;
                                    next[index] = isPct
                                      ? { ...next[index], percentValue: n }
                                      : { ...next[index], amount: n };
                                    setForm({ ...form, installments: next });
                                  }}
                                />
                                <span
                                  className="umkm-installment-suffix"
                                  aria-hidden
                                >
                                  {isPct ? '%' : ''}
                                </span>
                              </div>
                            </label>

                            <label className="umkm-installment-field umkm-installment-date-field">
                              <span>Date</span>
                              <input
                                type="date"
                                className="umkm-installment-date"
                                aria-label={`Payment ${index + 1} date`}
                                min={
                                  index > 0
                                    ? form.installments[index - 1]
                                        .installmentDate
                                    : undefined
                                }
                                title={
                                  index > 0
                                    ? `On or after payment ${index} (${form.installments[index - 1].installmentDate})`
                                    : undefined
                                }
                                value={row.installmentDate}
                                onChange={(e) => {
                                  const next = [...form.installments];
                                  const minDate =
                                    index > 0
                                      ? next[index - 1].installmentDate
                                      : '';
                                  let installmentDate = e.target.value;
                                  if (minDate && installmentDate < minDate) {
                                    installmentDate = minDate;
                                  }
                                  next[index] = {
                                    ...next[index],
                                    installmentDate,
                                  };
                                  setForm({
                                    ...form,
                                    installments: cascadeInstallmentDates(
                                      next,
                                      index,
                                    ),
                                  });
                                }}
                              />
                            </label>

                            {resolvedAmount > 0 || progress ? (
                              <div className="umkm-installment-meta">
                                <div className="umkm-installment-meta-stats">
                                  <div>
                                    <span>Pays</span>
                                    <strong>
                                      {formatMoney(resolvedAmount)}
                                      {orderTotal > 0 ? (
                                        <em> {formatPct(sharePct)}%</em>
                                      ) : null}
                                    </strong>
                                  </div>
                                  {progress ? (
                                    <div>
                                      <span>Left</span>
                                      <strong>
                                        {formatMoney(progress.remaining)}
                                        <em>
                                          {' '}
                                          {formatPct(progress.remainingPct)}%
                                        </em>
                                      </strong>
                                    </div>
                                  ) : null}
                                </div>
                                {progress && orderTotal > 0 ? (
                                  <div
                                    className="umkm-installment-mini-bar"
                                    aria-hidden
                                  >
                                    <div
                                      style={{
                                        width: `${Math.min(
                                          100,
                                          Math.max(
                                            0,
                                            100 - progress.remainingPct,
                                          ),
                                        )}%`,
                                      }}
                                    />
                                  </div>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        </li>
                      );
                    });
                  })()}
                </ul>
              )}
            </FormSection>

            <div className="umkm-actions">
              <button
                className="umkm-btn"
                type="submit"
                disabled={loading || !allLinesReady || hasStockShortage}
              >
                {loading
                  ? 'Saving…'
                  : editingId
                    ? 'Update order'
                    : 'Add order'}
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

      {!formOpen && !viewing ? (
      <ContentSection
        eyebrow="Fulfillment"
        title="Orders"
        description="Search and sort pack-based orders by date, status, payment, and total."
      >
        <div className="umkm-catalog-toolbar">
          <div className="umkm-field umkm-catalog-search">
            <label htmlFor="order-search">Search</label>
            <input
              id="order-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Product, status, payment, date…"
              autoComplete="off"
            />
          </div>
          <CollapsibleFilters
            activeCount={
              (statusFilters.length > 0 ? 1 : 0) +
              (paymentFilters.length > 0 ? 1 : 0) +
              (isDateRangeActive(orderDateRange) ? 1 : 0) +
              (isDateRangeActive(shipmentDateRange) ? 1 : 0) +
              (isDateRangeActive(invoiceDateRange) ? 1 : 0)
            }
          >
            <MultiSelectFilter
              id="order-status-filter"
              label="Status"
              allLabel="All statuses"
              value={statusFilters}
              onChange={(next) => {
                setStatusFilters(next);
                setPage(1);
              }}
              options={ORDER_STATUSES.map((status) => ({
                value: status,
                label: orderStatusLabel(status),
              }))}
            />
            <MultiSelectFilter
              id="order-payment-filter"
              label="Payment"
              allLabel="All payments"
              value={paymentFilters}
              onChange={(next) => {
                setPaymentFilters(next);
                setPage(1);
              }}
              options={PAYMENT_STATUSES.map((status) => ({
                value: status,
                label: paymentStatusLabel(status),
              }))}
            />
            <DateRangeFilter
              id="order-date-filter"
              label="Order date"
              allLabel="All order dates"
              value={orderDateRange}
              onChange={(next) => {
                setOrderDateRange(next);
                setPage(1);
              }}
            />
            <DateRangeFilter
              id="shipment-date-filter"
              label="Shipment date"
              allLabel="All shipment dates"
              value={shipmentDateRange}
              onChange={(next) => {
                setShipmentDateRange(next);
                setPage(1);
              }}
            />
            <DateRangeFilter
              id="invoice-date-filter"
              label="Invoice date"
              allLabel="All invoice dates"
              value={invoiceDateRange}
              onChange={(next) => {
                setInvoiceDateRange(next);
                setPage(1);
              }}
            />
          </CollapsibleFilters>
          <p className="umkm-catalog-count">
            {listLoading
              ? 'Loading…'
              : listMeta.total === 0
                ? '0 orders'
                : `Showing ${(listMeta.page - 1) * listMeta.limit + 1}–${Math.min(listMeta.page * listMeta.limit, listMeta.total)} of ${listMeta.total.toLocaleString('en-US')}`}
          </p>
        </div>

        {listMeta.total === 0 && !listLoading ? (
          debouncedSearch ||
          statusFilters.length > 0 ||
          paymentFilters.length > 0 ||
          hasDateFilters ? (
            <EmptyState
              title="No matches"
              description="Try another search or clear the filters."
            />
          ) : (
            <EmptyState
              title="No orders yet"
              description="Create an order from a product pack to track fulfillment and stock."
            />
          )
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
                    <th>Pack</th>
                    <th>
                      <button
                        type="button"
                        className="umkm-th-sort"
                        onClick={() => toggleSort('status')}
                        data-dir={sortMark('status')}
                      >
                        Status
                      </button>
                    </th>
                    <th className="is-num">
                      <button
                        type="button"
                        className="umkm-th-sort"
                        onClick={() => toggleSort('total')}
                        data-dir={sortMark('total')}
                      >
                        Total
                      </button>
                    </th>
                    <th>
                      <button
                        type="button"
                        className="umkm-th-sort"
                        onClick={() => toggleSort('payment')}
                        data-dir={sortMark('payment')}
                      >
                        Payment
                      </button>
                    </th>
                    <th className="is-num">
                      <span className="umkm-th-label">Paid</span>
                    </th>
                    <th className="is-actions">
                      <span className="umkm-th-label">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {fulfillment.map((o) => {
                    const u = unitShort(o.unit ?? o.unitSnapshot);
                    const packSize = o.packSizeSnapshot ?? 1;
                    const packCount = o.packCount ?? 1;
                    const qty = o.qty ?? o.productQty;
                    const packPrice =
                      o.packPriceSnapshot ?? o.price ?? o.unitPriceSnapshot;
                    const extra = orderExtraLineCount(o);
                    const paid = orderPaidAmount(o);
                    const paymentRate = orderPaymentRatePercent(o);
                    return (
                      <tr
                        key={o.id}
                        className="umkm-catalog-row"
                        tabIndex={0}
                        onClick={() => startView(o)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            startView(o);
                          }
                        }}
                      >
                        <td>
                          <div className="umkm-order-date-cell is-compact">
                            <span className="umkm-order-date-primary">
                              {o.orderDate?.slice(0, 10) ?? '—'}
                            </span>
                            <EntityIdBadge
                              id={o.sku || o.id}
                              literal={Boolean(o.sku)}
                              compact
                              soft
                            />
                          </div>
                        </td>
                        <td>
                          <div className="umkm-product-cell">
                            <span className="umkm-product-name">
                              {o.product?.name ?? o.productId}
                            </span>
                            <p className="umkm-product-meta-line">
                              <span>
                                {unitLabel(o.unit ?? o.unitSnapshot) || u || '—'}
                              </span>
                              {extra > 0 ? (
                                <span className="umkm-product-more">
                                  +{extra} more
                                </span>
                              ) : null}
                            </p>
                          </div>
                        </td>
                        <td>
                          <div className="umkm-pack-cell">
                            <div className="umkm-pack-primary">
                              <span className="umkm-pack-size">
                                {formatQty(packSize)}
                                {u}
                              </span>
                              <span className="umkm-pack-times" aria-hidden>
                                ×
                              </span>
                              <span className="umkm-pack-count">
                                {packCount}
                              </span>
                            </div>
                            <p className="umkm-pack-meta-line">
                              <span title="Total quantity">
                                {formatQty(qty)} {u}
                              </span>
                              <span title="Price per pack">
                                @ {formatMoney(packPrice)}
                              </span>
                            </p>
                          </div>
                        </td>
                        <td>
                          <span className="umkm-badge">
                            {orderStatusLabel(o.status)}
                          </span>
                        </td>
                        <td className="is-num">
                          <span className="umkm-num">
                            {formatMoney(o.totalOrderValue)}
                          </span>
                        </td>
                        <td>
                          <span className="umkm-num-sub">
                            {paymentStatusLabel(o.paymentStatus)}
                          </span>
                        </td>
                        <td className="is-num">
                          <PaidRateCell
                            rate={paymentRate}
                            paidLabel={formatMoney(paid)}
                            totalLabel={formatMoney(o.totalOrderValue)}
                          />
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
                              aria-label="View order"
                              onClick={() => startView(o)}
                            >
                              <IconView />
                            </button>
                            <button
                              className="umkm-icon-btn"
                              type="button"
                              title="Edit"
                              aria-label="Edit order"
                              onClick={() => startEdit(o)}
                            >
                              <IconEdit />
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
              {fulfillment.map((o) => {
                const u = unitShort(o.unit ?? o.unitSnapshot);
                const packSize = o.packSizeSnapshot ?? 1;
                const packCount = o.packCount ?? 1;
                const extra = orderExtraLineCount(o);
                const remaining =
                  o.remainingAmount ??
                  remainingFromInstallments(
                    o.totalOrderValue,
                    o.installments ?? [],
                  );
                const paymentRate = orderPaymentRatePercent(o);
                const paid = orderPaidAmount(o);
                return (
                  <li key={o.id} className="umkm-catalog-card">
                    <button
                      type="button"
                      className="umkm-catalog-card-main"
                      onClick={() => startView(o)}
                    >
                      <div className="umkm-catalog-card-identity">
                        <span className="umkm-product-name">
                          {o.product?.name ?? o.productId}
                        </span>
                        <p className="umkm-product-meta-line">
                          <span>{orderStatusLabel(o.status)}</span>
                          <span>
                            {formatQty(packSize)}
                            {u} × {packCount}
                          </span>
                          {extra > 0 ? (
                            <span className="umkm-product-more">
                              +{extra} more
                            </span>
                          ) : null}
                        </p>
                        <div className="umkm-order-date-cell is-compact">
                          <span className="umkm-order-date-primary">
                            {o.orderDate?.slice(0, 10) ?? '—'}
                          </span>
                          <EntityIdBadge
                            id={o.sku || o.id}
                            literal={Boolean(o.sku)}
                            compact
                            soft
                          />
                        </div>
                      </div>
                      <div className="umkm-catalog-card-metrics">
                        <div>
                          <span>Total</span>
                          <strong>{formatMoney(o.totalOrderValue)}</strong>
                        </div>
                        <div>
                          <span>Payment</span>
                          <strong>
                            {paymentStatusLabel(o.paymentStatus)}
                          </strong>
                        </div>
                        <div>
                          <span>Paid</span>
                          <strong>
                            <AppTooltip
                              embedded
                              label="Paid"
                              value={
                                paymentRate == null
                                  ? undefined
                                  : formatRatePercent(paymentRate)
                              }
                              description="How much of this order’s total has been collected so far."
                              detail={`${formatMoney(paid)} of ${formatMoney(o.totalOrderValue)}`}
                            >
                              {paymentRate == null
                                ? '—'
                                : formatRatePercent(paymentRate)}
                            </AppTooltip>
                          </strong>
                        </div>
                        <div>
                          <span>Left</span>
                          <strong>{formatMoney(remaining)}</strong>
                        </div>
                      </div>
                    </button>
                    <div className="umkm-row-actions umkm-icon-actions">
                      <button
                        className="umkm-icon-btn"
                        type="button"
                        title="View"
                        aria-label="View order"
                        onClick={() => startView(o)}
                      >
                        <IconView />
                      </button>
                      <button
                        className="umkm-icon-btn"
                        type="button"
                        title="Edit"
                        aria-label="Edit order"
                        onClick={() => startEdit(o)}
                      >
                        <IconEdit />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
            {listMeta.totalPages > 1 ? (
              <div className="umkm-list-pager" aria-label="Orders pages">
                <button
                  type="button"
                  className="umkm-btn ghost"
                  disabled={listLoading || listMeta.page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </button>
                <span className="umkm-list-pager-status">
                  Page {listMeta.page} of {listMeta.totalPages}
                </span>
                <button
                  type="button"
                  className="umkm-btn ghost"
                  disabled={
                    listLoading || listMeta.page >= listMeta.totalPages
                  }
                  onClick={() =>
                    setPage((p) => Math.min(listMeta.totalPages, p + 1))
                  }
                >
                  Next
                </button>
              </div>
            ) : null}
          </>
        )}
      </ContentSection>
      ) : null}
    </section>
  );
}
