#!/usr/bin/env bash
# Add Firebase client keys to Vercel and redeploy (interactive).
# You need apiKey, messagingSenderId, appId from Firebase console.
#
# Usage:
#   scripts/add-firebase-to-vercel.sh
#   scripts/add-firebase-to-vercel.sh AIza... 123456789 1:123:web:abc
set -euo pipefail

WEB_DIR="$(cd "$(dirname "$0")/../apps/web" && pwd)"
SCOPE="rifqimtjahyono-3455s-projects"

API_KEY="${1:-}"
MSG_ID="${2:-}"
APP_ID="${3:-}"

if [[ -z "$API_KEY" ]]; then
  echo ""
  echo "Firebase → Project settings → Your apps → copy three values."
  echo "Get them here:"
  echo "  https://console.firebase.google.com/project/umkm-hub-2b955/settings/general"
  echo ""
  read -r -p "apiKey: " API_KEY
  read -r -p "messagingSenderId: " MSG_ID
  read -r -p "appId: " APP_ID
fi

if [[ -z "$API_KEY" || -z "$MSG_ID" || -z "$APP_ID" ]]; then
  echo "All three values are required." >&2
  exit 1
fi

cd "$WEB_DIR"

add_env() {
  local name="$1"
  local value="$2"
  for env in production preview development; do
    # Remove old value if present (ignore errors)
    npx vercel env rm "$name" "$env" --scope "$SCOPE" --yes 2>/dev/null || true
    printf '%s' "$value" | npx vercel env add "$name" "$env" --scope "$SCOPE"
  done
}

echo "==> Adding Firebase keys to Vercel..."
add_env "NEXT_PUBLIC_FIREBASE_API_KEY" "$API_KEY"
add_env "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID" "$MSG_ID"
add_env "NEXT_PUBLIC_FIREBASE_APP_ID" "$APP_ID"

echo "==> Redeploying production..."
npx vercel --prod --yes --scope "$SCOPE"

echo ""
echo "Done. Test: https://umkm-hub-web.vercel.app/register"
echo "Run: scripts/setup-check.sh"
