import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Prisma, ProductUnit } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import {
  ProductQueryDto,
  ProductSummaryQueryDto,
} from './dto/product-query.dto';
import { serializeProduct, decimalToNumber } from '../common/utils/serialize';
import { resolveCostPerUnit, resolvePricePerUnit } from './product-pricing';
import {
  buildProductSkuFromProduct,
} from './product-sku';
import { buildProductSummary } from './product-summary';
import {
  buildProductStatisticsFromCounts,
  emptyProductStatistics,
} from './product-statistics';
import { buildProductWhere } from './product-where';
import {
  buildProductFilterSql,
  inventoryValueSelectSql,
  mapInventoryValueRow,
} from './product-inventory-sql';
import {
  productStockSalesCountSql,
  productStockSalesPageSql,
} from './product-stock-sales-sql';
import {
  serializeProductStockSales,
  type ProductStockSalesSeed,
} from './product-stock-sales';
import { nullFixedPackFields, type PackCostFields, type PackPriceFields } from './pack-sizes';
import { Decimal } from '@prisma/client/runtime/library';

/** Lean list row — product notes load on GET /products/:id. */
const productListSelect = {
  id: true,
  profileId: true,
  name: true,
  productId: true,
  unit: true,
  stockQty: true,
  pricePerUnit: true,
  price1: true,
  price5: true,
  price10: true,
  price25: true,
  price50: true,
  price100: true,
  price250: true,
  price500: true,
  price1000: true,
  priceCustom: true,
  costPerUnit: true,
  cost1: true,
  cost5: true,
  cost10: true,
  cost25: true,
  cost50: true,
  cost100: true,
  cost250: true,
  cost500: true,
  cost1000: true,
  costCustom: true,
  customSize: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ProductSelect;

function nullPacks() {
  return {
    ...nullFixedPackFields(),
    priceCustom: null,
    costCustom: null,
    customSize: null,
  };
}

function optionalExisting(
  dtoValue: number | null | undefined,
  existing: Decimal | null,
): number | null {
  if (dtoValue !== undefined) return dtoValue;
  if (existing == null) return null;
  return decimalToNumber(existing);
}

type PricingSnapshot = {
  pricePerUnit: number;
  costPerUnit: number | null;
} & PackPriceFields &
  PackCostFields;

function pickPackPricing(input: PackPriceFields & PackCostFields & { pricePerUnit?: number | null; costPerUnit?: number | null; unit: ProductUnit }) {
  return {
    unit: input.unit,
    pricePerUnit: input.pricePerUnit,
    price1: input.price1 ?? null,
    price5: input.price5 ?? null,
    price10: input.price10 ?? null,
    price25: input.price25 ?? null,
    price50: input.price50 ?? null,
    price100: input.price100 ?? null,
    price250: input.price250 ?? null,
    price500: input.price500 ?? null,
    price1000: input.price1000 ?? null,
    priceCustom: input.priceCustom ?? null,
    customSize: input.customSize ?? null,
    costPerUnit: input.costPerUnit,
    cost1: input.cost1 ?? null,
    cost5: input.cost5 ?? null,
    cost10: input.cost10 ?? null,
    cost25: input.cost25 ?? null,
    cost50: input.cost50 ?? null,
    cost100: input.cost100 ?? null,
    cost250: input.cost250 ?? null,
    cost500: input.cost500 ?? null,
    cost1000: input.cost1000 ?? null,
    costCustom: input.costCustom ?? null,
  };
}

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(private readonly prisma: PrismaService) {}

  private buildPricingData(
    input: {
      unit: ProductUnit;
      pricePerUnit?: number | null;
      costPerUnit?: number | null;
    } & PackPriceFields &
      PackCostFields,
  ): PricingSnapshot {
    try {
      const packInput = pickPackPricing(input);
      const pricePerUnit = resolvePricePerUnit(packInput);
      const costPerUnit = resolveCostPerUnit(packInput);

      if (input.unit === ProductUnit.PCS) {
        return {
          pricePerUnit,
          costPerUnit,
          ...nullPacks(),
        };
      }

      const {
        unit: _unit,
        pricePerUnit: _resolvedPrice,
        costPerUnit: _resolvedCost,
        ...packFields
      } = packInput;
      return {
        pricePerUnit,
        costPerUnit,
        ...packFields,
      };
    } catch (err) {
      throw new BadRequestException(
        err instanceof Error ? err.message : 'Invalid product pricing',
      );
    }
  }

  private pricingInputFromProduct(product: {
    unit: ProductUnit;
    pricePerUnit: Decimal | number;
    price1: Decimal | number | null;
    price5: Decimal | number | null;
    price10: Decimal | number | null;
    price25: Decimal | number | null;
    price50: Decimal | number | null;
    price100: Decimal | number | null;
    price250: Decimal | number | null;
    price500: Decimal | number | null;
    price1000: Decimal | number | null;
    priceCustom: Decimal | number | null;
    costPerUnit: Decimal | number | null;
    cost1: Decimal | number | null;
    cost5: Decimal | number | null;
    cost10: Decimal | number | null;
    cost25: Decimal | number | null;
    cost50: Decimal | number | null;
    cost100: Decimal | number | null;
    cost250: Decimal | number | null;
    cost500: Decimal | number | null;
    cost1000: Decimal | number | null;
    costCustom: Decimal | number | null;
    customSize: Decimal | number | null;
  }): PricingSnapshot & { unit: ProductUnit } {
    const dec = (value: Decimal | number | null) =>
      value == null ? null : decimalToNumber(value);
    return {
      unit: product.unit,
      pricePerUnit: decimalToNumber(product.pricePerUnit),
      price1: dec(product.price1),
      price5: dec(product.price5),
      price10: dec(product.price10),
      price25: dec(product.price25),
      price50: dec(product.price50),
      price100: dec(product.price100),
      price250: dec(product.price250),
      price500: dec(product.price500),
      price1000: dec(product.price1000),
      priceCustom: dec(product.priceCustom),
      costPerUnit: dec(product.costPerUnit),
      cost1: dec(product.cost1),
      cost5: dec(product.cost5),
      cost10: dec(product.cost10),
      cost25: dec(product.cost25),
      cost50: dec(product.cost50),
      cost100: dec(product.cost100),
      cost250: dec(product.cost250),
      cost500: dec(product.cost500),
      cost1000: dec(product.cost1000),
      costCustom: dec(product.costCustom),
      customSize: dec(product.customSize),
    };
  }

  private skuFor(
    name: string,
    unit: ProductUnit,
    pricing: PricingSnapshot,
    productId: string,
  ) {
    return buildProductSkuFromProduct(
      name,
      { unit, ...pricing },
      productId,
    );
  }

  private skuNeedsRefresh(sku: string, productId: string) {
    return (
      !sku ||
      sku.startsWith('TMP_') ||
      !sku.endsWith(productId)
    );
  }

  /** Align skus to `{INITIALS}_{PACK}_{uuid}` (safe to call repeatedly). */
  async backfillMissingSkus(profileId?: string) {
    const products = await this.prisma.product.findMany({
      where: profileId ? { profileId } : undefined,
      orderBy: { createdAt: 'asc' },
    });
    let updated = 0;
    for (const product of products) {
      const pricing = this.pricingInputFromProduct(product);
      const { unit, ...packPricing } = pricing;
      const expected = this.skuFor(
        product.name,
        unit,
        packPricing,
        product.id,
      );
      if (product.productId === expected) continue;
      await this.prisma.product.update({
        where: { id: product.id },
        data: { productId: expected },
      });
      updated += 1;
    }
    if (updated > 0) {
      this.logger.log(`Product SKU backfill updated ${updated} rows`);
    }
    return { updated };
  }

  async create(profileId: string, dto: CreateProductDto) {
    const pricing = this.buildPricingData(dto);
    const id = randomUUID();
    const sku = this.skuFor(dto.name, dto.unit, pricing, id);
    const product = await this.prisma.product.create({
      data: {
        id,
        profileId,
        name: dto.name,
        productId: sku,
        unit: dto.unit,
        stockQty: dto.stockQty ?? 0,
        details: dto.details ?? '',
        ...pricing,
      },
    });
    this.logger.log(
      `Product created: ${product.id} productId=${sku} by ${profileId}`,
    );
    return serializeProduct(product);
  }

  async getSummary(profileId: string, query: ProductSummaryQueryDto = {}) {
    const where = buildProductWhere(profileId, query);
    const packReadyClause: Prisma.ProductWhereInput = {
      OR: [
        { unit: ProductUnit.PCS },
        { price50: { not: null } },
        { price100: { not: null } },
        { price250: { not: null } },
        { price500: { not: null } },
        { price1000: { not: null } },
        { priceCustom: { not: null } },
      ],
    };
    const and = (extra: Prisma.ProductWhereInput): Prisma.ProductWhereInput => ({
      AND: [where, extra],
    });

    const productFilterSql = buildProductFilterSql({
      profileId,
      search: query.search,
      unit: query.unit,
      stockStatus: query.stockStatus,
      costSet: query.costSet,
      packReady: query.packReady,
    });

    // Counts via Prisma; inventory value via SQL SUM(stock×price/cost).
    const [agg, inStockCount, withCostCount, packReadyCount, detailsWithCount, unitRows, valueRows] =
      await Promise.all([
        this.prisma.product.aggregate({
          where,
          _count: true,
          _sum: { stockQty: true },
        }),
        this.prisma.product.count({
          where: and({ stockQty: { gt: 0 } }),
        }),
        this.prisma.product.count({
          where: and({ costPerUnit: { not: null } }),
        }),
        this.prisma.product.count({
          where: and(packReadyClause),
        }),
        this.prisma.product.count({
          where: and({ NOT: { details: '' } }),
        }),
        this.prisma.product.groupBy({
          by: ['unit'],
          where,
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

    return {
      ...buildProductSummary({
        productCount: agg._count,
        totalStockQty: decimalToNumber(agg._sum.stockQty ?? 0),
        sellValue: values.sellValue,
        costedSellValue: values.costedSellValue,
        costValue: values.costValue,
        hasCost: values.hasCost,
        inStockCount,
        withCostCount,
        packReadyCount,
      }),
      statistics:
        agg._count === 0
          ? emptyProductStatistics()
          : buildProductStatisticsFromCounts({
              productCount: agg._count,
              inStockCount,
              withCostCount,
              packReadyCount,
              detailsWithCount,
              unitRows: unitRows.map((row) => ({
                key: row.unit,
                count: row._count,
              })),
            }),
    };
  }

  /**
   * Per-product stock vs sales metrics
   * (stocks, revenue / discount / cost / profit, STR / ITR / SSR / AOV / UPT).
   * Filter-aware with catalog Directory; includes SKUs with zero sales.
   */
  async findStockSales(profileId: string, query: ProductQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter = {
      profileId,
      search: query.search,
      unit: query.unit,
      stockStatus: query.stockStatus,
      costSet: query.costSet,
      packReady: query.packReady,
    };
    const offset = (page - 1) * limit;

    const [countRows, pageRows] = await Promise.all([
      this.prisma.$queryRaw<Array<{ total: number }>>(
        productStockSalesCountSql(filter),
      ),
      this.prisma.$queryRaw<ProductStockSalesSeed[]>(
        productStockSalesPageSql(filter, limit, offset),
      ),
    ]);

    const total = Number(countRows[0]?.total ?? 0);
    return {
      items: pageRows.map((row) => serializeProductStockSales(row)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async findAll(profileId: string, query: ProductQueryDto) {
    // SKU backfill is offline/CLI only — never on the list hot path.
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = buildProductWhere(profileId, query);

    const [total, items] = await this.prisma.$transaction([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        select: productListSelect,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      items: items.map((product) =>
        serializeProduct({ ...product, details: '' }),
      ),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  async findOne(profileId: string, id: string) {
    let product = await this.prisma.product.findFirst({
      where: { id, profileId },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    if (!product.productId || product.productId.startsWith('TMP_')) {
      await this.backfillMissingSkus(profileId);
      product = await this.prisma.product.findFirstOrThrow({
        where: { id, profileId },
      });
    }
    return serializeProduct(product);
  }

  async update(profileId: string, id: string, dto: UpdateProductDto) {
    const existing = await this.prisma.product.findFirst({
      where: { id, profileId },
    });
    if (!existing) {
      throw new NotFoundException('Product not found');
    }

    const unit = dto.unit ?? existing.unit;
    const name = dto.name ?? existing.name;
    const pricing = this.buildPricingData({
      unit,
      pricePerUnit:
        dto.pricePerUnit ?? decimalToNumber(existing.pricePerUnit),
      price50: optionalExisting(dto.price50, existing.price50),
      price100: optionalExisting(dto.price100, existing.price100),
      price250: optionalExisting(dto.price250, existing.price250),
      price500: optionalExisting(dto.price500, existing.price500),
      price1000: optionalExisting(dto.price1000, existing.price1000),
      priceCustom: optionalExisting(dto.priceCustom, existing.priceCustom),
      costPerUnit: optionalExisting(dto.costPerUnit, existing.costPerUnit),
      cost50: optionalExisting(dto.cost50, existing.cost50),
      cost100: optionalExisting(dto.cost100, existing.cost100),
      cost250: optionalExisting(dto.cost250, existing.cost250),
      cost500: optionalExisting(dto.cost500, existing.cost500),
      cost1000: optionalExisting(dto.cost1000, existing.cost1000),
      costCustom: optionalExisting(dto.costCustom, existing.costCustom),
      customSize: optionalExisting(dto.customSize, existing.customSize),
    });

    const nextSku = this.skuFor(name, unit, pricing, id);
    const shouldRefreshSku =
      existing.productId !== nextSku || this.skuNeedsRefresh(existing.productId, id);

    const sku = shouldRefreshSku ? nextSku : existing.productId;

    const product = await this.prisma.product.update({
      where: { id },
      data: {
        name,
        productId: sku,
        ...(dto.unit !== undefined ? { unit: dto.unit } : {}),
        ...(dto.details !== undefined ? { details: dto.details } : {}),
        ...pricing,
      },
    });
    this.logger.log(`Product updated: ${id} productId=${sku}`);
    return serializeProduct(product);
  }

  async remove(profileId: string, id: string) {
    await this.findOne(profileId, id);
    const orderCount = await this.prisma.orderLine.count({
      where: { productId: id, order: { profileId } },
    });
    if (orderCount > 0) {
      throw new ConflictException(
        'Cannot delete product that is used on existing orders',
      );
    }
    await this.prisma.product.delete({ where: { id } });
    this.logger.log(`Product deleted: ${id}`);
    return { deleted: true };
  }
}
