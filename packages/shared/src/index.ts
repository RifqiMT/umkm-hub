export const COMPANY_TYPES = ['RESTAURANT', 'HOTEL', 'STORE'] as const;
export type CompanyType = (typeof COMPANY_TYPES)[number];

export const PRODUCT_UNITS = ['PCS', 'GRAM', 'LITER'] as const;
export type ProductUnit = (typeof PRODUCT_UNITS)[number];

export const PARTNERSHIP_STAGES = ['WHATSAPP', 'EMAIL', 'DIRECT_VISIT'] as const;
export type PartnershipStage = (typeof PARTNERSHIP_STAGES)[number];

export const CUSTOMER_STATUSES = [
  'NOT_INTERESTED',
  'DOUBTFUL',
  'INTERESTED',
  'OTHERS',
] as const;
export type CustomerStatus = (typeof CUSTOMER_STATUSES)[number];

export const RELATIONSHIP_LEVELS = [
  'NEGOTIATION',
  'REQUEST_SAMPLE',
  'CLOSING_FIRST_ORDER',
  'WILL_CONTACT',
  'INITIAL_APPROACH',
] as const;
export type RelationshipLevel = (typeof RELATIONSHIP_LEVELS)[number];

export const DISCOUNT_TYPES = ['PERCENTAGE', 'AMOUNT'] as const;
export type DiscountType = (typeof DISCOUNT_TYPES)[number];

export const PAYMENT_STATUSES = [
  'CASH',
  'CONSIGNMENT',
  'DELAYED_PAYMENT',
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const ORDER_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export function calculateOrderTotals(input: {
  unitPrice: number;
  productQty: number;
  discountType: DiscountType;
  discountValue: number;
}): { lineTotal: number; totalOrderValue: number } {
  const round = (v: number) => Math.round((v + Number.EPSILON) * 10000) / 10000;
  const lineTotal = round(input.unitPrice * input.productQty);
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

export * from './labels';
export * from './translation';
export * from './product-packs';
