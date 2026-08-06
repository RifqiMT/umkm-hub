# UMKM Hub Web

Next.js 15 ops UI — catalog (**Stock & sales** + product performance View), CRM (**Order totals** + order performance View), orders (invoice PDF / Kontra bon PDF / e-Faktur prep), warehouse (edit + **Sold history** + Open order), targets, analytics, domain statistics, dictionary (~102 terms), dashboard, export/import, language, profile invoicing, Firebase auth (production).

Responsive: tablet/phone catalog **cards** (≤1100); exclusive View **focus mode**; non-sticky feature chrome on narrow; shell brand bar + bottom nav stay fixed. Filters **collapsed by default**; form enums use `OptionSelect`; numeric fields use empty drafts (`NumberDraft`); sheet actions at the foot.

Docs **v1.5.277**.

## Local run

```bash
npm run setup && npm run sync
npm run api:dev
npm run web:dev   # → http://localhost:3000
```

## Key routes

`/login` · `/register` · `/forgot-password` · `/reset-password` · `/verify-email` · `/dashboard` · `/products` · `/customers` · `/orders` · `/warehouse` · `/targets` · `/analytics` · `/glossary` · `/profile`

## Docs

[Design](../../docs/DESIGN_GUIDELINES.md) · [Index](../../docs/README.md)
