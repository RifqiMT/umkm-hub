-- Migrate QTY → PCS, then rebuild ProductUnit enum without QTY.
-- Includes WarehouseRestock (created before this migration) and is idempotent
-- for Render retries after a partial failure.

UPDATE "Product" SET "unit" = 'PCS' WHERE "unit"::text = 'QTY';
UPDATE "Order" SET "unitSnapshot" = 'PCS' WHERE "unitSnapshot"::text = 'QTY';

DO $$ BEGIN
  IF to_regclass('"WarehouseRestock"') IS NOT NULL THEN
    UPDATE "WarehouseRestock"
    SET "unitSnapshot" = 'PCS'
    WHERE "unitSnapshot"::text = 'QTY';
  END IF;
END $$;

DO $$ BEGIN
  -- Finish a previous partial run (Product/Order already on ProductUnit_new).
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ProductUnit_new') THEN
    IF to_regclass('"WarehouseRestock"') IS NOT NULL THEN
      ALTER TABLE "WarehouseRestock" ALTER COLUMN "unitSnapshot" DROP DEFAULT;
      ALTER TABLE "WarehouseRestock"
        ALTER COLUMN "unitSnapshot" TYPE "ProductUnit_new"
        USING ("unitSnapshot"::text::"ProductUnit_new");
      ALTER TABLE "WarehouseRestock"
        ALTER COLUMN "unitSnapshot" SET DEFAULT 'PCS'::"ProductUnit_new";
    END IF;

    DROP TYPE IF EXISTS "ProductUnit";
    ALTER TYPE "ProductUnit_new" RENAME TO "ProductUnit";
    RETURN;
  END IF;

  -- Fresh run while QTY is still in the enum.
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'ProductUnit' AND e.enumlabel = 'QTY'
  ) THEN
    ALTER TABLE "Product" ALTER COLUMN "unit" DROP DEFAULT;
    ALTER TABLE "Order" ALTER COLUMN "unitSnapshot" DROP DEFAULT;

    IF to_regclass('"WarehouseRestock"') IS NOT NULL THEN
      ALTER TABLE "WarehouseRestock" ALTER COLUMN "unitSnapshot" DROP DEFAULT;
    END IF;

    CREATE TYPE "ProductUnit_new" AS ENUM ('PCS', 'GRAM', 'LITER');

    ALTER TABLE "Product"
      ALTER COLUMN "unit" TYPE "ProductUnit_new"
      USING ("unit"::text::"ProductUnit_new");

    ALTER TABLE "Order"
      ALTER COLUMN "unitSnapshot" TYPE "ProductUnit_new"
      USING ("unitSnapshot"::text::"ProductUnit_new");

    IF to_regclass('"WarehouseRestock"') IS NOT NULL THEN
      ALTER TABLE "WarehouseRestock"
        ALTER COLUMN "unitSnapshot" TYPE "ProductUnit_new"
        USING ("unitSnapshot"::text::"ProductUnit_new");
    END IF;

    ALTER TABLE "Product" ALTER COLUMN "unit" SET DEFAULT 'PCS'::"ProductUnit_new";
    ALTER TABLE "Order" ALTER COLUMN "unitSnapshot" SET DEFAULT 'PCS'::"ProductUnit_new";

    IF to_regclass('"WarehouseRestock"') IS NOT NULL THEN
      ALTER TABLE "WarehouseRestock"
        ALTER COLUMN "unitSnapshot" SET DEFAULT 'PCS'::"ProductUnit_new";
    END IF;

    DROP TYPE "ProductUnit";
    ALTER TYPE "ProductUnit_new" RENAME TO "ProductUnit";
  END IF;
END $$;
