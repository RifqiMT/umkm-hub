-- AlterTable
ALTER TABLE "Order"
ADD COLUMN "packSizeSnapshot" DECIMAL(18,4) NOT NULL DEFAULT 1,
ADD COLUMN "packPriceSnapshot" DECIMAL(18,4),
ADD COLUMN "packCount" DECIMAL(18,4) NOT NULL DEFAULT 1;

-- Backfill pack price from unit price × pack size for existing rows
UPDATE "Order"
SET "packPriceSnapshot" = "unitPriceSnapshot" * "packSizeSnapshot"
WHERE "packPriceSnapshot" IS NULL;

ALTER TABLE "Order"
ALTER COLUMN "packPriceSnapshot" SET NOT NULL;
