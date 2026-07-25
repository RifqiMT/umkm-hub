-- CreateEnum
CREATE TYPE "RevenueTargetMode" AS ENUM ('MANUAL', 'SYSTEMATIC');

-- CreateEnum
CREATE TYPE "RevenueTargetMonthSource" AS ENUM ('MANUAL', 'GENERATED');

-- CreateTable
CREATE TABLE "RevenueTargetPlan" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "monthlyMode" "RevenueTargetMode" NOT NULL DEFAULT 'MANUAL',
    "annualMode" "RevenueTargetMode" NOT NULL DEFAULT 'MANUAL',
    "baseMonthAmount" DECIMAL(18,4),
    "monthlyGrowthPercent" DECIMAL(18,4),
    "annualAmount" DECIMAL(18,4),
    "baseAnnualAmount" DECIMAL(18,4),
    "annualGrowthPercent" DECIMAL(18,4),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RevenueTargetPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RevenueTargetMonth" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "amount" DECIMAL(18,4) NOT NULL,
    "source" "RevenueTargetMonthSource" NOT NULL DEFAULT 'MANUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RevenueTargetMonth_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RevenueTargetPlan_profileId_idx" ON "RevenueTargetPlan"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "RevenueTargetPlan_profileId_year_key" ON "RevenueTargetPlan"("profileId", "year");

-- CreateIndex
CREATE INDEX "RevenueTargetMonth_planId_idx" ON "RevenueTargetMonth"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "RevenueTargetMonth_planId_month_key" ON "RevenueTargetMonth"("planId", "month");

-- AddForeignKey
ALTER TABLE "RevenueTargetPlan" ADD CONSTRAINT "RevenueTargetPlan_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevenueTargetMonth" ADD CONSTRAINT "RevenueTargetMonth_planId_fkey" FOREIGN KEY ("planId") REFERENCES "RevenueTargetPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
