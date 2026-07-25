-- Multi-product orders: OrderLine + backfill from existing single-product orders.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE "OrderLine" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "productQty" DECIMAL(18,4) NOT NULL,
    "packSizeSnapshot" DECIMAL(18,4) NOT NULL DEFAULT 1,
    "packPriceSnapshot" DECIMAL(18,4) NOT NULL,
    "packCount" DECIMAL(18,4) NOT NULL DEFAULT 1,
    "unitSnapshot" "ProductUnit" NOT NULL DEFAULT 'PCS',
    "unitPriceSnapshot" DECIMAL(18,4) NOT NULL,
    "stockQtySnapshot" DECIMAL(18,4) NOT NULL,
    "lineTotal" DECIMAL(18,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderLine_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OrderLine_orderId_idx" ON "OrderLine"("orderId");
CREATE INDEX "OrderLine_productId_idx" ON "OrderLine"("productId");
CREATE INDEX "OrderLine_orderId_sortOrder_idx" ON "OrderLine"("orderId", "sortOrder");

ALTER TABLE "OrderLine" ADD CONSTRAINT "OrderLine_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrderLine" ADD CONSTRAINT "OrderLine_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- One line per existing order (1:1 backfill).
INSERT INTO "OrderLine" (
  "id",
  "orderId",
  "productId",
  "sortOrder",
  "productQty",
  "packSizeSnapshot",
  "packPriceSnapshot",
  "packCount",
  "unitSnapshot",
  "unitPriceSnapshot",
  "stockQtySnapshot",
  "lineTotal",
  "createdAt",
  "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  o."id",
  o."productId",
  0,
  o."productQty",
  o."packSizeSnapshot",
  o."packPriceSnapshot",
  o."packCount",
  o."unitSnapshot",
  o."unitPriceSnapshot",
  o."stockQtySnapshot",
  o."lineTotal",
  o."createdAt",
  o."updatedAt"
FROM "Order" o;
