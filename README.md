# UMKM Hub

Multi-tenant **CRM + inventory + order workspace** for Indonesian MSMEs (UMKM). One profile owns products, customers, warehouse stock, orders, revenue targets, and analytics — available on **web** and **mobile** against a shared NestJS API.

**Current product version:** 1.5.217 · **Docs:** [`docs/`](./docs/)

---

## Benefits

- Centralize stock, pack pricing, and optional COGS
- Track B2B customer pipeline (stage, status, relationship, promises, address)
- Create multi-line orders with discounts, installments, invoice status, and stock checks
- Plan yearly revenue targets with attainment, on-plan, pace, and coverage rates
- Analyze Weekly / Monthly / Quarterly / Annual performance (multi-year or All timelines)
- Shared Dictionary of metric definitions; verified account identity (username + email)
- Same backend for Next.js web and Flutter mobile

---

## Features

| Domain | Capabilities |
|--------|----------------|
| **Profile** | Register (unique username + email), login by username/email (JWT), immutable identity, password change, email verify, sealed location, workspace snapshot, delete account |
| **Product** | CRUD — pcs/gram/liter packs + optional COGS; warehouse-managed stock; summary rates |
| **Warehouse** | Restock (manual or by pack); history; inventory valuation + summary |
| **Customer** | CRUD — company type, CRM fields, address + postal geo fill; summary rates |
| **Order** | Multi-line packs, discounts, terms, installments, invoice status, optional CRM link; paginated filters; summary health rates; no delete |
| **Targets** | Per-year monthly/annual plans (manual/systematic); FeatureStage attainment / on-plan / pace / coverage (**web-first**) |
| **Analytics** | Weekly/Monthly/Quarterly/Annual; progressive load; mix %; UPT/APF; lead times; Top/Bottom rankings; Graph\|Table + fullscreen |
| **Dictionary** | Plain-English metric definitions and formulas (web nav; mobile via Profile) |
| **Dashboard** | Period-scoped order stage + workspace domain panels (web) |

---

## Tech stack

| Layer | Technology |
|-------|------------|
| API | NestJS 11 + TypeScript + Prisma 6 |
| Database | PostgreSQL 16 |
| Auth | JWT access + refresh, bcrypt (cost 12) |
| Web | Next.js 15 (App Router) + React 19 + Tailwind CSS 4 + Recharts |
| Mobile | Flutter (Provider, fl_chart, Manrope) |
| Shared | `@umkm-hub/shared` enums/helpers |
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
# First time on a machine / empty sandbox
npm run setup

# After every git pull or teammate change
npm run sync
```

Then:

```bash
npm run api:dev   # → http://localhost:3001/api/v1/health
npm run web:dev   # → http://localhost:3000
```

`setup` loads sandbox data (`rifqi_tjahyono` / `12041994` on first create only). Re-seed: `npm run sync -- --seed` or `npm run db:seed`.

```bash
npm run sync -- --skip-mobile
npm run sync -- --seed
```

See [docs/CONTRIBUTING.md](./docs/CONTRIBUTING.md).

### Manual steps

#### 1. Database
```bash
docker compose up -d
```

#### 2. API
```bash
cd apps/api
cp .env.example .env
npm install
npx prisma migrate deploy
npm run start:dev
```

#### 3. Web
```bash
cd apps/web
cp .env.example .env.local
npm install
npm run dev
```

> Run only one `next` process. Don’t `build` while `dev` is active.

#### 4. Mobile
```bash
cd apps/mobile
flutter create . --project-name umkm_hub   # if needed
flutter pub get
flutter run --dart-define=API_BASE_URL=http://localhost:3001/api/v1
```
Android emulator: `http://10.0.2.2:3001/api/v1`

---

## Root scripts

| Script | Purpose |
|--------|---------|
| `npm run setup` / `sync` | Bootstrap / keep sandbox current |
| `npm run db:up` / `db:down` | Postgres |
| `npm run db:migrate` / `db:generate` / `db:seed` | Prisma |
| `npm run api:dev` / `web:dev` | Dev servers |
| `npm run api:test` / `web:build` | Tests / build |

---

## Tests

```bash
cd apps/api && npm test
cd apps/web && npm run build
# Mobile: flutter test
```

---

## Documentation

| Doc | Contents |
|-----|----------|
| [PRODUCT](./docs/PRODUCT.md) | Overview, benefits, features, logics |
| [PRD](./docs/PRD.md) | Requirements |
| [PERSONAS](./docs/PERSONAS.md) / [USER_STORIES](./docs/USER_STORIES.md) | Users & stories |
| [VARIABLES](./docs/VARIABLES.md) | Formulas + relationship charts |
| [METRICS](./docs/METRICS.md) | Product metrics & OKRs |
| [DESIGN_GUIDELINES](./docs/DESIGN_GUIDELINES.md) | Color, type, components |
| [TRACEABILITY](./docs/TRACEABILITY.md) | FR → code matrix |
| [GUARDRAILS](./docs/GUARDRAILS.md) | Tech & business limits |
| [ARCHITECTURE](./docs/ARCHITECTURE.md) | System architecture |
| [CHANGELOG](./docs/CHANGELOG.md) | Development history |

Index: [docs/README.md](./docs/README.md).

---

## License

Private / UNLICENSED unless otherwise stated.
