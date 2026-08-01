-- CreateTable
CREATE TABLE "WarehouseRestock" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "qtyAdded" DECIMAL(18,4) NOT NULL,
    "restockDate" DATE NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "unitSnapshot" "ProductUnit" NOT NULL DEFAULT 'PCS',
    "stockBefore" DECIMAL(18,4) NOT NULL,
    "stockAfter" DECIMAL(18,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WarehouseRestock_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WarehouseRestock_profileId_idx" ON "WarehouseRestock"("profileId");
CREATE INDEX "WarehouseRestock_profileId_productId_idx" ON "WarehouseRestock"("profileId", "productId");
CREATE INDEX "WarehouseRestock_profileId_restockDate_idx" ON "WarehouseRestock"("profileId", "restockDate");

ALTER TABLE "WarehouseRestock" ADD CONSTRAINT "WarehouseRestock_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WarehouseRestock" ADD CONSTRAINT "WarehouseRestock_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
