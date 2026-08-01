#!/usr/bin/env bash
# Deploy UMKM Hub web to Vercel (team: rifqimtjahyono-3455s-projects).
# Requires: npm, Vercel login (npx vercel login)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WEB="$ROOT/apps/web"

echo "==> UMKM Hub — Vercel deploy (apps/web)"
echo "    Team: https://vercel.com/rifqimtjahyono-3455s-projects"
echo "    Firebase: umkm-hub-2b955"
echo ""

if [[ ! -f "$WEB/.env.local" ]] && [[ -z "${NEXT_PUBLIC_FIREBASE_API_KEY:-}" ]]; then
  echo "WARN: No apps/web/.env.local — set env vars in Vercel dashboard before prod deploy."
  echo "      Run: scripts/print-production-env.sh"
  echo ""
fi

cd "$WEB"

if [[ ! -d node_modules ]]; then
  echo "==> npm install"
  npm install
fi

echo "==> Build check"
npm run build

echo "==> Vercel link (select team rifqimtjahyono-3455s-projects, project name e.g. umkm-hub-web)"
if [[ ! -d .vercel ]]; then
  npx vercel link
fi

echo "==> Deploy production"
npx vercel --prod

echo ""
echo "Done. Next steps:"
echo "  1. Add Vercel URL to Firebase authorized domains"
echo "  2. Update Firebase email templates (verify-email, reset-password URLs)"
echo "  3. Set CORS_ORIGIN + APP_PUBLIC_URL on API to your Vercel URL"
echo "  4. Run: scripts/print-production-env.sh https://YOUR_VERCEL_URL https://YOUR_API_URL"
