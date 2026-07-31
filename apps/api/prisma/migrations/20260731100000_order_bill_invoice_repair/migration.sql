-- Idempotent repair for bill + expanded invoice status (safe on partially migrated DBs).

DO $$ BEGIN
  CREATE TYPE "BillStatus" AS ENUM ('CREATED', 'SENT');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Order"
  ADD COLUMN IF NOT EXISTS "billStatus" "BillStatus" NOT NULL DEFAULT 'CREATED',
  ADD COLUMN IF NOT EXISTS "billDate" DATE;

ALTER TYPE "InvoiceStatus" ADD VALUE IF NOT EXISTS 'PARTIALLY_PAID';
ALTER TYPE "InvoiceStatus" ADD VALUE IF NOT EXISTS 'FULLY_PAID';

UPDATE "Order"
SET "billDate" = "invoiceDate"
WHERE "billDate" IS NULL AND "invoiceDate" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "Order_profileId_billStatus_idx" ON "Order"("profileId", "billStatus");
CREATE INDEX IF NOT EXISTS "Order_profileId_billDate_idx" ON "Order"("profileId", "billDate");
