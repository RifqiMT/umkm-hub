-- Rename human-readable sku columns to entity-specific business IDs.

ALTER TABLE "Product" RENAME COLUMN "sku" TO "productId";

ALTER TABLE "Customer" RENAME COLUMN "sku" TO "customerId";

ALTER TABLE "Order" RENAME COLUMN "sku" TO "orderId";

-- Prisma unique constraint names follow table/column; rename for clarity.
ALTER INDEX IF EXISTS "Product_profileId_sku_key" RENAME TO "Product_profileId_productId_key";
ALTER INDEX IF EXISTS "Customer_profileId_sku_key" RENAME TO "Customer_profileId_customerId_key";
ALTER INDEX IF EXISTS "Order_profileId_sku_key" RENAME TO "Order_profileId_orderId_key";
