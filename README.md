# UMKM Hub

Multi-tenant **CRM + inventory + order workspace** for Indonesian MSMEs (UMKM). One profile owns products, customers, warehouse stock, orders, revenue targets, and analytics — available on **web** and **mobile** against a shared NestJS API.

**Current product version:** 1.5.233 · **Docs:** [`docs/`](./docs/) · Code tip aligned: **v1.5.232**

---

## Benefits

- Centralize stock, pack pricing, and optional COGS
- Track B2B customer pipeline (stage, status, relationship, promises, address)
- Create multi-line orders with discounts, PPN-aware **amount due**, installments, bill vs invoice collection, and stock checks
- Download printable **PDF invoices** and **e-Faktur prep** (CSV/XML) — prep aids, not DJP filing
- Plan yearly revenue targets with attainment, on-plan, pace, and coverage rates
- Analyze Weekly / Monthly / Quarterly / Annual performance; domain **statistics** breakdowns; export charts as CSV/PNG
- Backup/restore via JSON & CSV export/import (own or allowlisted all-profiles; feature-scoped)
- Shared Dictionary + optional UI language; verified identity + forgot/reset password
- Same backend for Next.js web and Flutter mobile

---

## Features

| Domain | Capabilities |
|--------|----------------|
| **Profile** | Register (unique username + email), login by username/email, immutable identity, password change, forgot/reset, email verify, sealed location, **invoicing identity** (NPWP, PKP, PPN %, taxInclusive, invoice prefix), workspace snapshot, export/import, UI language |
| **Product** | CRUD — packs + optional COGS; warehouse-managed stock; human `productId`; summary + **statistics**; feature transfer |
| **Warehouse** | Restock create + **edit** (web); history; valuation; summary + **statistics**; feature transfer |
| **Customer** | CRUD — CRM fields, address + postal geo, optional **NPWP**; human `customerId`; summary + **statistics**; feature transfer |
| **Order** | Multi-line packs, discounts, terms, installments vs **amountDue**; bill + invoice collection; PDF + e-Faktur prep; optional CRM link; pagination up to 500k; summary + **statistics**; feature transfer |
| **Targets** | Per-year plans; FeatureStage rates (**web-first**); feature transfer |
| **Analytics** | W/M/Q/Y; progressive load; mix %; UPT/APF; Top/Bottom rankings; Graph\|Table; CSV/PNG export |
| **Dictionary** | Plain-English metric definitions (web nav; mobile via Profile) |
| **Dashboard** | Period-scoped order stage + workspace panels (web) |

---

## Tech stack

| Layer | Technology |
|-------|------------|
| API | NestJS 11 + TypeScript + Prisma 6 |
| Database | PostgreSQL 16 |
| Auth | Firebase Auth (production) + JWT/bcrypt fallback (local dev); email verify; password reset |
| Cache / limits | Upstash Redis (production) — distributed throttling + analytics cache |
| Web | Next.js 15 + React 19 + Tailwind CSS 4 + Recharts |
| Mobile | Flutter (Provider, fl_chart, Manrope) |
| Shared | `@umkm-hub/shared` |
| Local DB | Docker Compose |

---

## Repository layout

```
apps/api         NestJS REST API (/api/v1)
apps/web         Next.js web app
apps/mobile      Flutter mobile app
packages/shared  Shared TS enums/helpers
scripts/         Env bootstrap & sync
docs/            Product & engineering documentation
docker-compose.yml
```

---

## Quick start (recommended)

```bash
npm run setup   # first time
npm run sync    # after every pull
npm run api:dev # → http://localhost:3001/api/v1/health
npm run web:dev # → http://localhost:3000
```

Sandbox login (first create only): `rifqi_tjahyono` / `12041994`.  
See [docs/CONTRIBUTING.md](./docs/CONTRIBUTING.md).

### Manual steps

```bash
docker compose up -d
cd apps/api && cp .env.example .env && npm install && npx prisma migrate deploy && npm run start:dev
cd apps/web && cp .env.example .env.local && npm install && npm run dev
cd apps/mobile && flutter pub get && flutter run --dart-define=API_BASE_URL=http://localhost:3001/api/v1
```

> Run only one Next process. Don’t `build` while `dev` is active.

---

## Root scripts

| Script | Purpose |
|--------|---------|
| `npm run setup` / `sync` | Bootstrap / keep sandbox current |
| `npm run db:up` / `db:down` / `db:migrate` / `db:seed` | Postgres / Prisma |
| `npm run api:dev` / `web:dev` | Dev servers |
| `npm run api:test` / `web:build` | Tests / build |
| `scripts/deploy-vercel.sh` | Deploy web to Vercel |
| `scripts/print-production-env.sh` | Print Vercel + API env template |

---

## Tests

```bash
cd apps/api && npm test
cd apps/web && npm run build
# Mobile: flutter test
```

---

## Documentation

Index: [docs/README.md](./docs/README.md) — PRODUCT, PRD, PERSONAS, USER_STORIES, VARIABLES, METRICS, DESIGN, TRACEABILITY, GUARDRAILS, ARCHITECTURE, CHANGELOG.

**Production (Vercel + Firebase + Redis):** [docs/DEPLOY-VERCEL.md](./docs/DEPLOY-VERCEL.md) · [docs/ENV-UMKM-HUB-PRODUCTION.md](./docs/ENV-UMKM-HUB-PRODUCTION.md) (project `umkm-hub-2b955`)

**Plain English setup (no tech background needed):** [docs/SETUP-GUIDE-PLAIN-ENGLISH.md](./docs/SETUP-GUIDE-PLAIN-ENGLISH.md) · Live web: https://umkm-hub-web.vercel.app

---

## License

Private / UNLICENSED unless otherwise stated.
