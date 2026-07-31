export const COMPANY_TYPES = ['RESTAURANT', 'HOTEL', 'STORE'] as const;
export const PRODUCT_UNITS = ['PCS', 'GRAM', 'LITER'] as const;
export const PARTNERSHIP_STAGES = ['WHATSAPP', 'EMAIL', 'DIRECT_VISIT'] as const;
export const CUSTOMER_STATUSES = [
  'NOT_INTERESTED',
  'DOUBTFUL',
  'INTERESTED',
  'OTHERS',
] as const;
export const RELATIONSHIP_LEVELS = [
  'NEGOTIATION',
  'REQUEST_SAMPLE',
  'CLOSING_FIRST_ORDER',
  'WILL_CONTACT',
  'INITIAL_APPROACH',
] as const;
export const DISCOUNT_TYPES = ['PERCENTAGE', 'AMOUNT'] as const;
export const PAYMENT_STATUSES = [
  'CASH',
  'CONSIGNMENT',
  'DELAYED_PAYMENT',
] as const;
export const BILL_STATUSES = ['CREATED', 'SENT'] as const;
export const INVOICE_STATUSES = [
  'CREATED',
  'SENT',
  'PARTIALLY_PAID',
  'FULLY_PAID',
] as const;
export const ORDER_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
] as const;

export function todayDateInput() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const LABELS = {
  productUnit: {
    PCS: 'Pcs',
    GRAM: 'Gram',
    LITER: 'Liter',
  },
  companyType: {
    RESTAURANT: 'Restaurant',
    HOTEL: 'Hotel',
    STORE: 'Store',
  },
  partnershipStage: {
    WHATSAPP: 'WhatsApp',
    EMAIL: 'Email',
    DIRECT_VISIT: 'Direct visit',
  },
  customerStatus: {
    NOT_INTERESTED: 'Not interested',
    DOUBTFUL: 'Doubtful',
    INTERESTED: 'Interested',
    OTHERS: 'Others',
  },
  relationshipLevel: {
    NEGOTIATION: 'Negotiation',
    REQUEST_SAMPLE: 'Request a sample',
    CLOSING_FIRST_ORDER: 'Closing — first order requested',
    WILL_CONTACT: 'Will contact',
    INITIAL_APPROACH: 'Initial approach',
  },
  discountType: {
    PERCENTAGE: 'Percentage',
    AMOUNT: 'Direct amount',
  },
  paymentStatus: {
    CASH: 'Cash',
    CONSIGNMENT: 'Consignment',
    DELAYED_PAYMENT: 'Delayed payment',
  },
  invoiceStatus: {
    CREATED: 'Not billed yet',
    SENT: 'Awaiting payment',
    PARTIALLY_PAID: 'Partial payment',
    FULLY_PAID: 'Paid in full',
  },
  billStatus: {
    CREATED: 'Draft bill',
    SENT: 'Sent to customer',
  },
  orderStatus: {
    PENDING: 'Pending',
    CONFIRMED: 'Confirmed',
    SHIPPED: 'Shipped',
    DELIVERED: 'Delivered',
    CANCELLED: 'Cancelled',
  },
} as const;

export function calculateMultiLineOrderTotals(input: {
  lines: Array<{ unitPrice: number; productQty: number }>;
  discountType: 'PERCENTAGE' | 'AMOUNT';
  discountValue: number;
}) {
  const round = (v: number) => Math.round((v + Number.EPSILON) * 10000) / 10000;
  const lineTotal = round(
    input.lines.reduce(
      (sum, line) => sum + round(line.unitPrice * line.productQty),
      0,
    ),
  );
  if (input.discountType === 'PERCENTAGE') {
    return {
      lineTotal,
      totalOrderValue: round(lineTotal * (1 - input.discountValue / 100)),
    };
  }
  return {
    lineTotal,
    totalOrderValue: round(Math.max(0, lineTotal - input.discountValue)),
  };
}

export type ProductPackOption = {
  key: string;
  size: number;
  price: number;
  label: string;
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

/** Pack options available for ordering (price is locked from product). */
export function listProductPacks(product: {
  unit: string;
  pricePerUnit: number;
  price50: number | null;
  price100: number | null;
  price250: number | null;
  price500: number | null;
  price1000: number | null;
  priceCustom: number | null;
  customSize: number | null;
}): ProductPackOption[] {
  if (product.unit === 'PCS') {
    return [
      {
        key: 'PCS',
        size: 1,
        price: product.pricePerUnit,
        label: `Per pcs · ${product.pricePerUnit}`,
      },
    ];
  }

  const short = unitShort(product.unit);
  const packs: ProductPackOption[] = [];
  const fixed: Array<[string, number, number | null]> = [
    ['50', 50, product.price50],
    ['100', 100, product.price100],
    ['250', 250, product.price250],
    ['500', 500, product.price500],
    ['1000', 1000, product.price1000],
  ];
  for (const [key, size, price] of fixed) {
    if (price != null) {
      packs.push({
        key,
        size,
        price,
        label: `${size}${short} · ${price}`,
      });
    }
  }
  if (
    product.priceCustom != null &&
    product.customSize != null &&
    product.customSize > 0
  ) {
    packs.push({
      key: 'CUSTOM',
      size: product.customSize,
      price: product.priceCustom,
      label: `${product.customSize}${short} (custom) · ${product.priceCustom}`,
    });
  }
  return packs;
}
