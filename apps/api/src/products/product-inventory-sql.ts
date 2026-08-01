import { ProductUnit, Prisma } from '@prisma/client';

export type ProductInventoryFilter = {
  profileId: string;
  search?: string;
  unit?: ProductUnit[];
  stockStatus?: Array<'in_stock' | 'out_of_stock'>;
  costSet?: Array<'set' | 'unset'>;
  packReady?: Array<'ready' | 'not_ready'>;
};

export type InventoryValueAgg = {
  sellValue: number;
  costedSellValue: number;
  costValue: number;
  profitValue: number;
  hasCost: boolean;
};

const PACK_READY_SQL = Prisma.sql`(
  p.unit = 'PCS'::"ProductUnit"
  OR p."price1" IS NOT NULL
  OR p."price5" IS NOT NULL
  OR p."price10" IS NOT NULL
  OR p."price25" IS NOT NULL
  OR p.price50 IS NOT NULL
  OR p.price100 IS NOT NULL
  OR p.price250 IS NOT NULL
  OR p.price500 IS NOT NULL
  OR p.price1000 IS NOT NULL
  OR p."priceCustom" IS NOT NULL
)`;

/**
 * SQL predicate for Product alias `p` matching ProductsService.buildProductWhere /
 * Warehouse summary product filters.
 */
export function buildProductFilterSql(
  filter: ProductInventoryFilter,
): Prisma.Sql {
  const parts: Prisma.Sql[] = [Prisma.sql`p."profileId" = ${filter.profileId}`];

  const search = filter.search?.trim() ?? '';
  if (search) {
    const pattern = `%${search}%`;
    parts.push(
      Prisma.sql`(p.name ILIKE ${pattern} OR p."productId" ILIKE ${pattern})`,
    );
  }

  const units = filter.unit ?? [];
  if (units.length > 0) {
    parts.push(
      Prisma.sql`p.unit IN (${Prisma.join(
        units.map((unit) => Prisma.sql`${unit}::"ProductUnit"`),
      )})`,
    );
  }

  const stockStatus = filter.stockStatus ?? [];
  if (stockStatus.length === 1) {
    parts.push(
      stockStatus[0] === 'in_stock'
        ? Prisma.sql`p."stockQty" > 0`
        : Prisma.sql`p."stockQty" <= 0`,
    );
  }

  const costSet = filter.costSet ?? [];
  if (costSet.length === 1) {
    parts.push(
      costSet[0] === 'set'
        ? Prisma.sql`p."costPerUnit" IS NOT NULL`
        : Prisma.sql`p."costPerUnit" IS NULL`,
    );
  } else if (costSet.length > 1 && !costSet.includes('set')) {
    parts.push(Prisma.sql`p."costPerUnit" IS NULL`);
  } else if (costSet.length > 1 && !costSet.includes('unset')) {
    parts.push(Prisma.sql`p."costPerUnit" IS NOT NULL`);
  }

  const packReady = filter.packReady ?? [];
  if (packReady.length === 1) {
    parts.push(
      packReady[0] === 'ready'
        ? PACK_READY_SQL
        : Prisma.sql`NOT ${PACK_READY_SQL}`,
    );
  }

  return Prisma.join(parts, ' AND ');
}

/** Matches product-pricing inventory helpers (4dp row rounding). */
export function inventoryValueSelectSql(): Prisma.Sql {
  return Prisma.sql`
    COALESCE(SUM(
      ROUND(GREATEST(p."stockQty", 0) * GREATEST(p."pricePerUnit", 0), 4)
    ), 0) AS "sellValue",
    COALESCE(SUM(
      CASE
        WHEN p."costPerUnit" IS NOT NULL
        THEN ROUND(GREATEST(p."stockQty", 0) * GREATEST(p."pricePerUnit", 0), 4)
        ELSE 0
      END
    ), 0) AS "costedSellValue",
    COALESCE(SUM(
      CASE
        WHEN p."costPerUnit" IS NOT NULL
        THEN ROUND(GREATEST(p."stockQty", 0) * GREATEST(p."costPerUnit", 0), 4)
        ELSE 0
      END
    ), 0) AS "costValue",
    COALESCE(SUM(
      CASE
        WHEN p."costPerUnit" IS NOT NULL
        THEN ROUND(
          GREATEST(p."stockQty", 0) * (p."pricePerUnit" - p."costPerUnit"),
          4
        )
        ELSE 0
      END
    ), 0) AS "profitValue",
    COALESCE(BOOL_OR(p."costPerUnit" IS NOT NULL), false) AS "hasCost"
  `;
}

export function mapInventoryValueRow(row: {
  sellValue: Prisma.Decimal | number | null;
  costedSellValue: Prisma.Decimal | number | null;
  costValue: Prisma.Decimal | number | null;
  profitValue: Prisma.Decimal | number | null;
  hasCost: boolean | null;
}): InventoryValueAgg {
  const num = (v: Prisma.Decimal | number | null | undefined) =>
    v == null ? 0 : Number(v);
  return {
    sellValue: num(row.sellValue),
    costedSellValue: num(row.costedSellValue),
    costValue: num(row.costValue),
    profitValue: num(row.profitValue),
    hasCost: Boolean(row.hasCost),
  };
}
