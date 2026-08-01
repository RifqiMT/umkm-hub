#!/usr/bin/env bash
# One-shot Render deploy helper (run locally after pushing to main).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
API_URL="${API_URL:-https://umkm-hub-api.onrender.com/api/v1/health}"

echo "==> UMKM Hub — Render deploy check"
echo "    Repo: ${ROOT}"
echo "    Health: ${API_URL}"
echo ""

echo "==> Latest commit on main:"
git -C "$ROOT" log -1 --oneline
echo ""

echo "Render steps (do these in the dashboard if auto-deploy did not run):"
echo "  1. https://dashboard.render.com → umkm-hub-api → Manual Deploy → Deploy latest commit"
echo "  2. Settings → Root Directory: apps/api"
echo "  3. Settings → Build Command: NPM_CONFIG_PRODUCTION=false npm ci && npm run build"
echo "  4. Settings → Start Command: bash scripts/render-start.sh"
echo ""
echo "If migrations still fail (P3009) on a brand-new database:"
echo "  → umkm-hub-db → Settings → Delete Database → Blueprint Manual Sync"
echo ""

echo "==> Polling health (free tier may take ~60s on cold start)..."
for i in 1 2 3 4 5 6; do
  if curl -fsS -m 45 "$API_URL" 2>/dev/null; then
    echo ""
    echo "==> API is live."
    exit 0
  fi
  echo "    Attempt ${i}/6 — waiting 15s..."
  sleep 15
done

echo ""
echo "==> API not responding yet. Open Render → umkm-hub-api → Logs for deploy status."
exit 1
