/**
 * One-off backfill: Order ID = YYYY_MM_DD_{uuid}
 * Run: npx ts-node --transpile-only src/orders/backfill-skus.ts
 */
import { PrismaClient } from '@prisma/client';
import { buildOrderSku } from './order-sku';

const prisma = new PrismaClient();

async function main() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: 'asc' },
  });
  for (const order of orders) {
    const sku = buildOrderSku(order.orderDate, order.id);
    await prisma.order.update({
      where: { id: order.id },
      data: { sku },
    });
    // eslint-disable-next-line no-console
    console.log(
      `${order.orderDate.toISOString().slice(0, 10)} → ${sku}`,
    );
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
