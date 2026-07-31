-- Split bill (document) from invoice (collection) on Order.
-- Existing invoiceStatus CREATED/SENT maps onto bill*.

CREATE TYPE "BillStatus" AS ENUM ('CREATED', 'SENT');

ALTER TABLE "Order"
  ADD COLUMN "billStatus" "BillStatus" NOT NULL DEFAULT 'CREATED',
  ADD COLUMN "billDate" DATE;

UPDATE "Order"
SET
  "billStatus" = CASE
    WHEN "invoiceStatus"::text = 'SENT' THEN 'SENT'::"BillStatus"
    ELSE 'CREATED'::"BillStatus"
  END,
  "billDate" = "invoiceDate";

-- Expand invoice enum (values used in the next migration after commit).
ALTER TYPE "InvoiceStatus" ADD VALUE 'PARTIALLY_PAID';
ALTER TYPE "InvoiceStatus" ADD VALUE 'FULLY_PAID';
