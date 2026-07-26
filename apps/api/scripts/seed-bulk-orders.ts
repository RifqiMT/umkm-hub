/**
 * One-time bulk order seed:
 * Sell 1e12 packs per product across random multi-line orders (2022–2030).
 *
 * Usage:
 *   npx tsx scripts/seed-bulk-orders.ts
 *   npx tsx scripts/seed-bulk-orders.ts --dry-run
 *   npx tsx scripts/seed-bulk-orders.ts --profile=rifqi_tjahyono
 */
import { randomUUID } from 'crypto';
import {
  InvoiceStatus,
  Prisma,
  PrismaClient,
  Product,
  ProductUnit,
} from '@prisma/client';
import { calculateMultiLineOrderTotals, lineSubtotal } from '../src/orders/order-math';
import { listProductPacks } from '../src/orders/order-packs';
import { buildOrderSku } from '../src/orders/order-sku';
import {
  MAX_ORDER_MONEY,
  PACKS_PER_PRODUCT,
  addDaysUtc,
  maxPacksForLine,
  parseDateOnlyUtc,
  pickOne,
  pickOrderStatus,
  pickPaymentStatus,
  randFloat,
  randInt,
  randomDateBetween,
  randomPackCount,
  shuffleInPlace,
  splitInstallments,
  toDateOnlyString,
} from '../src/orders/seed-bulk-orders-math';

const prisma = new PrismaClient();

const RANGE_START = parseDateOnlyUtc('2022-01-01');
const RANGE_END = parseDateOnlyUtc('2030-12-31');
const BATCH_SIZE = 40;
const TODAY = parseDateOnlyUtc(toDateOnlyString(new Date()));

type CatalogProduct = Product & {
  packs: ReturnType<typeof listProductPacks>;
};

type PlannedLine = {
  productId: string;
  packSize: number;
  packPrice: number;
  packCount: number;
  unit: ProductUnit;
  unitPrice: number;
  productQty: number;
  lineTotal: number;
  stockQtySnapshot: number;
};

function argValue(flag: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`${flag}=`));
  return hit?.slice(flag.length + 1);
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function bigintToNumberSafe(value: bigint): number {
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error(`Value exceeds Number.MAX_SAFE_INTEGER: ${value}`);
  }
  return Number(value);
}

async function main() {
  const dryRun = hasFlag('--dry-run');
  const profileName = argValue('--profile') ?? 'rifqi_tjahyono';

  const profile = await prisma.profile.findFirst({
    where: { profileName },
  });
  if (!profile) {
    throw new Error(`Profile not found: ${profileName}`);
  }

  const customers = await prisma.customer.findMany({
    where: { profileId: profile.id },
    select: { id: true, name: true },
  });
  if (customers.length === 0) {
    throw new Error(`No customers for profile ${profileName}`);
  }

  const productsRaw = await prisma.product.findMany({
    where: { profileId: profile.id },
  });
  const products: CatalogProduct[] = productsRaw
    .map((p) => ({ ...p, packs: listProductPacks(p) }))
    .filter((p) => p.packs.length > 0);

  if (products.length === 0) {
    throw new Error(`No sellable products for profile ${profileName}`);
  }

  const remaining = new Map<string, bigint>();
  const stockRemaining = new Map<string, Prisma.Decimal>();
  for (const p of products) {
    remaining.set(p.id, PACKS_PER_PRODUCT);
    stockRemaining.set(p.id, new Prisma.Decimal(p.stockQty.toString()));
  }

  console.log(
    JSON.stringify(
      {
        profile: profile.profileName,
        profileId: profile.id,
        products: products.length,
        customers: customers.length,
        packsPerProduct: PACKS_PER_PRODUCT.toString(),
        dryRun,
      },
      null,
      2,
    ),
  );

  let ordersCreated = 0;
  let linesCreated = 0;
  let installmentsCreated = 0;
  let guard = 0;
  const maxOrders = 200_000;

  type BatchOrder = {
    id: string;
    profileId: string;
    sku: string;
    customerId: string;
    productId: string;
    orderDate: Date;
    shipmentDate: Date;
    productQty: number;
    packSizeSnapshot: number;
    packPriceSnapshot: number;
    packCount: number;
    unitSnapshot: ProductUnit;
    unitPriceSnapshot: number;
    stockQtySnapshot: number;
    lineTotal: number;
    discountType: 'PERCENTAGE';
    discountValue: number;
    totalOrderValue: number;
    status: string;
    paymentStatus: string;
    invoiceStatus: InvoiceStatus;
    invoiceDate: Date;
    updatedAt: Date;
  };

  type BatchLine = {
    orderId: string;
    productId: string;
    sortOrder: number;
    productQty: number;
    packSizeSnapshot: number;
    packPriceSnapshot: number;
    packCount: number;
    unitSnapshot: ProductUnit;
    unitPriceSnapshot: number;
    stockQtySnapshot: number;
    lineTotal: number;
  };

  type BatchInstallment = {
    orderId: string;
    amount: number;
    installmentDate: Date;
    updatedAt: Date;
  };

  let orderBatch: BatchOrder[] = [];
  let lineBatch: BatchLine[] = [];
  let installmentBatch: BatchInstallment[] = [];
  const stockDeltaBatch = new Map<string, Prisma.Decimal>();

  async function flush() {
    if (orderBatch.length === 0) return;
    if (dryRun) {
      orderBatch = [];
      lineBatch = [];
      installmentBatch = [];
      stockDeltaBatch.clear();
      return;
    }

    await prisma.$transaction(
      async (tx) => {
        await tx.order.createMany({ data: orderBatch as never });
        if (lineBatch.length) {
          await tx.orderLine.createMany({ data: lineBatch });
        }
        if (installmentBatch.length) {
          await tx.orderInstallment.createMany({
            data: installmentBatch,
          });
        }
        for (const [productId, delta] of stockDeltaBatch) {
          const product = await tx.product.findUniqueOrThrow({
            where: { id: productId },
          });
          const next = new Prisma.Decimal(product.stockQty.toString()).plus(
            delta,
          );
          if (next.lessThan(0)) {
            throw new Error(`Stock would go negative for ${productId}`);
          }
          await tx.product.update({
            where: { id: productId },
            data: { stockQty: next },
          });
        }
      },
      { timeout: 120_000 },
    );

    orderBatch = [];
    lineBatch = [];
    installmentBatch = [];
    stockDeltaBatch.clear();
  }

  function totalRemaining(): bigint {
    let sum = 0n;
    for (const v of remaining.values()) sum += v;
    return sum;
  }

  while (totalRemaining() > 0n && guard < maxOrders) {
    guard += 1;
    const withStock = products.filter((p) => (remaining.get(p.id) ?? 0n) > 0n);
    if (withStock.length === 0) break;

    const nLines = randInt(1, Math.min(5, withStock.length));
    const chosen = shuffleInPlace([...withStock]).slice(0, nLines);

    let orderMoneyBudget = MAX_ORDER_MONEY;
    const planned: PlannedLine[] = [];

    for (const product of chosen) {
      const rem = remaining.get(product.id) ?? 0n;
      if (rem <= 0n) continue;
      const pack = pickOne(product.packs);
      const maxPacks = maxPacksForLine({
        packPrice: pack.price,
        remainingPacks: rem,
        orderMoneyBudget,
      });
      if (maxPacks <= 0n) continue;

      const packCountBi = randomPackCount(maxPacks);
      if (packCountBi <= 0n) continue;
      const packCount = bigintToNumberSafe(packCountBi);
      const productQty = pack.size * packCount;
      const unitPrice = pack.price / pack.size;
      const lt = lineSubtotal(unitPrice, productQty);
      if (lt > orderMoneyBudget + 1e-6) continue;

      const stockNow = stockRemaining.get(product.id)!;
      if (stockNow.lessThan(productQty)) {
        throw new Error(
          `Insufficient stock for ${product.name}: need ${productQty}, have ${stockNow.toString()}`,
        );
      }

      planned.push({
        productId: product.id,
        packSize: pack.size,
        packPrice: pack.price,
        packCount,
        unit: product.unit,
        unitPrice,
        productQty,
        lineTotal: lt,
        stockQtySnapshot: Number(stockNow.toString()),
      });
      orderMoneyBudget -= lt;
    }

    if (planned.length === 0) {
      // Force a minimal single-product dump for the product with most remaining.
      const top = [...withStock].sort((a, b) =>
        (remaining.get(b.id)! > remaining.get(a.id)! ? 1 : -1),
      )[0]!;
      const pack = pickOne(top.packs);
      const rem = remaining.get(top.id)!;
      const maxPacks = maxPacksForLine({
        packPrice: pack.price,
        remainingPacks: rem,
        orderMoneyBudget: MAX_ORDER_MONEY,
      });
      if (maxPacks <= 0n) {
        throw new Error(
          `Cannot allocate remaining packs for ${top.name} (remaining=${rem})`,
        );
      }
      const packCount = bigintToNumberSafe(maxPacks);
      const productQty = pack.size * packCount;
      const unitPrice = pack.price / pack.size;
      const stockNow = stockRemaining.get(top.id)!;
      planned.push({
        productId: top.id,
        packSize: pack.size,
        packPrice: pack.price,
        packCount,
        unit: top.unit,
        unitPrice,
        productQty,
        lineTotal: lineSubtotal(unitPrice, productQty),
        stockQtySnapshot: Number(stockNow.toString()),
      });
    }

    const discountValue = randFloat(2.5, 10, 4);
    const totals = calculateMultiLineOrderTotals({
      lines: planned.map((l) => ({
        unitPrice: l.unitPrice,
        productQty: l.productQty,
      })),
      discountType: 'PERCENTAGE',
      discountValue,
    });

    const orderDate = randomDateBetween(RANGE_START, RANGE_END);
    const shipLag = randInt(7, 60);
    const shipmentDate = addDaysUtc(orderDate, shipLag);
    const paymentLag = randInt(7, 60);
    const firstPayDate = addDaysUtc(orderDate, paymentLag);
    // Prefer payments starting around shipment/payment lag window
    const payBase =
      firstPayDate.getTime() >= shipmentDate.getTime()
        ? firstPayDate
        : shipmentDate;

    const installmentCount = randInt(1, 10);
    const installments = splitInstallments({
      totalOrderValue: totals.totalOrderValue,
      count: installmentCount,
      baseDate: payBase,
      gapDaysMin: 7,
      gapDaysMax: 21,
    });

    const id = randomUUID();
    const primary = planned[0]!;
    const customer = pickOne(customers);
    const status = pickOrderStatus(orderDate, TODAY);
    const paymentStatus = pickPaymentStatus();
    const now = new Date();

    orderBatch.push({
      id,
      profileId: profile.id,
      sku: buildOrderSku(orderDate, id),
      customerId: customer.id,
      productId: primary.productId,
      orderDate,
      shipmentDate,
      productQty: primary.productQty,
      packSizeSnapshot: primary.packSize,
      packPriceSnapshot: primary.packPrice,
      packCount: primary.packCount,
      unitSnapshot: primary.unit,
      unitPriceSnapshot: primary.unitPrice,
      stockQtySnapshot: primary.stockQtySnapshot,
      lineTotal: totals.lineTotal,
      discountType: 'PERCENTAGE',
      discountValue,
      totalOrderValue: totals.totalOrderValue,
      status,
      paymentStatus,
      invoiceStatus: InvoiceStatus.SENT,
      invoiceDate: orderDate,
      updatedAt: now,
    });

    planned.forEach((line, idx) => {
      lineBatch.push({
        orderId: id,
        productId: line.productId,
        sortOrder: idx,
        productQty: line.productQty,
        packSizeSnapshot: line.packSize,
        packPriceSnapshot: line.packPrice,
        packCount: line.packCount,
        unitSnapshot: line.unit,
        unitPriceSnapshot: line.unitPrice,
        stockQtySnapshot: line.stockQtySnapshot,
        lineTotal: line.lineTotal,
      });

      remaining.set(
        line.productId,
        (remaining.get(line.productId) ?? 0n) - BigInt(line.packCount),
      );
      const stockNow = stockRemaining.get(line.productId)!;
      stockRemaining.set(
        line.productId,
        stockNow.minus(line.productQty),
      );
      const prevDelta =
        stockDeltaBatch.get(line.productId) ?? new Prisma.Decimal(0);
      stockDeltaBatch.set(
        line.productId,
        prevDelta.minus(line.productQty),
      );
    });

    for (const row of installments) {
      installmentBatch.push({
        orderId: id,
        amount: row.amount,
        installmentDate: parseDateOnlyUtc(row.installmentDate),
        updatedAt: now,
      });
    }

    ordersCreated += 1;
    linesCreated += planned.length;
    installmentsCreated += installments.length;

    if (orderBatch.length >= BATCH_SIZE) {
      await flush();
      if (ordersCreated % 500 === 0 || dryRun) {
        const remLeft = Object.fromEntries(
          products.map((p) => [p.name, remaining.get(p.id)?.toString()]),
        );
        console.log(
          JSON.stringify({
            progressOrders: ordersCreated,
            remainingPacks: remLeft,
          }),
        );
      }
    }

    if (dryRun && ordersCreated >= 25) {
      console.log('Dry-run sample complete (25 orders planned).');
      break;
    }
  }

  await flush();

  if (!dryRun) {
    const stockAfter = await prisma.product.findMany({
      where: { profileId: profile.id },
      select: { id: true, name: true, stockQty: true },
    });

    console.log(
      JSON.stringify(
        {
          done: true,
          ordersCreated,
          linesCreated,
          installmentsCreated,
          packsSoldThisRun: Object.fromEntries(
            products.map((p) => [
              p.name,
              (PACKS_PER_PRODUCT - (remaining.get(p.id) ?? 0n)).toString(),
            ]),
          ),
          remainingPacks: Object.fromEntries(
            products.map((p) => [
              p.name,
              remaining.get(p.id)?.toString() ?? '0',
            ]),
          ),
          stockAfter: Object.fromEntries(
            stockAfter.map((p) => [p.name, p.stockQty.toString()]),
          ),
        },
        null,
        2,
      ),
    );
  } else {
    console.log(
      JSON.stringify(
        {
          dryRun: true,
          sampleOrders: ordersCreated,
          sampleLines: linesCreated,
          sampleInstallments: installmentsCreated,
          note: 'Re-run without --dry-run to persist.',
        },
        null,
        2,
      ),
    );
  }

  if (totalRemaining() > 0n && !dryRun) {
    throw new Error(
      `Seed finished with packs still remaining: ${totalRemaining()}`,
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
