/**
 * Comprehensive sandbox dummy data for products, customers, orders, and profile.
 * Idempotent — fixed UUIDs; safe to re-run (`npm run db:seed`).
 */
import {
  BillStatus,
  CompanyType,
  CustomerStatus,
  DiscountType,
  InvoiceStatus,
  OrderStatus,
  PartnershipStage,
  PaymentStatus,
  Prisma,
  PrismaClient,
  ProductUnit,
  RelationshipLevel,
} from '@prisma/client';
import { buildCustomerSku } from '../src/customers/customer-sku';
import { deriveInvoiceStatusFromPayments } from '../src/orders/order-installments';
import { resolveOrderAmountDue } from '../src/orders/fiscal-invoice';
import { buildOrderSku } from '../src/orders/order-sku';
import { buildProductSku } from '../src/products/product-sku';

const DEMO_IDS = {
  productCabai: '00000000-0000-4000-8000-000000000001',
  productKopi: '00000000-0000-4000-8000-000000000002',
  productMinyak: '00000000-0000-4000-8000-000000000003',
  productAyam: '00000000-0000-4000-8000-000000000004',
  productGaram: '00000000-0000-4000-8000-000000000005',
  productTeh: '00000000-0000-4000-8000-000000000006',
  productOutOfStock: '00000000-0000-4000-8000-000000000007',

  customerWarung: '00000000-0000-4000-8000-000000000011',
  customerHotel: '00000000-0000-4000-8000-000000000012',
  customerStore: '00000000-0000-4000-8000-000000000013',
  customerResto: '00000000-0000-4000-8000-000000000014',
  customerHotel2: '00000000-0000-4000-8000-000000000015',

  orderPendingCash: '00000000-0000-4000-8000-000000000021',
  orderMultiLine: '00000000-0000-4000-8000-000000000022',
  orderDelayedFuture: '00000000-0000-4000-8000-000000000023',
  orderDelayedOverdue: '00000000-0000-4000-8000-000000000024',
  orderFullyPaid: '00000000-0000-4000-8000-000000000025',
  orderConsignment: '00000000-0000-4000-8000-000000000026',
  orderCancelled: '00000000-0000-4000-8000-000000000027',
  orderAmountDiscount: '00000000-0000-4000-8000-000000000028',

  lineMultiCabai: '00000000-0000-4000-8000-000000000031',
  lineMultiMinyak: '00000000-0000-4000-8000-000000000032',
} as const;

function d(iso: string): Date {
  return new Date(`${iso.slice(0, 10)}T00:00:00.000Z`);
}

function dec(n: number): Prisma.Decimal {
  return new Prisma.Decimal(n);
}

type LineSeed = {
  id: string;
  productId: string;
  sortOrder: number;
  packSize: number;
  packPrice: number;
  packCount: number;
  unit: ProductUnit;
  stockQtySnapshot: number;
};

type InstallmentSeed = {
  amount: number;
  installmentDate: string;
};

type OrderSeed = {
  id: string;
  customerId: string;
  orderDate: string;
  shipmentDate?: string | null;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  discountType: DiscountType;
  discountValue: number;
  billStatus: BillStatus;
  billDate?: string | null;
  invoiceDate?: string | null;
  paymentDueDate?: string | null;
  lines: LineSeed[];
  installments: InstallmentSeed[];
};

function lineTotals(lines: LineSeed[]) {
  const rows = lines.map((l) => {
    const productQty = l.packSize * l.packCount;
    const unitPrice = l.packPrice / l.packSize;
    const lineTotal = l.packPrice * l.packCount;
    return { productQty, unitPrice, lineTotal, ...l };
  });
  const lineTotal = rows.reduce((s, r) => s + r.lineTotal, 0);
  return { rows, lineTotal };
}

function orderTotal(
  lineTotal: number,
  discountType: DiscountType,
  discountValue: number,
): number {
  if (discountType === DiscountType.PERCENTAGE) {
    return Math.round((lineTotal * (1 - discountValue / 100) + Number.EPSILON) * 10000) / 10000;
  }
  return Math.round((Math.max(0, lineTotal - discountValue) + Number.EPSILON) * 10000) / 10000;
}

async function upsertOrder(
  prisma: PrismaClient,
  profileId: string,
  seed: OrderSeed,
): Promise<void> {
  const { rows, lineTotal } = lineTotals(seed.lines);
  const totalOrderValue = orderTotal(
    lineTotal,
    seed.discountType,
    seed.discountValue,
  );
  const paidAmount = seed.installments.reduce((s, i) => s + i.amount, 0);
  const profile = await prisma.profile.findFirstOrThrow({
    where: { id: profileId },
  });
  const amountDue = resolveOrderAmountDue({
    totalOrderValue,
    includePpn: null,
    profile: {
      isPkp: profile.isPkp,
      ppnPercent: Number(profile.defaultPpnPercent),
      taxInclusive: profile.taxInclusive,
    },
  });
  const invoiceStatus = deriveInvoiceStatusFromPayments({
    amountDue,
    paidAmount,
    billStatus: seed.billStatus,
  }) as InvoiceStatus;
  const primary = rows[0]!;
  const orderSku = buildOrderSku(seed.orderDate, seed.id);

  const existing = await prisma.order.findUnique({ where: { id: seed.id } });

  await prisma.order.upsert({
    where: { id: seed.id },
    create: {
      id: seed.id,
      profileId,
      orderId: orderSku,
      customerId: seed.customerId,
      productId: primary.productId,
      orderDate: d(seed.orderDate),
      shipmentDate: seed.shipmentDate ? d(seed.shipmentDate) : null,
      productQty: primary.productQty,
      packSizeSnapshot: primary.packSize,
      packPriceSnapshot: primary.packPrice,
      packCount: primary.packCount,
      unitSnapshot: primary.unit,
      unitPriceSnapshot: primary.unitPrice,
      stockQtySnapshot: dec(primary.stockQtySnapshot),
      lineTotal: dec(lineTotal),
      discountType: seed.discountType,
      discountValue: dec(seed.discountValue),
      totalOrderValue: dec(totalOrderValue),
      status: seed.status,
      paymentStatus: seed.paymentStatus,
      billStatus: seed.billStatus,
      billDate: seed.billDate ? d(seed.billDate) : null,
      invoiceStatus,
      invoiceDate: seed.invoiceDate ? d(seed.invoiceDate) : null,
      paymentDueDate: seed.paymentDueDate ? d(seed.paymentDueDate) : null,
    },
    update: {
      profileId,
      orderId: orderSku,
      customerId: seed.customerId,
      productId: primary.productId,
      orderDate: d(seed.orderDate),
      shipmentDate: seed.shipmentDate ? d(seed.shipmentDate) : null,
      productQty: primary.productQty,
      packSizeSnapshot: primary.packSize,
      packPriceSnapshot: primary.packPrice,
      packCount: primary.packCount,
      unitSnapshot: primary.unit,
      unitPriceSnapshot: primary.unitPrice,
      stockQtySnapshot: dec(primary.stockQtySnapshot),
      lineTotal: dec(lineTotal),
      discountType: seed.discountType,
      discountValue: dec(seed.discountValue),
      totalOrderValue: dec(totalOrderValue),
      status: seed.status,
      paymentStatus: seed.paymentStatus,
      billStatus: seed.billStatus,
      billDate: seed.billDate ? d(seed.billDate) : null,
      invoiceStatus,
      invoiceDate: seed.invoiceDate ? d(seed.invoiceDate) : null,
      paymentDueDate: seed.paymentDueDate ? d(seed.paymentDueDate) : null,
    },
  });

  await prisma.orderLine.deleteMany({ where: { orderId: seed.id } });
  await prisma.orderInstallment.deleteMany({ where: { orderId: seed.id } });

  for (const row of rows) {
    await prisma.orderLine.create({
      data: {
        id: row.id,
        orderId: seed.id,
        productId: row.productId,
        sortOrder: row.sortOrder,
        productQty: row.productQty,
        packSizeSnapshot: row.packSize,
        packPriceSnapshot: row.packPrice,
        packCount: row.packCount,
        unitSnapshot: row.unit,
        unitPriceSnapshot: row.unitPrice,
        stockQtySnapshot: dec(row.stockQtySnapshot),
        lineTotal: dec(row.lineTotal),
      },
    });
  }

  for (const inst of seed.installments) {
    await prisma.orderInstallment.create({
      data: {
        orderId: seed.id,
        amount: dec(inst.amount),
        installmentDate: d(inst.installmentDate),
      },
    });
  }

  if (!existing && seed.status !== OrderStatus.CANCELLED) {
    for (const row of rows) {
      await prisma.product.update({
        where: { id: row.productId },
        data: { stockQty: { decrement: row.productQty } },
      });
    }
  }
}

async function seedDemoProfile(
  prisma: PrismaClient,
  profileId: string,
): Promise<void> {
  await prisma.profile.update({
    where: { id: profileId },
    data: {
      firstName: 'Rifqi',
      lastName: 'Tjahyono',
      locationCity: 'Jakarta Pusat',
      locationCountry: 'Indonesia',
      locationSource: 'MANUAL',
      businessName: 'Toko Sumber Rejeki Demo',
      businessPhone: '+62 812 3456 7890',
      businessAddress: 'Jl. Sudirman Kav. 52-53, Jakarta Pusat 12190',
      npwp: '0123456789010000',
      isPkp: true,
      defaultPpnPercent: 11,
      taxInclusive: false,
      invoicePrefix: 'INV',
      emailVerifiedAt: new Date('2026-01-01T08:00:00.000Z'),
      accountVerifiedAt: new Date('2026-01-01T08:00:00.000Z'),
    },
  });
}

function optDec(value: number | null | undefined): Prisma.Decimal | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return dec(value);
}

async function seedDemoProducts(
  prisma: PrismaClient,
  profileId: string,
): Promise<void> {
  type ProductSeed = {
    id: string;
    name: string;
    unit: ProductUnit;
    stockQty: number;
    pricePerUnit: number;
    price100?: number | null;
    price1000?: number | null;
    costPerUnit?: number | null;
    cost100?: number | null;
    cost1000?: number | null;
    details: string;
    packSize: number;
  };

  const products: ProductSeed[] = [
    {
      id: DEMO_IDS.productCabai,
      name: 'Cabai Merah',
      unit: ProductUnit.GRAM,
      stockQty: 50000,
      pricePerUnit: 45,
      price100: 4500,
      costPerUnit: 30,
      cost100: 3000,
      details: 'Cabai merah keriting — grade A, sandbox stock (100 g pack)',
      packSize: 100,
    },
    {
      id: DEMO_IDS.productKopi,
      name: 'Kopi Bubuk',
      unit: ProductUnit.PCS,
      stockQty: 120,
      pricePerUnit: 35000,
      costPerUnit: 22000,
      details: 'Kemasan 250 g — house blend arabica',
      packSize: 1,
    },
    {
      id: DEMO_IDS.productMinyak,
      name: 'Minyak Goreng',
      unit: ProductUnit.LITER,
      stockQty: 80000,
      pricePerUnit: 180,
      price1000: 180000,
      costPerUnit: 120,
      cost1000: 120000,
      details: 'Minyak sawit kemasan 1000 L — untuk hotel & resto',
      packSize: 1000,
    },
    {
      id: DEMO_IDS.productAyam,
      name: 'Daging Ayam Fillet',
      unit: ProductUnit.GRAM,
      stockQty: 200000,
      pricePerUnit: 42,
      price1000: 42000,
      costPerUnit: 28,
      cost1000: 28000,
      details: 'Fillet dada ayam broiler — 1000 g pack',
      packSize: 1000,
    },
    {
      id: DEMO_IDS.productGaram,
      name: 'Garam Meja',
      unit: ProductUnit.PCS,
      stockQty: 500,
      pricePerUnit: 8500,
      costPerUnit: null,
      details: '500 g sachet — cost unset demo SKU',
      packSize: 1,
    },
    {
      id: DEMO_IDS.productTeh,
      name: 'Teh Celup',
      unit: ProductUnit.GRAM,
      stockQty: 0,
      pricePerUnit: 0,
      price100: null,
      costPerUnit: null,
      details: 'No pack price yet — pack readiness demo',
      packSize: 100,
    },
    {
      id: DEMO_IDS.productOutOfStock,
      name: 'Beras Premium',
      unit: ProductUnit.PCS,
      stockQty: 0,
      pricePerUnit: 95000,
      costPerUnit: 72000,
      details: '5 kg — out of stock demo SKU',
      packSize: 1,
    },
  ];

  for (const p of products) {
    const productId = buildProductSku(p.name, p.packSize, p.id);
    await prisma.product.upsert({
      where: { id: p.id },
      create: {
        id: p.id,
        profileId,
        productId,
        name: p.name,
        unit: p.unit,
        stockQty: dec(p.stockQty),
        pricePerUnit: dec(p.pricePerUnit),
        price100: optDec(p.price100),
        price1000: optDec(p.price1000),
        costPerUnit: optDec(p.costPerUnit),
        cost100: optDec(p.cost100),
        cost1000: optDec(p.cost1000),
        details: p.details,
      },
      update: {
        profileId,
        productId,
        name: p.name,
        unit: p.unit,
        stockQty: dec(p.stockQty),
        pricePerUnit: dec(p.pricePerUnit),
        price100: optDec(p.price100 ?? null),
        price1000: optDec(p.price1000 ?? null),
        costPerUnit: optDec(p.costPerUnit ?? null),
        cost100: optDec(p.cost100 ?? null),
        cost1000: optDec(p.cost1000 ?? null),
        details: p.details,
      },
    });
  }
}

async function seedDemoCustomers(
  prisma: PrismaClient,
  profileId: string,
): Promise<void> {
  const customers = [
    {
      id: DEMO_IDS.customerWarung,
      name: 'Siti Aminah',
      title: 'Purchasing Manager',
      companyName: 'Warung Sederhana',
      companyType: CompanyType.RESTAURANT,
      npwp: '9876543210987654',
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
      customerNeeds: 'Supply cabai & kopi mingguan untuk 3 outlet',
      desiredStandards: 'Segar, grade A, halal MUI',
      promiseOnTimeDelivery: true,
      promisePackagingBox: true,
      relationshipLevel: RelationshipLevel.CLOSING_FIRST_ORDER,
      approvalPercentage: 85,
      remarks: 'Priority restaurant account — demo NPWP on file',
    },
    {
      id: DEMO_IDS.customerHotel,
      name: 'Budi Santoso',
      title: 'Director of Procurement',
      companyName: 'Hotel Nusantara',
      companyType: CompanyType.HOTEL,
      npwp: '1111222233334444',
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
      customerNeeds: 'Bulk minyak goreng & protein untuk kitchen hotel',
      desiredStandards: 'Halal certified, delivery before 06:00',
      promisePackagingBox: true,
      relationshipLevel: RelationshipLevel.NEGOTIATION,
      approvalPercentage: 42,
      remarks: '5-star hotel lead — tender review Q3',
    },
    {
      id: DEMO_IDS.customerStore,
      name: 'Dewi Kartika',
      title: 'Category Manager',
      companyName: 'FreshMart Retail',
      companyType: CompanyType.STORE,
      npwp: '',
      email: 'dewi@freshmart.demo',
      phone: '+6281188776655',
      address: 'Jl. Asia Afrika No. 8',
      additionalAddress: 'Fresh category office',
      postalCode: '10270',
      city: 'Jakarta Pusat',
      province: 'DKI Jakarta',
      country: 'Indonesia',
      partnershipStage: PartnershipStage.DIRECT_VISIT,
      status: CustomerStatus.NOT_INTERESTED,
      customerNeeds: 'Retail pack program nationwide',
      desiredStandards: 'Barcode-ready 500/1000 g packs',
      relationshipLevel: RelationshipLevel.INITIAL_APPROACH,
      approvalPercentage: 15,
      remarks: 'Retail chain — cold lead for pipeline demo',
    },
    {
      id: DEMO_IDS.customerResto,
      name: 'Agus Wijaya',
      title: 'Executive Chef',
      companyName: 'Warung Nusantara Group',
      companyType: CompanyType.RESTAURANT,
      npwp: '5555666677778888',
      email: 'agus@warungnusantara.demo',
      phone: '+6281312345678',
      address: 'Jl. Kemang Raya No. 10',
      additionalAddress: 'Central kitchen',
      postalCode: '12730',
      city: 'Jakarta Selatan',
      province: 'DKI Jakarta',
      country: 'Indonesia',
      partnershipStage: PartnershipStage.WHATSAPP,
      status: CustomerStatus.OTHERS,
      customerNeeds: 'Ayam fillet & cabai untuk 12 outlets',
      desiredStandards: 'Cold chain, traceable suppliers',
      promiseAnnualBonus: true,
      promiseOnTimeDelivery: true,
      promisePackagingBox: true,
      relationshipLevel: RelationshipLevel.REQUEST_SAMPLE,
      approvalPercentage: 60,
      remarks: 'Multi-outlet group — sample requested',
    },
    {
      id: DEMO_IDS.customerHotel2,
      name: 'Rina Melati',
      title: 'F&B Manager',
      companyName: 'Grand Plaza Hotel',
      companyType: CompanyType.HOTEL,
      npwp: '9999888877776666',
      email: 'rina@grandplaza.demo',
      phone: '+6281199887766',
      address: 'Jl. MH Thamrin No. 1',
      additionalAddress: 'F&B office level 3',
      postalCode: '10310',
      city: 'Jakarta Pusat',
      province: 'DKI Jakarta',
      country: 'Indonesia',
      partnershipStage: PartnershipStage.EMAIL,
      status: CustomerStatus.INTERESTED,
      customerNeeds: 'Premium protein & cooking oil program',
      desiredStandards: 'Export-grade cuts, vacuum pack',
      promiseAnnualBonus: true,
      promiseOnTimeDelivery: true,
      relationshipLevel: RelationshipLevel.WILL_CONTACT,
      approvalPercentage: 78,
      remarks: 'High-profile hotel — all promise flags demo',
    },
  ] as const;

  for (const c of customers) {
    const customerId = buildCustomerSku(c.name, c.companyType, c.id);
    await prisma.customer.upsert({
      where: { id: c.id },
      create: { ...c, profileId, customerId },
      update: { ...c, profileId, customerId },
    });
  }
}

async function seedDemoOrders(
  prisma: PrismaClient,
  profileId: string,
): Promise<void> {
  const cabaiStock = 50000;
  const kopiStock = 120;
  const minyakStock = 80000;
  const ayamStock = 200000;

  const orders: OrderSeed[] = [
    {
      id: DEMO_IDS.orderPendingCash,
      customerId: DEMO_IDS.customerWarung,
      orderDate: '2026-07-28',
      status: OrderStatus.PENDING,
      paymentStatus: PaymentStatus.CASH,
      discountType: DiscountType.PERCENTAGE,
      discountValue: 10,
      billStatus: BillStatus.CREATED,
      billDate: '2026-07-28',
      lines: [
        {
          id: '00000000-0000-4000-8000-000000000041',
          productId: DEMO_IDS.productKopi,
          sortOrder: 0,
          packSize: 1,
          packPrice: 35000,
          packCount: 2,
          unit: ProductUnit.PCS,
          stockQtySnapshot: kopiStock,
        },
      ],
      installments: [],
    },
    {
      id: DEMO_IDS.orderMultiLine,
      customerId: DEMO_IDS.customerHotel,
      orderDate: '2026-07-15',
      shipmentDate: '2026-07-18',
      status: OrderStatus.CONFIRMED,
      paymentStatus: PaymentStatus.CASH,
      discountType: DiscountType.PERCENTAGE,
      discountValue: 5,
      billStatus: BillStatus.SENT,
      billDate: '2026-07-16',
      invoiceDate: '2026-07-20',
      lines: [
        {
          id: DEMO_IDS.lineMultiCabai,
          productId: DEMO_IDS.productCabai,
          sortOrder: 0,
          packSize: 100,
          packPrice: 4500,
          packCount: 10,
          unit: ProductUnit.GRAM,
          stockQtySnapshot: cabaiStock,
        },
        {
          id: DEMO_IDS.lineMultiMinyak,
          productId: DEMO_IDS.productMinyak,
          sortOrder: 1,
          packSize: 1000,
          packPrice: 180000,
          packCount: 3,
          unit: ProductUnit.LITER,
          stockQtySnapshot: minyakStock,
        },
      ],
      installments: [],
    },
    {
      id: DEMO_IDS.orderDelayedFuture,
      customerId: DEMO_IDS.customerHotel2,
      orderDate: '2026-07-10',
      shipmentDate: '2026-07-12',
      status: OrderStatus.SHIPPED,
      paymentStatus: PaymentStatus.DELAYED_PAYMENT,
      discountType: DiscountType.PERCENTAGE,
      discountValue: 0,
      billStatus: BillStatus.SENT,
      billDate: '2026-07-10',
      invoiceDate: '2026-07-15',
      paymentDueDate: '2026-09-30',
      lines: [
        {
          id: '00000000-0000-4000-8000-000000000043',
          productId: DEMO_IDS.productAyam,
          sortOrder: 0,
          packSize: 1000,
          packPrice: 42000,
          packCount: 5,
          unit: ProductUnit.GRAM,
          stockQtySnapshot: ayamStock,
        },
      ],
      installments: [
        { amount: 50000, installmentDate: '2026-07-20' },
      ],
    },
    {
      id: DEMO_IDS.orderDelayedOverdue,
      customerId: DEMO_IDS.customerResto,
      orderDate: '2026-05-01',
      shipmentDate: '2026-05-05',
      status: OrderStatus.DELIVERED,
      paymentStatus: PaymentStatus.DELAYED_PAYMENT,
      discountType: DiscountType.PERCENTAGE,
      discountValue: 0,
      billStatus: BillStatus.SENT,
      billDate: '2026-05-01',
      invoiceDate: '2026-05-10',
      paymentDueDate: '2026-06-01',
      lines: [
        {
          id: '00000000-0000-4000-8000-000000000044',
          productId: DEMO_IDS.productMinyak,
          sortOrder: 0,
          packSize: 1000,
          packPrice: 180000,
          packCount: 2,
          unit: ProductUnit.LITER,
          stockQtySnapshot: minyakStock,
        },
      ],
      installments: [
        { amount: 100000, installmentDate: '2026-05-15' },
      ],
    },
    {
      id: DEMO_IDS.orderFullyPaid,
      customerId: DEMO_IDS.customerWarung,
      orderDate: '2026-06-20',
      shipmentDate: '2026-06-22',
      status: OrderStatus.DELIVERED,
      paymentStatus: PaymentStatus.CASH,
      discountType: DiscountType.PERCENTAGE,
      discountValue: 0,
      billStatus: BillStatus.SENT,
      billDate: '2026-06-20',
      invoiceDate: '2026-06-25',
      lines: [
        {
          id: '00000000-0000-4000-8000-000000000045',
          productId: DEMO_IDS.productCabai,
          sortOrder: 0,
          packSize: 100,
          packPrice: 4500,
          packCount: 20,
          unit: ProductUnit.GRAM,
          stockQtySnapshot: cabaiStock,
        },
      ],
      installments: [
        { amount: 45000, installmentDate: '2026-06-25' },
        { amount: 45000, installmentDate: '2026-07-01' },
      ],
    },
    {
      id: DEMO_IDS.orderConsignment,
      customerId: DEMO_IDS.customerStore,
      orderDate: '2026-07-01',
      status: OrderStatus.CONFIRMED,
      paymentStatus: PaymentStatus.CONSIGNMENT,
      discountType: DiscountType.PERCENTAGE,
      discountValue: 0,
      billStatus: BillStatus.CREATED,
      lines: [
        {
          id: '00000000-0000-4000-8000-000000000046',
          productId: DEMO_IDS.productGaram,
          sortOrder: 0,
          packSize: 1,
          packPrice: 8500,
          packCount: 15,
          unit: ProductUnit.PCS,
          stockQtySnapshot: 500,
        },
      ],
      installments: [],
    },
    {
      id: DEMO_IDS.orderCancelled,
      customerId: DEMO_IDS.customerHotel,
      orderDate: '2026-07-05',
      status: OrderStatus.CANCELLED,
      paymentStatus: PaymentStatus.CASH,
      discountType: DiscountType.PERCENTAGE,
      discountValue: 0,
      billStatus: BillStatus.CREATED,
      lines: [
        {
          id: '00000000-0000-4000-8000-000000000047',
          productId: DEMO_IDS.productKopi,
          sortOrder: 0,
          packSize: 1,
          packPrice: 35000,
          packCount: 1,
          unit: ProductUnit.PCS,
          stockQtySnapshot: kopiStock,
        },
      ],
      installments: [],
    },
    {
      id: DEMO_IDS.orderAmountDiscount,
      customerId: DEMO_IDS.customerHotel2,
      orderDate: '2026-07-20',
      shipmentDate: '2026-07-22',
      status: OrderStatus.SHIPPED,
      paymentStatus: PaymentStatus.DELAYED_PAYMENT,
      discountType: DiscountType.AMOUNT,
      discountValue: 25000,
      billStatus: BillStatus.SENT,
      billDate: '2026-07-20',
      invoiceDate: '2026-07-22',
      paymentDueDate: '2026-08-20',
      lines: [
        {
          id: '00000000-0000-4000-8000-000000000048',
          productId: DEMO_IDS.productAyam,
          sortOrder: 0,
          packSize: 1000,
          packPrice: 42000,
          packCount: 8,
          unit: ProductUnit.GRAM,
          stockQtySnapshot: ayamStock,
        },
        {
          id: '00000000-0000-4000-8000-000000000049',
          productId: DEMO_IDS.productKopi,
          sortOrder: 1,
          packSize: 1,
          packPrice: 35000,
          packCount: 4,
          unit: ProductUnit.PCS,
          stockQtySnapshot: kopiStock,
        },
      ],
      installments: [
        { amount: 150000, installmentDate: '2026-07-25' },
      ],
    },
  ];

  for (const order of orders) {
    await upsertOrder(prisma, profileId, order);
  }
}

export async function seedDemoData(
  prisma: PrismaClient,
  profileId: string,
): Promise<void> {
  await seedDemoProfile(prisma, profileId);
  await seedDemoProducts(prisma, profileId);
  await seedDemoCustomers(prisma, profileId);
  await seedDemoOrders(prisma, profileId);
}
