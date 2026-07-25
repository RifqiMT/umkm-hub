-- Product human SKU: {INITIALS}_{PACK}_ e.g. CB_100_
-- Seed unique placeholders from UUID, then API/backfill rewrites to name+pack codes.

ALTER TABLE "Product" ADD COLUMN "sku" TEXT NOT NULL DEFAULT '';

UPDATE "Product"
SET "sku" = 'TMP_' || REPLACE("id", '-', '') || '_'
WHERE "sku" = '' OR "sku" IS NULL;

CREATE UNIQUE INDEX "Product_profileId_sku_key" ON "Product"("profileId", "sku");
