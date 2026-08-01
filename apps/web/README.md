# UMKM Hub Web

Next.js 15 ops UI — catalog (**Stock & sales**), CRM (**Order totals**), orders (PDF / e-Faktur prep), warehouse (edit + **Sold history** + Open order), targets, analytics, domain statistics, dictionary (~101 terms), dashboard, export/import, language, profile invoicing, Firebase auth (production).

Docs **v1.5.250**.

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
