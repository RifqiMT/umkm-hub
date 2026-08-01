#!/usr/bin/env bash
# Render.com build (free-tier Node runtime).
# Works even when the dashboard uses the default npm install + npm run build.
set -euo pipefail

echo "==> Node $(node -v), npm $(npm -v)"
echo "==> Installing dependencies..."
export NPM_CONFIG_PRODUCTION=false
npm ci

echo "==> Building API..."
npm run build

echo "==> Build complete."
