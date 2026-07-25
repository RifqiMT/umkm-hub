-- Order human+system ID: YYYY_MM_DD_{uuid} e.g. 2026_07_25_<uuid>

ALTER TABLE "Order" ADD COLUMN "sku" TEXT NOT NULL DEFAULT '';

UPDATE "Order"
SET "sku" = 'TMP_' || REPLACE("id", '-', '') || '_'
WHERE "sku" = '' OR "sku" IS NULL;

CREATE UNIQUE INDEX "Order_profileId_sku_key" ON "Order"("profileId", "sku");
