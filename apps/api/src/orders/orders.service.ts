import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  DiscountType,
  InvoiceStatus,
  OrderStatus,
  PaymentStatus,
  Prisma,
  Product,
  ProductUnit,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationQueryDto } from '../common/dto/pagination.dto';
import { decimalToNumber, serializeOrder } from '../common/utils/serialize';
import {
  calculateMultiLineOrderTotals,
  lineSubtotal,
} from './order-math';
import {
  assertInstallmentsChronological,
  assertInstallmentsWithinTotal,
} from './order-installments';
import { resolveOrderPack } from './order-packs';
import { buildOrderSku } from './order-sku';
import {
  CreateOrderDto,
  OrderInstallmentDto,
  OrderLineDto,
  UpdateOrderDto,
} from './dto/order.dto';

/** Parse YYYY-MM-DD (or ISO) as a calendar date at UTC midnight. */
function parseDateOnly(value: string): Date {
  const day = value.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    throw new BadRequestException('Invalid date format. Use YYYY-MM-DD.');
  }
  return new Date(`${day}T00:00:00.000Z`);
}

function todayDateOnly(): Date {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return new Date(`${y}-${m}-${d}T00:00:00.000Z`);
}

const orderInclude = {
  product: true,
  customer: true,
  lines: {
    include: { product: true },
    orderBy: { sortOrder: 'asc' as const },
  },
  installments: { orderBy: { installmentDate: 'asc' as const } },
};

type ResolvedLine = {
  product: Product;
  productId: string;
  sortOrder: number;
  packSize: number;
  packPrice: number;
  packCount: number;
  unit: ProductUnit;
  unitPrice: number;
  productQty: number;
  lineTotal: number;
  stockQtySnapshot: number;
};

function validateInstallments(
  totalOrderValue: number,
  installments: OrderInstallmentDto[] | undefined,
) {
  if (!installments) return;
  try {
    assertInstallmentsChronological(installments);
    assertInstallmentsWithinTotal(totalOrderValue, installments);
  } catch (err) {
    throw new BadRequestException(
      err instanceof Error ? err.message : 'Invalid installments',
    );
  }
}

async function replaceInstallments(
  tx: Prisma.TransactionClient,
  orderId: string,
  installments: OrderInstallmentDto[],
) {
  await tx.orderInstallment.deleteMany({ where: { orderId } });
  if (installments.length === 0) return;
  await tx.orderInstallment.createMany({
    data: installments.map((row) => ({
      orderId,
      amount: row.amount,
      installmentDate: parseDateOnly(row.installmentDate),
      updatedAt: new Date(),
    })),
  });
}

async function replaceLines(
  tx: Prisma.TransactionClient,
  orderId: string,
  lines: ResolvedLine[],
) {
  await tx.orderLine.deleteMany({ where: { orderId } });
  await tx.orderLine.createMany({
    data: lines.map((line) => ({
      orderId,
      productId: line.productId,
      sortOrder: line.sortOrder,
      productQty: line.productQty,
      packSizeSnapshot: line.packSize,
      packPriceSnapshot: line.packPrice,
      packCount: line.packCount,
      unitSnapshot: line.unit,
      unitPriceSnapshot: line.unitPrice,
      stockQtySnapshot: line.stockQtySnapshot,
      lineTotal: line.lineTotal,
    })),
  });
}

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(private readonly prisma: PrismaService) {}

  private async resolveCustomerId(
    tx: Prisma.TransactionClient,
    profileId: string,
    customerId: string | null | undefined,
  ): Promise<string | null> {
    if (customerId == null || customerId === '') return null;
    const customer = await tx.customer.findFirst({
      where: { id: customerId, profileId },
      select: { id: true },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }
    return customer.id;
  }

  private async resolveLines(
    tx: Prisma.TransactionClient,
    profileId: string,
    lineDtos: OrderLineDto[],
    /** Extra stock available per product (e.g. restored from previous draw). */
    stockCredit: Map<string, number> = new Map(),
  ): Promise<ResolvedLine[]> {
    if (!lineDtos.length) {
      throw new BadRequestException('Order requires at least one line');
    }

    const productIds = lineDtos.map((l) => l.productId);
    const products = await tx.product.findMany({
      where: { profileId, id: { in: [...new Set(productIds)] } },
    });
    const byId = new Map(products.map((p) => [p.id, p]));

    const demandByProduct = new Map<string, number>();
    const resolved: ResolvedLine[] = [];

    for (let i = 0; i < lineDtos.length; i += 1) {
      const dto = lineDtos[i];
      const product = byId.get(dto.productId);
      if (!product) {
        throw new NotFoundException(`Product not found: ${dto.productId}`);
      }

      const pack = resolveOrderPack({
        product,
        packSize:
          product.unit === ProductUnit.PCS ? undefined : dto.packSize,
        packCount: dto.packCount,
      });
      const lineTotal = lineSubtotal(pack.unitPrice, pack.productQty);
      const catalogStock = decimalToNumber(product.stockQty);
      const credit = stockCredit.get(product.id) ?? 0;
      const available = catalogStock + credit;

      resolved.push({
        product,
        productId: product.id,
        sortOrder: i,
        packSize: pack.packSize,
        packPrice: pack.packPrice,
        packCount: pack.packCount,
        unit: pack.unit,
        unitPrice: pack.unitPrice,
        productQty: pack.productQty,
        lineTotal,
        stockQtySnapshot: available,
      });

      demandByProduct.set(
        product.id,
        (demandByProduct.get(product.id) ?? 0) + pack.productQty,
      );
    }

    for (const [productId, demand] of demandByProduct) {
      const product = byId.get(productId)!;
      const catalogStock = decimalToNumber(product.stockQty);
      const credit = stockCredit.get(productId) ?? 0;
      const available = catalogStock + credit;
      if (demand > available) {
        throw new BadRequestException(
          `Insufficient stock for ${product.name}. Available: ${available} ${product.unit.toLowerCase()}, requested: ${demand}`,
        );
      }
    }

    return resolved;
  }

  private async applyStockDelta(
    tx: Prisma.TransactionClient,
    deltas: Map<string, number>,
  ) {
    for (const [productId, delta] of deltas) {
      if (delta === 0) continue;
      const product = await tx.product.findUniqueOrThrow({
        where: { id: productId },
      });
      const next = decimalToNumber(product.stockQty) + delta;
      if (next < -0.00005) {
        throw new BadRequestException(
          `Insufficient stock while adjusting product ${productId}`,
        );
      }
      await tx.product.update({
        where: { id: productId },
        data: { stockQty: Math.max(0, next) },
      });
    }
  }

  /** Positive delta = restore stock; negative = draw. */
  private stockDeltasFromLines(
    lines: Array<{ productId: string; productQty: number }>,
    sign: 1 | -1,
  ): Map<string, number> {
    const deltas = new Map<string, number>();
    for (const line of lines) {
      deltas.set(
        line.productId,
        (deltas.get(line.productId) ?? 0) + sign * line.productQty,
      );
    }
    return deltas;
  }

  private skuFor(orderDate: Date | string, id: string) {
    return buildOrderSku(orderDate, id);
  }

  /** Align skus to `YYYY_MM_DD_{uuid}` (safe to call repeatedly). */
  async backfillMissingSkus(profileId?: string) {
    const orders = await this.prisma.order.findMany({
      where: profileId ? { profileId } : undefined,
      orderBy: { createdAt: 'asc' },
    });
    let updated = 0;
    for (const order of orders) {
      const expected = this.skuFor(order.orderDate, order.id);
      if (order.sku === expected) continue;
      await this.prisma.order.update({
        where: { id: order.id },
        data: { sku: expected },
      });
      updated += 1;
    }
    if (updated > 0) {
      this.logger.log(`Order SKU backfill updated ${updated} rows`);
    }
    return { updated };
  }

  async create(profileId: string, dto: CreateOrderDto) {
    return this.prisma.$transaction(async (tx) => {
      const status =
        (dto.status as OrderStatus | undefined) ?? OrderStatus.PENDING;
      const resolved = await this.resolveLines(tx, profileId, dto.lines);
      const customerId = await this.resolveCustomerId(
        tx,
        profileId,
        dto.customerId,
      );
      const orderDate = dto.orderDate
        ? parseDateOnly(dto.orderDate)
        : todayDateOnly();
      const shipmentDate =
        dto.shipmentDate && dto.shipmentDate !== ''
          ? parseDateOnly(dto.shipmentDate)
          : null;
      const invoiceStatus =
        (dto.invoiceStatus as InvoiceStatus | undefined) ??
        InvoiceStatus.CREATED;
      let invoiceDate: Date | null = orderDate;
      if (dto.invoiceDate === null || dto.invoiceDate === '') {
        invoiceDate = null;
      } else if (typeof dto.invoiceDate === 'string') {
        invoiceDate = parseDateOnly(dto.invoiceDate);
      }
      const installments = dto.installments ?? [];

      let totals;
      try {
        totals = calculateMultiLineOrderTotals({
          lines: resolved.map((l) => ({
            unitPrice: l.unitPrice,
            productQty: l.productQty,
          })),
          discountType: dto.discountType,
          discountValue: dto.discountValue,
        });
      } catch (err) {
        throw new BadRequestException(
          err instanceof Error ? err.message : 'Invalid order totals',
        );
      }

      validateInstallments(totals.totalOrderValue, installments);

      const primary = resolved[0];
      const id = randomUUID();
      const sku = this.skuFor(orderDate, id);
      const order = await tx.order.create({
        data: {
          id,
          profileId,
          sku,
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
          discountType: dto.discountType,
          discountValue: dto.discountValue,
          totalOrderValue: totals.totalOrderValue,
          status,
          paymentStatus: dto.paymentStatus,
          invoiceStatus,
          invoiceDate,
        },
      });

      await replaceLines(tx, order.id, resolved);
      await replaceInstallments(tx, order.id, installments);

      if (status !== OrderStatus.CANCELLED) {
        await this.applyStockDelta(
          tx,
          this.stockDeltasFromLines(resolved, -1),
        );
      }

      const full = await tx.order.findFirst({
        where: { id: order.id },
        include: orderInclude,
      });

      this.logger.log(
        `Order created: ${order.id} sku=${sku} (${resolved.length} lines) by ${profileId}`,
      );
      return serializeOrder(full!);
    });
  }

  async findAll(profileId: string, query: PaginationQueryDto) {
    await this.backfillMissingSkus(profileId);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.OrderWhereInput = { profileId };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        include: orderInclude,
        orderBy: [{ orderDate: 'desc' }, { updatedAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      items: items.map(serializeOrder),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  async findOne(profileId: string, id: string) {
    let order = await this.prisma.order.findFirst({
      where: { id, profileId },
      include: orderInclude,
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    const expected = this.skuFor(order.orderDate, order.id);
    if (order.sku !== expected) {
      order = await this.prisma.order.update({
        where: { id: order.id },
        data: { sku: expected },
        include: orderInclude,
      });
    }
    return serializeOrder(order);
  }

  async update(profileId: string, id: string, dto: UpdateOrderDto) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.order.findFirst({
        where: { id, profileId },
        include: {
          lines: { orderBy: { sortOrder: 'asc' } },
          installments: true,
        },
      });
      if (!existing) {
        throw new NotFoundException('Order not found');
      }

      const oldLines =
        existing.lines.length > 0
          ? existing.lines.map((l) => ({
              productId: l.productId,
              productQty: decimalToNumber(l.productQty),
              packSize: decimalToNumber(l.packSizeSnapshot),
              packCount: decimalToNumber(l.packCount),
            }))
          : [
              {
                productId: existing.productId,
                productQty: decimalToNumber(existing.productQty),
                packSize: decimalToNumber(existing.packSizeSnapshot),
                packCount: decimalToNumber(existing.packCount),
              },
            ];

      const wasCancelled = existing.status === OrderStatus.CANCELLED;
      const status =
        (dto.status as OrderStatus | undefined) ?? existing.status;
      const willBeCancelled = status === OrderStatus.CANCELLED;

      const lineDtos: OrderLineDto[] =
        dto.lines ??
        oldLines.map((l) => ({
          productId: l.productId,
          packSize: l.packSize,
          packCount: l.packCount,
        }));

      // Credit back previous draw when re-resolving stock for active orders.
      const stockCredit = new Map<string, number>();
      if (!wasCancelled) {
        for (const line of oldLines) {
          stockCredit.set(
            line.productId,
            (stockCredit.get(line.productId) ?? 0) + line.productQty,
          );
        }
      }

      const resolved = await this.resolveLines(
        tx,
        profileId,
        lineDtos,
        willBeCancelled ? new Map() : stockCredit,
      );

      const discountType =
        (dto.discountType as DiscountType | undefined) ??
        existing.discountType;
      const discountValue =
        dto.discountValue ?? decimalToNumber(existing.discountValue);
      const paymentStatus =
        (dto.paymentStatus as PaymentStatus | undefined) ??
        existing.paymentStatus;
      const invoiceStatus =
        (dto.invoiceStatus as InvoiceStatus | undefined) ??
        existing.invoiceStatus;
      const orderDate = dto.orderDate
        ? parseDateOnly(dto.orderDate)
        : existing.orderDate;
      let shipmentDate = existing.shipmentDate;
      if (dto.shipmentDate === null || dto.shipmentDate === '') {
        shipmentDate = null;
      } else if (typeof dto.shipmentDate === 'string') {
        shipmentDate = parseDateOnly(dto.shipmentDate);
      }
      let invoiceDate = existing.invoiceDate;
      if (dto.invoiceDate === null || dto.invoiceDate === '') {
        invoiceDate = null;
      } else if (typeof dto.invoiceDate === 'string') {
        invoiceDate = parseDateOnly(dto.invoiceDate);
      }

      let totals;
      try {
        totals = calculateMultiLineOrderTotals({
          lines: resolved.map((l) => ({
            unitPrice: l.unitPrice,
            productQty: l.productQty,
          })),
          discountType,
          discountValue,
        });
      } catch (err) {
        throw new BadRequestException(
          err instanceof Error ? err.message : 'Invalid order totals',
        );
      }

      const installmentsForValidation =
        dto.installments ??
        existing.installments.map((row) => ({
          amount: decimalToNumber(row.amount),
          installmentDate: row.installmentDate.toISOString().slice(0, 10),
        }));
      validateInstallments(totals.totalOrderValue, installmentsForValidation);

      let customerId = existing.customerId;
      if (dto.customerId !== undefined) {
        customerId = await this.resolveCustomerId(
          tx,
          profileId,
          dto.customerId,
        );
      }

      // Stock: restore old draw if previously active; draw new if becoming/staying active.
      if (!wasCancelled) {
        await this.applyStockDelta(
          tx,
          this.stockDeltasFromLines(oldLines, 1),
        );
      }
      if (!willBeCancelled) {
        await this.applyStockDelta(
          tx,
          this.stockDeltasFromLines(resolved, -1),
        );
      }

      const primary = resolved[0];
      const sku = this.skuFor(orderDate, id);
      await tx.order.update({
        where: { id },
        data: {
          sku,
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
          discountType,
          discountValue,
          totalOrderValue: totals.totalOrderValue,
          status,
          paymentStatus,
          invoiceStatus,
          invoiceDate,
        },
      });

      await replaceLines(tx, id, resolved);

      if (dto.installments) {
        await replaceInstallments(tx, id, dto.installments);
      }

      const full = await tx.order.findFirst({
        where: { id },
        include: orderInclude,
      });

      this.logger.log(
        `Order updated: ${id} sku=${sku} (${resolved.length} lines)`,
      );
      return serializeOrder(full!);
    });
  }
}
