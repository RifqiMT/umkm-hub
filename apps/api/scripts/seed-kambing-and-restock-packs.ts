/**
 * One-time sandbox data adjust:
 * 1) Add Daging Kambing SKUs mirroring Daging Sapi cuts, with sell/cost
 *    between comparable Ayam and Sapi prices.
 * 2) Set every product (existing + new) to 2_000_000_000_000 packs on hand.
 *
 * Usage:
 *   npx tsx scripts/seed-kambing-and-restock-packs.ts
 *   npx tsx scripts/seed-kambing-and-restock-packs.ts --dry-run
 *   npx tsx scripts/seed-kambing-and-restock-packs.ts --profile=rifqi_tjahyono
 */
import { randomUUID } from 'crypto';
import { Prisma, PrismaClient, ProductUnit } from '@prisma/client';
import {
  getActivePackFromPricing,
  packsOnHand,
  qtyFromPackCount,
  type PackPricingInput,
} from '../src/products/product-pack-math';
import { buildProductSkuFromProduct } from '../src/products/product-sku';

const PACKS = 2_000_000_000_000;
const prisma = new PrismaClient();

type MoneyPair = { sellPerUnit: number; costPerUnit: number };

/** Midpoint between Ayam analog and Sapi cut (rounded). */
function between(ayam: MoneyPair, sapi: MoneyPair): MoneyPair {
  return {
    sellPerUnit: Math.round((ayam.sellPerUnit + sapi.sellPerUnit) / 2),
    costPerUnit: Math.round((ayam.costPerUnit + sapi.costPerUnit) / 2),
  };
}

/**
 * Kambing cuts mirror Sapi 1000g packs.
 * Price/cost sit between Ayam analogs and matching Sapi SKUs.
 */
const KAMBING_DEFS = [
  {
    name: 'Daging Kambing Giling (1000)',
    // Ayam Karkas/Kaki 90/50 ↔ Sapi Giling 140/90
    ...between(
      { sellPerUnit: 90, costPerUnit: 50 },
      { sellPerUnit: 140, costPerUnit: 90 },
    ),
  },
  {
    name: 'Daging Kambing Paha (1000)',
    // Ayam Paha 130/70 ↔ Sapi Paha 155/125
    ...between(
      { sellPerUnit: 130, costPerUnit: 70 },
      { sellPerUnit: 155, costPerUnit: 125 },
    ),
  },
  {
    name: 'Daging Kambing Tenderloin (1000)',
    // Best Ayam (Paha) 130/70 ↔ Sapi Tenderloin 245/170
    ...between(
      { sellPerUnit: 130, costPerUnit: 70 },
      { sellPerUnit: 245, costPerUnit: 170 },
    ),
  },
] as const;

function toNum(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function pricingInput(p: {
  unit: ProductUnit;
  pricePerUnit: Prisma.Decimal | number;
  costPerUnit: Prisma.Decimal | number | null;
  price50: Prisma.Decimal | number | null;
  price100: Prisma.Decimal | number | null;
  price250: Prisma.Decimal | number | null;
  price500: Prisma.Decimal | number | null;
  price1000: Prisma.Decimal | number | null;
  priceCustom: Prisma.Decimal | number | null;
  cost50: Prisma.Decimal | number | null;
  cost100: Prisma.Decimal | number | null;
  cost250: Prisma.Decimal | number | null;
  cost500: Prisma.Decimal | number | null;
  cost1000: Prisma.Decimal | number | null;
  costCustom: Prisma.Decimal | number | null;
  customSize: Prisma.Decimal | number | null;
}): PackPricingInput {
  return {
    unit: p.unit,
    pricePerUnit: toNum(p.pricePerUnit) ?? 0,
    costPerUnit: toNum(p.costPerUnit),
    price50: toNum(p.price50),
    price100: toNum(p.price100),
    price250: toNum(p.price250),
    price500: toNum(p.price500),
    price1000: toNum(p.price1000),
    priceCustom: toNum(p.priceCustom),
    cost50: toNum(p.cost50),
    cost100: toNum(p.cost100),
    cost250: toNum(p.cost250),
    cost500: toNum(p.cost500),
    cost1000: toNum(p.cost1000),
    costCustom: toNum(p.costCustom),
    customSize: toNum(p.customSize),
  };
}

function parseArgs(argv: string[]) {
  let dryRun = false;
  let profileName = process.env.SEED_PROFILE_NAME?.trim() || 'rifqi_tjahyono';
  for (const arg of argv) {
    if (arg === '--dry-run') dryRun = true;
    if (arg.startsWith('--profile=')) {
      profileName = arg.slice('--profile='.length).trim() || profileName;
    }
  }
  return { dryRun, profileName };
}

async function main() {
  const { dryRun, profileName } = parseArgs(process.argv.slice(2));
  const profile = await prisma.profile.findUnique({
    where: { profileName },
  });
  if (!profile) {
    throw new Error(`Profile not found: ${profileName}`);
  }

  console.log(
    `${dryRun ? '[dry-run] ' : ''}Profile ${profileName} (${profile.id})`,
  );

  const created: string[] = [];
  for (const def of KAMBING_DEFS) {
    const existing = await prisma.product.findFirst({
      where: { profileId: profile.id, name: def.name },
    });
    if (existing) {
      console.log(`skip existing: ${def.name}`);
      continue;
    }

    const packSize = 1000;
    const price1000 = def.sellPerUnit * packSize;
    const cost1000 = def.costPerUnit * packSize;
    const id = randomUUID();
    const pricing: PackPricingInput = {
      unit: 'GRAM',
      pricePerUnit: def.sellPerUnit,
      costPerUnit: def.costPerUnit,
      price50: null,
      price100: null,
      price250: null,
      price500: null,
      price1000,
      priceCustom: null,
      cost50: null,
      cost100: null,
      cost250: null,
      cost500: null,
      cost1000,
      costCustom: null,
      customSize: null,
    };
    const sku = buildProductSkuFromProduct(def.name, pricing, id);
    const stockQty = qtyFromPackCount(PACKS, packSize);

    console.log(
      `${dryRun ? 'would create' : 'create'}: ${def.name} sell=${def.sellPerUnit}/g cost=${def.costPerUnit}/g pack=${price1000}/${cost1000} sku=${sku}`,
    );

    if (!dryRun) {
      await prisma.product.create({
        data: {
          id,
          profileId: profile.id,
          name: def.name,
          sku,
          unit: ProductUnit.GRAM,
          stockQty: new Prisma.Decimal(stockQty),
          pricePerUnit: new Prisma.Decimal(def.sellPerUnit),
          costPerUnit: new Prisma.Decimal(def.costPerUnit),
          price1000: new Prisma.Decimal(price1000),
          cost1000: new Prisma.Decimal(cost1000),
          details:
            'Daging kambing — priced between Ayam and Sapi analogs (1000 g pack)',
        },
      });
    }
    created.push(def.name);
  }

  const products = await prisma.product.findMany({
    where: { profileId: profile.id },
    orderBy: { name: 'asc' },
  });

  console.log(
    `${dryRun ? 'would set' : 'setting'} ${products.length} products to ${PACKS} packs each`,
  );

  for (const p of products) {
    const pack = getActivePackFromPricing(pricingInput(p));
    if (!pack) {
      console.warn(`no active pack for ${p.name} — skip`);
      continue;
    }
    const stockQty = qtyFromPackCount(PACKS, pack.size);
    const before = packsOnHand(toNum(p.stockQty) ?? 0, pack);
    if (!dryRun) {
      await prisma.product.update({
        where: { id: p.id },
        data: { stockQty: new Prisma.Decimal(stockQty) },
      });
    }
    console.log(
      `${p.name}: packs ${before ?? '—'} → ${PACKS} (stockQty=${stockQty}, pack=${pack.size})`,
    );
  }

  console.log(
    JSON.stringify(
      {
        dryRun,
        created,
        productCount: products.length,
        packsEach: PACKS,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
