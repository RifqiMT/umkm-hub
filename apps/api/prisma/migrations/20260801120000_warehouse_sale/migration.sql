-- CreateTable
CREATE TABLE "WarehouseSale" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderLineId" TEXT NOT NULL,
    "qtySold" DECIMAL(28,4) NOT NULL,
    "soldDate" DATE NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "unitSnapshot" "ProductUnit" NOT NULL DEFAULT 'PCS',
    "packSizeSnapshot" DECIMAL(18,4) NOT NULL DEFAULT 1,
    "packCount" DECIMAL(18,4) NOT NULL DEFAULT 1,
    "stockBefore" DECIMAL(28,4) NOT NULL,
    "stockAfter" DECIMAL(28,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WarehouseSale_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WarehouseSale_orderLineId_key" ON "WarehouseSale"("orderLineId");

-- CreateIndex
CREATE INDEX "WarehouseSale_profileId_idx" ON "WarehouseSale"("profileId");

-- CreateIndex
CREATE INDEX "WarehouseSale_profileId_productId_idx" ON "WarehouseSale"("profileId", "productId");

-- CreateIndex
CREATE INDEX "WarehouseSale_profileId_soldDate_idx" ON "WarehouseSale"("profileId", "soldDate");

-- CreateIndex
CREATE INDEX "WarehouseSale_orderId_idx" ON "WarehouseSale"("orderId");

-- AddForeignKey
ALTER TABLE "WarehouseSale" ADD CONSTRAINT "WarehouseSale_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehouseSale" ADD CONSTRAINT "WarehouseSale_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehouseSale" ADD CONSTRAINT "WarehouseSale_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehouseSale" ADD CONSTRAINT "WarehouseSale_orderLineId_fkey" FOREIGN KEY ("orderLineId") REFERENCES "OrderLine"("id") ON DELETE CASCADE ON UPDATE CASCADE;
