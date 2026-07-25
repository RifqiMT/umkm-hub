/**
 * One-off backfill: Customer ID = {NameSegments}{Type}_{uuid}
 * Run: npx ts-node --transpile-only src/customers/backfill-skus.ts
 */
import { PrismaClient } from '@prisma/client';
import { buildCustomerSku } from './customer-sku';

const prisma = new PrismaClient();

async function main() {
  const customers = await prisma.customer.findMany({
    orderBy: { createdAt: 'asc' },
  });
  for (const customer of customers) {
    const sku = buildCustomerSku(
      customer.name,
      customer.companyType,
      customer.id,
    );
    await prisma.customer.update({
      where: { id: customer.id },
      data: { sku },
    });
    // eslint-disable-next-line no-console
    console.log(`${customer.name} (${customer.companyType}) → ${sku}`);
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
