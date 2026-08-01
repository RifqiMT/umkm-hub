import { Prisma } from '@prisma/client';
import {
  buildProductFilterSql,
  type ProductInventoryFilter,
} from './product-inventory-sql';

export function productStockSalesCountSql(
  filter: ProductInventoryFilter,
): Prisma.Sql {
  const productWhere = buildProductFilterSql(filter);
  return Prisma.sql`
    SELECT COUNT(*)::int AS total
    FROM "Product" p
    WHERE ${productWhere}
  `;
}

export function productStockSalesPageSql(
  filter: ProductInventoryFilter,
  limit: number,
  offset: number,
): Prisma.Sql {
  const productWhere = buildProductFilterSql(filter);
  return Prisma.sql`
    WITH filtered AS (
      SELECT
        p.id,
        p."productId" AS "productCode",
        p.name,
        p.unit::text AS unit,
        GREATEST(p."stockQty", 0)::float8 AS "currentStocks",
        p."costPerUnit"::float8 AS "costPerUnit"
      FROM "Product" p
      WHERE ${productWhere}
    ),
    sales AS (
      SELECT
        ol."productId",
        COUNT(DISTINCT o.id)::int AS "orderCount",
        COALESCE(SUM(ol."productQty"), 0)::float8 AS "soldStocks",
        COALESCE(SUM(ol."packCount"), 0)::float8 AS "packsSold",
        -- Discount-allocated net revenue (same share rule as allocateLineRevenue).
        COALESCE(
          SUM(
            CASE
              WHEN o."lineTotal" > 0 THEN
                ol."lineTotal" * (o."totalOrderValue" / o."lineTotal")
              ELSE 0::float8
            END
          ),
          0
        )::float8 AS revenue,
        -- Allocated order discount share for this product’s lines.
        COALESCE(
          SUM(
            CASE
              WHEN o."lineTotal" > 0 THEN
                ol."lineTotal" * (
                  GREATEST(o."lineTotal" - o."totalOrderValue", 0) / o."lineTotal"
                )
              ELSE 0::float8
            END
          ),
          0
        )::float8 AS discount
      FROM "OrderLine" ol
      INNER JOIN "Order" o ON o.id = ol."orderId"
      INNER JOIN filtered f ON f.id = ol."productId"
      WHERE o."profileId" = ${filter.profileId}
        AND o.status <> 'CANCELLED'::"OrderStatus"
      GROUP BY ol."productId"
    )
    SELECT
      f.id AS "productUuid",
      f."productCode",
      f.name,
      f.unit,
      f."currentStocks",
      f."costPerUnit",
      COALESCE(s."soldStocks", 0)::float8 AS "soldStocks",
      COALESCE(s."orderCount", 0)::int AS "orderCount",
      COALESCE(s."packsSold", 0)::float8 AS "packsSold",
      COALESCE(s.revenue, 0)::float8 AS revenue,
      COALESCE(s.discount, 0)::float8 AS discount
    FROM filtered f
    LEFT JOIN sales s ON s."productId" = f.id
    ORDER BY COALESCE(s."soldStocks", 0) DESC, f.name ASC
    LIMIT ${limit}
    OFFSET ${offset}
  `;
}
