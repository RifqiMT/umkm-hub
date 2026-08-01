#!/usr/bin/env bash
# Open every setup page you need in your browser (macOS).
# Usage: scripts/open-setup-links.sh
set -euo pipefail

open "https://umkm-hub-web.vercel.app/login"
open "https://console.firebase.google.com/project/umkm-hub-2b955/authentication/providers"
open "https://console.firebase.google.com/project/umkm-hub-2b955/authentication/settings"
open "https://console.firebase.google.com/project/umkm-hub-2b955/settings/general"
open "https://console.firebase.google.com/project/umkm-hub-2b955/authentication/templates"
open "https://console.firebase.google.com/project/umkm-hub-2b955/settings/serviceaccounts/adminsdk"
open "https://vercel.com/rifqimtjahyono-3455s-projects/umkm-hub-web/settings/environment-variables"
open "https://vercel.com/rifqimtjahyono-3455s-projects/umkm-hub-web"
open "https://dashboard.render.com/select-repo?type=blueprint"
open "https://console.upstash.com"

echo ""
echo "Opened setup tabs in your browser."
echo "Follow: docs/SETUP-GUIDE-PLAIN-ENGLISH.md"
echo ""
