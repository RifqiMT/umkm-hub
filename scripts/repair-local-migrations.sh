#!/usr/bin/env bash
# Repair local Postgres when _prisma_migrations has old renamed migration names.
# Safe for local Docker/dev DB only — never run against production.
#
# Usage: scripts/repair-local-migrations.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API="$ROOT/apps/api"

if [[ -f "$API/.env" ]]; then
  db_url="$(grep -E '^DATABASE_URL=' "$API/.env" | tail -n1 | cut -d= -f2- | tr -d '"')"
  if echo "$db_url" | grep -qiE 'onrender\.com|amazonaws\.com|neon\.tech|supabase\.co'; then
    echo "ERROR: DATABASE_URL looks like production — aborting." >&2
    exit 1
  fi
fi

log() { printf '==> %s\n' "$*"; }

log "Repairing renamed migration records (local only)"

API_DIR="$API" node <<'NODE'
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const apiDir = process.env.API_DIR;
const migrationsDir = path.join(apiDir, 'prisma', 'migrations');

function checksumFor(name) {
  const sqlPath = path.join(migrationsDir, name, 'migration.sql');
  if (!fs.existsSync(sqlPath)) {
    throw new Error(`Missing migration file for ${name}`);
  }
  const content = fs.readFileSync(sqlPath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

const renames = [
  ['20260326120000_order_dates_status_fields', '20260724105000_order_dates_status_fields'],
  ['20260326140000_warehouse_restock', '20260724125000_warehouse_restock'],
  ['20260326160000_product_cost_fields', '20260724145000_product_cost_fields'],
  ['20260326130000_order_pack_selection', '20260724155000_order_pack_selection'],
  ['20260326150000_customer_address_fields', '20260724165000_customer_address_fields'],
  ['20260731100000_order_bill_invoice_repair', '20260731102000_order_bill_invoice_repair'],
];

const statements = [
  `DELETE FROM "_prisma_migrations"
   WHERE migration_name = '20260724105000_order_dates_status_fields'
     AND finished_at IS NULL;`,
];

for (const [from, to] of renames) {
  const checksum = checksumFor(to);
  statements.push(
    `UPDATE "_prisma_migrations"
     SET migration_name = '${to}', checksum = '${checksum}'
     WHERE migration_name = '${from}';`,
  );
}

const sql = statements.join('\n');
const sqlFile = path.join(apiDir, '.repair-migrations.sql');
fs.writeFileSync(sqlFile, sql);

try {
  execSync(`npx prisma db execute --schema prisma/schema.prisma --file "${sqlFile}"`, {
    cwd: apiDir,
    stdio: 'inherit',
  });
} finally {
  fs.unlinkSync(sqlFile);
}

console.log('Migration history repaired.');
NODE

log "Applying any remaining migrations"
npm --prefix "$API" run prisma:deploy

log "Done. Restart the API: npm run api:dev"
echo "If login still fails, reset local DB: npm run db:reset"
