-- Every profile must have a unique email bound to its profile name.
-- Backfill any missing emails with a deterministic local address (dev/legacy only).
UPDATE "Profile"
SET email = LOWER(REGEXP_REPLACE("profileName", '[^a-zA-Z0-9._-]', '', 'g')) || '@users.umkm-hub.local'
WHERE email IS NULL OR BTRIM(email) = '';

-- Normalize casing again after backfill.
UPDATE "Profile"
SET email = LOWER(email)
WHERE email <> LOWER(email);

ALTER TABLE "Profile" ALTER COLUMN "email" SET NOT NULL;

-- Full unique index on lower(email) now that nulls are gone.
DROP INDEX IF EXISTS "Profile_email_lower_key";
CREATE UNIQUE INDEX "Profile_email_lower_key" ON "Profile" (LOWER(email));
