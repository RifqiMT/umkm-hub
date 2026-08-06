# UMKM Hub — Flutter Mobile

Field client: products, customers, orders, warehouse (restock + Sold history list/view), profile (incl. invoicing fields), analytics, dictionary (~102 terms), language, feature transfer.

**List filters:** Products / Customers / Orders / Warehouse match web (search + multi-select; Orders also date ranges); filters collapsed by default.

**Forms:** Enum dropdowns (`OptionDropdown`); blank numeric drafts (no leading 0); sheet actions at the foot.

Responsive: tablet **NavigationRail**, `showAppViewSheet`, spacing tokens, Analytics metric cards under 600px.

**Web-first (API ready):** Targets UI, PDF / e-Faktur download, warehouse restock edit, Stock & sales, Order totals, domain statistics UI, Open order from Sold history.

Docs **v1.5.274**.

```bash
npm run setup && npm run api:dev
cd apps/mobile && flutter pub get
flutter run --dart-define=API_BASE_URL=http://localhost:3001/api/v1
```

Android emulator: `http://10.0.2.2:3001/api/v1`

## Docs

[Design](../../docs/DESIGN_GUIDELINES.md) · [Index](../../docs/README.md)
