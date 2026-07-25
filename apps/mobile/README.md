# UMKM Hub — Flutter Mobile

Field client for UMKM Hub: products, customers, orders, warehouse, profile, and analytics against the shared NestJS API.

**Note:** Revenue **targets** are web-first in v1 (`/targets` on web). The API is ready; mobile UI is deferred.

## Stack

- Flutter (SDK ≥ 3.3)
- Provider, http, fl_chart, google_fonts (Manrope), flutter_secure_storage
- Theme: `lib/theme/umkm_theme.dart` (`UmkmColors`, `UmkmType`)

## Local run

From monorepo root (preferred):

```bash
npm run setup   # or npm run sync
npm run api:dev
```

Then:

```bash
cd apps/mobile
flutter create . --project-name umkm_hub   # if platform folders missing
flutter pub get
flutter run --dart-define=API_BASE_URL=http://localhost:3001/api/v1
```

| Environment | Typical API base |
|-------------|------------------|
| Android emulator | `http://10.0.2.2:3001/api/v1` |
| iOS simulator | `http://localhost:3001/api/v1` |
| Default in `lib/config.dart` | Often emulator host — override with `--dart-define` |

## Screens

Login · Home shell (Products, Customers, Orders, Warehouse, Profile) · Analytics (from Profile)

## Tests

```bash
flutter test
```

## Docs

- Design: [`../../docs/DESIGN_GUIDELINES.md`](../../docs/DESIGN_GUIDELINES.md)
- Product index: [`../../docs/README.md`](../../docs/README.md)
- Guardrails (mobile targets gap): [`../../docs/GUARDRAILS.md`](../../docs/GUARDRAILS.md)
