import { OrderStatus, PaymentStatus, Prisma } from '@prisma/client';
import { dateOnlyBounds } from './order-date-range';

export type OrderFilterQuery = {
  search?: string;
  status?: OrderStatus[];
  paymentStatus?: PaymentStatus[];
  orderDateFrom?: string;
  orderDateTo?: string;
  shipmentDateFrom?: string;
  shipmentDateTo?: string;
  invoiceDateFrom?: string;
  invoiceDateTo?: string;
};

/**
 * SQL predicate for Order alias `o` matching buildOrderFilterWhere.
 * Keeps summary aggregates filter-scoped without exploding IN (...) binds.
 */
export function buildOrderFilterSql(
  profileId: string,
  query: OrderFilterQuery,
): Prisma.Sql {
  const parts: Prisma.Sql[] = [Prisma.sql`o."profileId" = ${profileId}`];

  const statuses = query.status ?? [];
  if (statuses.length > 0) {
    parts.push(
      Prisma.sql`o.status IN (${Prisma.join(
        statuses.map((status) => Prisma.sql`${status}::"OrderStatus"`),
      )})`,
    );
  }

  const paymentStatuses = query.paymentStatus ?? [];
  if (paymentStatuses.length > 0) {
    parts.push(
      Prisma.sql`o."paymentStatus" IN (${Prisma.join(
        paymentStatuses.map(
          (status) => Prisma.sql`${status}::"PaymentStatus"`,
        ),
      )})`,
    );
  }

  const orderDate = dateOnlyBounds(query.orderDateFrom, query.orderDateTo);
  if (orderDate?.gte) {
    parts.push(Prisma.sql`o."orderDate" >= ${orderDate.gte}`);
  }
  if (orderDate?.lte) {
    parts.push(Prisma.sql`o."orderDate" <= ${orderDate.lte}`);
  }

  const shipmentDate = dateOnlyBounds(
    query.shipmentDateFrom,
    query.shipmentDateTo,
  );
  if (shipmentDate?.gte) {
    parts.push(Prisma.sql`o."shipmentDate" >= ${shipmentDate.gte}`);
  }
  if (shipmentDate?.lte) {
    parts.push(Prisma.sql`o."shipmentDate" <= ${shipmentDate.lte}`);
  }

  const invoiceDate = dateOnlyBounds(
    query.invoiceDateFrom,
    query.invoiceDateTo,
  );
  if (invoiceDate?.gte) {
    parts.push(Prisma.sql`o."invoiceDate" >= ${invoiceDate.gte}`);
  }
  if (invoiceDate?.lte) {
    parts.push(Prisma.sql`o."invoiceDate" <= ${invoiceDate.lte}`);
  }

  const search = query.search?.trim() ?? '';
  if (search) {
    const pattern = `%${search}%`;
    const searchParts: Prisma.Sql[] = [
      Prisma.sql`o.sku ILIKE ${pattern}`,
      Prisma.sql`EXISTS (
        SELECT 1 FROM "Product" p
        WHERE p.id = o."productId"
          AND (p.name ILIKE ${pattern} OR p.sku ILIKE ${pattern})
      )`,
      Prisma.sql`EXISTS (
        SELECT 1 FROM "Customer" c
        WHERE c.id = o."customerId"
          AND c.name ILIKE ${pattern}
      )`,
      Prisma.sql`EXISTS (
        SELECT 1
        FROM "OrderLine" ol
        INNER JOIN "Product" lp ON lp.id = ol."productId"
        WHERE ol."orderId" = o.id
          AND lp.name ILIKE ${pattern}
      )`,
    ];
    const statusKey = search.toUpperCase();
    if (Object.values(OrderStatus).includes(statusKey as OrderStatus)) {
      searchParts.push(
        Prisma.sql`o.status = ${statusKey}::"OrderStatus"`,
      );
    }
    if (Object.values(PaymentStatus).includes(statusKey as PaymentStatus)) {
      searchParts.push(
        Prisma.sql`o."paymentStatus" = ${statusKey}::"PaymentStatus"`,
      );
    }
    parts.push(Prisma.sql`(${Prisma.join(searchParts, ' OR ')})`);
  }

  return Prisma.join(parts, ' AND ');
}
