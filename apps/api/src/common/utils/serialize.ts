import { Decimal } from '@prisma/client/runtime/library';
import {
  Product,
  Order,
  OrderLine,
  Customer,
  WarehouseRestock,
  WarehouseSale,
  OrderInstallment,
} from '@prisma/client';
import { GRAM_LITER_PACK_SIZES } from '../../products/pack-sizes';
import {
  calculatePotentialCost,
  calculatePotentialProfit,
  calculatePotentialRevenue,
  calculateProfitMarginPercent,
  calculateUnitProfit,
} from '../../products/product-pricing';
import { calculateRemainingAmount } from '../../orders/order-installments';
import { resolveOrderAmountDue } from '../../orders/fiscal-invoice';

type SerializeOrderProfile = {
  isPkp: boolean;
  defaultPpnPercent: Decimal | number | string;
  taxInclusive: boolean;
};

export function decimalToNumber(value: Decimal | number | string): number {
  if (typeof value === 'number') return value;
  return Number(value.toString());
}

function optionalDecimal(value: Decimal | null | undefined): number | null {
  if (value == null) return null;
  return decimalToNumber(value);
}

export function serializeProduct(product: Product) {
  const stockQty = decimalToNumber(product.stockQty);
  const pricePerUnit = decimalToNumber(product.pricePerUnit);
  const costPerUnit = optionalDecimal(product.costPerUnit);
  return {
    ...product,
    stockQty,
    pricePerUnit,
    ...Object.fromEntries(
      GRAM_LITER_PACK_SIZES.flatMap((size) => [
        [`price${size}`, optionalDecimal(product[`price${size}` as keyof Product] as Decimal | null | undefined)],
        [`cost${size}`, optionalDecimal(product[`cost${size}` as keyof Product] as Decimal | null | undefined)],
      ]),
    ),
    priceCustom: optionalDecimal(product.priceCustom),
    costPerUnit,
    costCustom: optionalDecimal(product.costCustom),
    customSize: optionalDecimal(product.customSize),
    potentialRevenue: calculatePotentialRevenue(stockQty, pricePerUnit),
    potentialCost: calculatePotentialCost(stockQty, costPerUnit),
    unitProfit: calculateUnitProfit(pricePerUnit, costPerUnit),
    potentialProfit: calculatePotentialProfit(
      stockQty,
      pricePerUnit,
      costPerUnit,
    ),
    profitMarginPercent: calculateProfitMarginPercent(
      pricePerUnit,
      costPerUnit,
    ),
  };
}

function dateOnlyIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

export function serializeOrder(
  order: Order & {
    product?: Product | null;
    customer?: Customer | null;
    lines?: Array<
      OrderLine & {
        product?: Product | null;
      }
    >;
    installments?: OrderInstallment[];
  },
  profile?: SerializeOrderProfile,
) {
  const packSize = decimalToNumber(order.packSizeSnapshot);
  const packPrice = decimalToNumber(order.packPriceSnapshot);
  const packCount = decimalToNumber(order.packCount);
  const productQty = decimalToNumber(order.productQty);
  const totalOrderValue = decimalToNumber(order.totalOrderValue);
  const installments = (order.installments ?? []).map((row) => ({
    id: row.id,
    amount: decimalToNumber(row.amount),
    installmentDate: dateOnlyIso(row.installmentDate)!,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
  const paidAmount = installments.reduce((sum, row) => sum + row.amount, 0);
  const amountDue = profile
    ? resolveOrderAmountDue({
        totalOrderValue,
        includePpn: order.includePpn,
        profile: {
          isPkp: profile.isPkp,
          ppnPercent: decimalToNumber(profile.defaultPpnPercent),
          taxInclusive: profile.taxInclusive,
        },
      })
    : totalOrderValue;

  const lines = (order.lines ?? []).map((line) => {
    const linePackSize = decimalToNumber(line.packSizeSnapshot);
    const linePackPrice = decimalToNumber(line.packPriceSnapshot);
    const linePackCount = decimalToNumber(line.packCount);
    const lineQty = decimalToNumber(line.productQty);
    return {
      id: line.id,
      orderId: line.orderId,
      productId: line.productId,
      sortOrder: line.sortOrder,
      productQty: lineQty,
      packSizeSnapshot: linePackSize,
      packPriceSnapshot: linePackPrice,
      packCount: linePackCount,
      unitSnapshot: line.unitSnapshot,
      unit: line.unitSnapshot,
      unitPriceSnapshot: decimalToNumber(line.unitPriceSnapshot),
      stockQtySnapshot: decimalToNumber(line.stockQtySnapshot),
      lineTotal: decimalToNumber(line.lineTotal),
      price: linePackPrice,
      qty: lineQty,
      product: line.product ? serializeProduct(line.product) : undefined,
      createdAt: line.createdAt,
      updatedAt: line.updatedAt,
    };
  });

  return {
    ...order,
    orderDate: dateOnlyIso(order.orderDate)!,
    shipmentDate: dateOnlyIso(order.shipmentDate),
    billDate: dateOnlyIso(order.billDate),
    invoiceDate: dateOnlyIso(order.invoiceDate),
    paymentDueDate: dateOnlyIso(order.paymentDueDate),
    productQty,
    packSizeSnapshot: packSize,
    packPriceSnapshot: packPrice,
    packCount,
    unit: order.unitSnapshot,
    /** Pack selling price on primary line (read-only commercial price). */
    price: packPrice,
    qty: productQty,
    unitPriceSnapshot: decimalToNumber(order.unitPriceSnapshot),
    stockQtySnapshot: decimalToNumber(order.stockQtySnapshot),
    lineTotal: decimalToNumber(order.lineTotal),
    discountValue: decimalToNumber(order.discountValue),
    totalOrderValue,
    amountDue: profile ? amountDue : undefined,
    lineCount: lines.length || 1,
    lines,
    installments,
    paidAmount: Math.round((paidAmount + Number.EPSILON) * 10000) / 10000,
    remainingAmount: calculateRemainingAmount(amountDue, installments),
    product: order.product ? serializeProduct(order.product) : undefined,
    customer: order.customer
      ? serializeCustomer(order.customer)
      : undefined,
  };
}

export function serializeWarehouseRestock(
  restock: WarehouseRestock & { product?: Product | null },
) {
  return {
    ...restock,
    restockDate: dateOnlyIso(restock.restockDate)!,
    qtyAdded: decimalToNumber(restock.qtyAdded),
    stockBefore: decimalToNumber(restock.stockBefore),
    stockAfter: decimalToNumber(restock.stockAfter),
    unit: restock.unitSnapshot,
    product: restock.product ? serializeProduct(restock.product) : undefined,
  };
}

export function serializeWarehouseSale(
  sale: WarehouseSale & {
    product?: Product | null;
    order?: { id: string; orderId: string; orderDate: Date } | null;
  },
) {
  return {
    id: sale.id,
    profileId: sale.profileId,
    productId: sale.productId,
    orderId: sale.orderId,
    orderLineId: sale.orderLineId,
    qtySold: decimalToNumber(sale.qtySold),
    soldDate: dateOnlyIso(sale.soldDate)!,
    notes: sale.notes,
    unitSnapshot: sale.unitSnapshot,
    unit: sale.unitSnapshot,
    packSizeSnapshot: decimalToNumber(sale.packSizeSnapshot),
    packCount: decimalToNumber(sale.packCount),
    stockBefore: decimalToNumber(sale.stockBefore),
    stockAfter: decimalToNumber(sale.stockAfter),
    createdAt: sale.createdAt,
    updatedAt: sale.updatedAt,
    orderRef: sale.order?.orderId || sale.orderId,
    order: sale.order
      ? {
          id: sale.order.id,
          orderId: sale.order.orderId,
          orderDate: dateOnlyIso(sale.order.orderDate)!,
        }
      : undefined,
    product: sale.product ? serializeProduct(sale.product) : undefined,
  };
}

function serializeCustomer(customer: Customer) {
  return customer;
}
