#!/usr/bin/env bash
# Warn when local env files accidentally point at production services.
# Usage: scripts/guard-local-env.sh [--strict]
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STRICT=0
if [[ "${1:-}" == "--strict" ]]; then
  STRICT=1
fi

issues=0
warn() { printf 'WARN: %s\n' "$*" >&2; issues=$((issues + 1)); }
fail() { printf 'ERROR: %s\n' "$*" >&2; issues=$((issues + 1)); }

env_value() {
  local file="$1"
  local key="$2"
  [[ -f "$file" ]] || return 0
  grep -E "^${key}=" "$file" 2>/dev/null | tail -n1 | cut -d= -f2- \
    | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//" \
    || true
}

looks_like_production_url() {
  local value="${1:-}"
  [[ -z "$value" ]] && return 1
  if echo "$value" | grep -qiE \
    'onrender\.com|vercel\.app|upstash\.io|redis\.io|amazonaws\.com|rds\.|neon\.tech|supabase\.co'; then
    return 0
  fi
  return 1
}

check_file() {
  local label="$1"
  local file="$2"
  shift 2
  [[ -f "$file" ]] || return 0

  local key value
  for key in "$@"; do
    value="$(env_value "$file" "$key")"
    [[ -z "$value" ]] && continue
    if looks_like_production_url "$value"; then
      fail "$label: $key looks like a production URL in $(basename "$file") — use localhost values for local dev (see docs/ENV-LOCAL.md)"
    fi
  done

  if [[ "$file" == *"/apps/api/.env" ]]; then
    value="$(env_value "$file" "FIREBASE_SERVICE_ACCOUNT_JSON")"
    if [[ -n "$value" && ${#value} -gt 80 ]]; then
      warn "$label: FIREBASE_SERVICE_ACCOUNT_JSON is set in apps/api/.env — omit for local JWT auth, or use a dev-only Firebase project"
    fi
    value="$(env_value "$file" "REDIS_URL")"
    if looks_like_production_url "$value"; then
      fail "$label: REDIS_URL points at hosted Redis — leave unset locally (in-process fallback) or use redis://localhost:6379"
    fi
  fi
}

check_file "API" "$ROOT/apps/api/.env" \
  DATABASE_URL \
  CORS_ORIGIN \
  APP_PUBLIC_URL

check_file "Web" "$ROOT/apps/web/.env.local" \
  NEXT_PUBLIC_API_URL \
  NEXT_PUBLIC_APP_URL

if [[ "$issues" -eq 0 ]]; then
  echo "OK: local env files do not reference production hosts"
  exit 0
fi

if [[ "$STRICT" -eq 1 ]]; then
  echo "" >&2
  echo "Fix local env files or see docs/ENV-LOCAL.md" >&2
  exit 1
fi

echo "" >&2
echo "Local dev can continue, but review the warnings above." >&2
exit 0
