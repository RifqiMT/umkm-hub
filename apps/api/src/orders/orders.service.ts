import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  BillStatus,
  DiscountType,
  InvoiceStatus,
  OrderStatus,
  PaymentStatus,
  Prisma,
  Product,
  ProductUnit,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { decimalToNumber, serializeOrder } from '../common/utils/serialize';
import {
  calculateMultiLineOrderTotals,
  lineSubtotal,
} from './order-math';
import {
  assertInstallmentsChronological,
  assertInstallmentsWithinTotal,
  applyBillInvoiceDateHints,
  calculateRemainingFromPaid,
  deriveInvoiceStatusFromPayments,
  sumInstallmentAmounts,
} from './order-installments';
import { resolveOrderPack } from './order-packs';
import { buildOrderSku } from './order-sku';
import {
  CreateOrderDto,
  OrderInstallmentDto,
  OrderLineDto,
  UpdateOrderDto,
} from './dto/order.dto';
import { OrderListQueryDto } from './dto/order-list-query.dto';
import { OrderSummaryQueryDto } from './dto/order-summary-query.dto';
import { resolveOrderAmountDue } from './fiscal-invoice';
import {
  cancellationRatePercent,
  discountRatePercent,
  fullPaymentRatePercent,
  profitMarginRatePercent,
  toDateOnlyIso,
  totalProductsSold,
} from './order-summary';
import {
  buildOrderStatistics,
  emptyOrderStatistics,
} from './order-statistics';
import { dateOnlyBounds, parseDateOnlyUtc } from './order-date-range';
import { buildOrderFilterSql } from './order-filter-sql';

/** Parse YYYY-MM-DD (or ISO) as a calendar date at UTC midnight. */
function parseDateOnly(value: string): Date {
  try {
    return parseDateOnlyUtc(value);
  } catch {
    throw new BadRequestException('Invalid date format. Use YYYY-MM-DD.');
  }
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

/**
 * Lean list shape — full lines/installments load on GET /orders/:id.
 * Installment rows omitted; paid totals come from a page-scoped groupBy.
 */
const orderListSelect = {
  id: true,
  profileId: true,
  orderId: true,
  customerId: true,
  productId: true,
  orderDate: true,
  shipmentDate: true,
  billDate: true,
  billStatus: true,
  invoiceDate: true,
  invoiceStatus: true,
  paymentDueDate: true,
  fiscalInvoiceNumber: true,
  includePpn: true,
  productQty: true,
  packSizeSnapshot: true,
  packPriceSnapshot: true,
  packCount: true,
  unitSnapshot: true,
  unitPriceSnapshot: true,
  stockQtySnapshot: true,
  lineTotal: true,
  discountType: true,
  discountValue: true,
  totalOrderValue: true,
  status: true,
  paymentStatus: true,
  createdAt: true,
  updatedAt: true,
  product: {
    select: {
      id: true,
      name: true,
      productId: true,
      unit: true,
    },
  },
  customer: {
    select: {
      id: true,
      name: true,
      companyName: true,
    },
  },
  _count: { select: { lines: true, installments: true } },
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
  amountDue: number,
  installments: OrderInstallmentDto[] | undefined,
) {
  if (!installments) return;
  try {
    assertInstallmentsChronological(installments);
    assertInstallmentsWithinTotal(amountDue, installments);
  } catch (err) {
    throw new BadRequestException(
      err instanceof Error ? err.message : 'Invalid installments',
    );
  }
}

function orderAmountDueFromProfile(
  totalOrderValue: number,
  includePpn: boolean | null,
  profile: {
    isPkp: boolean;
    defaultPpnPercent: Prisma.Decimal | number | string;
    taxInclusive: boolean;
  },
): number {
  return resolveOrderAmountDue({
    totalOrderValue,
    includePpn,
    profile: {
      isPkp: profile.isPkp,
      ppnPercent: decimalToNumber(profile.defaultPpnPercent),
      taxInclusive: profile.taxInclusive,
    },
  });
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
      if (order.orderId === expected) continue;
      await this.prisma.order.update({
        where: { id: order.id },
        data: { orderId: expected },
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
      const profile = await tx.profile.findFirstOrThrow({
        where: { id: profileId },
      });
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
      const billStatus =
        (dto.billStatus as BillStatus | undefined) ?? BillStatus.CREATED;
      const billDateProvided =
        dto.billDate !== undefined && dto.billDate !== null && dto.billDate !== '';
      let billDate: Date | null = orderDate;
      if (dto.billDate === null || dto.billDate === '') {
        billDate = null;
      } else if (typeof dto.billDate === 'string') {
        billDate = parseDateOnly(dto.billDate);
      }
      const invoiceDateProvided =
        dto.invoiceDate !== undefined &&
        dto.invoiceDate !== null &&
        dto.invoiceDate !== '';
      let paymentDueDate: Date | null = null;
      if (dto.paymentDueDate === null || dto.paymentDueDate === '') {
        paymentDueDate = null;
      } else if (typeof dto.paymentDueDate === 'string') {
        paymentDueDate = parseDateOnly(dto.paymentDueDate);
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

      validateInstallments(
        orderAmountDueFromProfile(
          totals.totalOrderValue,
          dto.includePpn ?? null,
          profile,
        ),
        installments,
      );

      const paidAmount = sumInstallmentAmounts(installments);
      const invoiceStatus = deriveInvoiceStatusFromPayments({
        amountDue: orderAmountDueFromProfile(
          totals.totalOrderValue,
          dto.includePpn ?? null,
          profile,
        ),
        paidAmount,
        billStatus,
      }) as InvoiceStatus;
      let invoiceDate: Date | null = orderDate;
      if (dto.invoiceDate === null || dto.invoiceDate === '') {
        invoiceDate = null;
      } else if (typeof dto.invoiceDate === 'string') {
        invoiceDate = parseDateOnly(dto.invoiceDate);
      }

      const hintedDates = applyBillInvoiceDateHints({
        billStatus,
        billDate,
        billDateProvided,
        invoiceDate,
        invoiceDateProvided,
        installments,
        paidAmount,
        today: todayDateOnly(),
      });
      billDate = hintedDates.billDate;
      invoiceDate = hintedDates.invoiceDate;

      const primary = resolved[0];
      const id = randomUUID();
      const sku = this.skuFor(orderDate, id);
      const order = await tx.order.create({
        data: {
          id,
          profileId,
          orderId: sku,
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
          billStatus,
          billDate,
          invoiceStatus,
          invoiceDate,
          paymentDueDate,
          fiscalInvoiceNumber: dto.fiscalInvoiceNumber?.trim() ?? '',
          includePpn: dto.includePpn ?? null,
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
        `Order created: ${order.id} orderId=${sku} (${resolved.length} lines) by ${profileId}`,
      );
      return serializeOrder(full!, profile);
    });
  }

  private buildOrderFilterWhere(
    profileId: string,
    query: {
      search?: string;
      status?: OrderStatus[];
      paymentStatus?: PaymentStatus[];
      billStatus?: BillStatus[];
      invoiceStatus?: InvoiceStatus[];
      orderDateFrom?: string;
      orderDateTo?: string;
      shipmentDateFrom?: string;
      shipmentDateTo?: string;
      invoiceDateFrom?: string;
      invoiceDateTo?: string;
    },
  ): Prisma.OrderWhereInput {
    const search = query.search?.trim() ?? '';
    const statuses = query.status ?? [];
    const paymentStatuses = query.paymentStatus ?? [];
    const billStatuses = query.billStatus ?? [];
    const invoiceStatuses = query.invoiceStatus ?? [];
    const orderDate = dateOnlyBounds(query.orderDateFrom, query.orderDateTo);
    const shipmentDate = dateOnlyBounds(
      query.shipmentDateFrom,
      query.shipmentDateTo,
    );
    const invoiceDate = dateOnlyBounds(
      query.invoiceDateFrom,
      query.invoiceDateTo,
    );

    return {
      profileId,
      ...(statuses.length > 0 ? { status: { in: statuses } } : {}),
      ...(paymentStatuses.length > 0
        ? { paymentStatus: { in: paymentStatuses } }
        : {}),
      ...(billStatuses.length > 0
        ? { billStatus: { in: billStatuses } }
        : {}),
      ...(invoiceStatuses.length > 0
        ? { invoiceStatus: { in: invoiceStatuses } }
        : {}),
      ...(orderDate ? { orderDate } : {}),
      ...(shipmentDate ? { shipmentDate } : {}),
      ...(invoiceDate ? { invoiceDate } : {}),
      ...(search
        ? {
            OR: [
              { orderId: { contains: search, mode: 'insensitive' } },
              {
                product: {
                  name: { contains: search, mode: 'insensitive' },
                },
              },
              {
                product: {
                  productId: { contains: search, mode: 'insensitive' },
                },
              },
              {
                customer: {
                  name: { contains: search, mode: 'insensitive' },
                },
              },
              {
                lines: {
                  some: {
                    product: {
                      name: { contains: search, mode: 'insensitive' },
                    },
                  },
                },
              },
              ...(Object.values(OrderStatus).includes(
                search.toUpperCase() as OrderStatus,
              )
                ? [{ status: search.toUpperCase() as OrderStatus }]
                : []),
              ...(Object.values(PaymentStatus).includes(
                search.toUpperCase() as PaymentStatus,
              )
                ? [{ paymentStatus: search.toUpperCase() as PaymentStatus }]
                : []),
            ],
          }
        : {}),
    };
  }

  async findAll(profileId: string, query: OrderListQueryDto) {
    // SKU backfill is offline/CLI only — never on the list hot path.
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sort = query.sort ?? 'date';
    const dir = query.dir ?? 'desc';
    const where = this.buildOrderFilterWhere(profileId, query);

    const orderBy: Prisma.OrderOrderByWithRelationInput[] = (() => {
      switch (sort) {
        case 'product':
          return [{ product: { name: dir } }, { orderDate: 'desc' }];
        case 'status':
          return [{ status: dir }, { orderDate: 'desc' }];
        case 'total':
          return [{ totalOrderValue: dir }, { orderDate: 'desc' }];
        case 'payment':
          return [{ paymentStatus: dir }, { orderDate: 'desc' }];
        case 'date':
        default:
          return [{ orderDate: dir }, { updatedAt: 'desc' }];
      }
    })();

    const profile = await this.prisma.profile.findFirstOrThrow({
      where: { id: profileId },
    });

    const [total, items] = await this.prisma.$transaction([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        select: orderListSelect,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const orderIds = items.map((order) => order.id);
    const paidByOrderId = new Map<string, number>();
    if (orderIds.length > 0) {
      const chunkSize = 2000;
      for (let offset = 0; offset < orderIds.length; offset += chunkSize) {
        const chunk = orderIds.slice(offset, offset + chunkSize);
        const paidRows = await this.prisma.orderInstallment.groupBy({
          by: ['orderId'],
          where: { orderId: { in: chunk } },
          _sum: { amount: true },
        });
        for (const row of paidRows) {
          paidByOrderId.set(
            row.orderId,
            decimalToNumber(row._sum.amount ?? 0),
          );
        }
      }
    }

    return {
      items: items.map((order) => {
        const { _count, product, customer, ...rest } = order;
        const totalOrderValue = decimalToNumber(rest.totalOrderValue);
        const paidAmount = paidByOrderId.get(order.id) ?? 0;
        const amountDue = orderAmountDueFromProfile(
          totalOrderValue,
          rest.includePpn,
          profile,
        );
        const serialized = serializeOrder({
          ...rest,
          // List omits line/installment rows; header + aggregates are enough.
          lines: [],
          installments: [],
          product: null,
          customer: null,
        }, profile);
        return {
          ...serialized,
          lineCount: Math.max(1, _count.lines),
          installmentCount: _count.installments,
          lines: undefined,
          installments: [],
          paidAmount,
          amountDue,
          remainingAmount: calculateRemainingFromPaid(amountDue, paidAmount),
          product: product ?? undefined,
          customer: customer ?? undefined,
        };
      }),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  /**
   * Order snapshot for the same filter scope as the list
   * (search, status, paymentStatus, order/shipment/invoice dates).
   * Volume/revenue metrics exclude CANCELLED.
   * Rates: cancellation (all matching), margin/discount/full-payment (active).
   *
   * Important: never materialize matching order IDs into IN (...). Seeded
   * catalogs exceed Postgres' ~32767 bind-variable limit and crash the stage.
   */
  async getSummary(profileId: string, query: OrderSummaryQueryDto = {}) {
    const filterWhere = this.buildOrderFilterWhere(profileId, query);
    const matchedCount = await this.prisma.order.count({ where: filterWhere });

    if (matchedCount === 0) {
      return {
        earliestOrderDate: null,
        latestOrderDate: null,
        orderCount: 0,
        productsSold: 0,
        totalRevenue: 0,
        cancellationRate: null,
        profitMarginRate: null,
        discountRate: null,
        fullPaymentRate: null,
        statistics: emptyOrderStatistics(),
      };
    }

    const activeWhere: Prisma.OrderWhereInput = {
      AND: [filterWhere, { status: { not: OrderStatus.CANCELLED } }],
    };
    const filterSql = buildOrderFilterSql(profileId, query);

    const [
      orderAgg,
      linePackAgg,
      headerOnlyPackAgg,
      statusGroups,
      paymentStatusGroups,
      invoiceStatusGroups,
      billStatusGroups,
      discountTypeGroups,
      customerLinkedCount,
      fullyPaidRows,
      lineCostRows,
      headerCostRows,
    ] = await Promise.all([
      this.prisma.order.aggregate({
        where: activeWhere,
        _min: { orderDate: true },
        _max: { orderDate: true },
        _count: true,
        _sum: { totalOrderValue: true, lineTotal: true },
      }),
      this.prisma.orderLine.aggregate({
        where: { order: activeWhere },
        _sum: { packCount: true },
      }),
      this.prisma.order.aggregate({
        where: {
          AND: [activeWhere, { lines: { none: {} } }],
        },
        _sum: { packCount: true },
      }),
      this.prisma.order.groupBy({
        by: ['status'],
        where: filterWhere,
        _count: { _all: true },
      }),
      this.prisma.order.groupBy({
        by: ['paymentStatus'],
        where: filterWhere,
        _count: { _all: true },
      }),
      this.prisma.order.groupBy({
        by: ['invoiceStatus'],
        where: filterWhere,
        _count: { _all: true },
      }),
      this.prisma.order.groupBy({
        by: ['billStatus'],
        where: filterWhere,
        _count: { _all: true },
      }),
      this.prisma.order.groupBy({
        by: ['discountType'],
        where: filterWhere,
        _count: { _all: true },
      }),
      this.prisma.order.count({
        where: { AND: [filterWhere, { customerId: { not: null } }] },
      }),
      this.prisma.$queryRaw<Array<{ count: bigint | number }>>`
        SELECT COUNT(*)::bigint AS count
        FROM "Order" o
        INNER JOIN "Profile" p ON p.id = o."profileId"
        LEFT JOIN (
          SELECT "orderId", SUM(amount) AS paid
          FROM "OrderInstallment"
          GROUP BY "orderId"
        ) inst ON inst."orderId" = o.id
        WHERE o.status <> 'CANCELLED'::"OrderStatus"
          AND ${filterSql}
          AND COALESCE(inst.paid, 0) >= (
            CASE
              WHEN NOT COALESCE(o."includePpn", p."isPkp") THEN o."totalOrderValue"
              WHEN p."defaultPpnPercent" <= 0 THEN o."totalOrderValue"
              WHEN p."taxInclusive" THEN o."totalOrderValue"
              ELSE o."totalOrderValue" * (1 + p."defaultPpnPercent" / 100.0)
            END
          ) - 0.00005
      `,
      this.prisma.$queryRaw<
        Array<{ costSum: Prisma.Decimal | number | null; hasCost: boolean }>
      >`
        SELECT
          COALESCE(
            SUM(
              CASE
                WHEN p."costPerUnit" IS NOT NULL
                THEN ol."productQty" * p."costPerUnit"
                ELSE 0
              END
            ),
            0
          ) AS "costSum",
          BOOL_OR(p."costPerUnit" IS NOT NULL) AS "hasCost"
        FROM "OrderLine" ol
        INNER JOIN "Order" o ON o.id = ol."orderId"
        INNER JOIN "Product" p ON p.id = ol."productId"
        WHERE o.status <> 'CANCELLED'::"OrderStatus"
          AND ${filterSql}
      `,
      this.prisma.$queryRaw<
        Array<{ costSum: Prisma.Decimal | number | null; hasCost: boolean }>
      >`
        SELECT
          COALESCE(
            SUM(
              CASE
                WHEN p."costPerUnit" IS NOT NULL
                THEN o."productQty" * p."costPerUnit"
                ELSE 0
              END
            ),
            0
          ) AS "costSum",
          BOOL_OR(p."costPerUnit" IS NOT NULL) AS "hasCost"
        FROM "Order" o
        INNER JOIN "Product" p ON p.id = o."productId"
        WHERE o.status <> 'CANCELLED'::"OrderStatus"
          AND ${filterSql}
          AND NOT EXISTS (
            SELECT 1 FROM "OrderLine" ol WHERE ol."orderId" = o.id
          )
      `,
    ]);

    const productsSold = totalProductsSold({
      linePackSum: decimalToNumber(linePackAgg._sum.packCount ?? 0),
      headerOnlyPackSum: decimalToNumber(
        headerOnlyPackAgg._sum.packCount ?? 0,
      ),
    });

    const totalRevenue = decimalToNumber(orderAgg._sum.totalOrderValue ?? 0);
    const lineTotalSum = decimalToNumber(orderAgg._sum.lineTotal ?? 0);

    let cancelledCount = 0;
    let allOrderCount = 0;
    for (const row of statusGroups) {
      allOrderCount += row._count._all;
      if (row.status === OrderStatus.CANCELLED) {
        cancelledCount += row._count._all;
      }
    }

    const fullyPaidCount = Number(fullyPaidRows[0]?.count ?? 0);
    const lineCostSum = decimalToNumber(lineCostRows[0]?.costSum ?? 0);
    const headerCostSum = decimalToNumber(headerCostRows[0]?.costSum ?? 0);
    const hasCost = Boolean(
      lineCostRows[0]?.hasCost || headerCostRows[0]?.hasCost,
    );

    return {
      earliestOrderDate: toDateOnlyIso(orderAgg._min.orderDate),
      latestOrderDate: toDateOnlyIso(orderAgg._max.orderDate),
      orderCount: orderAgg._count,
      productsSold,
      totalRevenue,
      cancellationRate: cancellationRatePercent(cancelledCount, allOrderCount),
      profitMarginRate: profitMarginRatePercent(
        totalRevenue,
        lineCostSum + headerCostSum,
        hasCost,
      ),
      discountRate: discountRatePercent(lineTotalSum, totalRevenue),
      fullPaymentRate: fullPaymentRatePercent(
        fullyPaidCount,
        orderAgg._count,
      ),
      statistics: buildOrderStatistics({
        orderCount: allOrderCount,
        status: statusGroups.map((row) => ({
          key: row.status,
          count: row._count._all,
        })),
        paymentStatus: paymentStatusGroups.map((row) => ({
          key: row.paymentStatus,
          count: row._count._all,
        })),
        invoiceStatus: invoiceStatusGroups.map((row) => ({
          key: row.invoiceStatus,
          count: row._count._all,
        })),
        billStatus: billStatusGroups.map((row) => ({
          key: row.billStatus,
          count: row._count._all,
        })),
        discountType: discountTypeGroups.map((row) => ({
          key: row.discountType,
          count: row._count._all,
        })),
        customerLinked: {
          withCount: customerLinkedCount,
          withoutCount: allOrderCount - customerLinkedCount,
        },
      }),
    };
  }

  async findOne(profileId: string, id: string) {
    const profile = await this.prisma.profile.findFirstOrThrow({
      where: { id: profileId },
    });
    let order = await this.prisma.order.findFirst({
      where: { id, profileId },
      include: orderInclude,
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    const expected = this.skuFor(order.orderDate, order.id);
    if (order.orderId !== expected) {
      order = await this.prisma.order.update({
        where: { id: order.id },
        data: { orderId: expected },
        include: orderInclude,
      });
    }
    return serializeOrder(order, profile);
  }

  async update(profileId: string, id: string, dto: UpdateOrderDto) {
    return this.prisma.$transaction(async (tx) => {
      const profile = await tx.profile.findFirstOrThrow({
        where: { id: profileId },
      });
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
      const billStatus =
        (dto.billStatus as BillStatus | undefined) ?? existing.billStatus;
      const orderDate = dto.orderDate
        ? parseDateOnly(dto.orderDate)
        : existing.orderDate;
      let shipmentDate = existing.shipmentDate;
      if (dto.shipmentDate === null || dto.shipmentDate === '') {
        shipmentDate = null;
      } else if (typeof dto.shipmentDate === 'string') {
        shipmentDate = parseDateOnly(dto.shipmentDate);
      }
      let billDate = existing.billDate;
      const billDateProvided =
        dto.billDate !== undefined && dto.billDate !== null && dto.billDate !== '';
      if (dto.billDate === null || dto.billDate === '') {
        billDate = null;
      } else if (typeof dto.billDate === 'string') {
        billDate = parseDateOnly(dto.billDate);
      }
      const invoiceDateProvided =
        dto.invoiceDate !== undefined &&
        dto.invoiceDate !== null &&
        dto.invoiceDate !== '';
      let invoiceDate = existing.invoiceDate;
      if (dto.invoiceDate === null || dto.invoiceDate === '') {
        invoiceDate = null;
      } else if (typeof dto.invoiceDate === 'string') {
        invoiceDate = parseDateOnly(dto.invoiceDate);
      }
      let paymentDueDate = existing.paymentDueDate;
      if (dto.paymentDueDate === null || dto.paymentDueDate === '') {
        paymentDueDate = null;
      } else if (typeof dto.paymentDueDate === 'string') {
        paymentDueDate = parseDateOnly(dto.paymentDueDate);
      }
      let fiscalInvoiceNumber = existing.fiscalInvoiceNumber;
      if (dto.fiscalInvoiceNumber !== undefined) {
        fiscalInvoiceNumber = dto.fiscalInvoiceNumber.trim();
      }
      let includePpn = existing.includePpn;
      if (dto.includePpn !== undefined) {
        includePpn = dto.includePpn;
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
      validateInstallments(
        orderAmountDueFromProfile(
          totals.totalOrderValue,
          includePpn,
          profile,
        ),
        installmentsForValidation,
      );

      const paidAmount = sumInstallmentAmounts(
        installmentsForValidation.map((row) => ({ amount: row.amount })),
      );
      const invoiceStatus = deriveInvoiceStatusFromPayments({
        amountDue: orderAmountDueFromProfile(
          totals.totalOrderValue,
          includePpn,
          profile,
        ),
        paidAmount,
        billStatus,
      }) as InvoiceStatus;

      const hintedDates = applyBillInvoiceDateHints({
        billStatus,
        previousBillStatus: existing.billStatus,
        billDate,
        billDateProvided,
        invoiceDate,
        invoiceDateProvided,
        installments: installmentsForValidation,
        paidAmount,
        today: todayDateOnly(),
      });
      billDate = hintedDates.billDate;
      invoiceDate = hintedDates.invoiceDate;

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
          orderId: sku,
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
          billStatus,
          billDate,
          invoiceStatus,
          invoiceDate,
          paymentDueDate,
          fiscalInvoiceNumber,
          includePpn,
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
        `Order updated: ${id} orderId=${sku} (${resolved.length} lines)`,
      );
      return serializeOrder(full!, profile);
    });
  }
}
