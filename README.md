# UMKM Hub

Multi-tenant **CRM + inventory + order workspace** for Indonesian MSMEs (UMKM). One profile owns products, customers, warehouse stock, orders, revenue targets, and analytics — available on **web** and **mobile** against a shared NestJS API.

**Current product version:** 1.5.88 · **Docs:** [`docs/`](./docs/)

---

## Benefits

- Centralize stock, pack pricing, and optional COGS
- Track B2B customer pipeline (stage, status, relationship, promises, address)
- Create multi-line orders with discounts, installments, invoice status, and stock checks
- Plan yearly revenue targets and measure attainment against real orders
- Analyze revenue, margins, lead times, product/customer performance, and LTV
- Same backend for Next.js web and Flutter mobile

---

## Features

| Domain | Capabilities |
|--------|----------------|
| **Profile** | Register/login (JWT), update name/password, delete account (cascades data) |
| **Product** | CRUD — unit (pcs / gram / liter), pack sell prices + optional pack costs, profit/margin %; stock managed in Warehouse |
| **Warehouse** | Restock existing products (manual or by pack); history with before/after; inventory valuation |
| **Customer** | CRUD — company type, contacts, address + postal geo fill, partnership stage, status, needs, standards, promises, relationship, approval %, remarks |
| **Order** | Multi-line packs, order-level discount, payment terms, status lifecycle, installments, invoice status, optional CRM customer link; no delete (cancel restores stock) |
| **Targets** | Per-year monthly/annual plans (manual or systematic growth); attainment vs non-cancelled order actuals (**web-first**) |
| **Analytics** | Monthly + 5-year annual charts; rates; lead times; product & customer tables; Avg LTV + top customers |

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

One command prepares **any** fresh or existing sandbox so it matches the latest repo changes (Postgres, deps, migrations, Prisma client, optional seed):

```bash
# First time on a machine / empty sandbox
npm run setup

# After every git pull or teammate change
npm run sync
```

Then start apps:

```bash
npm run api:dev   # → http://localhost:3001/api/v1/health
npm run web:dev   # → http://localhost:3000
```

`setup` also loads sandbox data (`rifqi_tjahyono` / `12041994` on first create only). To re-seed later: `npm run sync -- --seed` or `npm run db:seed`.

Options (passed through to `scripts/sync-env.sh`):

```bash
npm run sync -- --skip-mobile   # skip Flutter pub get
npm run setup -- --skip-mobile
npm run sync -- --seed          # apply sandbox seed during sync
```

See [docs/CONTRIBUTING.md](./docs/CONTRIBUTING.md) for the post-pull checklist and env drift rules.

### Manual steps (if you prefer not to use sync)

#### 1. Database
```bash
docker compose up -d
# or: npm run db:up
```

#### 2. API
```bash
cd apps/api
cp .env.example .env   # if needed
npm install
npx prisma migrate deploy
npm run start:dev
# → http://localhost:3001/api/v1/health
```

#### 3. Web
```bash
cd apps/web
cp .env.example .env.local
npm install
npm run dev
# → http://localhost:3000
```

> Tip: run only one `next` process. Don’t run `npm run build` while `npm run dev` is active — it corrupts `.next` and causes fake IDE errors on `app-page` / `main-app` / `layout`. If that happens: stop servers, `rm -rf apps/web/.next`, then `npm run dev` again.

#### 4. Mobile
Install Flutter, then:
```bash
cd apps/mobile
flutter create . --project-name umkm_hub   # generate platform folders if missing
flutter pub get
flutter run --dart-define=API_BASE_URL=http://localhost:3001/api/v1
```
Android emulator host machine: `http://10.0.2.2:3001/api/v1`

---

## Root scripts

| Script | Purpose |
|--------|---------|
| `npm run setup` | First-time bootstrap (DB + install + migrate + seed) |
| `npm run sync` | Keep sandbox current after changes |
| `npm run db:up` / `db:down` | Start/stop Postgres |
| `npm run db:migrate` | `prisma migrate deploy` |
| `npm run db:generate` | `prisma generate` |
| `npm run db:seed` | Sandbox profile/products/customers |
| `npm run api:dev` / `web:dev` | Run API / web |
| `npm run api:test` / `web:build` | API tests / web production build |

---

## Tests

```bash
cd apps/api && npm test
cd apps/web && npm run build
# Mobile (requires Flutter): flutter test
```

---

## Documentation

Professional product documentation lives in [`docs/`](./docs/):

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
