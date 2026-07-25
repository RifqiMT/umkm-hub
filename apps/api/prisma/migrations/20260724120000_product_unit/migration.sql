-- AlterEnum
CREATE TYPE "ProductUnit" AS ENUM ('QTY', 'PCS', 'GRAM', 'LITER');

-- AlterTable Product
ALTER TABLE "Product" ADD COLUMN "unit" "ProductUnit" NOT NULL DEFAULT 'QTY';
CREATE INDEX "Product_profileId_unit_idx" ON "Product"("profileId", "unit");

-- AlterTable Order
ALTER TABLE "Order" ADD COLUMN "unitSnapshot" "ProductUnit" NOT NULL DEFAULT 'QTY';
