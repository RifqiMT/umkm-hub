/**
 * One-off backfill: Product ID = {INITIALS}_{PACK}_{systemUuid}
 * Run: npx ts-node --transpile-only src/products/backfill-skus.ts
 */
import { PrismaClient } from '@prisma/client';
import { buildProductSkuFromProduct } from './product-sku';
import { decimalToNumber } from '../common/utils/serialize';

const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    orderBy: { createdAt: 'asc' },
  });
  for (const product of products) {
    const pricing = {
      unit: product.unit,
      pricePerUnit: decimalToNumber(product.pricePerUnit),
      price50:
        product.price50 == null ? null : decimalToNumber(product.price50),
      price100:
        product.price100 == null ? null : decimalToNumber(product.price100),
      price250:
        product.price250 == null ? null : decimalToNumber(product.price250),
      price500:
        product.price500 == null ? null : decimalToNumber(product.price500),
      price1000:
        product.price1000 == null ? null : decimalToNumber(product.price1000),
      priceCustom:
        product.priceCustom == null
          ? null
          : decimalToNumber(product.priceCustom),
      costPerUnit:
        product.costPerUnit == null
          ? null
          : decimalToNumber(product.costPerUnit),
      cost50: product.cost50 == null ? null : decimalToNumber(product.cost50),
      cost100:
        product.cost100 == null ? null : decimalToNumber(product.cost100),
      cost250:
        product.cost250 == null ? null : decimalToNumber(product.cost250),
      cost500:
        product.cost500 == null ? null : decimalToNumber(product.cost500),
      cost1000:
        product.cost1000 == null ? null : decimalToNumber(product.cost1000),
      costCustom:
        product.costCustom == null
          ? null
          : decimalToNumber(product.costCustom),
      customSize:
        product.customSize == null
          ? null
          : decimalToNumber(product.customSize),
    };
    const sku = buildProductSkuFromProduct(product.name, pricing, product.id);
    await prisma.product.update({
      where: { id: product.id },
      data: { productId: sku },
    });
    // eslint-disable-next-line no-console
    console.log(`${product.name} → ${sku}`);
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
