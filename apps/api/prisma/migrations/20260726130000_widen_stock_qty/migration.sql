-- Widen stock columns so pack × packSize can store up to ~2e12 packs (e.g. ×1000).
ALTER TABLE "Product" ALTER COLUMN "stockQty" TYPE DECIMAL(28,4);
ALTER TABLE "Order" ALTER COLUMN "stockQtySnapshot" TYPE DECIMAL(28,4);
ALTER TABLE "OrderLine" ALTER COLUMN "stockQtySnapshot" TYPE DECIMAL(28,4);
ALTER TABLE "WarehouseRestock" ALTER COLUMN "qtyAdded" TYPE DECIMAL(28,4);
ALTER TABLE "WarehouseRestock" ALTER COLUMN "stockBefore" TYPE DECIMAL(28,4);
ALTER TABLE "WarehouseRestock" ALTER COLUMN "stockAfter" TYPE DECIMAL(28,4);
