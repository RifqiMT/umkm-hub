import {
  BillStatus,
  DiscountType,
  InvoiceStatus,
  OrderStatus,
  PaymentStatus,
} from '@prisma/client';
import {
  CountBucketInput,
  normalizeEnumBuckets,
  StatBucket,
  toStatBuckets,
  toWithWithoutStats,
  WithWithoutInput,
  WithWithoutStats,
} from '../common/statistics-buckets';

const ORDER_STATUS_KEYS = [
  OrderStatus.PENDING,
  OrderStatus.CONFIRMED,
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED,
  OrderStatus.CANCELLED,
] as const;

const PAYMENT_STATUS_KEYS = [
  PaymentStatus.CASH,
  PaymentStatus.CONSIGNMENT,
  PaymentStatus.DELAYED_PAYMENT,
] as const;

const INVOICE_STATUS_KEYS = [
  InvoiceStatus.CREATED,
  InvoiceStatus.SENT,
  InvoiceStatus.PARTIALLY_PAID,
  InvoiceStatus.FULLY_PAID,
] as const;

const BILL_STATUS_KEYS = [BillStatus.CREATED, BillStatus.SENT] as const;

const DISCOUNT_TYPE_KEYS = [
  DiscountType.PERCENTAGE,
  DiscountType.AMOUNT,
] as const;

export type OrderStatisticsInput = {
  orderCount: number;
  status: CountBucketInput[];
  paymentStatus: CountBucketInput[];
  invoiceStatus: CountBucketInput[];
  billStatus: CountBucketInput[];
  discountType: CountBucketInput[];
  customerLinked: WithWithoutInput;
};

export type OrderStatistics = {
  status: StatBucket[];
  paymentStatus: StatBucket[];
  invoiceStatus: StatBucket[];
  billStatus: StatBucket[];
  discountType: StatBucket[];
  customerLinked: WithWithoutStats;
};

export function buildOrderStatistics(
  input: OrderStatisticsInput,
): OrderStatistics {
  const total = Math.max(0, input.orderCount);
  return {
    status: toStatBuckets(
      normalizeEnumBuckets(ORDER_STATUS_KEYS, input.status),
      total,
    ),
    paymentStatus: toStatBuckets(
      normalizeEnumBuckets(PAYMENT_STATUS_KEYS, input.paymentStatus),
      total,
    ),
    invoiceStatus: toStatBuckets(
      normalizeEnumBuckets(INVOICE_STATUS_KEYS, input.invoiceStatus),
      total,
    ),
    billStatus: toStatBuckets(
      normalizeEnumBuckets(BILL_STATUS_KEYS, input.billStatus),
      total,
    ),
    discountType: toStatBuckets(
      normalizeEnumBuckets(DISCOUNT_TYPE_KEYS, input.discountType),
      total,
    ),
    customerLinked: toWithWithoutStats(input.customerLinked, total),
  };
}

export function emptyOrderStatistics(): OrderStatistics {
  return buildOrderStatistics({
    orderCount: 0,
    status: [],
    paymentStatus: [],
    invoiceStatus: [],
    billStatus: [],
    discountType: [],
    customerLinked: { withCount: 0, withoutCount: 0 },
  });
}
