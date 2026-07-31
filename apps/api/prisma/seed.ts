import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { seedDemoData } from './seed-demo-data';

const prisma = new PrismaClient();

/**
 * DEV / SANDBOX default profile only.
 * Do not use these credentials in production.
 * Existing profiles are never overwritten (manual edits are preserved),
 * except demo catalog fields refreshed on each seed run.
 */
const SANDBOX_PROFILE =
  process.env.SEED_PROFILE_NAME?.trim() || 'rifqi_tjahyono';
const SANDBOX_PASSWORD =
  process.env.SEED_PROFILE_PASSWORD?.trim() || '12041994';
const SANDBOX_EMAIL =
  process.env.SEED_PROFILE_EMAIL?.trim().toLowerCase() ||
  'rifqi.m.tjahjono@gmail.com';
const BCRYPT_ROUNDS = 12;

/**
 * Idempotent sandbox seed with comprehensive demo data for:
 * - Profile (identity, location, invoice & tax)
 * - Products (PCS / gram / liter, cost coverage, pack readiness, stock states)
 * - Customers (all pipeline enums, NPWP, promises, addresses)
 * - Orders (statuses, payment modes, bill/invoice, installments, multi-line, discounts)
 */
async function main() {
  let profile = await prisma.profile.findUnique({
    where: { profileName: SANDBOX_PROFILE },
  });
  let created = false;

  if (!profile) {
    const passwordHash = await bcrypt.hash(SANDBOX_PASSWORD, BCRYPT_ROUNDS);
    profile = await prisma.profile.create({
      data: {
        profileName: SANDBOX_PROFILE,
        email: SANDBOX_EMAIL,
        passwordHash,
      },
    });
    created = true;
    console.log(`Created sandbox profile: ${SANDBOX_PROFILE} <${SANDBOX_EMAIL}>`);
  } else if (process.env.SEED_RESET_PASSWORD === 'true') {
    const passwordHash = await bcrypt.hash(SANDBOX_PASSWORD, BCRYPT_ROUNDS);
    profile = await prisma.profile.update({
      where: { id: profile.id },
      data: { passwordHash },
    });
    console.log(
      `Reset sandbox password for existing profile: ${SANDBOX_PROFILE}`,
    );
  } else {
    console.log(
      `Sandbox profile already exists (password unchanged): ${SANDBOX_PROFILE}`,
    );
  }

  await seedDemoData(prisma, profile.id);

  console.log('Seed complete — demo data refreshed.');
  console.log(`  Profile: ${SANDBOX_PROFILE}`);
  console.log('  Products: 7 SKUs (PCS, gram, liter; in/out of stock; cost/pack variants)');
  console.log('  Customers: 5 contacts (restaurant, hotel, store pipeline mix)');
  console.log('  Orders: 8 orders (cash, consignment, delayed, multi-line, cancelled, discounts)');
  if (created) {
    console.log(`  Password: ${SANDBOX_PASSWORD} (sandbox default — change in production)`);
  } else {
    console.log('  Password: unchanged (set SEED_RESET_PASSWORD=true to reset)');
  }
}

main()
  .catch((err) => {
    console.error('Seed failed:', err instanceof Error ? err.message : err);
    if (err instanceof Error && err.stack) {
      console.error(err.stack);
    }
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
