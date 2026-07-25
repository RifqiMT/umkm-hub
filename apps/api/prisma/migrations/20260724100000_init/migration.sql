-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "CompanyType" AS ENUM ('RESTAURANT', 'HOTEL', 'STORE');
CREATE TYPE "PartnershipStage" AS ENUM ('WHATSAPP', 'EMAIL', 'DIRECT_VISIT');
CREATE TYPE "CustomerStatus" AS ENUM ('NOT_INTERESTED', 'DOUBTFUL', 'INTERESTED', 'OTHERS');
CREATE TYPE "RelationshipLevel" AS ENUM ('NEGOTIATION', 'REQUEST_SAMPLE', 'CLOSING_FIRST_ORDER', 'WILL_CONTACT', 'INITIAL_APPROACH');
CREATE TYPE "DiscountType" AS ENUM ('PERCENTAGE', 'AMOUNT');
CREATE TYPE "PaymentStatus" AS ENUM ('CASH', 'CONSIGNMENT', 'DELAYED_PAYMENT');

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "profileName" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "stockQty" DECIMAL(18,4) NOT NULL,
    "pricePerUnit" DECIMAL(18,4) NOT NULL,
    "details" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "companyName" TEXT NOT NULL,
    "companyType" "CompanyType" NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "partnershipStage" "PartnershipStage" NOT NULL,
    "status" "CustomerStatus" NOT NULL,
    "customerNeeds" TEXT NOT NULL DEFAULT '',
    "desiredStandards" TEXT NOT NULL DEFAULT '',
    "promiseAnnualBonus" BOOLEAN NOT NULL DEFAULT false,
    "promiseOnTimeDelivery" BOOLEAN NOT NULL DEFAULT false,
    "promisePackagingBox" BOOLEAN NOT NULL DEFAULT false,
    "relationshipLevel" "RelationshipLevel" NOT NULL,
    "approvalPercentage" INTEGER NOT NULL DEFAULT 0,
    "remarks" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productQty" DECIMAL(18,4) NOT NULL,
    "unitPriceSnapshot" DECIMAL(18,4) NOT NULL,
    "stockQtySnapshot" DECIMAL(18,4) NOT NULL,
    "lineTotal" DECIMAL(18,4) NOT NULL,
    "discountType" "DiscountType" NOT NULL,
    "discountValue" DECIMAL(18,4) NOT NULL,
    "totalOrderValue" DECIMAL(18,4) NOT NULL,
    "paymentStatus" "PaymentStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Profile_profileName_key" ON "Profile"("profileName");
CREATE INDEX "Product_profileId_idx" ON "Product"("profileId");
CREATE INDEX "Product_profileId_name_idx" ON "Product"("profileId", "name");
CREATE INDEX "Customer_profileId_idx" ON "Customer"("profileId");
CREATE INDEX "Customer_profileId_status_idx" ON "Customer"("profileId", "status");
CREATE INDEX "Customer_profileId_companyType_idx" ON "Customer"("profileId", "companyType");
CREATE INDEX "Customer_profileId_relationshipLevel_idx" ON "Customer"("profileId", "relationshipLevel");
CREATE INDEX "Order_profileId_idx" ON "Order"("profileId");
CREATE INDEX "Order_profileId_productId_idx" ON "Order"("profileId", "productId");
CREATE INDEX "Order_profileId_paymentStatus_idx" ON "Order"("profileId", "paymentStatus");

ALTER TABLE "Product" ADD CONSTRAINT "Product_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
