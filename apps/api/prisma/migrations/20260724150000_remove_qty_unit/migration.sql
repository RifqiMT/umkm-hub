-- Migrate QTY → PCS, then rebuild ProductUnit enum without QTY

UPDATE "Product" SET "unit" = 'PCS' WHERE "unit" = 'QTY';
UPDATE "Order" SET "unitSnapshot" = 'PCS' WHERE "unitSnapshot" = 'QTY';

ALTER TABLE "Product" ALTER COLUMN "unit" DROP DEFAULT;
ALTER TABLE "Order" ALTER COLUMN "unitSnapshot" DROP DEFAULT;

CREATE TYPE "ProductUnit_new" AS ENUM ('PCS', 'GRAM', 'LITER');

ALTER TABLE "Product"
  ALTER COLUMN "unit" TYPE "ProductUnit_new"
  USING ("unit"::text::"ProductUnit_new");

ALTER TABLE "Order"
  ALTER COLUMN "unitSnapshot" TYPE "ProductUnit_new"
  USING ("unitSnapshot"::text::"ProductUnit_new");

ALTER TABLE "Product" ALTER COLUMN "unit" SET DEFAULT 'PCS'::"ProductUnit_new";
ALTER TABLE "Order" ALTER COLUMN "unitSnapshot" SET DEFAULT 'PCS'::"ProductUnit_new";

DROP TYPE "ProductUnit";
ALTER TYPE "ProductUnit_new" RENAME TO "ProductUnit";
