# UMKM Hub — Flutter Mobile

Field client: products, customers, orders, warehouse, profile (incl. invoicing fields), analytics, dictionary, language, feature transfer.

**Web-first (API ready):** Targets UI, PDF / e-Faktur download, warehouse restock edit. Docs **v1.5.233**.

```bash
npm run setup && npm run api:dev
cd apps/mobile && flutter pub get
flutter run --dart-define=API_BASE_URL=http://localhost:3001/api/v1
```

Android emulator: `http://10.0.2.2:3001/api/v1`

## Docs

[Design](../../docs/DESIGN_GUIDELINES.md) · [Index](../../docs/README.md)
