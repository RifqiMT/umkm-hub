#!/usr/bin/env bash
# Check PRODUCTION setup progress — plain English output.
# For local development, use: npm run dev:check
# Usage: scripts/setup-check.sh
set -euo pipefail

WEB_URL="${WEB_URL:-https://umkm-hub-web.vercel.app}"
API_URL="${API_URL:-https://umkm-hub-api.onrender.com/api/v1}"
FIREBASE_PROJECT="${FIREBASE_PROJECT:-umkm-hub-2b955}"

pass() { printf '  ✅ %s\n' "$1"; }
fail() { printf '  ❌ %s\n' "$1"; }
warn() { printf '  ⚠️  %s\n' "$1"; }

echo ""
echo "UMKM Hub — setup progress check"
echo "================================"
echo ""

# 1. Website
echo "1. Website (Vercel)"
code=$(curl -s -o /dev/null -w "%{http_code}" "${WEB_URL}/login" || echo "000")
if [[ "$code" == "200" ]]; then
  pass "Website is online: ${WEB_URL}"
else
  fail "Website not reachable (HTTP ${code}): ${WEB_URL}"
fi

# 2. API
echo ""
echo "2. Backend API (Render)"
health=$(curl -s -m 30 "${API_URL}/health" 2>/dev/null || true)
if echo "$health" | grep -q '"status".*"ok"'; then
  pass "API is healthy: ${API_URL}"
else
  fail "API not ready yet: ${API_URL}/health"
  warn "Do Part 3 in docs/SETUP-GUIDE-PLAIN-ENGLISH.md (Render Blueprint)"
fi

# 3. Firebase config endpoint
echo ""
echo "3. Firebase on API"
config=$(curl -s -m 30 -X POST "${API_URL}/auth/config" 2>/dev/null || true)
if echo "$config" | grep -q '"firebaseEnabled":true'; then
  pass "Firebase Admin is configured on the API"
elif echo "$config" | grep -q '"firebaseEnabled":false'; then
  warn "API runs but Firebase Admin not configured — add FIREBASE_SERVICE_ACCOUNT_JSON on Render"
else
  warn "Could not check Firebase (API may be down)"
fi

# 4. Vercel env (if CLI available)
echo ""
echo "4. Vercel environment variables"
WEB_DIR="$(cd "$(dirname "$0")/../apps/web" && pwd)"
if command -v npx >/dev/null 2>&1 && [[ -d "${WEB_DIR}/.vercel" ]]; then
  missing=0
  for key in \
    NEXT_PUBLIC_FIREBASE_API_KEY \
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID \
    NEXT_PUBLIC_FIREBASE_APP_ID; do
    if npx vercel env ls "$key" --scope rifqimtjahyono-3455s-projects 2>/dev/null | grep -q Production; then
      pass "${key} is set on Vercel"
    else
      fail "${key} is MISSING on Vercel — do Part 2 in the setup guide"
      missing=1
    fi
  done
  if [[ "$missing" -eq 0 ]]; then
    pass "All three Firebase client keys are on Vercel"
  fi
else
  warn "Run from a linked apps/web folder to check Vercel env, or check manually in the dashboard"
fi

# 5. Live site Firebase bootstrap
echo ""
echo "5. Firebase in the live website"
html=$(curl -s -m 20 "${WEB_URL}/login" 2>/dev/null || true)
if echo "$html" | grep -q "umkm-hub-2b955"; then
  pass "Firebase project id appears in the built site"
else
  warn "Could not confirm Firebase config in page (may still need redeploy after adding keys)"
fi

echo ""
echo "================================"
echo "Full step-by-step guide:"
echo "  docs/SETUP-GUIDE-PLAIN-ENGLISH.md"
echo ""
echo "Open all setup pages in browser:"
echo "  scripts/open-setup-links.sh"
echo ""
