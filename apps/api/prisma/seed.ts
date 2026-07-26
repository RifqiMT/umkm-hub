import {
  PrismaClient,
  ProductUnit,
  CompanyType,
  PartnershipStage,
  CustomerStatus,
  RelationshipLevel,
  DiscountType,
  PaymentStatus,
  OrderStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

/**
 * DEV / SANDBOX default profile only.
 * Do not use these credentials in production.
 * Existing profiles are never overwritten (manual edits are preserved).
 */
const SANDBOX_PROFILE =
  process.env.SEED_PROFILE_NAME?.trim() || 'rifqi_tjahyono';
const SANDBOX_PASSWORD =
  process.env.SEED_PROFILE_PASSWORD?.trim() || '12041994';
const SANDBOX_EMAIL =
  process.env.SEED_PROFILE_EMAIL?.trim().toLowerCase() ||
  'rifqi.m.tjahjono@gmail.com';
const BCRYPT_ROUNDS = 12;

/** Fixed UUIDs so re-seeding is idempotent. */
const IDS = {
  productCabai: '00000000-0000-4000-8000-000000000001',
  productKopi: '00000000-0000-4000-8000-000000000002',
  productMinyak: '00000000-0000-4000-8000-000000000003',
  customerWarung: '00000000-0000-4000-8000-000000000011',
  customerHotel: '00000000-0000-4000-8000-000000000012',
  orderKopi: '00000000-0000-4000-8000-000000000021',
} as const;

/**
 * Idempotent sandbox seed.
 * - Creates sandbox profile only if missing (never resets a user-modified password).
 * - Refreshes sample products/customers under that profile.
 */
async function main() {
  let profile = await prisma.profile.findUnique({
    where: { profileName: SANDBOX_PROFILE },
  });
  let created = false;

  if (!profile) {
    const passwordHash = await bcrypt.hash(SANDBOX_PASSWORD, BCRYPT_ROUNDS);
    profile = await prisma.profile.create({
      data: {
        profileName: SANDBOX_PROFILE,
        email: SANDBOX_EMAIL,
        passwordHash,
      },
    });
    created = true;
    console.log(`Created sandbox profile: ${SANDBOX_PROFILE} <${SANDBOX_EMAIL}>`);
  } else if (process.env.SEED_RESET_PASSWORD === 'true') {
    const passwordHash = await bcrypt.hash(SANDBOX_PASSWORD, BCRYPT_ROUNDS);
    profile = await prisma.profile.update({
      where: { id: profile.id },
      data: { passwordHash },
    });
    console.log(
      `Reset sandbox password for existing profile: ${SANDBOX_PROFILE}`,
    );
  } else {
    console.log(
      `Sandbox profile already exists (left unchanged): ${SANDBOX_PROFILE}`,
    );
  }

  await prisma.product.upsert({
    where: { id: IDS.productCabai },
    create: {
      id: IDS.productCabai,
      profileId: profile.id,
      name: 'Cabai Merah',
      unit: ProductUnit.GRAM,
      stockQty: 50000,
      pricePerUnit: 45,
      price100: 4500,
      costPerUnit: 30,
      cost100: 3000,
      details: 'Cabai merah keriting — sandbox stock (gram)',
    },
    update: {
      profileId: profile.id,
      name: 'Cabai Merah',
      unit: ProductUnit.GRAM,
      stockQty: 50000,
      pricePerUnit: 45,
      price100: 4500,
      costPerUnit: 30,
      cost100: 3000,
      details: 'Cabai merah keriting — sandbox stock (gram)',
    },
  });

  const productKopi = await prisma.product.upsert({
    where: { id: IDS.productKopi },
    create: {
      id: IDS.productKopi,
      profileId: profile.id,
      name: 'Kopi Bubuk',
      unit: ProductUnit.PCS,
      stockQty: 120,
      pricePerUnit: 35000,
      costPerUnit: 22000,
      details: 'Kemasan 250g',
    },
    update: {
      profileId: profile.id,
      name: 'Kopi Bubuk',
      unit: ProductUnit.PCS,
      stockQty: 120,
      pricePerUnit: 35000,
      costPerUnit: 22000,
      details: 'Kemasan 250g',
    },
  });

  await prisma.product.upsert({
    where: { id: IDS.productMinyak },
    create: {
      id: IDS.productMinyak,
      profileId: profile.id,
      name: 'Minyak Goreng',
      unit: ProductUnit.LITER,
      stockQty: 80,
      pricePerUnit: 180,
      price1000: 180000,
      costPerUnit: 120,
      cost1000: 120000,
      details: 'Minyak sawit — priced per 1000 L pack example',
    },
    update: {
      profileId: profile.id,
      name: 'Minyak Goreng',
      unit: ProductUnit.LITER,
      stockQty: 80,
      pricePerUnit: 180,
      price1000: 180000,
      costPerUnit: 120,
      cost1000: 120000,
      details: 'Minyak sawit — priced per 1000 L pack example',
    },
  });

  await prisma.customer.upsert({
    where: { id: IDS.customerWarung },
    create: {
      id: IDS.customerWarung,
      profileId: profile.id,
      name: 'Siti Aminah',
      title: 'Purchasing',
      companyName: 'Warung Sederhana',
      companyType: CompanyType.RESTAURANT,
      email: 'siti@warungsederhana.demo',
      phone: '+6281234567890',
      address: 'Jl. Melati No. 12',
      additionalAddress: 'RT 03/RW 05',
      postalCode: '40123',
      city: 'Bandung',
      province: 'Jawa Barat',
      country: 'Indonesia',
      partnershipStage: PartnershipStage.WHATSAPP,
      status: CustomerStatus.INTERESTED,
      customerNeeds: 'Supply cabai mingguan',
      desiredStandards: 'Segar, grade A',
      promiseOnTimeDelivery: true,
      relationshipLevel: RelationshipLevel.CLOSING_FIRST_ORDER,
      approvalPercentage: 80,
      remarks: 'Sandbox customer',
    },
    update: {
      profileId: profile.id,
      status: CustomerStatus.INTERESTED,
      approvalPercentage: 80,
    },
  });

  await prisma.customer.upsert({
    where: { id: IDS.customerHotel },
    create: {
      id: IDS.customerHotel,
      profileId: profile.id,
      name: 'Budi Santoso',
      title: 'Owner',
      companyName: 'Hotel Nusantara',
      companyType: CompanyType.HOTEL,
      email: 'budi@hotelnusantara.demo',
      phone: '+628129998877',
      address: 'Jl. Sudirman Kav. 45',
      additionalAddress: 'Lobby purchasing desk',
      postalCode: '10220',
      city: 'Jakarta Pusat',
      province: 'DKI Jakarta',
      country: 'Indonesia',
      partnershipStage: PartnershipStage.EMAIL,
      status: CustomerStatus.DOUBTFUL,
      customerNeeds: 'Bulk minyak goreng',
      desiredStandards: 'Halal certified',
      promisePackagingBox: true,
      relationshipLevel: RelationshipLevel.NEGOTIATION,
      approvalPercentage: 40,
      remarks: 'Sandbox hotel lead',
    },
    update: {
      profileId: profile.id,
      status: CustomerStatus.DOUBTFUL,
      approvalPercentage: 40,
    },
  });

  const existingOrder = await prisma.order.findUnique({
    where: { id: IDS.orderKopi },
  });

  if (!existingOrder) {
    const packCount = 2;
    const packSize = 1;
    const packPrice = Number(productKopi.pricePerUnit);
    const unitPrice = packPrice / packSize;
    const productQty = packSize * packCount;
    const lineTotal = packPrice * packCount;
    const discountValue = 10;
    const totalOrderValue = lineTotal * (1 - discountValue / 100);

    await prisma.$transaction(async (tx) => {
      await tx.order.create({
        data: {
          id: IDS.orderKopi,
          profileId: profile.id,
          productId: productKopi.id,
          customerId: IDS.customerWarung,
          orderDate: new Date(),
          shipmentDate: null,
          productQty,
          packSizeSnapshot: packSize,
          packPriceSnapshot: packPrice,
          packCount,
          unitSnapshot: productKopi.unit,
          unitPriceSnapshot: unitPrice,
          stockQtySnapshot: productKopi.stockQty,
          lineTotal,
          discountType: DiscountType.PERCENTAGE,
          discountValue,
          totalOrderValue,
          status: OrderStatus.PENDING,
          paymentStatus: PaymentStatus.CASH,
        },
      });
      await tx.product.update({
        where: { id: productKopi.id },
        data: { stockQty: { decrement: productQty } },
      });
    });
  } else if (!existingOrder.customerId) {
    await prisma.order.update({
      where: { id: IDS.orderKopi },
      data: { customerId: IDS.customerWarung },
    });
  }

  console.log('Seed complete.');
  console.log(`  Sandbox profile: ${SANDBOX_PROFILE}`);
  if (created) {
    console.log('  Password: set on first create (sandbox default)');
  } else {
    console.log('  Password: unchanged (manual edits preserved)');
  }
}

main()
  .catch((err) => {
    console.error('Seed failed:', err instanceof Error ? err.message : err);
    if (err instanceof Error && err.stack) {
      console.error(err.stack);
    }
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
