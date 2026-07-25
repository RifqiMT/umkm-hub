#!/usr/bin/env bash
# Sync / bootstrap any local or sandbox environment with the latest repo changes.
# Usage:
#   scripts/sync-env.sh setup [--seed] [--skip-mobile]
#   scripts/sync-env.sh sync  [--seed] [--skip-mobile]
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MODE="${1:-}"
shift || true

# Common local tool locations (macOS / Homebrew / user Flutter installs)
export PATH="/opt/homebrew/bin:/usr/local/bin:${HOME}/flutter/bin:${HOME}/development/flutter/bin:${PATH}"

DO_SEED=0
SKIP_MOBILE=0
for arg in "$@"; do
  case "$arg" in
    --seed) DO_SEED=1 ;;
    --skip-mobile) SKIP_MOBILE=1 ;;
    -h|--help)
      sed -n '2,6p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown option: $arg" >&2
      exit 2
      ;;
  esac
done

if [[ "$MODE" != "setup" && "$MODE" != "sync" ]]; then
  echo "Usage: $0 {setup|sync} [--seed] [--skip-mobile]" >&2
  exit 2
fi

# setup always seeds so a fresh sandbox is usable
if [[ "$MODE" == "setup" ]]; then
  DO_SEED=1
fi

log() { printf '\n==> %s\n' "$*"; }
warn() { printf 'WARN: %s\n' "$*" >&2; }
fail() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "Required command not found: $1"
}

# Extract KEY names from a dotenv-style file (ignore comments/blank/export).
env_keys() {
  local file="$1"
  [[ -f "$file" ]] || return 0
  grep -E '^[A-Za-z_][A-Za-z0-9_]*=' "$file" \
    | sed 's/=.*//' \
    | sort -u
}

# Warn when .env.example has keys missing from a local env file.
check_env_drift() {
  local example="$1"
  local local_env="$2"
  local label="$3"

  [[ -f "$example" ]] || return 0
  if [[ ! -f "$local_env" ]]; then
    warn "$label: missing $local_env (expected keys from $(basename "$example"))"
    return 0
  fi

  local missing=0
  while IFS= read -r key; do
    [[ -z "$key" ]] && continue
    if ! grep -qE "^${key}=" "$local_env"; then
      warn "$label: missing env key '$key' in $(basename "$local_env") — copy from $(basename "$example")"
      missing=1
    fi
  done < <(env_keys "$example")

  if [[ "$missing" -eq 0 ]]; then
    echo "OK: $label env keys match $(basename "$example")"
  fi
}

ensure_env_file() {
  local example="$1"
  local target="$2"
  if [[ -f "$target" ]]; then
    echo "Keep existing $(basename "$target")"
    return 0
  fi
  [[ -f "$example" ]] || fail "Missing template: $example"
  cp "$example" "$target"
  echo "Created $target from $(basename "$example")"
}

postgres_tcp_open() {
  # Returns 0 if localhost:5432 accepts TCP connections
  if command -v nc >/dev/null 2>&1; then
    nc -z 127.0.0.1 5432 >/dev/null 2>&1 && return 0
  fi
  node -e "const n=require('net');const s=n.connect(5432,'127.0.0.1',()=>{process.exit(0)});s.on('error',()=>process.exit(1));setTimeout(()=>process.exit(1),2000);" >/dev/null 2>&1
}

load_database_url() {
  local env_file="$ROOT/apps/api/.env"
  if [[ -f "$env_file" ]]; then
    local raw
    raw="$(grep -E '^DATABASE_URL=' "$env_file" | tail -n1 | cut -d= -f2- || true)"
    if [[ -n "$raw" ]]; then
      # Strip surrounding quotes
      raw="${raw%\"}"
      raw="${raw#\"}"
      raw="${raw%\'}"
      raw="${raw#\'}"
      export DATABASE_URL="$raw"
    fi
  fi
}

wait_for_postgres() {
  local max_attempts="${1:-30}"
  local attempt=1
  load_database_url
  local url="${DATABASE_URL:-postgresql://umkm:umkm_secret@localhost:5432/umkm_hub}"

  if postgres_tcp_open; then
    echo "Postgres already reachable on localhost:5432 (skipping Docker start)"
    return 0
  fi

  if command -v docker >/dev/null 2>&1; then
    if ! docker compose -f "$ROOT/docker-compose.yml" ps --status running 2>/dev/null | grep -q postgres; then
      log "Starting Postgres (docker compose up -d)"
      docker compose -f "$ROOT/docker-compose.yml" up -d
    else
      echo "Postgres container already running"
    fi

    log "Waiting for Postgres to become healthy"
    while [[ "$attempt" -le "$max_attempts" ]]; do
      if docker compose -f "$ROOT/docker-compose.yml" exec -T postgres pg_isready -U umkm -d umkm_hub >/dev/null 2>&1 \
        || postgres_tcp_open; then
        echo "Postgres is ready (attempt $attempt)"
        return 0
      fi
      sleep 1
      attempt=$((attempt + 1))
    done
    fail "Postgres did not become ready within ${max_attempts}s. Check: docker compose -f \"$ROOT/docker-compose.yml\" logs postgres (DATABASE_URL tip: $url)"
  fi

  fail "Postgres is not reachable on localhost:5432 and Docker is not available. Start Postgres (npm run db:up) or set DATABASE_URL in apps/api/.env (current tip: $url)"
}

install_node_pkg() {
  local dir="$1"
  local label="$2"
  log "Installing dependencies: $label"
  if [[ -f "$dir/package-lock.json" ]]; then
    npm ci --prefix "$dir"
  else
    npm install --prefix "$dir"
  fi
}

run_prisma() {
  log "Applying Prisma migrations (migrate deploy)"
  npm --prefix "$ROOT/apps/api" run prisma:deploy
  log "Generating Prisma client"
  npm --prefix "$ROOT/apps/api" run prisma:generate
}

run_seed() {
  log "Seeding demo data"
  npm --prefix "$ROOT/apps/api" run prisma:seed
}

sync_mobile() {
  if [[ "$SKIP_MOBILE" -eq 1 ]]; then
    echo "Skipping mobile (--skip-mobile)"
    return 0
  fi
  if ! command -v flutter >/dev/null 2>&1; then
    warn "Flutter not found — skip apps/mobile. Install Flutter or pass --skip-mobile."
    return 0
  fi
  log "Flutter pub get"
  (cd "$ROOT/apps/mobile" && flutter pub get)
}

# --- main ---
need_cmd node
need_cmd npm

log "UMKM Hub env $MODE (root: $ROOT)"

log "Ensuring env files exist (never overwrites)"
ensure_env_file "$ROOT/apps/api/.env.example" "$ROOT/apps/api/.env"
ensure_env_file "$ROOT/apps/web/.env.example" "$ROOT/apps/web/.env.local"

log "Checking env key drift vs templates"
check_env_drift "$ROOT/apps/api/.env.example" "$ROOT/apps/api/.env" "API"
check_env_drift "$ROOT/apps/web/.env.example" "$ROOT/apps/web/.env.local" "Web"

wait_for_postgres 40

install_node_pkg "$ROOT/apps/api" "apps/api"
install_node_pkg "$ROOT/apps/web" "apps/web"
if [[ -f "$ROOT/packages/shared/package.json" ]]; then
  install_node_pkg "$ROOT/packages/shared" "packages/shared"
fi

run_prisma

if [[ "$DO_SEED" -eq 1 ]]; then
  run_seed
else
  echo "Skipping seed (pass --seed to load demo data)"
fi

sync_mobile

log "Done ($MODE). Next steps:"
echo "  API:  npm run api:dev     → http://localhost:3001/api/v1/health"
echo "  Web:  npm run web:dev     → http://localhost:3000"
echo "  After every pull / teammate change: npm run sync"
if [[ "$DO_SEED" -eq 1 ]]; then
  echo "  Demo login: demo / demopass1"
fi
exit 0
