-- Invoice tracking + installments on orders (idempotent for partially applied DBs)
DO $$ BEGIN
  CREATE TYPE "InvoiceStatus" AS ENUM ('CREATED', 'SENT');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Order"
  ADD COLUMN IF NOT EXISTS "invoiceStatus" "InvoiceStatus" NOT NULL DEFAULT 'CREATED',
  ADD COLUMN IF NOT EXISTS "invoiceDate" DATE;

CREATE TABLE IF NOT EXISTS "OrderInstallment" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "amount" DECIMAL(18,4) NOT NULL,
  "installmentDate" DATE NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OrderInstallment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Order_profileId_invoiceStatus_idx" ON "Order"("profileId", "invoiceStatus");
CREATE INDEX IF NOT EXISTS "OrderInstallment_orderId_idx" ON "OrderInstallment"("orderId");
CREATE INDEX IF NOT EXISTS "OrderInstallment_orderId_installmentDate_idx" ON "OrderInstallment"("orderId", "installmentDate");

DO $$ BEGIN
  ALTER TABLE "OrderInstallment"
    ADD CONSTRAINT "OrderInstallment_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "Order"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
