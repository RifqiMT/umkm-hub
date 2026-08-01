/**
 * Backfill WarehouseSale for active order lines that predate dual-write.
 *
 * Replays restocks (+) and sales (−) chronologically per product so
 * stockBefore / stockAfter stay consistent with current on-hand:
 *   start = stockQty + Σ(sales) − Σ(restocks)
 *
 * Idempotent: skips order lines that already have a WarehouseSale.
 *
 * Run from apps/api:
 *   npx tsx src/warehouse/backfill-sales.ts
 *   npx tsx src/warehouse/backfill-sales.ts --profile=<profileId>
 */
import { randomUUID } from 'crypto';
import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type SaleEvent = {
  kind: 'sale';
  at: number;
  tie: number;
  lineId: string;
  orderId: string;
  orderRef: string;
  profileId: string;
  productId: string;
  qty: number;
  soldDate: Date;
  unitSnapshot: string;
  packSizeSnapshot: Prisma.Decimal;
  packCount: Prisma.Decimal;
};

type RestockEvent = {
  kind: 'restock';
  at: number;
  tie: number;
  qty: number;
};

function decimalToNumber(value: Prisma.Decimal | number | string): number {
  if (typeof value === 'number') return value;
  return Number(value.toString());
}

function parseArgs() {
  const profileArg = process.argv.find((a) => a.startsWith('--profile='));
  return {
    profileId: profileArg ? profileArg.slice('--profile='.length) : undefined,
  };
}

async function backfillProduct(productId: string, profileId: string) {
  const product = await prisma.product.findFirst({
    where: { id: productId, profileId },
    select: { id: true, stockQty: true },
  });
  if (!product) return 0;

  const [restocks, lines, existing] = await Promise.all([
    prisma.warehouseRestock.findMany({
      where: { productId, profileId },
      select: {
        qtyAdded: true,
        restockDate: true,
        createdAt: true,
        id: true,
      },
    }),
    prisma.orderLine.findMany({
      where: {
        productId,
        order: { profileId, status: { not: 'CANCELLED' } },
      },
      select: {
        id: true,
        orderId: true,
        productId: true,
        productQty: true,
        unitSnapshot: true,
        packSizeSnapshot: true,
        packCount: true,
        sortOrder: true,
        createdAt: true,
        order: {
          select: {
            id: true,
            orderId: true,
            orderDate: true,
            createdAt: true,
            profileId: true,
          },
        },
      },
      orderBy: [
        { order: { orderDate: 'asc' } },
        { order: { createdAt: 'asc' } },
        { sortOrder: 'asc' },
        { id: 'asc' },
      ],
    }),
    prisma.warehouseSale.findMany({
      where: { productId, profileId },
      select: { orderLineId: true },
    }),
  ]);

  const hasSale = new Set(existing.map((r) => r.orderLineId));
  let salesQty = 0;
  let restockQty = 0;
  for (const r of restocks) restockQty += decimalToNumber(r.qtyAdded);
  for (const line of lines) salesQty += decimalToNumber(line.productQty);

  const current = decimalToNumber(product.stockQty);
  let running = current + salesQty - restockQty;

  const events: Array<SaleEvent | RestockEvent> = [];
  for (const r of restocks) {
    events.push({
      kind: 'restock',
      at: r.restockDate.getTime(),
      tie: r.createdAt.getTime(),
      qty: decimalToNumber(r.qtyAdded),
    });
  }
  for (const line of lines) {
    events.push({
      kind: 'sale',
      at: line.order.orderDate.getTime(),
      tie: line.order.createdAt.getTime() + line.sortOrder,
      lineId: line.id,
      orderId: line.order.id,
      orderRef: line.order.orderId || line.order.id,
      profileId: line.order.profileId,
      productId: line.productId,
      qty: decimalToNumber(line.productQty),
      soldDate: line.order.orderDate,
      unitSnapshot: line.unitSnapshot,
      packSizeSnapshot: line.packSizeSnapshot,
      packCount: line.packCount,
    });
  }
  events.sort((a, b) => a.at - b.at || a.tie - b.tie);

  const now = new Date();
  const rows: Prisma.WarehouseSaleCreateManyInput[] = [];
  for (const event of events) {
    if (event.kind === 'restock') {
      running += event.qty;
      continue;
    }
    const before = running;
    const after = Math.max(0, before - event.qty);
    running = after;
    if (hasSale.has(event.lineId)) continue;
    rows.push({
      id: randomUUID(),
      profileId: event.profileId,
      productId: event.productId,
      orderId: event.orderId,
      orderLineId: event.lineId,
      qtySold: event.qty,
      soldDate: event.soldDate,
      notes: `Order ${event.orderRef}`,
      unitSnapshot: event.unitSnapshot as never,
      packSizeSnapshot: event.packSizeSnapshot,
      packCount: event.packCount,
      stockBefore: before,
      stockAfter: after,
      createdAt: now,
      updatedAt: now,
    });
  }

  const chunk = 1000;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += chunk) {
    const slice = rows.slice(i, i + chunk);
    const result = await prisma.warehouseSale.createMany({
      data: slice,
      skipDuplicates: true,
    });
    inserted += result.count;
  }
  return inserted;
}

async function main() {
  const { profileId } = parseArgs();
  const products = await prisma.product.findMany({
    where: profileId ? { profileId } : undefined,
    select: { id: true, profileId: true, name: true },
    orderBy: { createdAt: 'asc' },
  });

  // eslint-disable-next-line no-console
  console.log(
    `Backfilling WarehouseSale for ${products.length} product(s)` +
      (profileId ? ` (profile ${profileId})` : ''),
  );

  let total = 0;
  for (const product of products) {
    const n = await backfillProduct(product.id, product.profileId);
    total += n;
    if (n > 0) {
      // eslint-disable-next-line no-console
      console.log(`  ${product.name}: +${n}`);
    }
  }

  // eslint-disable-next-line no-console
  console.log(`Done. Inserted ${total} sold history row(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
