-- Customer human+system ID: {NameSegments}{CompanyType}_{uuid} e.g. BuSaR_<uuid>

ALTER TABLE "Customer" ADD COLUMN "sku" TEXT NOT NULL DEFAULT '';

UPDATE "Customer"
SET "sku" = 'TMP_' || REPLACE("id", '-', '') || '_'
WHERE "sku" = '' OR "sku" IS NULL;

CREATE UNIQUE INDEX "Customer_profileId_sku_key" ON "Customer"("profileId", "sku");
