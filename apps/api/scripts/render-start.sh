#!/usr/bin/env bash
# Render.com start: migrate (with P3009 auto-recovery) then boot API.
set -euo pipefail

MIGRATE_LOG="$(mktemp)"
trap 'rm -f "$MIGRATE_LOG"' EXIT

resolve_failed_migrations() {
  # Prisma P3009: "migrate found failed migrations in the target database"
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
  if npx prisma migrate deploy 2> "$MIGRATE_LOG"; then
    return 0
  fi
  cat "$MIGRATE_LOG" >&2
  return 1
}

echo "==> Applying database migrations..."
if ! run_migrate_deploy; then
  if resolve_failed_migrations; then
    echo "==> Retrying migrations after recovery..."
    run_migrate_deploy
  else
    exit 1
  fi
fi

echo "==> Starting API..."
exec npm run start:prod
