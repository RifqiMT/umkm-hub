#!/usr/bin/env bash
# Copy Firebase service account JSON to clipboard for Render paste.
set -euo pipefail

JSON_FILE="${1:-$HOME/Downloads/umkm-hub-firebase.json}"

if [[ ! -f "$JSON_FILE" ]]; then
  echo "ERROR: File not found: $JSON_FILE"
  echo "Save your Firebase service account JSON from:"
  echo "  https://console.firebase.google.com/project/umkm-hub-2b955/settings/serviceaccounts/adminsdk"
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "ERROR: jq required (brew install jq)"
  exit 1
fi

jq -c . "$JSON_FILE" | pbcopy

echo "✅ Copied minified Firebase JSON to clipboard."
echo ""
echo "On Render:"
echo "  1. Open umkm-hub-api → Environment"
echo "  2. Add key: FIREBASE_SERVICE_ACCOUNT_JSON"
echo "  3. Paste (Cmd+V) → Save Changes"
echo ""
echo "Verify after Live:"
echo "  curl -X POST https://umkm-hub-api.onrender.com/api/v1/auth/config"

if [[ "$(uname)" == "Darwin" ]]; then
  open "https://dashboard.render.com"
fi
