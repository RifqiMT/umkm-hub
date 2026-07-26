# UMKM Hub — Flutter Mobile

Field client: products, customers, orders, warehouse, profile, analytics, and dictionary against the shared NestJS API.

**Note:** Revenue **targets** are web-first in v1. Docs tip **v1.5.217**.

## Stack

- Flutter (SDK ≥ 3.3)
- Provider, http, fl_chart, google_fonts (Manrope), flutter_secure_storage
- Theme: `lib/theme/umkm_theme.dart`

## Local run

```bash
npm run setup && npm run api:dev   # monorepo
cd apps/mobile
flutter pub get
flutter run --dart-define=API_BASE_URL=http://localhost:3001/api/v1
```

| Environment | Typical API base |
|-------------|------------------|
| Android emulator | `http://10.0.2.2:3001/api/v1` |
| iOS simulator | `http://localhost:3001/api/v1` |

## Screens

Login · Home shell (Products, Customers, Orders, Warehouse, Profile) · Analytics · Dictionary (from Profile)

## Tests

```bash
flutter test
```

## Docs

- [Design](../../docs/DESIGN_GUIDELINES.md) · [Docs index](../../docs/README.md)
