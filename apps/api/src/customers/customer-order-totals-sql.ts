import {
  CompanyType,
  CustomerStatus,
  PartnershipStage,
  Prisma,
  RelationshipLevel,
} from '@prisma/client';

export type CustomerOrderTotalsFilter = {
  profileId: string;
  search?: string;
  status?: CustomerStatus[];
  companyType?: CompanyType[];
  relationshipLevel?: RelationshipLevel[];
  partnershipStage?: PartnershipStage[];
};

/** WHERE fragments for the Customer alias `c`. */
function buildCustomerOrderTotalsCustomerWhere(
  filter: CustomerOrderTotalsFilter,
): Prisma.Sql {
  const parts: Prisma.Sql[] = [
    Prisma.sql`c."profileId" = ${filter.profileId}`,
  ];

  if (filter.status && filter.status.length > 0) {
    parts.push(
      Prisma.sql`c.status IN (${Prisma.join(
        filter.status.map((status) => Prisma.sql`${status}::"CustomerStatus"`),
      )})`,
    );
  }
  if (filter.companyType && filter.companyType.length > 0) {
    parts.push(
      Prisma.sql`c."companyType" IN (${Prisma.join(
        filter.companyType.map(
          (type) => Prisma.sql`${type}::"CompanyType"`,
        ),
      )})`,
    );
  }
  if (filter.relationshipLevel && filter.relationshipLevel.length > 0) {
    parts.push(
      Prisma.sql`c."relationshipLevel" IN (${Prisma.join(
        filter.relationshipLevel.map(
          (level) => Prisma.sql`${level}::"RelationshipLevel"`,
        ),
      )})`,
    );
  }
  if (filter.partnershipStage && filter.partnershipStage.length > 0) {
    parts.push(
      Prisma.sql`c."partnershipStage" IN (${Prisma.join(
        filter.partnershipStage.map(
          (stage) => Prisma.sql`${stage}::"PartnershipStage"`,
        ),
      )})`,
    );
  }

  const search = filter.search?.trim();
  if (search) {
    const pattern = `%${search}%`;
    parts.push(
      Prisma.sql`(
        c.name ILIKE ${pattern}
        OR c."companyName" ILIKE ${pattern}
        OR c.email ILIKE ${pattern}
        OR c.city ILIKE ${pattern}
        OR c.province ILIKE ${pattern}
        OR c.country ILIKE ${pattern}
        OR c."postalCode" ILIKE ${pattern}
        OR c."customerId" ILIKE ${pattern}
      )`,
    );
  }

  return Prisma.join(parts, ' AND ');
}

/**
 * Customers with ≥1 linked order (any status). Money/packs come from
 * non-cancelled only; cancelledCount is tracked separately.
 */
export function customerOrderTotalsCountSql(
  filter: CustomerOrderTotalsFilter,
): Prisma.Sql {
  const customerWhere = buildCustomerOrderTotalsCustomerWhere(filter);
  return Prisma.sql`
    SELECT COUNT(*)::int AS total
    FROM (
      SELECT o."customerId"
      FROM "Order" o
      INNER JOIN "Customer" c ON c.id = o."customerId"
      WHERE ${customerWhere}
        AND o."profileId" = ${filter.profileId}
        AND o."customerId" IS NOT NULL
      GROUP BY o."customerId"
    ) grouped
  `;
}

export function customerOrderTotalsPageSql(
  filter: CustomerOrderTotalsFilter,
  limit: number,
  offset: number,
): Prisma.Sql {
  const customerWhere = buildCustomerOrderTotalsCustomerWhere(filter);
  return Prisma.sql`
    WITH filtered_customers AS (
      SELECT
        c.id,
        c."customerId" AS "customerCode",
        c.name,
        c.title,
        c."companyName",
        c."companyType"::text AS "companyType",
        c.email,
        c.phone
      FROM "Customer" c
      WHERE ${customerWhere}
    ),
    order_stats AS (
      SELECT
        o."customerId",
        COUNT(*) FILTER (
          WHERE o.status <> 'CANCELLED'::"OrderStatus"
        )::int AS "orderCount",
        COUNT(*) FILTER (
          WHERE o.status = 'CANCELLED'::"OrderStatus"
        )::int AS "cancelledCount",
        COALESCE(
          SUM(o."lineTotal") FILTER (
            WHERE o.status <> 'CANCELLED'::"OrderStatus"
          ),
          0
        )::float8 AS totals,
        COALESCE(
          SUM(
            GREATEST(o."lineTotal" - o."totalOrderValue", 0)
          ) FILTER (
            WHERE o.status <> 'CANCELLED'::"OrderStatus"
          ),
          0
        )::float8 AS discount,
        COALESCE(
          SUM(o."totalOrderValue") FILTER (
            WHERE o.status <> 'CANCELLED'::"OrderStatus"
          ),
          0
        )::float8 AS "orderTotal"
      FROM "Order" o
      INNER JOIN filtered_customers fc ON fc.id = o."customerId"
      WHERE o."profileId" = ${filter.profileId}
        AND o."customerId" IS NOT NULL
      GROUP BY o."customerId"
    ),
    pack_stats AS (
      SELECT
        o."customerId",
        COALESCE(SUM(ol."packCount"), 0)::float8 AS "packsSold"
      FROM "Order" o
      INNER JOIN "OrderLine" ol ON ol."orderId" = o.id
      INNER JOIN filtered_customers fc ON fc.id = o."customerId"
      WHERE o."profileId" = ${filter.profileId}
        AND o.status <> 'CANCELLED'::"OrderStatus"
        AND o."customerId" IS NOT NULL
      GROUP BY o."customerId"
    )
    SELECT
      fc.id AS "customerId",
      fc."customerCode",
      fc.name,
      fc.title,
      fc."companyName",
      fc."companyType",
      fc.email,
      fc.phone,
      os.totals,
      os.discount,
      os."orderTotal",
      os."orderCount",
      os."cancelledCount",
      COALESCE(ps."packsSold", 0)::float8 AS "packsSold"
    FROM order_stats os
    INNER JOIN filtered_customers fc ON fc.id = os."customerId"
    LEFT JOIN pack_stats ps ON ps."customerId" = os."customerId"
    ORDER BY os."orderTotal" DESC, fc.name ASC
    LIMIT ${limit}
    OFFSET ${offset}
  `;
}
