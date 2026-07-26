-- CreateEnum
CREATE TYPE "LocationSource" AS ENUM ('MANUAL', 'IP');

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "lastName" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "locationCity" TEXT,
ADD COLUMN     "locationCountry" TEXT,
ADD COLUMN     "locationSource" "LocationSource";

-- CreateIndex
CREATE UNIQUE INDEX "Profile_email_key" ON "Profile"("email");
