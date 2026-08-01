import { roundMoney } from '../revenue-targets/revenue-target-math';

export type DurationOrderRow = {
  orderDate: Date;
  shipmentDate: Date | null;
  invoiceDate: Date | null;
  /** First installment date when any installments exist. */
  firstPaymentDate: Date | null;
  /** Last installment date when any installments exist. */
  lastPaymentDate: Date | null;
};

type PeriodDuration = {
  /** Average days order → shipment (orders with a shipment date). */
  avgShipmentDays: number | null;
  shipmentSampleSize: number;
  /** Average days order → invoice (orders with an invoice date). */
  avgInvoiceDays: number | null;
  invoiceSampleSize: number;
  /** Average days order → first installment (orders with installments). */
  avgFirstPaymentDays: number | null;
  firstPaymentSampleSize: number;
  /** Average days order → last installment (orders with installments). */
  avgPaymentDays: number | null;
  paymentSampleSize: number;
};

function utcDayDiff(from: Date, to: Date): number {
  const a = Date.UTC(
    from.getUTCFullYear(),
    from.getUTCMonth(),
    from.getUTCDate(),
  );
  const b = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
  return Math.round((b - a) / 86_400_000);
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  const sum = values.reduce((a, b) => a + b, 0);
  return roundMoney(sum / values.length);
}

function emptyMonthDurations(): Record<number, PeriodDuration> {
  const byMonth: Record<number, PeriodDuration> = {};
  for (let m = 1; m <= 12; m += 1) {
    byMonth[m] = {
      avgShipmentDays: null,
      shipmentSampleSize: 0,
      avgInvoiceDays: null,
      invoiceSampleSize: 0,
      avgFirstPaymentDays: null,
      firstPaymentSampleSize: 0,
      avgPaymentDays: null,
      paymentSampleSize: 0,
    };
  }
  return byMonth;
}

/** Bucket average shipment/invoice/payment durations by order-date UTC month. */
export function bucketDurationsByMonth(
  rows: DurationOrderRow[],
): Record<number, PeriodDuration> {
  const ship: Record<number, number[]> = {};
  const invoice: Record<number, number[]> = {};
  const firstPay: Record<number, number[]> = {};
  const pay: Record<number, number[]> = {};
  for (let m = 1; m <= 12; m += 1) {
    ship[m] = [];
    invoice[m] = [];
    firstPay[m] = [];
    pay[m] = [];
  }

  for (const row of rows) {
    const month = row.orderDate.getUTCMonth() + 1;
    if (row.shipmentDate) {
      ship[month]!.push(utcDayDiff(row.orderDate, row.shipmentDate));
    }
    if (row.invoiceDate) {
      invoice[month]!.push(utcDayDiff(row.orderDate, row.invoiceDate));
    }
    if (row.firstPaymentDate) {
      firstPay[month]!.push(utcDayDiff(row.orderDate, row.firstPaymentDate));
    }
    if (row.lastPaymentDate) {
      pay[month]!.push(utcDayDiff(row.orderDate, row.lastPaymentDate));
    }
  }

  const byMonth = emptyMonthDurations();
  for (let m = 1; m <= 12; m += 1) {
    byMonth[m] = {
      avgShipmentDays: average(ship[m]!),
      shipmentSampleSize: ship[m]!.length,
      avgInvoiceDays: average(invoice[m]!),
      invoiceSampleSize: invoice[m]!.length,
      avgFirstPaymentDays: average(firstPay[m]!),
      firstPaymentSampleSize: firstPay[m]!.length,
      avgPaymentDays: average(pay[m]!),
      paymentSampleSize: pay[m]!.length,
    };
  }
  return byMonth;
}

/** Period-level averages across the given order rows. */
export function periodDurationsFromOrders(
  rows: DurationOrderRow[],
): PeriodDuration {
  const ship: number[] = [];
  const invoice: number[] = [];
  const firstPay: number[] = [];
  const pay: number[] = [];
  for (const row of rows) {
    if (row.shipmentDate) {
      ship.push(utcDayDiff(row.orderDate, row.shipmentDate));
    }
    if (row.invoiceDate) {
      invoice.push(utcDayDiff(row.orderDate, row.invoiceDate));
    }
    if (row.firstPaymentDate) {
      firstPay.push(utcDayDiff(row.orderDate, row.firstPaymentDate));
    }
    if (row.lastPaymentDate) {
      pay.push(utcDayDiff(row.orderDate, row.lastPaymentDate));
    }
  }
  return {
    avgShipmentDays: average(ship),
    shipmentSampleSize: ship.length,
    avgInvoiceDays: average(invoice),
    invoiceSampleSize: invoice.length,
    avgFirstPaymentDays: average(firstPay),
    firstPaymentSampleSize: firstPay.length,
    avgPaymentDays: average(pay),
    paymentSampleSize: pay.length,
  };
}

export { utcDayDiff };

/** Average order value for a period; null when there are no orders. */
export function averageOrderValue(
  revenue: number,
  orderCount: number,
): number | null {
  if (orderCount <= 0) return null;
  return roundMoney(revenue / orderCount);
}
