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
import { CreateWarehouseRestockDto } from './dto/warehouse.dto';
import { WarehouseSummaryQueryDto } from './dto/warehouse-query.dto';
import {
  parseDateOnlyForTest as parseDateOnly,
  todayDateOnlyForTest as todayDateOnly,
} from './warehouse-dates';
import { buildWarehouseSummary } from './warehouse-summary';
import {
  buildProductFilterSql,
  inventoryValueSelectSql,
  mapInventoryValueRow,
} from '../products/product-inventory-sql';

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
    const productWhere: Prisma.ProductWhereInput = { profileId };
    const search = query.search?.trim();
    if (search) {
      productWhere.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (query.unit && query.unit.length > 0) {
      productWhere.unit = { in: query.unit };
    }
    const stockStatus = query.stockStatus ?? [];
    if (stockStatus.length === 1) {
      productWhere.stockQty =
        stockStatus[0] === 'in_stock' ? { gt: 0 } : { lte: 0 };
    }

    const and = (extra: Prisma.ProductWhereInput): Prisma.ProductWhereInput => ({
      AND: [productWhere, extra],
    });

    const productFilterSql = buildProductFilterSql({
      profileId,
      search,
      unit: query.unit,
      stockStatus,
    });

    const [agg, inStockCount, withCostCount, valueRows, restockAgg] =
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
          where: {
            profileId,
            ...(search || (query.unit && query.unit.length > 0)
              ? { product: productWhere }
              : {}),
          },
          _count: true,
          _sum: { qtyAdded: true },
          _min: { restockDate: true },
          _max: { restockDate: true },
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
        stockStatus.length > 0,
    );

    return buildWarehouseSummary({
      productCount: agg._count,
      sellValue: values.sellValue,
      costedSellValue: values.costedSellValue,
      costValue: values.costValue,
      profitValue: values.profitValue,
      hasCost: values.hasCost,
      inStockCount,
      withCostCount,
      restockCount: filtersActive ? 0 : restockAgg._count,
      qtyRestocked: filtersActive
        ? 0
        : decimalToNumber(restockAgg._sum.qtyAdded ?? 0),
      earliestRestockDate: filtersActive
        ? null
        : restockAgg._min.restockDate,
      latestRestockDate: filtersActive
        ? null
        : restockAgg._max.restockDate,
    });
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
        include: { product: true },
        orderBy: [{ restockDate: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      items: items.map(serializeWarehouseRestock),
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
}
