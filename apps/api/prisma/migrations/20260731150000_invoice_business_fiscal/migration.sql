-- Business & fiscal fields for PDF invoices and e-Faktur prep (UMKM / SME).

ALTER TABLE "Profile" ADD COLUMN "businessName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Profile" ADD COLUMN "businessPhone" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Profile" ADD COLUMN "businessAddress" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Profile" ADD COLUMN "npwp" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Profile" ADD COLUMN "isPkp" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Profile" ADD COLUMN "defaultPpnPercent" DECIMAL(5,2) NOT NULL DEFAULT 11;
ALTER TABLE "Profile" ADD COLUMN "taxInclusive" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Profile" ADD COLUMN "invoicePrefix" TEXT NOT NULL DEFAULT '';

ALTER TABLE "Customer" ADD COLUMN "npwp" TEXT NOT NULL DEFAULT '';

ALTER TABLE "Order" ADD COLUMN "fiscalInvoiceNumber" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Order" ADD COLUMN "includePpn" BOOLEAN;
