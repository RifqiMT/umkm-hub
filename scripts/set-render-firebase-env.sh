#!/usr/bin/env bash
# Set FIREBASE_SERVICE_ACCOUNT_JSON on Render via API (never commit the JSON file).
#
# 1. Create API key: https://dashboard.render.com/u/settings#api-keys
# 2. Save Firebase service account JSON outside the repo, e.g. ~/Downloads/umkm-hub-firebase.json
# 3. Run:
#    RENDER_API_KEY=rnd_xxx scripts/set-render-firebase-env.sh ~/Downloads/umkm-hub-firebase.json
#
set -euo pipefail

JSON_FILE="${1:-}"
SERVICE_NAME="${RENDER_SERVICE_NAME:-umkm-hub-api}"
ENV_KEY="FIREBASE_SERVICE_ACCOUNT_JSON"

if [[ -z "${RENDER_API_KEY:-}" ]]; then
  echo "ERROR: Set RENDER_API_KEY (https://dashboard.render.com/u/settings#api-keys)"
  exit 1
fi

if [[ -z "$JSON_FILE" || ! -f "$JSON_FILE" ]]; then
  echo "Usage: RENDER_API_KEY=rnd_xxx $0 /path/to/service-account.json"
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "ERROR: jq is required (brew install jq)"
  exit 1
fi

JSON_MINIFIED="$(jq -c . "$JSON_FILE")"
SERVICE_ID="${RENDER_SERVICE_ID:-}"

if [[ -z "$SERVICE_ID" ]]; then
  echo "==> Looking up Render service: ${SERVICE_NAME}"
  SERVICE_ID="$(
    curl -fsS "https://api.render.com/v1/services?limit=100" \
      -H "Authorization: Bearer ${RENDER_API_KEY}" \
      -H "Accept: application/json" \
    | jq -r --arg name "$SERVICE_NAME" '
        .[]
        | select(.service.name == $name)
        | .service.id
      ' \
    | head -1
  )"
fi

if [[ -z "$SERVICE_ID" ]]; then
  echo "ERROR: Could not find service ${SERVICE_NAME}. Set RENDER_SERVICE_ID manually."
  exit 1
fi

echo "==> Updating ${ENV_KEY} on ${SERVICE_NAME} (${SERVICE_ID})"
curl -fsS -X PUT \
  "https://api.render.com/v1/services/${SERVICE_ID}/env-vars/${ENV_KEY}" \
  -H "Authorization: Bearer ${RENDER_API_KEY}" \
  -H "Content-Type: application/json" \
  --data "$(jq -n --arg value "$JSON_MINIFIED" '{value: $value}')"

echo ""
echo "==> Done. Render will restart ${SERVICE_NAME}."
echo "    Verify: curl -X POST https://umkm-hub-api.onrender.com/api/v1/auth/config"
echo "    Expected: {\"firebaseEnabled\":true}"
