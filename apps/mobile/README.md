# UMKM Hub — Flutter Mobile

Field client: products, customers, orders, warehouse, profile (incl. invoicing fields), analytics, dictionary, language, feature transfer.

**Web-first (API ready):** Targets UI, PDF / e-Faktur download, warehouse restock edit. Docs **v1.5.233**.

```bash
npm run setup && npm run api:dev
cd apps/mobile && flutter pub get
flutter run --dart-define=API_BASE_URL=http://localhost:3001/api/v1
```

Android emulator: `http://10.0.2.2:3001/api/v1`

## Local development

Without Firebase dart-defines, legacy API auth works (sandbox login).

## Production (Firebase)

Project: **umkm-hub-2b955** · Vercel: [rifqimtjahyono-3455s-projects](https://vercel.com/rifqimtjahyono-3455s-projects)

Full env checklist: [docs/ENV-UMKM-HUB-PRODUCTION.md](../../docs/ENV-UMKM-HUB-PRODUCTION.md)

Pass the same Firebase web-app keys as `--dart-define` flags:

```bash
flutter run \
  --dart-define=API_BASE_URL=https://api.yourdomain.com/api/v1 \
  --dart-define=FIREBASE_API_KEY=... \
  --dart-define=FIREBASE_AUTH_DOMAIN=umkm-hub-2b955.firebaseapp.com \
  --dart-define=FIREBASE_PROJECT_ID=umkm-hub-2b955 \
  --dart-define=FIREBASE_STORAGE_BUCKET=umkm-hub-2b955.firebasestorage.app \
  --dart-define=FIREBASE_MESSAGING_SENDER_ID=... \
  --dart-define=FIREBASE_APP_ID=...
```

Forgot-password and email verification are handled by Firebase (reset links open in the device browser).

See [docs/DEPLOY-VERCEL.md](../../docs/DEPLOY-VERCEL.md) for the full production guide.

## Docs

[Design](../../docs/DESIGN_GUIDELINES.md) · [Index](../../docs/README.md)
