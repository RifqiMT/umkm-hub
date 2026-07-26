-- Normalize emails to lowercase (app already stores lowercased going forward).
UPDATE "Profile"
SET email = LOWER(email)
WHERE email IS NOT NULL AND email <> LOWER(email);

-- Case-insensitive uniqueness for sign-in identity and email.
-- Keeps existing Prisma @unique indexes; these block Foo vs foo / A@x.com vs a@x.com.
CREATE UNIQUE INDEX "Profile_profileName_lower_key"
ON "Profile" (LOWER("profileName"));

CREATE UNIQUE INDEX "Profile_email_lower_key"
ON "Profile" (LOWER(email))
WHERE email IS NOT NULL;
