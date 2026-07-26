# Product Documentation — UMKM Hub

| Field | Value |
|-------|-------|
| **Product name** | UMKM Hub |
| **Version** | 1.5.217 |
| **Date** | 2026-07-26 |
| **Status** | Implemented (v1) |
| **Audience** | Product, engineering, design, operations |

---

## 1. Overview

**UMKM Hub** is a multi-tenant **CRM + inventory + order workspace** for Indonesian micro and small enterprises (UMKM)—especially food and packaging suppliers selling to restaurants, hotels, and stores.

Each seller operates under a single **Profile** (tenant). That profile owns products, customers, warehouse restocks, orders, revenue targets, and analytics. Web (Next.js) and mobile (Flutter) clients share one NestJS REST API and PostgreSQL system of record.

The product replaces fragmented WhatsApp chats, spreadsheets, and memory with:

- A priced product catalog with optional COGS
- Structured B2B customer pipeline and delivery address
- Multi-line pack-based orders with discounts, installments, and stock control
- Warehouse restock history and inventory valuation
- Yearly revenue targets with **% of target**, on-plan, pace, and coverage rates vs real order actuals
- Analytics across **Weekly / Monthly / Quarterly / Annual** (single year, multi-year, or All timelines): revenue, margins, lead times, order-status/payment mix, UPT, APF, product/customer performance, LTV
- **Dictionary** of metrics: searchable, feature-browsable plain-English definitions and formulas (web nav + mobile Profile)
- Account workspace: personal details, sealed location, email verification, workspace snapshot

---

## 2. Product benefits

| # | Benefit | Outcome |
|---|---------|---------|
| 1 | **Single source of truth per profile** | Stock, prices, CRM, and orders stay aligned across devices |
| 2 | **Faster, safer order capture** | Automatic totals, live remaining balance, stock checks before save |
| 3 | **Structured B2B CRM** | Partnership stage, status, relationship, promises, approval %, address |
| 4 | **Cross-platform access** | Same API for desktop ops (web) and field sales (mobile) |
| 5 | **Warehouse visibility** | Stock + packs-on-hand; restock by qty or pack; sell/cost/profit/margin |
| 6 | **Revenue planning** | Manual or systematic monthly/annual targets with attainment, on-plan, pace, coverage |
| 7 | **Decision-ready analytics** | Multi-granularity charts, mix %, lead times, Top/Bottom rankings, progressive load |
| 8 | **Compact money readability** | Large amounts as million/billion words; quantities stay full digits |
| 9 | **Shared metric language** | Dictionary explains KPIs and formulas in plain English |
| 10 | **Trustworthy account identity** | Unique username + email (immutable), verify-via-link, privacy-sealed location |

---

## 3. Feature domains

### 3.1 Profile & access
- Register with unique **username** (`profileName`) + unique **email** (both case-insensitive) + password (≥8)
- Live availability via `POST /auth/register-availability` returns only available/taken (anti-enumeration); register 409 uses the same unified message
- Login with username **or** email + password → JWT access + refresh
- Username and email are **immutable** after registration; credentials save is password-only
- Optional first/last name; city/country (sealed AES-GCM at rest; IP one-way HMAC when detected)
- Email verification: send link from Profile; open `/verify-email?token=…` (Resend or `devVerifyUrl`); login allowed while unverified
- Profile workspace: identity strip, snapshot (products/customers/orders/margin), shortcuts (Dictionary / Analytics / Targets / Dashboard on web), security tips
- Shell: Account chip opens Profile; Log out only on Profile

### 3.2 Products (catalog)
- CRUD with unit **pcs / gram / liter**; exactly one active pack for gram/liter; optional COGS
- Product ID `{INITIALS}_{PACK}_{uuid}`; stock managed in Warehouse only
- List feature stage + `GET /products/summary` (inventory value, SKU count, stock rates; filter-aware)
- Delete blocked if any order line references the product

### 3.3 Customers (CRM)
- CRUD with company type, contacts, optional CRM fields, address + postal geo fill
- Customer ID `{NameSegments}{R|H|S}_{uuid}`
- `GET /customers/summary` (count, approval, interested/closing/promises/contact rates)

### 3.4 Orders
- Multi-line packs; order-level discount; payment terms; status lifecycle; installments; invoice status
- Optional CRM customer link (enables LTV & customer analytics)
- Order ID `YYYY_MM_DD_{uuid}`; stock transactional; no delete (cancel restores stock)
- Paginated list with search/status/payment/date-range filters; `GET /orders/summary` health rates
- Feature stages across Orders, Products, Warehouse, Customers, Targets, Analytics

### 3.5 Warehouse
- Restock existing products (manual qty or by pack); history with before/after
- `GET /warehouse/summary` (sell/cost/profit; margin/cost-set/stock rates; restock date span)

### 3.6 Revenue targets (web-first)
- One plan per profile + calendar year; Manual/Systematic monthly and annual
- Annual always equals month sum when months exist; one Clear plan clears the year
- Actuals = sum of non-cancelled order totals by UTC `orderDate`
- FeatureStage: Annual target / Annual actual / Next year; rates **Attainment / On plan / Pace / Coverage**
- UI: YearSelect + **By month | By year** + single Edit plan / Clear plan

### 3.7 Analytics
- Timeline: single year, multi-year (`years=2024,2025`), or **All** (`years=all`); UI years **2020–2035**
- Granularity: **Weekly / Monthly / Quarterly / Annual**
- Single-year annual context uses rolling **10-year** window (`ANNUAL_WINDOW = 10`)
- Progressive load: `include=summary|series|products|customers` + `granularity=…`; ~45s in-process window cache
- Summary + series: revenue, orders, AOV, target, attainment, cost/profit/**stage margin %** (profit ÷ **net** revenue), lead times (ship / invoice / first pay / last pay), UPT (`avgBasketSize`), APF, avg product revenue, avg LTV
- Mix: order-status % (includes CANCELLED); payment-mode % (excludes cancelled)
- Charts omit empty periods; Graph | Table toggle; fullscreen cinema with prev/next
- Product/customer tables: revenue, packs sold, discount/cost/profit/%, AOV, first/avg repeat days
- Rankings: Top **and Bottom** 5 products by revenue; Top **and Bottom** 5 customers by LTV
- Web `/analytics`; Mobile via Profile

### 3.8 Dictionary
- Searchable glossary of stage/analytics/order/warehouse metrics (≈80 terms)
- Web `/glossary`; mobile Profile → Dictionary; catalogs kept in sync

### 3.9 Dashboard (web)
- Parallel summary loads; period filter scopes order summary by `orderDate`
- Feature stage + workspace board (Orders featured; Products/Customers panels; rail to Warehouse/Targets/Analytics)

---

## 4. Core logics

| Topic | Rule |
|-------|------|
| **Tenancy** | Every resource scoped by JWT `profileId` |
| **Identity** | Username + email unique (case-insensitive), required, immutable after register |
| **Order math** | Line = pack price × pack count; order total after % or amount discount |
| **Stock qty** | `packSize × packCount` per line |
| **Payments** | Installments → paidAmount; remaining = max(0, total − paid) |
| **Stock lifecycle** | Start 0 → restock ↑ → order ↓ → cancel restores |
| **Analytics actuals** | Shared with targets: `status ≠ CANCELLED`, UTC `orderDate` |
| **Stage margin %** | `(profit / netRevenue) × 100` on charts/summary |
| **Table margin %** | `(profit / (revenue + discount)) × 100` on product/customer tables |
| **Weekly target** | Day-weighted share of monthly plan amounts |
| **Quarterly target** | Sum of the three monthly plan amounts |
| **UPT** | `Σ packCount / orderCount` |
| **APF** | Linked orders ÷ distinct customers with linked orders |
| **Targets On plan** | Months with attainment ≥ 100 ÷ months with target > 0 |
| **Targets Pace** | YTD actual ÷ sum of targets for elapsed UTC months |
| **Targets Coverage** | Months with target ÷ 12 |
| **Money display** | Compact words for KPIs; exact in tooltips; full digits for qty |
| **Rounding** | Money to 4 decimal places |

---

## 5. Platforms

| Client | Role | Highlights |
|--------|------|------------|
| **Web (Next.js 15)** | Primary desktop + responsive ops UI | Teal shell; tablet icon rail; phone bottom tabs + drawer; Targets; full Analytics; Dictionary; Dashboard |
| **Mobile (Flutter)** | Field CRM & orders | Shared tokens; Analytics + Dictionary via Profile; **Targets web-first** |
| **API (NestJS)** | System of record | `/api/v1`, JWT, Prisma, throttling, validation, progressive analytics |

---

## 6. Business guidelines

- Password ≥8; bcrypt cost 12; never stored plain
- Username unique + immutable; email required, unique, immutable (1:1 with username)
- Register/login never reveal which of username/email collided
- Orders: no delete in v1; cancel restores stock
- Payment status = commercial terms (not PSP); invoice status = operational
- Profile deletion irreversible (cascades owned data)
- LTV / customer analytics require `customerId` on orders
- Location city/country sealed; IP never stored plaintext

---

## 7. Technical guidelines

| Topic | Standard |
|-------|----------|
| API base | `/api/v1` |
| Auth | Bearer access JWT; refresh via `POST /auth/refresh` |
| Pagination | Default page=1, limit=20, **max 100** |
| Errors | `{ statusCode, error, message, timestamp }` |
| Analytics | `years` / `year`, `include`, `granularity`; window cache TTL 45s |
| CORS | `CORS_ORIGIN` (comma-separated) |
| Rate limit | Global ~100/60s; stricter on auth |
| Location crypto | `PROFILE_LOCATION_SECRET` (falls back to `JWT_ACCESS_SECRET`) |
| Email | Optional `RESEND_API_KEY`; `APP_PUBLIC_URL` for verify links |
| Sandbox | `npm run setup` / `npm run sync` — never overwrite existing `.env` |

---

## 8. Technology stack

| Layer | Technology |
|-------|------------|
| API | NestJS 11, TypeScript, Prisma 6, class-validator, Passport JWT |
| Database | PostgreSQL 16 |
| Auth | JWT access + refresh, bcrypt cost 12 |
| Web | Next.js 15, React 19, Tailwind CSS 4, Recharts |
| Mobile | Flutter (Provider, http, fl_chart, google_fonts, secure storage) |
| Shared | `@umkm-hub/shared` — enums, labels, order totals |
| Local ops | Docker Compose, `scripts/sync-env.sh` |

See root [README.md](../README.md). Requirements: [PRD.md](./PRD.md). Formulas: [VARIABLES.md](./VARIABLES.md).

---

## 9. Document map

| Document | Purpose |
|----------|---------|
| [PRD.md](./PRD.md) | Requirements |
| [PERSONAS.md](./PERSONAS.md) | User personas |
| [USER_STORIES.md](./USER_STORIES.md) | Epics & acceptance criteria |
| [VARIABLES.md](./VARIABLES.md) | Variable catalog + charts |
| [METRICS.md](./METRICS.md) | Product metrics & OKRs |
| [DESIGN_GUIDELINES.md](./DESIGN_GUIDELINES.md) | Visual system |
| [TRACEABILITY.md](./TRACEABILITY.md) | FR → code map |
| [GUARDRAILS.md](./GUARDRAILS.md) | Tech & business limits |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System architecture |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Sandbox rules |
| [CHANGELOG.md](./CHANGELOG.md) | Development history |
| [PLAN.md](./PLAN.md) | Approved implementation plan |
