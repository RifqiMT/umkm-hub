-- Widen revenue target money columns for large seeded actuals / targets.
ALTER TABLE "RevenueTargetPlan" ALTER COLUMN "baseMonthAmount" TYPE DECIMAL(28,4);
ALTER TABLE "RevenueTargetPlan" ALTER COLUMN "annualAmount" TYPE DECIMAL(28,4);
ALTER TABLE "RevenueTargetPlan" ALTER COLUMN "baseAnnualAmount" TYPE DECIMAL(28,4);
ALTER TABLE "RevenueTargetMonth" ALTER COLUMN "amount" TYPE DECIMAL(28,4);
