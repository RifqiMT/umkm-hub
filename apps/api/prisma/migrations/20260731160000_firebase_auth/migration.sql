-- Firebase Auth: link profiles to Firebase UIDs; password optional for Firebase-only accounts.
ALTER TABLE "Profile" ADD COLUMN "firebaseUid" TEXT;
ALTER TABLE "Profile" ALTER COLUMN "passwordHash" DROP NOT NULL;
CREATE UNIQUE INDEX "Profile_firebaseUid_key" ON "Profile"("firebaseUid");
