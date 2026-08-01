#!/usr/bin/env bash
# Render.com build script (free tier Node runtime).
set -euo pipefail

echo "==> Installing dependencies (including dev, for Nest build)..."
npm ci --include=dev

echo "==> Building API..."
npm run build:render

echo "==> Build complete."
