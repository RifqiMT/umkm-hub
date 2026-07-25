-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Order"
ADD COLUMN "orderDate" DATE NOT NULL DEFAULT CURRENT_DATE,
ADD COLUMN "shipmentDate" DATE,
ADD COLUMN "status" "OrderStatus" NOT NULL DEFAULT 'PENDING';

CREATE INDEX "Order_profileId_status_idx" ON "Order"("profileId", "status");
CREATE INDEX "Order_profileId_orderDate_idx" ON "Order"("profileId", "orderDate");
