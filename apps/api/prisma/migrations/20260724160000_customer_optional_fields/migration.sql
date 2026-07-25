-- Make optional CRM fields nullable / defaulted; keep name, title, companyName, companyType required

ALTER TABLE "Customer" ALTER COLUMN "title" DROP DEFAULT;

ALTER TABLE "Customer" ALTER COLUMN "email" SET DEFAULT '';
ALTER TABLE "Customer" ALTER COLUMN "phone" SET DEFAULT '';

ALTER TABLE "Customer" ALTER COLUMN "partnershipStage" DROP NOT NULL;
ALTER TABLE "Customer" ALTER COLUMN "status" DROP NOT NULL;
ALTER TABLE "Customer" ALTER COLUMN "relationshipLevel" DROP NOT NULL;
