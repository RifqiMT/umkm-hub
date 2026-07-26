import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { OrderStatus, Prisma, RevenueTargetMode } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { decimalToNumber } from '../common/utils/serialize';
import { attainmentPercent, sumAmounts } from '../revenue-targets/revenue-target-math';
import { allocateLineRevenue } from '../orders/order-math';
import { bucketOrdersByMonth, emptyOrderActuals } from './order-actuals';
import {
  bucketMarginByMonth,
  periodMarginFromOrders,
  type MarginOrderRow,
} from './margin-series';
import {
  averageOrderValue,
  bucketDurationsByMonth,
  periodDurationsFromOrders,
  type DurationOrderRow,
} from './duration-series';
import { aggregateProductPerformance } from './product-performance';
import { aggregateCustomerPerformance } from './customer-performance';
import {
  bucketAvgLtvByMonth,
  periodAvgLtvFromOrders,
  type LtvOrderRow,
} from './ltv-series';
import {
  bucketAvgProductRevenueByMonth,
  periodAvgProductRevenueFromLines,
  type ProductRevenueRow,
} from './product-revenue-series';
import {
  bucketAvgBasketByMonth,
  periodAvgBasketFromOrders,
  type BasketOrderRow,
} from './basket-series';
import {
  bucketAvgPurchaseFrequencyByMonth,
  periodAvgPurchaseFrequencyFromOrders,
  type PurchaseFrequencyOrderRow,
} from './purchase-frequency-series';
import { buildWeeklySeries } from './week-series';
import {
  buildQuarterlySeries,
  calendarQuarterKey,
  calendarQuarterKeyFromDate,
} from './quarter-series';
import { buildMonthTargetMap } from './weekly-target';
import {
  isoWeekKey,
  isoWeekKeyFromDate,
  listCalendarMonthsInYears,
  listCalendarQuartersInYears,
  listIsoWeeksInCalendarYears,
} from './iso-week';
import {
  APP_YEAR_MAX,
  APP_YEAR_MIN,
  resolveAnalyticsLoadYears,
  isDateInTimeline,
  focusYears,
  timelineScopeLabel,
  type AnalyticsTimeline,
} from './analytics-period';
import {
  defaultAnalyticsOverviewOptions,
  wantsSeriesGranularity,
  type AnalyticsOverviewOptions,
} from './analytics-query';
import {
  analyticsWindowCacheKey,
  readCacheEntry,
  writeCacheEntry,
  type AnalyticsWindowCacheEntry,
} from './analytics-cache';
import { roundMoney } from '../revenue-targets/revenue-target-math';
import {
  attachMixSharesToPoints,
  type MixOrderRow,
} from './status-payment-series';

const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

type CatalogProduct = {
  id: string;
  name: string;
  unit: string;
  costPerUnit: number | null;
};

type CatalogCustomer = {
  id: string;
  name: string;
  companyName: string;
  companyType: string;
};

type AnalyticsOrderRow = {
  id: string;
  productId: string;
  orderDate: Date;
  shipmentDate: Date | null;
  invoiceDate: Date | null;
  totalOrderValue: number;
  lineTotal: number;
  productQty: number;
  packCount: number;
  customerId: string | null;
  lines: Array<{
    productId: string;
    productQty: number;
    packCount: number;
    lineTotal: number;
  }>;
  installments: Array<{ installmentDate: Date }>;
};

type AnalyticsSharedWindow = {
  plans: Awaited<ReturnType<AnalyticsService['loadPlansForYears']>>;
  products: Array<{
    id: string;
    name: string;
    unit: string;
    costPerUnit: Prisma.Decimal | null;
  }>;
  customers: Array<{
    id: string;
    name: string;
    companyName: string;
    companyType: string | null;
  }>;
  windowOrders: AnalyticsOrderRow[];
  mixOrders: MixOrderRow[];
};

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);
  private readonly windowCache = new Map<
    string,
    AnalyticsWindowCacheEntry<AnalyticsSharedWindow>
  >();

  constructor(private readonly prisma: PrismaService) {}

  async getOverview(
    profileId: string,
    timeline: AnalyticsTimeline,
    options: AnalyticsOverviewOptions = defaultAnalyticsOverviewOptions(),
  ) {
    const focus = focusYears(timeline);
    const singleYear = focus?.length === 1 ? focus[0]! : null;
    if (singleYear != null) this.assertYear(singleYear);
    for (const y of focus ?? []) this.assertYear(y);

    const years = resolveAnalyticsLoadYears(timeline);
    const inScope = (date: Date) => isDateInTimeline(date, timeline);
    const scopeKind = timelineScopeLabel(timeline);
    const wantSummary = options.include.has('summary');
    const wantSeries = options.include.has('series');
    const wantProducts = options.include.has('products');
    const wantCustomers = options.include.has('customers');
    const wantWeekly = wantsSeriesGranularity(options, 'weekly');
    const wantMonthly = wantsSeriesGranularity(options, 'monthly');
    const wantQuarterly = wantsSeriesGranularity(options, 'quarterly');
    const wantAnnual = wantsSeriesGranularity(options, 'annual');
    const needMetricRows = wantSummary || wantSeries;

    // Shared short-TTL window cache — progressive summary/series then tables
    // reuse the same order/catalog load within ~45s.
    const { plans, products, customers, windowOrders, mixOrders } =
      await this.loadSharedWindow(profileId, years);

    const annualActuals = years.map((y) => ({
      year: y,
      actuals: bucketOrdersByMonth(
        windowOrders.filter((o) => o.orderDate.getUTCFullYear() === y),
      ),
    }));

    const productById = new Map<string, CatalogProduct>(
      products.map((p) => [
        p.id,
        {
          id: p.id,
          name: p.name,
          unit: p.unit,
          costPerUnit:
            p.costPerUnit != null ? decimalToNumber(p.costPerUnit) : null,
        },
      ]),
    );
    const customerById = new Map<string, CatalogCustomer>(
      customers.map((c) => [
        c.id,
        {
          id: c.id,
          name: c.name,
          companyName: c.companyName,
          companyType: c.companyType ?? '',
        },
      ]),
    );

    const resolveProduct = (productId: string): CatalogProduct =>
      productById.get(productId) ?? {
        id: productId,
        name: 'Unknown product',
        unit: 'PCS',
        costPerUnit: null,
      };

    const emptySummary = {
      year: singleYear,
      years: focus,
      scope: scopeKind,
      revenue: 0,
      orderCount: 0,
      avgOrderValue: null as number | null,
      target: null as number | null,
      attainmentPercent: null as number | null,
      monthlyTargetSum: null as number | null,
      cost: null as number | null,
      profit: null as number | null,
      marginPercent: null as number | null,
      avgShipmentDays: null as number | null,
      shipmentSampleSize: 0,
      avgInvoiceDays: null as number | null,
      invoiceSampleSize: 0,
      avgFirstPaymentDays: null as number | null,
      firstPaymentSampleSize: 0,
      avgPaymentDays: null as number | null,
      paymentSampleSize: 0,
      avgLtv: null as number | null,
      ltvCustomerCount: 0,
      avgProductRevenue: null as number | null,
      productSaleCount: 0,
      avgBasketSize: null as number | null,
      avgPurchaseFrequency: null as number | null,
      purchaseFrequencyCustomerCount: 0,
    };

    // Tables-only: skip metric-row / series CPU; still use the window load.
    if (!needMetricRows) {
      const yearOrders = windowOrders.filter((o) => inScope(o.orderDate));
      const productPerf = wantProducts
        ? this.aggregateProductsForOrders(yearOrders, resolveProduct)
        : [];
      const customerPerf = wantCustomers
        ? this.aggregateCustomersForOrders(
            yearOrders,
            resolveProduct,
            customerById,
          )
        : [];
      this.logger.log(
        `Analytics overview (tables) for ${profileId} scope=${scopeKind} years=${focus?.join(',') ?? 'all'} (${productPerf.length} products, ${customerPerf.length} customers, windowOrders=${windowOrders.length})`,
      );
      return {
        year: singleYear,
        years: focus,
        scope: scopeKind,
        summary: emptySummary,
        weekly: [],
        monthly: [],
        quarterly: [],
        annual: [],
        products: productPerf,
        customers: customerPerf,
      };
    }

    const marginRows: MarginOrderRow[] = [];
    const productRevenueRows: ProductRevenueRow[] = [];
    for (const o of windowOrders) {
      const orderTotal = o.totalOrderValue;
      const orderGross = o.lineTotal;
      const lineRows =
        o.lines.length > 0
          ? o.lines
          : [
              {
                productId: o.productId,
                productQty: o.productQty,
                lineTotal: o.lineTotal,
              },
            ];
      const lineTotals = lineRows.map((l) => l.lineTotal);
      const grossTotals =
        o.lines.length > 0
          ? lineTotals
          : [orderGross > 0 ? orderGross : (lineTotals[0] ?? orderTotal)];
      const allocated = allocateLineRevenue(grossTotals, orderTotal);
      lineRows.forEach((line, index) => {
        const product = resolveProduct(line.productId);
        const net = allocated[index] ?? 0;
        marginRows.push({
          orderDate: o.orderDate,
          totalOrderValue: net,
          productQty: line.productQty,
          costPerUnit: product.costPerUnit,
        });
        productRevenueRows.push({
          orderDate: o.orderDate,
          productId: line.productId,
          revenue: net,
        });
      });
    }

    const durationRows: DurationOrderRow[] = windowOrders.map((o) => {
      const first =
        o.installments.length > 0 ? o.installments[0]!.installmentDate : null;
      const last =
        o.installments.length > 0
          ? o.installments[o.installments.length - 1]!.installmentDate
          : null;
      return {
        orderDate: o.orderDate,
        shipmentDate: o.shipmentDate,
        invoiceDate: o.invoiceDate,
        firstPaymentDate: first,
        lastPaymentDate: last,
      };
    });

    const scopeMarginRows = marginRows.filter((r) => inScope(r.orderDate));
    const scopeDurationRows = durationRows.filter((r) => inScope(r.orderDate));
    const monthlyMargins = bucketMarginByMonth(
      singleYear != null
        ? scopeMarginRows
        : marginRows.filter(
            (r) =>
              r.orderDate.getUTCFullYear() === new Date().getUTCFullYear(),
          ),
    );
    const yearMargin = periodMarginFromOrders(scopeMarginRows);
    const monthlyDurations = bucketDurationsByMonth(
      singleYear != null
        ? scopeDurationRows
        : durationRows.filter(
            (r) =>
              r.orderDate.getUTCFullYear() === new Date().getUTCFullYear(),
          ),
    );
    const yearDurations = periodDurationsFromOrders(scopeDurationRows);

    const ltvRows: LtvOrderRow[] = [];
    for (const o of windowOrders) {
      if (!o.customerId) continue;
      ltvRows.push({
        orderDate: o.orderDate,
        customerId: o.customerId,
        revenue: o.totalOrderValue,
      });
    }
    const scopeLtvRows = ltvRows.filter((r) => inScope(r.orderDate));
    const monthlyLtv = bucketAvgLtvByMonth(
      singleYear != null
        ? scopeLtvRows
        : ltvRows.filter(
            (r) =>
              r.orderDate.getUTCFullYear() === new Date().getUTCFullYear(),
          ),
    );
    const yearLtv = periodAvgLtvFromOrders(scopeLtvRows);

    const scopeProductRevenueRows = productRevenueRows.filter((r) =>
      inScope(r.orderDate),
    );
    const monthlyProductRevenue = bucketAvgProductRevenueByMonth(
      singleYear != null
        ? scopeProductRevenueRows
        : productRevenueRows.filter(
            (r) =>
              r.orderDate.getUTCFullYear() === new Date().getUTCFullYear(),
          ),
    );
    const yearProductRevenue = periodAvgProductRevenueFromLines(
      scopeProductRevenueRows,
    );

    const basketRows: BasketOrderRow[] = windowOrders.map((o) => {
      const linePacks =
        o.lines.length > 0
          ? o.lines.map((l) => l.packCount)
          : [o.packCount];
      let packCount = 0;
      for (const packs of linePacks) {
        packCount += Math.max(0, packs);
      }
      return { orderDate: o.orderDate, packCount };
    });
    const scopeBasketRows = basketRows.filter((r) => inScope(r.orderDate));
    const monthlyBasket = bucketAvgBasketByMonth(
      singleYear != null
        ? scopeBasketRows
        : basketRows.filter(
            (r) =>
              r.orderDate.getUTCFullYear() === new Date().getUTCFullYear(),
          ),
    );
    const yearBasket = periodAvgBasketFromOrders(scopeBasketRows);

    const frequencyRows: PurchaseFrequencyOrderRow[] = ltvRows.map((r) => ({
      orderDate: r.orderDate,
      customerId: r.customerId,
    }));
    const scopeFrequencyRows = frequencyRows.filter((r) =>
      inScope(r.orderDate),
    );
    const monthlyFrequency = bucketAvgPurchaseFrequencyByMonth(
      singleYear != null
        ? scopeFrequencyRows
        : frequencyRows.filter(
            (r) =>
              r.orderDate.getUTCFullYear() === new Date().getUTCFullYear(),
          ),
    );
    const yearFrequency =
      periodAvgPurchaseFrequencyFromOrders(scopeFrequencyRows);

    const planByYear = new Map(plans.map((p) => [p.year, p]));
    const focusPlan =
      singleYear != null ? (planByYear.get(singleYear) ?? null) : null;
    const monthlyTargets =
      focusPlan && focusPlan.months.length === 12
        ? Object.fromEntries(
            focusPlan.months.map((m) => [m.month, decimalToNumber(m.amount)]),
          )
        : null;

    const monthlyActuals =
      singleYear != null
        ? (annualActuals.find((row) => row.year === singleYear)?.actuals ??
          emptyOrderActuals())
        : null;

    const buildMonthSlot = (slot: {
      year: number;
      month: number;
      label: string;
      withTargets?: boolean;
    }) => {
      const slotOrders = windowOrders.filter(
        (o) =>
          o.orderDate.getUTCFullYear() === slot.year &&
          o.orderDate.getUTCMonth() + 1 === slot.month,
      );
      let revenue = 0;
      for (const o of slotOrders) {
        revenue += Math.max(0, o.totalOrderValue);
      }
      revenue = roundMoney(revenue);
      const orderCount = slotOrders.length;
      const margin = periodMarginFromOrders(
        marginRows.filter(
          (r) =>
            r.orderDate.getUTCFullYear() === slot.year &&
            r.orderDate.getUTCMonth() + 1 === slot.month,
        ),
      );
      const duration = periodDurationsFromOrders(
        durationRows.filter(
          (r) =>
            r.orderDate.getUTCFullYear() === slot.year &&
            r.orderDate.getUTCMonth() + 1 === slot.month,
        ),
      );
      const ltv = periodAvgLtvFromOrders(
        ltvRows.filter(
          (r) =>
            r.orderDate.getUTCFullYear() === slot.year &&
            r.orderDate.getUTCMonth() + 1 === slot.month,
        ),
      );
      const productRev = periodAvgProductRevenueFromLines(
        productRevenueRows.filter(
          (r) =>
            r.orderDate.getUTCFullYear() === slot.year &&
            r.orderDate.getUTCMonth() + 1 === slot.month,
        ),
      );
      const basket = periodAvgBasketFromOrders(
        basketRows.filter(
          (r) =>
            r.orderDate.getUTCFullYear() === slot.year &&
            r.orderDate.getUTCMonth() + 1 === slot.month,
        ),
      );
      const frequency = periodAvgPurchaseFrequencyFromOrders(
        frequencyRows.filter(
          (r) =>
            r.orderDate.getUTCFullYear() === slot.year &&
            r.orderDate.getUTCMonth() + 1 === slot.month,
        ),
      );
      const plan = planByYear.get(slot.year);
      const monthTarget =
        slot.withTargets && plan && plan.months.length === 12
          ? decimalToNumber(
              plan.months.find((m) => m.month === slot.month)?.amount ?? 0,
            )
          : null;
      return {
        month: slot.month,
        year: slot.year,
        label: slot.label,
        revenue,
        orderCount,
        avgOrderValue: averageOrderValue(revenue, orderCount),
        target: monthTarget,
        attainmentPercent:
          monthTarget != null ? attainmentPercent(revenue, monthTarget) : null,
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
    };

    const timelineYears =
      focus ??
      Array.from(
        { length: APP_YEAR_MAX - APP_YEAR_MIN + 1 },
        (_, i) => APP_YEAR_MIN + i,
      );

    const monthKey = (year: number, month: number) =>
      `${year}-${String(month).padStart(2, '0')}`;
    const monthKeyFromDate = (date: Date) =>
      monthKey(date.getUTCFullYear(), date.getUTCMonth() + 1);

    const weekMonthTargets = buildMonthTargetMap(
      plans
        .filter((plan) => plan.months.length === 12)
        .map((plan) => ({
          year: plan.year,
          months: plan.months.map((m) => ({
            month: m.month,
            amount: decimalToNumber(m.amount),
          })),
        })),
    );

    const monthly = wantMonthly
      ? attachMixSharesToPoints(
          singleYear != null && monthlyActuals
            ? MONTH_LABELS.map((label, index) => {
                const month = index + 1;
                const revenue = monthlyActuals.byMonth[month] ?? 0;
                const orderCount = monthlyActuals.orderCountByMonth[month] ?? 0;
                const target = monthlyTargets
                  ? (monthlyTargets[month] ?? null)
                  : null;
                const margin = monthlyMargins[month];
                const duration = monthlyDurations[month];
                return {
                  month,
                  year: singleYear,
                  label,
                  revenue,
                  orderCount,
                  avgOrderValue: averageOrderValue(revenue, orderCount),
                  target,
                  attainmentPercent:
                    target != null ? attainmentPercent(revenue, target) : null,
                  cost: margin?.cost ?? null,
                  profit: margin?.profit ?? null,
                  marginPercent: margin?.marginPercent ?? null,
                  avgShipmentDays: duration?.avgShipmentDays ?? null,
                  shipmentSampleSize: duration?.shipmentSampleSize ?? 0,
                  avgInvoiceDays: duration?.avgInvoiceDays ?? null,
                  invoiceSampleSize: duration?.invoiceSampleSize ?? 0,
                  avgFirstPaymentDays: duration?.avgFirstPaymentDays ?? null,
                  firstPaymentSampleSize: duration?.firstPaymentSampleSize ?? 0,
                  avgPaymentDays: duration?.avgPaymentDays ?? null,
                  paymentSampleSize: duration?.paymentSampleSize ?? 0,
                  avgLtv: monthlyLtv[month] ?? null,
                  avgProductRevenue: monthlyProductRevenue[month] ?? null,
                  avgBasketSize: monthlyBasket[month] ?? null,
                  avgPurchaseFrequency: monthlyFrequency[month] ?? null,
                };
              })
            : listCalendarMonthsInYears(timelineYears).map((slot) =>
                buildMonthSlot({
                  year: slot.year,
                  month: slot.month,
                  label: slot.label,
                  withTargets: true,
                }),
              ),
          mixOrders,
          monthKeyFromDate,
          (p) => monthKey(p.year ?? singleYear ?? 0, p.month),
        )
      : [];

    const weekly = wantWeekly
      ? attachMixSharesToPoints(
          buildWeeklySeries({
            weeks: listIsoWeeksInCalendarYears(timelineYears),
            orderValues: windowOrders.map((o) => ({
              orderDate: o.orderDate,
              totalOrderValue: o.totalOrderValue,
            })),
            marginRows,
            durationRows,
            ltvRows,
            productRevenueRows,
            basketRows,
            frequencyRows,
            monthTargets: weekMonthTargets,
          }),
          mixOrders,
          isoWeekKeyFromDate,
          (p) => isoWeekKey(p.isoYear, p.week),
        )
      : [];

    const quarterly = wantQuarterly
      ? attachMixSharesToPoints(
          buildQuarterlySeries({
            quarters: listCalendarQuartersInYears(timelineYears),
            orderValues: windowOrders.map((o) => ({
              orderDate: o.orderDate,
              totalOrderValue: o.totalOrderValue,
            })),
            marginRows,
            durationRows,
            ltvRows,
            productRevenueRows,
            basketRows,
            frequencyRows,
            monthTargets: weekMonthTargets,
          }),
          mixOrders,
          calendarQuarterKeyFromDate,
          (p) => calendarQuarterKey(p.year, p.quarter),
        )
      : [];

    const annualTargetFor = (y: number): number | null => {
      const plan = planByYear.get(y);
      if (!plan) return null;
      if (plan.months.length === 12) {
        return sumAmounts(plan.months.map((m) => decimalToNumber(m.amount)));
      }
      if (plan.annualMode === RevenueTargetMode.MANUAL) {
        return plan.annualAmount != null
          ? decimalToNumber(plan.annualAmount)
          : null;
      }
      return plan.baseAnnualAmount != null
        ? decimalToNumber(plan.baseAnnualAmount)
        : null;
    };

    const annual = wantAnnual
      ? attachMixSharesToPoints(
          (focus != null && focus.length > 1
            ? annualActuals.filter((row) => focus.includes(row.year))
            : annualActuals
          ).map(({ year: y, actuals }) => {
            const target = annualTargetFor(y);
            const mRows = marginRows.filter(
              (r) => r.orderDate.getUTCFullYear() === y,
            );
            const dRows = durationRows.filter(
              (r) => r.orderDate.getUTCFullYear() === y,
            );
            const margin = periodMarginFromOrders(mRows);
            const duration = periodDurationsFromOrders(dRows);
            const ltv = periodAvgLtvFromOrders(
              ltvRows.filter((r) => r.orderDate.getUTCFullYear() === y),
            );
            const productRev = periodAvgProductRevenueFromLines(
              productRevenueRows.filter(
                (r) => r.orderDate.getUTCFullYear() === y,
              ),
            );
            const basket = periodAvgBasketFromOrders(
              basketRows.filter((r) => r.orderDate.getUTCFullYear() === y),
            );
            const frequency = periodAvgPurchaseFrequencyFromOrders(
              frequencyRows.filter((r) => r.orderDate.getUTCFullYear() === y),
            );
            return {
              year: y,
              revenue: actuals.yearTotal,
              orderCount: actuals.yearOrderCount,
              avgOrderValue: averageOrderValue(
                actuals.yearTotal,
                actuals.yearOrderCount,
              ),
              target,
              attainmentPercent:
                target != null
                  ? attainmentPercent(actuals.yearTotal, target)
                  : null,
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
          }),
          mixOrders,
          (d) => String(d.getUTCFullYear()),
          (p) => String(p.year),
        )
      : [];

    const scopeTargetYears = focus ?? [];
    let scopeTarget: number | null = null;
    if (singleYear != null) {
      scopeTarget = annualTargetFor(singleYear);
    } else if (scopeTargetYears.length > 1) {
      let sum = 0;
      let any = false;
      for (const y of scopeTargetYears) {
        const t = annualTargetFor(y);
        if (t == null) continue;
        any = true;
        sum += t;
      }
      scopeTarget = any ? roundMoney(sum) : null;
    }

    const scopeRevenue = roundMoney(
      windowOrders
        .filter((o) => inScope(o.orderDate))
        .reduce((sum, o) => sum + Math.max(0, o.totalOrderValue), 0),
    );
    const scopeOrderCount = windowOrders.filter((o) =>
      inScope(o.orderDate),
    ).length;
    const summary = {
      year: singleYear,
      years: focus,
      scope: scopeKind,
      revenue: scopeRevenue,
      orderCount: scopeOrderCount,
      avgOrderValue: averageOrderValue(scopeRevenue, scopeOrderCount),
      target: scopeTarget,
      attainmentPercent:
        scopeTarget != null
          ? attainmentPercent(scopeRevenue, scopeTarget)
          : null,
      monthlyTargetSum: monthlyTargets
        ? Object.values(monthlyTargets).reduce((a, b) => a + b, 0)
        : null,
      cost: yearMargin.cost,
      profit: yearMargin.profit,
      marginPercent: yearMargin.marginPercent,
      avgShipmentDays: yearDurations.avgShipmentDays,
      shipmentSampleSize: yearDurations.shipmentSampleSize,
      avgInvoiceDays: yearDurations.avgInvoiceDays,
      invoiceSampleSize: yearDurations.invoiceSampleSize,
      avgFirstPaymentDays: yearDurations.avgFirstPaymentDays,
      firstPaymentSampleSize: yearDurations.firstPaymentSampleSize,
      avgPaymentDays: yearDurations.avgPaymentDays,
      paymentSampleSize: yearDurations.paymentSampleSize,
      avgLtv: yearLtv.avgLtv,
      ltvCustomerCount: yearLtv.customerCount,
      avgProductRevenue: yearProductRevenue.avgProductRevenue,
      productSaleCount: yearProductRevenue.productCount,
      avgBasketSize: yearBasket.avgBasketSize,
      avgPurchaseFrequency: yearFrequency.avgPurchaseFrequency,
      purchaseFrequencyCustomerCount: yearFrequency.customerCount,
    };

    const yearOrders = windowOrders.filter((o) => inScope(o.orderDate));
    const productPerf = wantProducts
      ? this.aggregateProductsForOrders(yearOrders, resolveProduct)
      : [];
    const customerPerf = wantCustomers
      ? this.aggregateCustomersForOrders(
          yearOrders,
          resolveProduct,
          customerById,
        )
      : [];

    this.logger.log(
      `Analytics overview for ${profileId} scope=${scopeKind} years=${focus?.join(',') ?? 'all'} include=${[...options.include].join('+')} granularity=${options.granularity} (${scopeOrderCount} orders, ${productPerf.length} products, ${customerPerf.length} customers, windowOrders=${windowOrders.length})`,
    );

    return {
      year: singleYear,
      years: focus,
      scope: scopeKind,
      // Summary is cheap once metric rows exist; always return it on this path
      // so progressive clients can render KPIs even when include omitted summary.
      summary,
      weekly,
      monthly,
      quarterly,
      annual,
      products: productPerf,
      customers: customerPerf,
    };
  }

  private aggregateProductsForOrders(
    yearOrders: AnalyticsOrderRow[],
    resolveProduct: (productId: string) => CatalogProduct,
  ) {
    const productRows: Parameters<typeof aggregateProductPerformance>[0] = [];
    for (const o of yearOrders) {
      const orderTotal = o.totalOrderValue;
      const orderGross = o.lineTotal;
      const lineRows =
        o.lines.length > 0
          ? o.lines
          : [
              {
                productId: o.productId,
                productQty: o.productQty,
                packCount: o.packCount,
                lineTotal: o.lineTotal,
              },
            ];
      const lineTotals = lineRows.map((l) => l.lineTotal);
      const grossTotals =
        o.lines.length > 0
          ? lineTotals
          : [orderGross > 0 ? orderGross : (lineTotals[0] ?? orderTotal)];
      const allocated = allocateLineRevenue(grossTotals, orderTotal);
      lineRows.forEach((line, index) => {
        const product = resolveProduct(line.productId);
        const gross = grossTotals[index] ?? 0;
        const net = allocated[index] ?? 0;
        productRows.push({
          orderId: o.id,
          productId: line.productId,
          productName: product.name,
          unit: product.unit,
          orderDate: o.orderDate,
          totalOrderValue: net,
          discount: Math.max(0, gross - net),
          productQty: line.productQty,
          packCount: line.packCount,
          costPerUnit: product.costPerUnit,
        });
      });
    }
    return aggregateProductPerformance(productRows);
  }

  private aggregateCustomersForOrders(
    yearOrders: AnalyticsOrderRow[],
    resolveProduct: (productId: string) => CatalogProduct,
    customerById: Map<string, CatalogCustomer>,
  ) {
    const customerRows: Parameters<typeof aggregateCustomerPerformance>[0] =
      [];
    for (const o of yearOrders) {
      if (!o.customerId) continue;
      const customer = customerById.get(o.customerId);
      if (!customer) continue;
      const orderTotal = o.totalOrderValue;
      const orderGross = o.lineTotal;
      const discount = Math.max(0, orderGross - orderTotal);
      const lineRows =
        o.lines.length > 0
          ? o.lines
          : [
              {
                productId: o.productId,
                productQty: o.productQty,
                packCount: o.packCount,
              },
            ];
      let costSum = 0;
      let hasCost = false;
      let packsSold = 0;
      for (const line of lineRows) {
        packsSold += Math.max(0, line.packCount);
        const product = resolveProduct(line.productId);
        if (product.costPerUnit == null) continue;
        hasCost = true;
        costSum += line.productQty * product.costPerUnit;
      }
      customerRows.push({
        orderId: o.id,
        customerId: customer.id,
        customerName: customer.name,
        companyName: customer.companyName,
        companyType: customer.companyType,
        orderDate: o.orderDate,
        revenue: orderTotal,
        discount,
        cost: hasCost ? costSum : null,
        packsSold,
      });
    }
    return aggregateCustomerPerformance(customerRows);
  }

  private loadPlansForYears(profileId: string, years: number[]) {
    return this.prisma.revenueTargetPlan.findMany({
      where: { profileId, year: { in: years } },
      include: { months: { orderBy: { month: 'asc' as const } } },
    });
  }

  private async loadSharedWindow(
    profileId: string,
    years: number[],
  ): Promise<AnalyticsSharedWindow> {
    const key = analyticsWindowCacheKey(profileId, years);
    const hit = readCacheEntry(this.windowCache, key);
    if (hit) {
      this.logger.debug(`Analytics window cache hit for ${key}`);
      return hit;
    }

    const [plans, products, customers, windowOrders, mixOrders] =
      await Promise.all([
        this.loadPlansForYears(profileId, years),
        this.prisma.product.findMany({
          where: { profileId },
          select: {
            id: true,
            name: true,
            unit: true,
            costPerUnit: true,
          },
        }),
        this.prisma.customer.findMany({
          where: { profileId },
          select: {
            id: true,
            name: true,
            companyName: true,
            companyType: true,
          },
        }),
        this.loadWindowOrders(profileId, years),
        this.loadWindowMixOrders(profileId, years),
      ]);

    const value: AnalyticsSharedWindow = {
      plans,
      products,
      customers,
      windowOrders,
      mixOrders,
    };
    writeCacheEntry(this.windowCache, key, value);
    return value;
  }

  /**
   * Lightweight load including CANCELLED for status / payment mix charts.
   */
  private async loadWindowMixOrders(
    profileId: string,
    years: number[],
  ): Promise<MixOrderRow[]> {
    if (years.length === 0) return [];
    // Mix select is shallow — one range query is safe and faster than N years.
    const sorted = [...years].sort((a, b) => a - b);
    const start = new Date(Date.UTC(sorted[0]!, 0, 1));
    const end = new Date(Date.UTC(sorted[sorted.length - 1]! + 1, 0, 1));
    return this.prisma.order.findMany({
      where: {
        profileId,
        orderDate: { gte: start, lt: end },
      },
      select: {
        orderDate: true,
        status: true,
        paymentStatus: true,
      },
    });
  }

  /**
   * Load orders year-by-year with shallow selects to avoid Prisma nested-join
   * panics on large seeded windows (~40k+ orders). Years run in parallel.
   */
  private async loadWindowOrders(
    profileId: string,
    years: number[],
  ): Promise<AnalyticsOrderRow[]> {
    const chunks = await Promise.all(
      years.map(async (y) => {
        const start = new Date(Date.UTC(y, 0, 1));
        const end = new Date(Date.UTC(y + 1, 0, 1));
        const rows = await this.prisma.order.findMany({
          where: {
            profileId,
            status: { not: OrderStatus.CANCELLED },
            orderDate: { gte: start, lt: end },
          },
          select: {
            id: true,
            productId: true,
            orderDate: true,
            shipmentDate: true,
            invoiceDate: true,
            totalOrderValue: true,
            lineTotal: true,
            productQty: true,
            packCount: true,
            customerId: true,
            lines: {
              orderBy: { sortOrder: 'asc' },
              select: {
                productId: true,
                productQty: true,
                packCount: true,
                lineTotal: true,
              },
            },
            installments: {
              select: { installmentDate: true },
              orderBy: { installmentDate: 'asc' },
            },
          },
        });
        return rows.map((o) => ({
          id: o.id,
          productId: o.productId,
          orderDate: o.orderDate,
          shipmentDate: o.shipmentDate,
          invoiceDate: o.invoiceDate,
          totalOrderValue: decimalToNumber(o.totalOrderValue),
          lineTotal: decimalToNumber(o.lineTotal),
          productQty: decimalToNumber(o.productQty),
          packCount: decimalToNumber(o.packCount),
          customerId: o.customerId,
          lines: o.lines.map((l) => ({
            productId: l.productId,
            productQty: decimalToNumber(l.productQty),
            packCount: decimalToNumber(l.packCount),
            lineTotal: decimalToNumber(l.lineTotal),
          })),
          installments: o.installments.map((i) => ({
            installmentDate: i.installmentDate,
          })),
        }));
      }),
    );
    return chunks.flat();
  }

  private assertYear(year: number) {
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      throw new BadRequestException('Year must be between 2000 and 2100');
    }
  }
}
