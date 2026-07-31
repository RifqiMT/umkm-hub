import { ProductUnit, Prisma } from '@prisma/client';
import type { ProductQueryDto } from './dto/product-query.dto';

export type ProductListFilter = Pick<
  ProductQueryDto,
  'search' | 'unit' | 'costSet' | 'packReady' | 'stockStatus'
>;

export function buildProductWhere(
  profileId: string,
  query: ProductListFilter = {},
): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = { profileId };
  const search = query.search?.trim();
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { productId: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (query.unit && query.unit.length > 0) {
    where.unit = { in: query.unit };
  }

  const costSet = query.costSet ?? [];
  if (costSet.length === 1) {
    where.costPerUnit = costSet[0] === 'set' ? { not: null } : null;
  } else if (costSet.length > 1 && !costSet.includes('set')) {
    where.costPerUnit = null;
  } else if (costSet.length > 1 && !costSet.includes('unset')) {
    where.costPerUnit = { not: null };
  }

  const packReady = query.packReady ?? [];
  if (packReady.length === 1) {
    const readyClause: Prisma.ProductWhereInput = {
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
    where.AND = [
      ...(Array.isArray(where.AND)
        ? where.AND
        : where.AND
          ? [where.AND]
          : []),
      packReady[0] === 'ready' ? readyClause : { NOT: readyClause },
    ];
  }

  const stockStatus = query.stockStatus ?? [];
  if (stockStatus.length === 1) {
    where.stockQty =
      stockStatus[0] === 'in_stock' ? { gt: 0 } : { lte: 0 };
  }

  return where;
}
