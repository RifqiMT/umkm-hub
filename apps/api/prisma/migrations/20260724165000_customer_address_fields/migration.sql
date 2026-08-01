-- AlterTable
ALTER TABLE "Customer"
ADD COLUMN "address" TEXT NOT NULL DEFAULT '',
ADD COLUMN "additionalAddress" TEXT NOT NULL DEFAULT '',
ADD COLUMN "postalCode" TEXT NOT NULL DEFAULT '',
ADD COLUMN "city" TEXT NOT NULL DEFAULT '',
ADD COLUMN "province" TEXT NOT NULL DEFAULT '',
ADD COLUMN "country" TEXT NOT NULL DEFAULT '';

CREATE INDEX "Customer_profileId_city_idx" ON "Customer"("profileId", "city");
CREATE INDEX "Customer_profileId_province_idx" ON "Customer"("profileId", "province");
CREATE INDEX "Customer_profileId_country_idx" ON "Customer"("profileId", "country");
