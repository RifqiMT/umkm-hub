/**
 * One-time sandbox order adjust:
 * 1) Reassign customers on existing orders round-robin (even CRM distribution)
 * 2) Create new multi-line orders that sell packs until every product has
 *    TARGET_STOCK_PACKS (1e12) remaining — products & customers kept balanced
 *
 * Usage:
 *   npx tsx scripts/seed-sell-down-balanced.ts
 *   npx tsx scripts/seed-sell-down-balanced.ts --dry-run
 *   npx tsx scripts/seed-sell-down-balanced.ts --profile=rifqi_tjahyono
 *   npx tsx scripts/seed-sell-down-balanced.ts --skip-rebalance
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
  getActivePackFromPricing,
  packsOnHand,
} from '../src/products/product-pack-math';
import {
  MAX_ORDER_MONEY,
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

/** Final packs-on-hand target per product. */
const TARGET_STOCK_PACKS = 1_000_000_000_000n;

const RANGE_START = parseDateOnlyUtc('2022-01-01');
const RANGE_END = parseDateOnlyUtc('2030-12-31');
const BATCH_SIZE = 40;
const TODAY = parseDateOnlyUtc(toDateOnlyString(new Date()));
const REBALANCE_CHUNK = 2_000;

type CatalogProduct = Product & {
  packs: ReturnType<typeof listProductPacks>;
  activePackSize: number;
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

function decimalToBigIntFloor(value: Prisma.Decimal): bigint {
  const s = value.toFixed(0);
  return BigInt(s);
}

function packsFromStock(stockQty: Prisma.Decimal, packSize: number): bigint {
  if (!(packSize > 0)) return 0n;
  return decimalToBigIntFloor(stockQty.div(packSize));
}

async function rebalanceExistingCustomers(
  profileId: string,
  customerIds: string[],
  dryRun: boolean,
) {
  if (customerIds.length === 0) return { updated: 0 };

  const orders = await prisma.order.findMany({
    where: { profileId },
    select: { id: true },
    orderBy: { orderDate: 'asc' },
  });

  console.log(
    `${dryRun ? 'would rebalance' : 'rebalancing'} ${orders.length} orders across ${customerIds.length} customers`,
  );

  if (dryRun || orders.length === 0) {
    return { updated: orders.length };
  }

  let updated = 0;
  for (let i = 0; i < orders.length; i += REBALANCE_CHUNK) {
    const chunk = orders.slice(i, i + REBALANCE_CHUNK);
    await prisma.$transaction(
      async (tx) => {
        for (let j = 0; j < chunk.length; j += 1) {
          const order = chunk[j]!;
          const customerId = customerIds[(i + j) % customerIds.length]!;
          await tx.order.update({
            where: { id: order.id },
            data: { customerId },
          });
        }
      },
      { timeout: 120_000 },
    );
    updated += chunk.length;
    if (updated % 10_000 === 0 || updated === orders.length) {
      console.log(JSON.stringify({ rebalanceProgress: updated }));
    }
  }
  return { updated };
}

/** Prefer products with the most packs still to sell (keeps burn even). */
function pickBalancedProducts(
  products: CatalogProduct[],
  remaining: Map<string, bigint>,
  nLines: number,
): CatalogProduct[] {
  const withStock = products
    .filter((p) => (remaining.get(p.id) ?? 0n) > 0n)
    .sort((a, b) => {
      const ra = remaining.get(a.id) ?? 0n;
      const rb = remaining.get(b.id) ?? 0n;
      if (rb > ra) return 1;
      if (rb < ra) return -1;
      return 0;
    });
  if (withStock.length === 0) return [];
  // Take from the highest-remaining half, then shuffle for variety.
  const poolSize = Math.min(withStock.length, Math.max(nLines * 2, nLines));
  const pool = withStock.slice(0, poolSize);
  return shuffleInPlace(pool).slice(0, Math.min(nLines, pool.length));
}

async function main() {
  const dryRun = hasFlag('--dry-run');
  const skipRebalance = hasFlag('--skip-rebalance');
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
    orderBy: { name: 'asc' },
  });
  if (customers.length === 0) {
    throw new Error(`No customers for profile ${profileName}`);
  }
  const customerIds = customers.map((c) => c.id);

  const productsRaw = await prisma.product.findMany({
    where: { profileId: profile.id },
  });
  const products: CatalogProduct[] = productsRaw
    .map((p) => {
      const packs = listProductPacks(p);
      const active = getActivePackFromPricing({
        unit: p.unit,
        pricePerUnit: Number(p.pricePerUnit),
        costPerUnit: p.costPerUnit == null ? null : Number(p.costPerUnit),
        price50: p.price50 == null ? null : Number(p.price50),
        price100: p.price100 == null ? null : Number(p.price100),
        price250: p.price250 == null ? null : Number(p.price250),
        price500: p.price500 == null ? null : Number(p.price500),
        price1000: p.price1000 == null ? null : Number(p.price1000),
        priceCustom: p.priceCustom == null ? null : Number(p.priceCustom),
        cost50: p.cost50 == null ? null : Number(p.cost50),
        cost100: p.cost100 == null ? null : Number(p.cost100),
        cost250: p.cost250 == null ? null : Number(p.cost250),
        cost500: p.cost500 == null ? null : Number(p.cost500),
        cost1000: p.cost1000 == null ? null : Number(p.cost1000),
        costCustom: p.costCustom == null ? null : Number(p.costCustom),
        customSize: p.customSize == null ? null : Number(p.customSize),
      });
      return {
        ...p,
        packs,
        activePackSize: active?.size ?? packs[0]?.size ?? 1,
      };
    })
    .filter((p) => p.packs.length > 0);

  if (products.length === 0) {
    throw new Error(`No sellable products for profile ${profileName}`);
  }

  if (!skipRebalance) {
    const reb = await rebalanceExistingCustomers(
      profile.id,
      customerIds,
      dryRun,
    );
    console.log(JSON.stringify({ customerRebalance: reb }));
  }

  const remaining = new Map<string, bigint>();
  const stockRemaining = new Map<string, Prisma.Decimal>();
  const sellPlan: Record<string, string> = {};

  for (const p of products) {
    const stock = new Prisma.Decimal(p.stockQty.toString());
    stockRemaining.set(p.id, stock);
    const packsNow = packsFromStock(stock, p.activePackSize);
    const toSell =
      packsNow > TARGET_STOCK_PACKS ? packsNow - TARGET_STOCK_PACKS : 0n;
    remaining.set(p.id, toSell);
    sellPlan[p.name] = toSell.toString();
  }

  const totalToSell = [...remaining.values()].reduce((a, b) => a + b, 0n);

  console.log(
    JSON.stringify(
      {
        profile: profile.profileName,
        products: products.length,
        customers: customers.length,
        targetStockPacks: TARGET_STOCK_PACKS.toString(),
        packsToSellByProduct: sellPlan,
        totalPacksToSell: totalToSell.toString(),
        dryRun,
      },
      null,
      2,
    ),
  );

  if (totalToSell <= 0n) {
    console.log('Nothing to sell — all products already at or below target.');
    return;
  }

  let ordersCreated = 0;
  let linesCreated = 0;
  let installmentsCreated = 0;
  let guard = 0;
  const maxOrders = 250_000;
  let customerCursor = 0;

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
          await tx.orderInstallment.createMany({ data: installmentBatch });
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

  function nextCustomerId(): string {
    const id = customerIds[customerCursor % customerIds.length]!;
    customerCursor += 1;
    return id;
  }

  while (totalRemaining() > 0n && guard < maxOrders) {
    guard += 1;
    const withStock = products.filter((p) => (remaining.get(p.id) ?? 0n) > 0n);
    if (withStock.length === 0) break;

    const nLines = randInt(1, Math.min(5, withStock.length));
    const chosen = pickBalancedProducts(products, remaining, nLines);

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
      const top = [...withStock].sort((a, b) => {
        const ra = remaining.get(a.id) ?? 0n;
        const rb = remaining.get(b.id) ?? 0n;
        if (rb > ra) return 1;
        if (rb < ra) return -1;
        return 0;
      })[0]!;
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
    const customerId = nextCustomerId();
    const status = pickOrderStatus(orderDate, TODAY);
    const paymentStatus = pickPaymentStatus();
    const now = new Date();

    orderBatch.push({
      id,
      profileId: profile.id,
      sku: buildOrderSku(orderDate, id),
      customerId,
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
      stockRemaining.set(line.productId, stockNow.minus(line.productQty));
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
        console.log(
          JSON.stringify({
            progressOrders: ordersCreated,
            packsLeftToSell: Object.fromEntries(
              products.map((p) => [p.name, remaining.get(p.id)?.toString()]),
            ),
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
    });
    const packsAfter: Record<string, number | null> = {};
    for (const p of stockAfter) {
      const catalog = products.find((x) => x.id === p.id);
      if (!catalog) continue;
      const active = getActivePackFromPricing({
        unit: p.unit,
        pricePerUnit: Number(p.pricePerUnit),
        costPerUnit: p.costPerUnit == null ? null : Number(p.costPerUnit),
        price50: p.price50 == null ? null : Number(p.price50),
        price100: p.price100 == null ? null : Number(p.price100),
        price250: p.price250 == null ? null : Number(p.price250),
        price500: p.price500 == null ? null : Number(p.price500),
        price1000: p.price1000 == null ? null : Number(p.price1000),
        priceCustom: p.priceCustom == null ? null : Number(p.priceCustom),
        cost50: p.cost50 == null ? null : Number(p.cost50),
        cost100: p.cost100 == null ? null : Number(p.cost100),
        cost250: p.cost250 == null ? null : Number(p.cost250),
        cost500: p.cost500 == null ? null : Number(p.cost500),
        cost1000: p.cost1000 == null ? null : Number(p.cost1000),
        costCustom: p.costCustom == null ? null : Number(p.costCustom),
        customSize: p.customSize == null ? null : Number(p.customSize),
      });
      packsAfter[p.name] = packsOnHand(Number(p.stockQty), active);
    }

    const orderCount = await prisma.order.count({
      where: { profileId: profile.id },
    });
    const byCustomer = await prisma.order.groupBy({
      by: ['customerId'],
      where: { profileId: profile.id },
      _count: { _all: true },
    });

    console.log(
      JSON.stringify(
        {
          done: true,
          ordersCreated,
          linesCreated,
          installmentsCreated,
          totalOrders: orderCount,
          packsLeftToSell: Object.fromEntries(
            products.map((p) => [p.name, remaining.get(p.id)?.toString()]),
          ),
          packsOnHandAfter: packsAfter,
          ordersPerCustomer: byCustomer
            .map((row) => ({
              customerId: row.customerId,
              orders: row._count._all,
            }))
            .sort((a, b) => b.orders - a.orders),
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
          note: 'Re-run without --dry-run to persist.',
        },
        null,
        2,
      ),
    );
  }

  if (totalRemaining() > 0n && !dryRun) {
    throw new Error(
      `Finished with packs still to sell: ${totalRemaining().toString()}`,
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
