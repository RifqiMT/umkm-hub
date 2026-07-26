import { OrderStatus, PaymentStatus } from '@prisma/client';

export type MixOrderRow = {
  orderDate: Date;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
};

type StatusShares = Record<OrderStatus, number>;
type PaymentShares = Record<PaymentStatus, number>;

export type PeriodMixShares = {
  /** % of orders in each status (includes CANCELLED). Sum ≈ 100 when count > 0. */
  statusShares: StatusShares;
  statusOrderCount: number;
  /** % of non-cancelled orders by payment mode. Sum ≈ 100 when count > 0. */
  paymentShares: PaymentShares;
  paymentOrderCount: number;
};

const ZERO_STATUS_COUNTS: StatusShares = {
  PENDING: 0,
  CONFIRMED: 0,
  SHIPPED: 0,
  DELIVERED: 0,
  CANCELLED: 0,
};

const ZERO_PAYMENT_COUNTS: PaymentShares = {
  CASH: 0,
  CONSIGNMENT: 0,
  DELAYED_PAYMENT: 0,
};

function roundPct(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function sharesFromCounts<T extends string>(
  counts: Record<T, number>,
  total: number,
  zero: Record<T, number>,
): Record<T, number> {
  const out = { ...zero };
  if (total <= 0) return out;
  for (const key of Object.keys(counts) as T[]) {
    out[key] = roundPct((counts[key]! / total) * 100);
  }
  return out;
}

export function emptyMixShares(): PeriodMixShares {
  return {
    statusShares: { ...ZERO_STATUS_COUNTS },
    statusOrderCount: 0,
    paymentShares: { ...ZERO_PAYMENT_COUNTS },
    paymentOrderCount: 0,
  };
}

/** Order-status mix includes cancelled; payment mix excludes cancelled. */
export function periodMixShares(rows: MixOrderRow[]): PeriodMixShares {
  if (rows.length === 0) return emptyMixShares();

  const statusCounts: StatusShares = { ...ZERO_STATUS_COUNTS };
  const paymentCounts: PaymentShares = { ...ZERO_PAYMENT_COUNTS };
  let paymentOrderCount = 0;

  for (const row of rows) {
    statusCounts[row.status] = (statusCounts[row.status] ?? 0) + 1;
    if (row.status === OrderStatus.CANCELLED) continue;
    paymentOrderCount += 1;
    paymentCounts[row.paymentStatus] =
      (paymentCounts[row.paymentStatus] ?? 0) + 1;
  }

  const statusOrderCount = rows.length;
  return {
    statusShares: sharesFromCounts(
      statusCounts,
      statusOrderCount,
      ZERO_STATUS_COUNTS,
    ),
    statusOrderCount,
    paymentShares: sharesFromCounts(
      paymentCounts,
      paymentOrderCount,
      ZERO_PAYMENT_COUNTS,
    ),
    paymentOrderCount,
  };
}

/** Attach mix % shares onto timeline points by matching period keys. */
export function attachMixSharesToPoints<T extends object>(
  points: T[],
  mixRows: MixOrderRow[],
  periodKeyFromDate: (date: Date) => string,
  pointKey: (point: T) => string,
): Array<T & PeriodMixShares> {
  const buckets = new Map<string, MixOrderRow[]>();
  for (const row of mixRows) {
    const key = periodKeyFromDate(row.orderDate);
    const list = buckets.get(key);
    if (list) list.push(row);
    else buckets.set(key, [row]);
  }
  return points.map((point) => {
    const mix = periodMixShares(buckets.get(pointKey(point)) ?? []);
    return { ...point, ...mix };
  });
}
