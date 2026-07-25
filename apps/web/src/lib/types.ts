export type Product = {
  id: string;
  sku: string;
  name: string;
  unit: 'PCS' | 'GRAM' | 'LITER';
  stockQty: number;
  pricePerUnit: number;
  price50: number | null;
  price100: number | null;
  price250: number | null;
  price500: number | null;
  price1000: number | null;
  priceCustom: number | null;
  costPerUnit: number | null;
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
  sku: string;
  name: string;
  title: string;
  companyName: string;
  companyType: string;
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
  sku?: string;
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
  status: string;
  paymentStatus: string;
  invoiceStatus?: string;
  invoiceDate?: string | null;
  lineCount?: number;
  lines?: OrderLine[];
  installments?: OrderInstallment[];
  paidAmount?: number;
  remainingAmount?: number;
  product?: Product;
  customer?: Customer;
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

export type Paginated<T> = {
  items: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
};

export type Profile = {
  id: string;
  profileName: string;
  createdAt?: string;
  updatedAt?: string;
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

export type AnalyticsMonthPoint = {
  month: number;
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
  avgFirstPaymentDays: number | null;
  firstPaymentSampleSize: number;
  avgPaymentDays: number | null;
  paymentSampleSize: number;
  /** Avg revenue per customer who ordered this month. */
  avgLtv: number | null;
};

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
  avgFirstPaymentDays: number | null;
  firstPaymentSampleSize: number;
  avgPaymentDays: number | null;
  paymentSampleSize: number;
  avgLtv: number | null;
};

export type AnalyticsProductRow = {
  productId: string;
  name: string;
  unit: string;
  orderCount: number;
  qtySold: number;
  revenue: number;
  /** Net revenue ÷ distinct orders. */
  avgOrderValue: number | null;
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
  revenue: number;
  avgOrderValue: number | null;
  discount: number;
  discountPercent: number | null;
  cost: number | null;
  costPercent: number | null;
  profit: number | null;
  marginPercent: number | null;
};

export type AnalyticsOverview = {
  year: number;
  summary: {
    year: number;
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
    avgFirstPaymentDays: number | null;
    firstPaymentSampleSize: number;
    avgPaymentDays: number | null;
    paymentSampleSize: number;
    /** Avg revenue per customer with linked orders this year. */
    avgLtv: number | null;
    ltvCustomerCount: number;
  };
  monthly: AnalyticsMonthPoint[];
  annual: AnalyticsYearPoint[];
  products: AnalyticsProductRow[];
  customers: AnalyticsCustomerRow[];
};
