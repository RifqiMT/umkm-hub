-- Optional payment due date for delayed-payment orders (SME collections).
ALTER TABLE "Order" ADD COLUMN "paymentDueDate" DATE;

CREATE INDEX "Order_profileId_paymentDueDate_idx" ON "Order"("profileId", "paymentDueDate");
