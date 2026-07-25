import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { OrderStatus, RevenueTargetMode } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { decimalToNumber } from '../common/utils/serialize';
import { attainmentPercent, sumAmounts } from '../revenue-targets/revenue-target-math';
import { allocateLineRevenue } from '../orders/order-math';
import { loadOrderActuals } from './order-actuals';
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

const ANNUAL_WINDOW = 5;

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getOverview(profileId: string, year: number) {
    this.assertYear(year);

    const years = Array.from(
      { length: ANNUAL_WINDOW },
      (_, i) => year - (ANNUAL_WINDOW - 1 - i),
    );

    const windowStart = new Date(Date.UTC(years[0], 0, 1));
    const windowEnd = new Date(Date.UTC(year + 1, 0, 1));

    const [annualActuals, plans, windowOrders] = await Promise.all([
      Promise.all(
        years.map(async (y) => ({
          year: y,
          actuals: await loadOrderActuals(this.prisma, profileId, y),
        })),
      ),
      this.prisma.revenueTargetPlan.findMany({
        where: { profileId, year: { in: years } },
        include: { months: { orderBy: { month: 'asc' } } },
      }),
      this.prisma.order.findMany({
        where: {
          profileId,
          status: { not: OrderStatus.CANCELLED },
          orderDate: { gte: windowStart, lt: windowEnd },
        },
        select: {
          id: true,
          productId: true,
          orderDate: true,
          shipmentDate: true,
          totalOrderValue: true,
          lineTotal: true,
          productQty: true,
          customerId: true,
          customer: {
            select: {
              id: true,
              name: true,
              companyName: true,
              companyType: true,
            },
          },
          product: {
            select: {
              name: true,
              unit: true,
              costPerUnit: true,
            },
          },
          lines: {
            orderBy: { sortOrder: 'asc' },
            select: {
              productId: true,
              productQty: true,
              lineTotal: true,
              product: {
                select: {
                  name: true,
                  unit: true,
                  costPerUnit: true,
                },
              },
            },
          },
          installments: {
            select: { installmentDate: true },
            orderBy: { installmentDate: 'asc' },
          },
        },
      }),
    ]);

    const marginRows: MarginOrderRow[] = [];
    for (const o of windowOrders) {
      const orderTotal = decimalToNumber(o.totalOrderValue);
      const orderGross = decimalToNumber(o.lineTotal);
      const lineRows =
        o.lines.length > 0
          ? o.lines
          : [
              {
                productId: o.productId,
                productQty: o.productQty,
                lineTotal: o.lineTotal,
                product: o.product,
              },
            ];
      const lineTotals = lineRows.map((l) => decimalToNumber(l.lineTotal));
      // Prefer order.lineTotal when present so legacy single-line rows stay accurate.
      const grossTotals =
        o.lines.length > 0
          ? lineTotals
          : [orderGross > 0 ? orderGross : lineTotals[0] ?? orderTotal];
      const allocated = allocateLineRevenue(grossTotals, orderTotal);
      lineRows.forEach((line, index) => {
        marginRows.push({
          orderDate: o.orderDate,
          totalOrderValue: allocated[index] ?? 0,
          productQty: decimalToNumber(line.productQty),
          costPerUnit:
            line.product.costPerUnit != null
              ? decimalToNumber(line.product.costPerUnit)
              : null,
        });
      });
    }

    const durationRows: DurationOrderRow[] = windowOrders.map((o) => {
      const first =
        o.installments.length > 0
          ? o.installments[0].installmentDate
          : null;
      const last =
        o.installments.length > 0
          ? o.installments[o.installments.length - 1].installmentDate
          : null;
      return {
        orderDate: o.orderDate,
        shipmentDate: o.shipmentDate,
        firstPaymentDate: first,
        lastPaymentDate: last,
      };
    });

    const yearMarginRows = marginRows.filter(
      (r) => r.orderDate.getUTCFullYear() === year,
    );
    const yearDurationRows = durationRows.filter(
      (r) => r.orderDate.getUTCFullYear() === year,
    );
    const monthlyMargins = bucketMarginByMonth(yearMarginRows);
    const yearMargin = periodMarginFromOrders(yearMarginRows);
    const monthlyDurations = bucketDurationsByMonth(yearDurationRows);
    const yearDurations = periodDurationsFromOrders(yearDurationRows);

    const ltvRows: LtvOrderRow[] = [];
    for (const o of windowOrders) {
      if (!o.customerId) continue;
      ltvRows.push({
        orderDate: o.orderDate,
        customerId: o.customerId,
        revenue: decimalToNumber(o.totalOrderValue),
      });
    }
    const yearLtvRows = ltvRows.filter(
      (r) => r.orderDate.getUTCFullYear() === year,
    );
    const monthlyLtv = bucketAvgLtvByMonth(yearLtvRows);
    const yearLtv = periodAvgLtvFromOrders(yearLtvRows);

    const monthlyActuals =
      annualActuals.find((row) => row.year === year)?.actuals ??
      (await loadOrderActuals(this.prisma, profileId, year));

    const planByYear = new Map(plans.map((p) => [p.year, p]));
    const focusPlan = planByYear.get(year) ?? null;
    const monthlyTargets =
      focusPlan && focusPlan.months.length === 12
        ? Object.fromEntries(
            focusPlan.months.map((m) => [m.month, decimalToNumber(m.amount)]),
          )
        : null;

    const monthly = MONTH_LABELS.map((label, index) => {
      const month = index + 1;
      const revenue = monthlyActuals.byMonth[month] ?? 0;
      const orderCount = monthlyActuals.orderCountByMonth[month] ?? 0;
      const target = monthlyTargets ? (monthlyTargets[month] ?? null) : null;
      const margin = monthlyMargins[month];
      const duration = monthlyDurations[month];
      return {
        month,
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
        avgFirstPaymentDays: duration?.avgFirstPaymentDays ?? null,
        firstPaymentSampleSize: duration?.firstPaymentSampleSize ?? 0,
        avgPaymentDays: duration?.avgPaymentDays ?? null,
        paymentSampleSize: duration?.paymentSampleSize ?? 0,
        avgLtv: monthlyLtv[month] ?? null,
      };
    });

    const annualTargetFor = (y: number): number | null => {
      const plan = planByYear.get(y);
      if (!plan) return null;
      // Months are source of truth when a full year breakdown exists.
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

    const annual = annualActuals.map(({ year: y, actuals }) => {
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
          target != null ? attainmentPercent(actuals.yearTotal, target) : null,
        cost: margin.cost,
        profit: margin.profit,
        marginPercent: margin.marginPercent,
        avgShipmentDays: duration.avgShipmentDays,
        shipmentSampleSize: duration.shipmentSampleSize,
        avgFirstPaymentDays: duration.avgFirstPaymentDays,
        firstPaymentSampleSize: duration.firstPaymentSampleSize,
        avgPaymentDays: duration.avgPaymentDays,
        paymentSampleSize: duration.paymentSampleSize,
        avgLtv: ltv.avgLtv,
      };
    });

    const yearTarget = annualTargetFor(year);
    const summary = {
      year,
      revenue: monthlyActuals.yearTotal,
      orderCount: monthlyActuals.yearOrderCount,
      avgOrderValue: averageOrderValue(
        monthlyActuals.yearTotal,
        monthlyActuals.yearOrderCount,
      ),
      target: yearTarget,
      attainmentPercent:
        yearTarget != null
          ? attainmentPercent(monthlyActuals.yearTotal, yearTarget)
          : null,
      monthlyTargetSum: monthlyTargets
        ? Object.values(monthlyTargets).reduce((a, b) => a + b, 0)
        : null,
      cost: yearMargin.cost,
      profit: yearMargin.profit,
      marginPercent: yearMargin.marginPercent,
      avgShipmentDays: yearDurations.avgShipmentDays,
      shipmentSampleSize: yearDurations.shipmentSampleSize,
      avgFirstPaymentDays: yearDurations.avgFirstPaymentDays,
      firstPaymentSampleSize: yearDurations.firstPaymentSampleSize,
      avgPaymentDays: yearDurations.avgPaymentDays,
      paymentSampleSize: yearDurations.paymentSampleSize,
      avgLtv: yearLtv.avgLtv,
      ltvCustomerCount: yearLtv.customerCount,
    };

    const yearOrders = windowOrders.filter(
      (o) => o.orderDate.getUTCFullYear() === year,
    );
    const productRows: Parameters<typeof aggregateProductPerformance>[0] = [];
    for (const o of yearOrders) {
      const orderTotal = decimalToNumber(o.totalOrderValue);
      const orderGross = decimalToNumber(o.lineTotal);
      const lineRows =
        o.lines.length > 0
          ? o.lines
          : [
              {
                productId: o.productId,
                productQty: o.productQty,
                lineTotal: o.lineTotal,
                product: o.product,
              },
            ];
      const lineTotals = lineRows.map((l) => decimalToNumber(l.lineTotal));
      const grossTotals =
        o.lines.length > 0
          ? lineTotals
          : [orderGross > 0 ? orderGross : lineTotals[0] ?? orderTotal];
      const allocated = allocateLineRevenue(grossTotals, orderTotal);
      lineRows.forEach((line, index) => {
        const gross = grossTotals[index] ?? 0;
        const net = allocated[index] ?? 0;
        productRows.push({
          orderId: o.id,
          productId: line.productId,
          productName: line.product.name,
          unit: line.product.unit,
          totalOrderValue: net,
          discount: Math.max(0, gross - net),
          productQty: decimalToNumber(line.productQty),
          costPerUnit:
            line.product.costPerUnit != null
              ? decimalToNumber(line.product.costPerUnit)
              : null,
        });
      });
    }
    const products = aggregateProductPerformance(productRows);

    const customerRows: Parameters<typeof aggregateCustomerPerformance>[0] =
      [];
    for (const o of yearOrders) {
      if (!o.customerId || !o.customer) continue;
      const orderTotal = decimalToNumber(o.totalOrderValue);
      const orderGross = decimalToNumber(o.lineTotal);
      const discount = Math.max(0, orderGross - orderTotal);
      const lineRows =
        o.lines.length > 0
          ? o.lines
          : [
              {
                productQty: o.productQty,
                product: o.product,
              },
            ];
      let costSum = 0;
      let hasCost = false;
      for (const line of lineRows) {
        if (line.product.costPerUnit == null) continue;
        hasCost = true;
        costSum +=
          decimalToNumber(line.productQty) *
          decimalToNumber(line.product.costPerUnit);
      }
      customerRows.push({
        orderId: o.id,
        customerId: o.customer.id,
        customerName: o.customer.name,
        companyName: o.customer.companyName,
        companyType: o.customer.companyType,
        revenue: orderTotal,
        discount,
        cost: hasCost ? costSum : null,
      });
    }
    const customers = aggregateCustomerPerformance(customerRows);

    this.logger.log(
      `Analytics overview for ${profileId} year ${year} (${monthlyActuals.yearOrderCount} orders, ${products.length} products, ${customers.length} customers)`,
    );

    return { year, summary, monthly, annual, products, customers };
  }

  private assertYear(year: number) {
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      throw new BadRequestException('Year must be between 2000 and 2100');
    }
  }
}
