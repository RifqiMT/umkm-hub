import { OrderStatus, Prisma } from '@prisma/client';
import { decimalToNumber } from '../common/utils/serialize';
import { roundMoney } from '../revenue-targets/revenue-target-math';

type OrderActuals = {
  byMonth: Record<number, number>;
  orderCountByMonth: Record<number, number>;
  yearTotal: number;
  yearOrderCount: number;
};

type OrderRowForBucket = {
  orderDate: Date;
  totalOrderValue: Prisma.Decimal | number | string;
};

/** Empty Jan–Dec revenue + count maps. */
export function emptyOrderActuals(): OrderActuals {
  const byMonth: Record<number, number> = {};
  const orderCountByMonth: Record<number, number> = {};
  for (let m = 1; m <= 12; m += 1) {
    byMonth[m] = 0;
    orderCountByMonth[m] = 0;
  }
  return { byMonth, orderCountByMonth, yearTotal: 0, yearOrderCount: 0 };
}

/**
 * Bucket non-cancelled order rows into calendar months (UTC).
 * Pure helper — unit-tested without Prisma.
 */
export function bucketOrdersByMonth(orders: OrderRowForBucket[]): OrderActuals {
  const result = emptyOrderActuals();

  for (const order of orders) {
    const value = decimalToNumber(order.totalOrderValue);
    const month = order.orderDate.getUTCMonth() + 1;
    result.byMonth[month] = (result.byMonth[month] ?? 0) + value;
    result.orderCountByMonth[month] = (result.orderCountByMonth[month] ?? 0) + 1;
    result.yearTotal += value;
    result.yearOrderCount += 1;
  }

  for (let m = 1; m <= 12; m += 1) {
    result.byMonth[m] = roundMoney(result.byMonth[m] ?? 0);
  }
  result.yearTotal = roundMoney(result.yearTotal);

  return result;
}

type PrismaLike = {
  order: {
    findMany: (args: {
      where: {
        profileId: string;
        status: { not: typeof OrderStatus.CANCELLED };
        orderDate: { gte: Date; lt: Date };
      };
      select: { orderDate: true; totalOrderValue: true };
    }) => Promise<OrderRowForBucket[]>;
  };
};

/** Load profile order actuals for a calendar year (excludes CANCELLED). */
export async function loadOrderActuals(
  prisma: PrismaLike,
  profileId: string,
  year: number,
): Promise<OrderActuals> {
  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year + 1, 0, 1));

  const orders = await prisma.order.findMany({
    where: {
      profileId,
      status: { not: OrderStatus.CANCELLED },
      orderDate: { gte: start, lt: end },
    },
    select: { orderDate: true, totalOrderValue: true },
  });

  return bucketOrdersByMonth(orders);
}
