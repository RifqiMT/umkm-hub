#!/usr/bin/env bash
# Render.com start: migrate then boot API (free tier).
set -euo pipefail

echo "==> Applying database migrations..."
npx prisma migrate deploy

echo "==> Starting API..."
exec npm run start:prod
