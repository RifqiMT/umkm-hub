#!/usr/bin/env bash
# Reset LOCAL Postgres schema and reapply all migrations + seed.
# Wipes all local data. Never run against production.
#
# Usage: scripts/db-reset-local.sh [--no-seed]
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API="$ROOT/apps/api"
SEED=1
if [[ "${1:-}" == "--no-seed" ]]; then
  SEED=0
fi

if [[ -f "$API/.env" ]]; then
  db_url="$(grep -E '^DATABASE_URL=' "$API/.env" | tail -n1 | cut -d= -f2- | tr -d '"')"
  if echo "$db_url" | grep -qiE 'onrender\.com|amazonaws\.com|neon\.tech|supabase\.co'; then
    echo "ERROR: DATABASE_URL looks like production — aborting." >&2
    exit 1
  fi
fi

log() { printf '==> %s\n' "$*"; }

log "Resetting LOCAL database schema (all data will be lost)"

cd "$API"
npx prisma db execute --schema prisma/schema.prisma --stdin <<'SQL'
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO umkm;
GRANT ALL ON SCHEMA public TO public;
SQL

log "Applying migrations"
npm run prisma:deploy

if [[ "$SEED" -eq 1 ]]; then
  log "Seeding demo data"
  npm run prisma:seed
fi

log "Done. Restart the API: npm run api:dev"
echo "Demo login: rifqi_tjahyono / 12041994"
