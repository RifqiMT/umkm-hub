#!/usr/bin/env bash
# Verify the local / PoC development environment (not production).
# Usage: scripts/dev-check.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_URL="${LOCAL_API_URL:-http://localhost:3001/api/v1}"
WEB_URL="${LOCAL_WEB_URL:-http://localhost:3000}"

pass() { printf '  ✅ %s\n' "$1"; }
fail() { printf '  ❌ %s\n' "$1"; }
warn() { printf '  ⚠️  %s\n' "$1"; }

echo ""
echo "UMKM Hub — local development check"
echo "==================================="
echo ""

# 1. Env files
echo "1. Local env files"
if [[ -f "$ROOT/apps/api/.env" ]]; then
  pass "apps/api/.env exists"
else
  fail "apps/api/.env missing — run: npm run setup"
fi
if [[ -f "$ROOT/apps/web/.env.local" ]]; then
  pass "apps/web/.env.local exists"
else
  fail "apps/web/.env.local missing — run: npm run setup"
fi

echo ""
echo "2. Production URL guard"
if bash "$ROOT/scripts/guard-local-env.sh" --strict; then
  pass "Local env files use localhost (not production URLs)"
else
  fail "Local env may point at production — see docs/ENV-LOCAL.md"
fi

# 3. Postgres
echo ""
echo "3. Postgres (Docker or local)"
pg_ok=0
if command -v nc >/dev/null 2>&1 && nc -z 127.0.0.1 5432 >/dev/null 2>&1; then
  pg_ok=1
elif node -e "const n=require('net');const s=n.connect(5432,'127.0.0.1',()=>process.exit(0));s.on('error',()=>process.exit(1));setTimeout(()=>process.exit(1),2000);" >/dev/null 2>&1; then
  pg_ok=1
fi
if [[ "$pg_ok" -eq 1 ]]; then
  pass "Postgres reachable on localhost:5432"
else
  fail "Postgres not reachable — run: npm run db:up"
fi

# 4. Dependencies
echo ""
echo "4. Dependencies"
if [[ -d "$ROOT/apps/api/node_modules" ]]; then
  pass "apps/api node_modules installed"
else
  warn "apps/api node_modules missing — run: npm run sync"
fi
if [[ -d "$ROOT/apps/web/node_modules" ]]; then
  pass "apps/web node_modules installed"
else
  warn "apps/web node_modules missing — run: npm run sync"
fi

# 5. API (if running)
echo ""
echo "5. API dev server (optional — start with npm run api:dev)"
health=$(curl -s -m 3 "${API_URL}/health" 2>/dev/null || true)
if echo "$health" | grep -q '"status".*"ok"'; then
  pass "API healthy at ${API_URL}"
  config=$(curl -s -m 3 -X POST "${API_URL}/auth/config" 2>/dev/null || true)
  if echo "$config" | grep -q '"firebaseEnabled":true'; then
    warn "API has Firebase Admin enabled — OK for Firebase local testing; omit keys for JWT-only dev"
  else
    pass "API using JWT auth fallback (typical local setup)"
  fi
else
  warn "API not running yet — in another terminal: npm run api:dev"
fi

# 6. Web (if running)
echo ""
echo "6. Web dev server (optional — start with npm run web:dev)"
web_code=$(curl -s -o /dev/null -w "%{http_code}" -m 3 "${WEB_URL}/login" 2>/dev/null || echo "000")
if [[ "$web_code" == "200" ]]; then
  pass "Web app reachable at ${WEB_URL}"
else
  warn "Web not running yet — in another terminal: npm run web:dev"
fi

echo ""
echo "==================================="
echo "Local quick start:"
echo "  npm run setup          # first time"
echo "  npm run sync           # after every pull"
echo "  npm run api:dev        # terminal 1"
echo "  npm run web:dev        # terminal 2"
echo ""
echo "Docs: docs/ENV-LOCAL.md"
echo "Production check (separate): npm run setup:check"
echo ""
