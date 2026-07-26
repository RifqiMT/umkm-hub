import {
  isoWeekKey,
  isoWeekKeyFromDate,
  type IsoWeekRef,
} from './iso-week';
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
import { roundMoney } from '../revenue-targets/revenue-target-math';
import {
  weeklyAttainmentPercent,
  weeklyTargetFromMonthly,
  type MonthTargetMap,
} from './weekly-target';

export type WeeklySeriesPoint = {
  isoYear: number;
  week: number;
  label: string;
  revenue: number;
  orderCount: number;
  avgOrderValue: number | null;
  /** Day-weighted share of monthly plan amounts intersecting the ISO week. */
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

function bucketByIsoWeekKey<T extends { orderDate: Date }>(
  rows: T[],
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const key = isoWeekKeyFromDate(row.orderDate);
    const list = map.get(key);
    if (list) list.push(row);
    else map.set(key, [row]);
  }
  return map;
}

/**
 * Build weekly chart points for the given week slots from pre-loaded series rows.
 * Rows are indexed by ISO week once so large timeline windows stay O(n + weeks).
 */
export function buildWeeklySeries(args: {
  weeks: IsoWeekRef[];
  orderValues: OrderValueRow[];
  marginRows: MarginOrderRow[];
  durationRows: DurationOrderRow[];
  ltvRows: LtvOrderRow[];
  productRevenueRows: ProductRevenueRow[];
  basketRows: BasketOrderRow[];
  frequencyRows: PurchaseFrequencyOrderRow[];
  /** Full 12-month plan amounts keyed by calendar year-month. */
  monthTargets?: MonthTargetMap;
}): WeeklySeriesPoint[] {
  const ordersByWeek = bucketByIsoWeekKey(args.orderValues);
  const marginByWeek = bucketByIsoWeekKey(args.marginRows);
  const durationByWeek = bucketByIsoWeekKey(args.durationRows);
  const ltvByWeek = bucketByIsoWeekKey(args.ltvRows);
  const productByWeek = bucketByIsoWeekKey(args.productRevenueRows);
  const basketByWeek = bucketByIsoWeekKey(args.basketRows);
  const frequencyByWeek = bucketByIsoWeekKey(args.frequencyRows);

  return args.weeks.map((week) => {
    const key = isoWeekKey(week.isoYear, week.isoWeek);
    const orderValues = ordersByWeek.get(key) ?? [];
    let revenue = 0;
    for (const row of orderValues) {
      revenue += Math.max(0, row.totalOrderValue);
    }
    revenue = roundMoney(revenue);
    const orderCount = orderValues.length;
    const target = weeklyTargetFromMonthly(week, args.monthTargets);

    const margin = periodMarginFromOrders(marginByWeek.get(key) ?? []);
    const duration = periodDurationsFromOrders(durationByWeek.get(key) ?? []);
    const ltv = periodAvgLtvFromOrders(ltvByWeek.get(key) ?? []);
    const productRev = periodAvgProductRevenueFromLines(
      productByWeek.get(key) ?? [],
    );
    const basket = periodAvgBasketFromOrders(basketByWeek.get(key) ?? []);
    const frequency = periodAvgPurchaseFrequencyFromOrders(
      frequencyByWeek.get(key) ?? [],
    );

    return {
      isoYear: week.isoYear,
      week: week.isoWeek,
      label: week.label,
      revenue,
      orderCount,
      avgOrderValue: averageOrderValue(revenue, orderCount),
      target,
      attainmentPercent: weeklyAttainmentPercent(revenue, target),
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
