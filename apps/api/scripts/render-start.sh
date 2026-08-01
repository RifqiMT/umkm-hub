#!/usr/bin/env bash
# Render.com start: migrate (with P3009 auto-recovery) then boot API.
set -euo pipefail

MIGRATE_LOG="$(mktemp)"
trap 'rm -f "$MIGRATE_LOG"' EXIT

resolve_failed_migrations() {
  if ! grep -q "P3009" "$MIGRATE_LOG"; then
    return 1
  fi

  echo "==> Recovering from failed migration history (P3009)..."
  mapfile -t FAILED < <(
    grep -oE 'The `[0-9_[:alnum:]]+` migration' "$MIGRATE_LOG" \
      | sed -E 's/The `([^`]+)` migration/\1/' \
      | sort -u
  )

  if ((${#FAILED[@]} == 0)); then
    echo "==> Could not parse failed migration name from log."
    return 1
  fi

  for name in "${FAILED[@]}"; do
    echo "==> Marking rolled back: ${name}"
    npx prisma migrate resolve --rolled-back "${name}"
  done

  return 0
}

run_migrate_deploy() {
  : >"$MIGRATE_LOG"
  if npx prisma migrate deploy 2> "$MIGRATE_LOG"; then
    return 0
  fi
  cat "$MIGRATE_LOG" >&2
  return 1
}

echo "==> Applying database migrations..."
ATTEMPT=1
MAX_ATTEMPTS=5

while (( ATTEMPT <= MAX_ATTEMPTS )); do
  if run_migrate_deploy; then
    break
  fi

  if (( ATTEMPT == MAX_ATTEMPTS )); then
    echo "==> Migration failed after ${MAX_ATTEMPTS} attempts."
    exit 1
  fi

  if ! resolve_failed_migrations; then
    exit 1
  fi

  ATTEMPT=$((ATTEMPT + 1))
  echo "==> Retrying migrations (attempt ${ATTEMPT}/${MAX_ATTEMPTS})..."
done

echo "==> Starting API..."
ENTRY="dist/src/main.js"
if [[ ! -f "$ENTRY" ]]; then
  echo "==> ${ENTRY} missing — running build on start..."
  npm run build
fi

if [[ ! -f "$ENTRY" ]]; then
  echo "==> Build output still missing at ${ENTRY}"
  ls -la dist 2>&1 || true
  exit 1
fi

exec node "$ENTRY"
