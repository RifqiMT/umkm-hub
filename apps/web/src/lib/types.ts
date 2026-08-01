export type Product = {
  id: string;
  productId: string;
  name: string;
  unit: 'PCS' | 'GRAM' | 'LITER';
  stockQty: number;
  pricePerUnit: number;
  price1: number | null;
  price5: number | null;
  price10: number | null;
  price25: number | null;
  price50: number | null;
  price100: number | null;
  price250: number | null;
  price500: number | null;
  price1000: number | null;
  priceCustom: number | null;
  costPerUnit: number | null;
  cost1: number | null;
  cost5: number | null;
  cost10: number | null;
  cost25: number | null;
  cost50: number | null;
  cost100: number | null;
  cost250: number | null;
  cost500: number | null;
  cost1000: number | null;
  costCustom: number | null;
  customSize: number | null;
  potentialRevenue: number;
  potentialCost: number | null;
  unitProfit: number | null;
  potentialProfit: number | null;
  profitMarginPercent: number | null;
  details: string;
};

export type Customer = {
  id: string;
  customerId: string;
  name: string;
  title: string;
  companyName: string;
  companyType: string;
  /** Buyer tax ID for B2B invoices / e-Faktur (optional). */
  npwp?: string;
  email: string;
  phone: string;
  address: string;
  additionalAddress: string;
  postalCode: string;
  city: string;
  province: string;
  country: string;
  partnershipStage: string | null;
  status: string | null;
  customerNeeds: string;
  desiredStandards: string;
  promiseAnnualBonus: boolean;
  promiseOnTimeDelivery: boolean;
  promisePackagingBox: boolean;
  relationshipLevel: string | null;
  approvalPercentage: number;
  remarks: string;
};

export type OrderInstallment = {
  id?: string;
  amount: number;
  installmentDate: string;
};

export type OrderLine = {
  id?: string;
  productId: string;
  sortOrder?: number;
  productQty: number;
  qty?: number;
  packSizeSnapshot?: number;
  packPriceSnapshot?: number;
  packCount?: number;
  unit?: 'PCS' | 'GRAM' | 'LITER';
  unitSnapshot?: 'PCS' | 'GRAM' | 'LITER';
  price?: number;
  unitPriceSnapshot: number;
  stockQtySnapshot: number;
  lineTotal: number;
  product?: Product;
};

export type Order = {
  id: string;
  orderId?: string;
  customerId?: string | null;
  productId: string;
  orderDate: string;
  shipmentDate: string | null;
  productQty: number;
  qty?: number;
  packSizeSnapshot?: number;
  packPriceSnapshot?: number;
  packCount?: number;
  unit?: 'PCS' | 'GRAM' | 'LITER';
  unitSnapshot?: 'PCS' | 'GRAM' | 'LITER';
  price?: number;
  unitPriceSnapshot: number;
  stockQtySnapshot: number;
  lineTotal: number;
  discountType: string;
  discountValue: number;
  totalOrderValue: number;
  /** Invoice amount due (includes PPN when PKP tax-exclusive). */
  amountDue?: number;
  status: string;
  paymentStatus: string;
  invoiceStatus?: string;
  invoiceDate?: string | null;
  billStatus?: string;
  billDate?: string | null;
  paymentDueDate?: string | null;
  fiscalInvoiceNumber?: string;
  includePpn?: boolean | null;
  lineCount?: number;
  /** Present on lean list responses; full rows via GET /orders/:id. */
  installmentCount?: number;
  lines?: OrderLine[];
  installments?: OrderInstallment[];
  paidAmount?: number;
  remainingAmount?: number;
  product?: Product;
  customer?: Customer;
};

export type OrderSummary = {
  earliestOrderDate: string | null;
  latestOrderDate: string | null;
  orderCount: number;
  /** Total packs sold across non-cancelled orders. */
  productsSold: number;
  /** Sum of totalOrderValue across non-cancelled orders. */
  totalRevenue: number;
  /** Cancelled ÷ all orders × 100. */
  cancellationRate: number | null;
  /** (revenue − COGS) ÷ revenue × 100 when any cost is known. */
  profitMarginRate: number | null;
  /** Discount ÷ pre-discount line totals × 100. */
  discountRate: number | null;
  /** Fully paid (remaining ≈ 0) ÷ non-cancelled orders × 100. */
  fullPaymentRate: number | null;
  statistics: OrderStatistics;
};

export type OrderStatistics = {
  status: StatBucket[];
  paymentStatus: StatBucket[];
  invoiceStatus: StatBucket[];
  billStatus: StatBucket[];
  discountType: StatBucket[];
  customerLinked: WithWithoutStats;
};

export type ProductSummary = {
  productCount: number;
  totalStockQty: number;
  inventorySellValue: number;
  outOfStockRate: number | null;
  inStockRate: number | null;
  costCoverageRate: number | null;
  profitMarginRate: number | null;
  packReadyRate: number | null;
  statistics: ProductStatistics;
};

export type ProductStatistics = {
  unit: StatBucket[];
  stockStatus: StatBucket[];
  costSet: StatBucket[];
  packReady: StatBucket[];
  details: WithWithoutStats;
};

/** Per-product stock vs sales metrics (catalog Order totals analogue). */
export type ProductStockSales = {
  id: string;
  productId: string;
  name: string;
  unit: string;
  /** currentStocks + soldStocks. */
  totalStocks: number;
  /** Current on-hand stock. */
  currentStocks: number;
  soldStocks: number;
  /** Pre-discount gross (revenue + discount). */
  grossRevenue: number;
  /** Discount-allocated net revenue. */
  revenue: number;
  discount: number;
  discountPercent: number | null;
  /** sold × catalog costPerUnit; null when cost unset. */
  cost: number | null;
  /** Cost as % of gross (revenue + discount). */
  costPercent: number | null;
  /** revenue − cost; null when cost unset. */
  profit: number | null;
  /** Profit margin as % of gross (revenue + discount). */
  marginPercent: number | null;
  sellThroughRate: number | null;
  inventoryTurnover: number | null;
  stockToSalesRatio: number | null;
  orderCount: number;
  avgOrderValue: number | null;
  unitsPerTransaction: number | null;
};

export type WarehouseSummary = {
  earliestRestockDate: string | null;
  latestRestockDate: string | null;
  productCount: number;
  inventorySellValue: number;
  inventoryCostValue: number;
  inventoryProfitValue: number;
  restockCount: number;
  qtyRestocked: number;
  profitMarginRate: number | null;
  costCoverageRate: number | null;
  inStockRate: number | null;
  outOfStockRate: number | null;
  statistics: WarehouseStatistics;
};

export type WarehouseStatistics = {
  unit: StatBucket[];
  stockStatus: StatBucket[];
  costSet: StatBucket[];
  restockUnit: StatBucket[];
  restockNotes: WithWithoutStats;
};

export type CustomerSummary = {
  customerCount: number;
  avgApproval: number | null;
  interestedCount: number;
  interestedRate: number | null;
  closingRate: number | null;
  promiseRate: number | null;
  contactRate: number | null;
  statistics: CustomerStatistics;
};

export type CustomerStatBucket = {
  key: string;
  count: number;
  rate: number | null;
};

/** Shared bucket shape for feature statistics breakdowns. */
export type StatBucket = CustomerStatBucket;

export type CustomerWithWithoutStats = {
  withCount: number;
  withoutCount: number;
  withRate: number | null;
  withoutRate: number | null;
};

export type WithWithoutStats = CustomerWithWithoutStats;

export type CustomerPromiseStats = CustomerWithWithoutStats & {
  annualBonus: number;
  onTimeDelivery: number;
  packagingBox: number;
  annualBonusRate: number | null;
  onTimeDeliveryRate: number | null;
  packagingBoxRate: number | null;
};

export type CustomerStatistics = {
  companyType: CustomerStatBucket[];
  partnershipStage: CustomerStatBucket[];
  status: CustomerStatBucket[];
  relationshipLevel: CustomerStatBucket[];
  customerNeeds: CustomerWithWithoutStats;
  desiredStandards: CustomerWithWithoutStats;
  remarks: CustomerWithWithoutStats;
  customerPromise: CustomerPromiseStats;
  city: CustomerStatBucket[];
  province: CustomerStatBucket[];
  country: CustomerStatBucket[];
};

/** Per-customer commercial totals from linked orders. */
export type CustomerOrderTotals = {
  id: string;
  customerId: string;
  name: string;
  title: string;
  companyName: string;
  companyType: string;
  email: string;
  phone: string;
  /** Σ Order.lineTotal (pre-discount, non-cancelled). */
  totals: number;
  /** Alias of totals — pre-discount gross revenue. */
  grossRevenue: number;
  /** Σ (lineTotal − totalOrderValue) for non-cancelled. */
  discount: number;
  /** Σ Order.totalOrderValue (post-discount, non-cancelled). */
  orderTotal: number;
  /** Non-cancelled linked order count. */
  orderCount: number;
  /** Σ OrderLine.packCount on non-cancelled orders. */
  packsSold: number;
  /** Cancelled linked order count. */
  cancelledCount: number;
  /** cancelled ÷ (active + cancelled) × 100. */
  cancelRate: number | null;
  /** orderTotal ÷ orderCount. */
  avgOrderValue: number | null;
  /** packsSold ÷ orderCount (Units Per Transaction). */
  unitsPerTransaction: number | null;
  discountPercent: number | null;
};

export type WarehouseRestock = {
  id: string;
  productId: string;
  qtyAdded: number;
  restockDate: string;
  notes: string;
  unitSnapshot?: 'PCS' | 'GRAM' | 'LITER';
  unit?: 'PCS' | 'GRAM' | 'LITER';
  stockBefore: number;
  stockAfter: number;
  product?: Product;
};

export type WarehouseSale = {
  id: string;
  productId: string;
  orderId: string;
  orderLineId: string;
  qtySold: number;
  soldDate: string;
  notes: string;
  unitSnapshot?: 'PCS' | 'GRAM' | 'LITER';
  unit?: 'PCS' | 'GRAM' | 'LITER';
  packSizeSnapshot?: number | null;
  packCount?: number | null;
  stockBefore: number;
  stockAfter: number;
  orderRef?: string;
  order?: { id: string; orderId: string; orderDate: string };
  product?: Product;
};

export type Paginated<T> = {
  items: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
};

export type LocationSource = 'MANUAL' | 'IP';

export type Profile = {
  id: string;
  profileName: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  emailVerifiedAt?: string | null;
  accountVerifiedAt?: string | null;
  emailVerified?: boolean;
  accountVerified?: boolean;
  /** Decrypted for the owner; sealed (encrypted) at rest in the DB. */
  locationCity?: string | null;
  /** Decrypted for the owner; sealed (encrypted) at rest in the DB. */
  locationCountry?: string | null;
  /** True when sealed city/country values exist in the database. */
  locationSet?: boolean;
  /** True when legacy one-way hashes exist and must be re-entered. */
  locationNeedsReentry?: boolean;
  locationSource?: LocationSource | null;
  businessName?: string;
  businessPhone?: string;
  businessAddress?: string;
  npwp?: string;
  isPkp?: boolean;
  defaultPpnPercent?: number;
  taxInclusive?: boolean;
  invoicePrefix?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type DetectLocationResponse = {
  city: string;
  country: string;
  source: LocationSource;
  saved: boolean;
  profile: Profile | null;
};

export type RevenueTargetMode = 'MANUAL' | 'SYSTEMATIC';

export type RevenueTargetMonthRow = {
  id?: string;
  month: number;
  amount: number;
  source?: 'MANUAL' | 'GENERATED';
  actual: number;
  attainmentPercent: number | null;
};

export type RevenueTargetYear = {
  year: number;
  plan: {
    id: string;
    year: number;
    monthlyMode: RevenueTargetMode;
    annualMode: RevenueTargetMode;
    baseMonthAmount: number | null;
    monthlyGrowthPercent: number | null;
    annualAmount: number | null;
    baseAnnualAmount: number | null;
    annualGrowthPercent: number | null;
    monthlySumTarget: number;
    updatedAt: string;
  } | null;
  months: RevenueTargetMonthRow[];
  monthlyConfigured: boolean;
  annualConfigured: boolean;
  annual: {
    target: number;
    actual: number;
    attainmentPercent: number | null;
    nextYearProjected: number | null;
  } | null;
  actuals: {
    byMonth: Record<number, number>;
    yearTotal: number;
  };
};

type AnalyticsStatusShares = {
  PENDING: number;
  CONFIRMED: number;
  SHIPPED: number;
  DELIVERED: number;
  CANCELLED: number;
};

type AnalyticsPaymentShares = {
  CASH: number;
  CONSIGNMENT: number;
  DELAYED_PAYMENT: number;
};

type AnalyticsMixShares = {
  /** % of orders by status (includes CANCELLED). */
  statusShares: AnalyticsStatusShares;
  statusOrderCount: number;
  /** % of non-cancelled orders by payment mode. */
  paymentShares: AnalyticsPaymentShares;
  paymentOrderCount: number;
};

export type AnalyticsWeekPoint = {
  isoYear: number;
  week: number;
  label: string;
  revenue: number;
  orderCount: number;
  avgOrderValue: number | null;
  /** Day-weighted share of monthly plan amounts for the ISO week. */
  target: number | null;
  attainmentPercent: number | null;
  cost: number | null;
  profit: number | null;
  marginPercent: number | null;
  avgShipmentDays: number | null;
  shipmentSampleSize: number;
  avgInvoiceDays: number | null;
  invoiceSampleSize: number;
  avgFirstPaymentDays: number | null;
  firstPaymentSampleSize: number;
  avgPaymentDays: number | null;
  paymentSampleSize: number;
  avgLtv: number | null;
  avgProductRevenue: number | null;
  avgBasketSize: number | null;
  /** Linked orders ÷ distinct customers. */
  avgPurchaseFrequency: number | null;
} & AnalyticsMixShares;

export type AnalyticsMonthPoint = {
  month: number;
  /** Present for trailing-month (all timelines) series. */
  year?: number;
  label: string;
  revenue: number;
  orderCount: number;
  avgOrderValue: number | null;
  target: number | null;
  attainmentPercent: number | null;
  cost: number | null;
  profit: number | null;
  marginPercent: number | null;
  avgShipmentDays: number | null;
  shipmentSampleSize: number;
  avgInvoiceDays: number | null;
  invoiceSampleSize: number;
  avgFirstPaymentDays: number | null;
  firstPaymentSampleSize: number;
  avgPaymentDays: number | null;
  paymentSampleSize: number;
  /** Avg revenue per customer who ordered this month. */
  avgLtv: number | null;
  /** Avg net revenue per product sold this month. */
  avgProductRevenue: number | null;
  /** Avg stock units per order this month. */
  avgBasketSize: number | null;
  /** Linked orders ÷ distinct customers this month. */
  avgPurchaseFrequency: number | null;
} & AnalyticsMixShares;

export type AnalyticsQuarterPoint = {
  year: number;
  quarter: number;
  label: string;
  revenue: number;
  orderCount: number;
  avgOrderValue: number | null;
  /** Sum of monthly plan amounts for the three months in the quarter. */
  target: number | null;
  attainmentPercent: number | null;
  cost: number | null;
  profit: number | null;
  marginPercent: number | null;
  avgShipmentDays: number | null;
  shipmentSampleSize: number;
  avgInvoiceDays: number | null;
  invoiceSampleSize: number;
  avgFirstPaymentDays: number | null;
  firstPaymentSampleSize: number;
  avgPaymentDays: number | null;
  paymentSampleSize: number;
  avgLtv: number | null;
  avgProductRevenue: number | null;
  avgBasketSize: number | null;
  avgPurchaseFrequency: number | null;
} & AnalyticsMixShares;

export type AnalyticsYearPoint = {
  year: number;
  revenue: number;
  orderCount: number;
  avgOrderValue: number | null;
  target: number | null;
  attainmentPercent: number | null;
  cost: number | null;
  profit: number | null;
  marginPercent: number | null;
  avgShipmentDays: number | null;
  shipmentSampleSize: number;
  avgInvoiceDays: number | null;
  invoiceSampleSize: number;
  avgFirstPaymentDays: number | null;
  firstPaymentSampleSize: number;
  avgPaymentDays: number | null;
  paymentSampleSize: number;
  avgLtv: number | null;
  avgProductRevenue: number | null;
  avgBasketSize: number | null;
  avgPurchaseFrequency: number | null;
} & AnalyticsMixShares;

export type AnalyticsProductRow = {
  productId: string;
  name: string;
  unit: string;
  orderCount: number;
  qtySold: number;
  /** Sum of pack counts across lines for this product. */
  packsSold: number;
  /** Pre-discount gross (revenue + discount). */
  grossRevenue: number;
  revenue: number;
  /** Net revenue ÷ distinct orders. */
  avgOrderValue: number | null;
  /** UTC days from first → second order that includes this product. */
  firstRepeatOrderDays: number | null;
  /** Mean UTC days between consecutive orders that include this product. */
  avgRepeatOrderDays: number | null;
  /** Order discount allocated to this product’s lines. */
  discount: number;
  /** Discount as % of gross (revenue + discount). */
  discountPercent: number | null;
  cost: number | null;
  /** Cost as % of gross (same base as discount % / margin %). */
  costPercent: number | null;
  profit: number | null;
  /** Profit as % of gross. */
  marginPercent: number | null;
};

export type AnalyticsCustomerRow = {
  customerId: string;
  name: string;
  companyName: string;
  companyType: string;
  orderCount: number;
  /** Sum of packs across the customer’s orders in scope. */
  packsSold: number;
  /** Pre-discount gross (revenue + discount). */
  grossRevenue: number;
  revenue: number;
  avgOrderValue: number | null;
  /** UTC days from first → second order for this customer. */
  firstRepeatOrderDays: number | null;
  /** Mean UTC days between consecutive orders for this customer. */
  avgRepeatOrderDays: number | null;
  discount: number;
  discountPercent: number | null;
  cost: number | null;
  costPercent: number | null;
  profit: number | null;
  marginPercent: number | null;
};

export type AnalyticsScope = 'year' | 'years' | 'all';

export type AnalyticsOverview = {
  year: number | null;
  /** Focus years when scope is year/years; null when all. */
  years?: number[] | null;
  scope: AnalyticsScope;
  summary: {
    year: number | null;
    years?: number[] | null;
    scope?: AnalyticsScope;
    revenue: number;
    orderCount: number;
    avgOrderValue: number | null;
    target: number | null;
    attainmentPercent: number | null;
    monthlyTargetSum: number | null;
    cost: number | null;
    profit: number | null;
    marginPercent: number | null;
    avgShipmentDays: number | null;
    shipmentSampleSize: number;
    avgInvoiceDays: number | null;
    invoiceSampleSize: number;
    avgFirstPaymentDays: number | null;
    firstPaymentSampleSize: number;
    avgPaymentDays: number | null;
    paymentSampleSize: number;
    /** Avg revenue per customer with linked orders this year. */
    avgLtv: number | null;
    ltvCustomerCount: number;
    /** Avg net revenue per product with sales this year. */
    avgProductRevenue: number | null;
    productSaleCount: number;
    /** Units Per Transaction: packs ÷ orders this period. */
    avgBasketSize: number | null;
    /** Linked orders ÷ distinct customers this period. */
    avgPurchaseFrequency: number | null;
    purchaseFrequencyCustomerCount?: number;
  };
  weekly: AnalyticsWeekPoint[];
  monthly: AnalyticsMonthPoint[];
  quarterly: AnalyticsQuarterPoint[];
  annual: AnalyticsYearPoint[];
  products: AnalyticsProductRow[];
  customers: AnalyticsCustomerRow[];
};
