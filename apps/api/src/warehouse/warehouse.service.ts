import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationQueryDto } from '../common/dto/pagination.dto';
import {
  decimalToNumber,
  serializeWarehouseRestock,
} from '../common/utils/serialize';
import {
  CreateWarehouseRestockDto,
  UpdateWarehouseRestockDto,
} from './dto/warehouse.dto';
import { WarehouseSummaryQueryDto } from './dto/warehouse-query.dto';
import {
  parseDateOnlyForTest as parseDateOnly,
  todayDateOnlyForTest as todayDateOnly,
} from './warehouse-dates';
import { buildWarehouseSummary } from './warehouse-summary';
import {
  buildWarehouseStatisticsFromCounts,
  emptyWarehouseStatistics,
} from './warehouse-statistics';
import {
  buildProductFilterSql,
  inventoryValueSelectSql,
  mapInventoryValueRow,
} from '../products/product-inventory-sql';
import { buildProductWhere } from '../products/product-where';

const warehouseProductSelect = {
  id: true,
  profileId: true,
  name: true,
  productId: true,
  unit: true,
  stockQty: true,
  pricePerUnit: true,
  price50: true,
  price100: true,
  price250: true,
  price500: true,
  price1000: true,
  priceCustom: true,
  costPerUnit: true,
  cost50: true,
  cost100: true,
  cost250: true,
  cost500: true,
  cost1000: true,
  costCustom: true,
  customSize: true,
  details: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ProductSelect;

@Injectable()
export class WarehouseService {
  private readonly logger = new Logger(WarehouseService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(profileId: string, dto: CreateWarehouseRestockDto) {
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findFirst({
        where: { id: dto.productId, profileId },
      });
      if (!product) {
        throw new NotFoundException('Product not found');
      }

      if (!(dto.qtyAdded > 0)) {
        throw new BadRequestException('Qty added must be greater than 0');
      }

      let restockDate: Date;
      try {
        restockDate = dto.restockDate
          ? parseDateOnly(dto.restockDate)
          : todayDateOnly();
      } catch (err) {
        throw new BadRequestException(
          err instanceof Error ? err.message : 'Invalid restock date',
        );
      }

      const stockBefore = decimalToNumber(product.stockQty);
      const stockAfter = stockBefore + dto.qtyAdded;

      const restock = await tx.warehouseRestock.create({
        data: {
          profileId,
          productId: product.id,
          qtyAdded: dto.qtyAdded,
          restockDate,
          notes: dto.notes?.trim() ?? '',
          unitSnapshot: product.unit,
          stockBefore,
          stockAfter,
        },
      });

      const updatedProduct = await tx.product.update({
        where: { id: product.id },
        data: { stockQty: stockAfter },
      });

      this.logger.log(
        `Warehouse restock ${restock.id}: +${dto.qtyAdded} on product ${product.id}`,
      );
      return serializeWarehouseRestock({
        ...restock,
        product: updatedProduct,
      });
    });
  }

  async getSummary(profileId: string, query: WarehouseSummaryQueryDto = {}) {
    const productWhere = buildProductWhere(profileId, query);
    const search = query.search?.trim();

    const and = (extra: Prisma.ProductWhereInput): Prisma.ProductWhereInput => ({
      AND: [productWhere, extra],
    });

    const productFilterSql = buildProductFilterSql({
      profileId,
      search,
      unit: query.unit,
      stockStatus: query.stockStatus,
      costSet: query.costSet,
      packReady: query.packReady,
    });

    const restockWhere: Prisma.WarehouseRestockWhereInput = {
      profileId,
      ...(search ||
      (query.unit && query.unit.length > 0) ||
      (query.stockStatus && query.stockStatus.length > 0) ||
      (query.costSet && query.costSet.length > 0) ||
      (query.packReady && query.packReady.length > 0)
        ? { product: productWhere }
        : {}),
    };

    const [agg, inStockCount, withCostCount, unitRows, valueRows, restockAgg, restockUnitRows, restockNotesWithCount] =
      await Promise.all([
        this.prisma.product.aggregate({
          where: productWhere,
          _count: true,
        }),
        this.prisma.product.count({
          where: and({ stockQty: { gt: 0 } }),
        }),
        this.prisma.product.count({
          where: and({ costPerUnit: { not: null } }),
        }),
        this.prisma.product.groupBy({
          by: ['unit'],
          where: productWhere,
          _count: true,
        }),
        this.prisma.$queryRaw<
          Array<{
            sellValue: Prisma.Decimal | number | null;
            costedSellValue: Prisma.Decimal | number | null;
            costValue: Prisma.Decimal | number | null;
            profitValue: Prisma.Decimal | number | null;
            hasCost: boolean | null;
          }>
        >`
          SELECT ${inventoryValueSelectSql()}
          FROM "Product" p
          WHERE ${productFilterSql}
        `,
        this.prisma.warehouseRestock.aggregate({
          where: restockWhere,
          _count: true,
          _sum: { qtyAdded: true },
          _min: { restockDate: true },
          _max: { restockDate: true },
        }),
        this.prisma.warehouseRestock.groupBy({
          by: ['unitSnapshot'],
          where: restockWhere,
          _count: true,
        }),
        this.prisma.warehouseRestock.count({
          where: { ...restockWhere, NOT: { notes: '' } },
        }),
      ]);

    const values = mapInventoryValueRow(
      valueRows[0] ?? {
        sellValue: 0,
        costedSellValue: 0,
        costValue: 0,
        profitValue: 0,
        hasCost: false,
      },
    );

    const filtersActive = Boolean(
      search ||
        (query.unit && query.unit.length > 0) ||
        (query.stockStatus && query.stockStatus.length > 0) ||
        (query.costSet && query.costSet.length > 0) ||
        (query.packReady && query.packReady.length > 0),
    );

    const restockCount = restockAgg._count;

    return {
      ...buildWarehouseSummary({
        productCount: agg._count,
        sellValue: values.sellValue,
        costedSellValue: values.costedSellValue,
        costValue: values.costValue,
        profitValue: values.profitValue,
        hasCost: values.hasCost,
        inStockCount,
        withCostCount,
        restockCount: filtersActive ? 0 : restockCount,
        qtyRestocked: filtersActive
          ? 0
          : decimalToNumber(restockAgg._sum.qtyAdded ?? 0),
        earliestRestockDate: filtersActive
          ? null
          : restockAgg._min.restockDate,
        latestRestockDate: filtersActive
          ? null
          : restockAgg._max.restockDate,
      }),
      statistics:
        agg._count === 0 && restockCount === 0
          ? emptyWarehouseStatistics()
          : buildWarehouseStatisticsFromCounts({
              productCount: agg._count,
              restockCount,
              inStockCount,
              withCostCount,
              unitRows: unitRows.map((row) => ({
                key: row.unit,
                count: row._count,
              })),
              restockUnitRows: restockUnitRows.map((row) => ({
                key: row.unitSnapshot,
                count: row._count,
              })),
              restockNotesWithCount,
            }),
    };
  }

  async findAll(profileId: string, query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.WarehouseRestockWhereInput = { profileId };
    if (query.search?.trim()) {
      where.product = {
        name: { contains: query.search.trim(), mode: 'insensitive' },
      };
    }

    const [total, items] = await this.prisma.$transaction([
      this.prisma.warehouseRestock.count({ where }),
      this.prisma.warehouseRestock.findMany({
        where,
        include: { product: { select: warehouseProductSelect } },
        orderBy: [{ restockDate: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      items: items.map((row) =>
        serializeWarehouseRestock({ ...row, product: row.product ?? null }),
      ),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  async findOne(profileId: string, id: string) {
    const restock = await this.prisma.warehouseRestock.findFirst({
      where: { id, profileId },
      include: { product: true },
    });
    if (!restock) {
      throw new NotFoundException('Restock not found');
    }
    return serializeWarehouseRestock(restock);
  }

  async update(
    profileId: string,
    id: string,
    dto: UpdateWarehouseRestockDto,
  ) {
    if (
      dto.qtyAdded === undefined &&
      dto.restockDate === undefined &&
      dto.notes === undefined
    ) {
      return this.findOne(profileId, id);
    }

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.warehouseRestock.findFirst({
        where: { id, profileId },
        include: { product: true },
      });
      if (!existing) {
        throw new NotFoundException('Restock not found');
      }

      const oldQty = decimalToNumber(existing.qtyAdded);
      const nextQty = dto.qtyAdded ?? oldQty;
      if (!(nextQty > 0)) {
        throw new BadRequestException('Qty added must be greater than 0');
      }

      let restockDate = existing.restockDate;
      if (dto.restockDate !== undefined) {
        try {
          restockDate = parseDateOnly(dto.restockDate);
        } catch (err) {
          throw new BadRequestException(
            err instanceof Error ? err.message : 'Invalid restock date',
          );
        }
      }

      const delta = nextQty - oldQty;
      const stockBefore = decimalToNumber(existing.stockBefore);
      const stockAfter = stockBefore + nextQty;

      if (delta !== 0) {
        const product = existing.product;
        if (!product) {
          throw new NotFoundException('Product not found');
        }

        const currentStock = decimalToNumber(product.stockQty);
        const nextStock = currentStock + delta;
        if (nextStock < 0) {
          throw new BadRequestException(
            'Restock change would make product stock negative',
          );
        }

        await tx.product.update({
          where: { id: product.id },
          data: { stockQty: nextStock },
        });

        const subsequent = await tx.warehouseRestock.findMany({
          where: {
            profileId,
            productId: existing.productId,
            OR: [
              { restockDate: { gt: existing.restockDate } },
              {
                restockDate: existing.restockDate,
                createdAt: { gt: existing.createdAt },
              },
            ],
          },
          orderBy: [{ restockDate: 'asc' }, { createdAt: 'asc' }],
        });

        for (const row of subsequent) {
          await tx.warehouseRestock.update({
            where: { id: row.id },
            data: {
              stockBefore: decimalToNumber(row.stockBefore) + delta,
              stockAfter: decimalToNumber(row.stockAfter) + delta,
            },
          });
        }
      }

      const updated = await tx.warehouseRestock.update({
        where: { id: existing.id },
        data: {
          qtyAdded: nextQty,
          stockAfter,
          restockDate,
          ...(dto.notes !== undefined ? { notes: dto.notes.trim() } : {}),
        },
        include: { product: true },
      });

      this.logger.log(
        `Warehouse restock ${id} updated (qty ${oldQty} → ${nextQty})`,
      );
      return serializeWarehouseRestock(updated);
    });
  }
}
