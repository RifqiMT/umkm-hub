-- Hot-path indexes for list sort + analytics / date filters (Phase 2 perf).
CREATE INDEX IF NOT EXISTS "Product_profileId_updatedAt_idx" ON "Product"("profileId", "updatedAt");
CREATE INDEX IF NOT EXISTS "Product_profileId_stockQty_idx" ON "Product"("profileId", "stockQty");
CREATE INDEX IF NOT EXISTS "Customer_profileId_updatedAt_idx" ON "Customer"("profileId", "updatedAt");
CREATE INDEX IF NOT EXISTS "Order_profileId_orderDate_status_idx" ON "Order"("profileId", "orderDate", "status");
CREATE INDEX IF NOT EXISTS "Order_profileId_updatedAt_idx" ON "Order"("profileId", "updatedAt");
CREATE INDEX IF NOT EXISTS "Order_profileId_shipmentDate_idx" ON "Order"("profileId", "shipmentDate");
CREATE INDEX IF NOT EXISTS "Order_profileId_invoiceDate_idx" ON "Order"("profileId", "invoiceDate");
