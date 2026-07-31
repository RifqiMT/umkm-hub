-- Recompute invoice collection status from installments; index bill columns.

UPDATE "Order" o
SET "invoiceStatus" = CASE
  WHEN COALESCE(p.paid, 0) <= 0 AND o."billStatus" = 'SENT' THEN 'SENT'::"InvoiceStatus"
  WHEN COALESCE(p.paid, 0) <= 0 THEN 'CREATED'::"InvoiceStatus"
  WHEN COALESCE(p.paid, 0) + 0.00005 >= o."totalOrderValue" THEN 'FULLY_PAID'::"InvoiceStatus"
  ELSE 'PARTIALLY_PAID'::"InvoiceStatus"
END
FROM (
  SELECT "orderId", SUM(amount)::numeric AS paid
  FROM "OrderInstallment"
  GROUP BY "orderId"
) p
WHERE p."orderId" = o.id;

-- Orders with no installment rows stay CREATED, or SENT when bill is SENT.
UPDATE "Order" o
SET "invoiceStatus" = CASE
  WHEN o."billStatus" = 'SENT' THEN 'SENT'::"InvoiceStatus"
  ELSE 'CREATED'::"InvoiceStatus"
END
WHERE NOT EXISTS (
  SELECT 1 FROM "OrderInstallment" i WHERE i."orderId" = o.id
)
AND o."invoiceStatus"::text IN ('CREATED', 'SENT');

CREATE INDEX "Order_profileId_billStatus_idx" ON "Order"("profileId", "billStatus");
CREATE INDEX "Order_profileId_billDate_idx" ON "Order"("profileId", "billDate");
