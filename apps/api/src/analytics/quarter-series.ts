import { averageOrderValue } from './duration-series';
import {
  periodDurationsFromOrders,
  type DurationOrderRow,
} from './duration-series';
import { periodMarginFromOrders, type MarginOrderRow } from './margin-series';
import { periodAvgLtvFromOrders, type LtvOrderRow } from './ltv-series';
import {
  periodAvgProductRevenueFromLines,
  type ProductRevenueRow,
} from './product-revenue-series';
import {
  periodAvgBasketFromOrders,
  type BasketOrderRow,
} from './basket-series';
import {
  periodAvgPurchaseFrequencyFromOrders,
  type PurchaseFrequencyOrderRow,
} from './purchase-frequency-series';
import {
  attainmentPercent,
  roundMoney,
} from '../revenue-targets/revenue-target-math';
import {
  monthTargetKey,
  type MonthTargetMap,
} from './weekly-target';
import type { CalendarQuarterRef } from './iso-week';

type QuarterlySeriesPoint = {
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
};

type OrderValueRow = { orderDate: Date; totalOrderValue: number };

export function calendarQuarterKey(year: number, quarter: number): string {
  return `${year}-Q${quarter}`;
}

export function calendarQuarterKeyFromDate(date: Date): string {
  const year = date.getUTCFullYear();
  const quarter = Math.floor(date.getUTCMonth() / 3) + 1;
  return calendarQuarterKey(year, quarter);
}

/** Sum of monthly targets for Q1–Q4 (months 1–3, 4–6, 7–9, 10–12). */
export function quarterlyTargetFromMonthly(
  year: number,
  quarter: number,
  monthTargets: MonthTargetMap | undefined,
): number | null {
  if (!monthTargets || monthTargets.size === 0) return null;
  if (quarter < 1 || quarter > 4) return null;

  const startMonth = (quarter - 1) * 3 + 1;
  let total = 0;
  let hasTarget = false;
  for (let offset = 0; offset < 3; offset += 1) {
    const month = startMonth + offset;
    const amount = monthTargets.get(monthTargetKey(year, month));
    if (amount != null && Number.isFinite(amount)) {
      hasTarget = true;
      total += amount;
    }
  }
  if (!hasTarget) return null;
  return roundMoney(total);
}

function bucketByQuarterKey<T extends { orderDate: Date }>(
  rows: T[],
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const key = calendarQuarterKeyFromDate(row.orderDate);
    const list = map.get(key);
    if (list) list.push(row);
    else map.set(key, [row]);
  }
  return map;
}

/**
 * Build quarterly chart points for the given quarter slots from pre-loaded rows.
 * Metrics are recomputed from raw orders (not averages of monthly averages).
 */
export function buildQuarterlySeries(args: {
  quarters: CalendarQuarterRef[];
  orderValues: OrderValueRow[];
  marginRows: MarginOrderRow[];
  durationRows: DurationOrderRow[];
  ltvRows: LtvOrderRow[];
  productRevenueRows: ProductRevenueRow[];
  basketRows: BasketOrderRow[];
  frequencyRows: PurchaseFrequencyOrderRow[];
  monthTargets?: MonthTargetMap;
}): QuarterlySeriesPoint[] {
  const ordersByQ = bucketByQuarterKey(args.orderValues);
  const marginByQ = bucketByQuarterKey(args.marginRows);
  const durationByQ = bucketByQuarterKey(args.durationRows);
  const ltvByQ = bucketByQuarterKey(args.ltvRows);
  const productByQ = bucketByQuarterKey(args.productRevenueRows);
  const basketByQ = bucketByQuarterKey(args.basketRows);
  const frequencyByQ = bucketByQuarterKey(args.frequencyRows);

  return args.quarters.map((slot) => {
    const key = calendarQuarterKey(slot.year, slot.quarter);
    const orderValues = ordersByQ.get(key) ?? [];
    let revenue = 0;
    for (const row of orderValues) {
      revenue += Math.max(0, row.totalOrderValue);
    }
    revenue = roundMoney(revenue);
    const orderCount = orderValues.length;
    const target = quarterlyTargetFromMonthly(
      slot.year,
      slot.quarter,
      args.monthTargets,
    );

    const margin = periodMarginFromOrders(marginByQ.get(key) ?? []);
    const duration = periodDurationsFromOrders(durationByQ.get(key) ?? []);
    const ltv = periodAvgLtvFromOrders(ltvByQ.get(key) ?? []);
    const productRev = periodAvgProductRevenueFromLines(
      productByQ.get(key) ?? [],
    );
    const basket = periodAvgBasketFromOrders(basketByQ.get(key) ?? []);
    const frequency = periodAvgPurchaseFrequencyFromOrders(
      frequencyByQ.get(key) ?? [],
    );

    return {
      year: slot.year,
      quarter: slot.quarter,
      label: slot.label,
      revenue,
      orderCount,
      avgOrderValue: averageOrderValue(revenue, orderCount),
      target,
      attainmentPercent:
        target != null ? attainmentPercent(revenue, target) : null,
      cost: margin.cost,
      profit: margin.profit,
      marginPercent: margin.marginPercent,
      avgShipmentDays: duration.avgShipmentDays,
      shipmentSampleSize: duration.shipmentSampleSize,
      avgInvoiceDays: duration.avgInvoiceDays,
      invoiceSampleSize: duration.invoiceSampleSize,
      avgFirstPaymentDays: duration.avgFirstPaymentDays,
      firstPaymentSampleSize: duration.firstPaymentSampleSize,
      avgPaymentDays: duration.avgPaymentDays,
      paymentSampleSize: duration.paymentSampleSize,
      avgLtv: ltv.avgLtv,
      avgProductRevenue: productRev.avgProductRevenue,
      avgBasketSize: basket.avgBasketSize,
      avgPurchaseFrequency: frequency.avgPurchaseFrequency,
    };
  });
}
