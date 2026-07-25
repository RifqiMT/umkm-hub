# Product Documentation — UMKM Hub

| Field | Value |
|-------|-------|
| **Product name** | UMKM Hub |
| **Version** | 1.5.88 |
| **Date** | 2026-07-25 |
| **Status** | Implemented (v1) |
| **Audience** | Product, engineering, design, operations |

---

## 1. Overview

**UMKM Hub** is a multi-tenant **CRM + inventory + order workspace** built for Indonesian micro and small enterprises (UMKM)—especially food and packaging suppliers selling to restaurants, hotels, and stores.

Each seller operates under a single **Profile** (tenant). That profile owns products, customers, warehouse restocks, orders, revenue targets, and analytics. Web (Next.js) and mobile (Flutter) clients share one NestJS REST API and PostgreSQL system of record.

The product replaces fragmented WhatsApp chats, spreadsheets, and memory with:

- A priced product catalog with optional COGS
- Structured B2B customer pipeline and delivery address
- Multi-line pack-based orders with discounts, installments, and stock control
- Warehouse restock history and inventory valuation
- Yearly revenue targets with attainment vs real order actuals
- Analytics for revenue, margins, lead times, product/customer performance, and LTV

---

## 2. Product benefits

| # | Benefit | Outcome |
|---|---------|---------|
| 1 | **Single source of truth per profile** | Stock, prices, CRM, and orders stay aligned across devices |
| 2 | **Faster, safer order capture** | Automatic line/order totals, live remaining balance, and stock checks before save |
| 3 | **Structured B2B CRM** | Partnership stage, status, relationship, promises, approval %, and postal address |
| 4 | **Cross-platform access** | Same API for desktop ops (web) and field sales (mobile) |
| 5 | **Warehouse visibility** | Restock history with before/after stock; sell/cost/profit/margin at inventory level |
| 6 | **Revenue planning** | Manual or systematic monthly/annual targets with attainment % |
| 7 | **Decision-ready analytics** | Monthly/annual revenue & orders, rates, lead times, product & customer tables, LTV |
| 8 | **Compact money readability** | Large amounts display as Mn/Bn/Tn/Qd/Qn; quantities stay full digits |

---

## 3. Feature domains

### 3.1 Profile & access
- Register with unique `profileName` + password (≥8)
- Login returns JWT access + refresh tokens
- Update name/password; delete account (cascades all owned data)

### 3.2 Products (catalog)
- CRUD with unit **pcs / gram / liter**
- Pack selling prices + optional pack costs (50/100/250/500/1000/custom for gram/liter; exactly one active pack)
- Product ID: `{INITIALS}_{PACK}_{uuid}` (regenerates prefix when name or pack size changes)
- Stock is **not** edited on Products—managed in Warehouse
- Delete blocked if any order line references the product

### 3.3 Customers (CRM)
- CRUD with company type (Restaurant / Hotel / Store), contacts, optional CRM fields
- Address: street, additional, postal, city, province, country
- Postal + country lookup auto-fills locality when fields are empty or previously auto-filled
- Customer ID: `{NameSegments}{R|H|S}_{uuid}`

### 3.4 Orders
- Multi-line pack-based orders; locked pack price snapshots
- Order-level discount (percentage or amount)
- Payment terms: cash / consignment / delayed payment
- Fulfillment status: pending → confirmed → shipped → delivered / cancelled
- Invoice status: created / sent; optional invoice date
- Installments (amount or % of total, stored as amount); non-decreasing dates; sum ≤ total
- Computed `paidAmount` / `remainingAmount` on read
- Optional CRM customer link (enables customer analytics & LTV)
- Order ID: `YYYY_MM_DD_{uuid}` from order date
- Stock draw on create/update; cancel restores stock (transactional)

### 3.5 Warehouse
- Restock existing catalog products only (manual qty or by pack)
- History with `stockBefore` / `stockAfter`
- Inventory view: stock, packs-on-hand, potential revenue/cost/profit, margin %

### 3.6 Revenue targets (web-first)
- One plan per profile + calendar year
- Monthly: Manual (12 amounts) or Systematic (January base + MoM growth %)
- Annual: Manual or Systematic (+ optional YoY projection)
- Annual always equals month sum when months exist; clear either side clears the year
- Actuals = sum of non-cancelled order totals by `orderDate`

### 3.7 Analytics
- Year-scoped overview: monthly series + rolling 5-year annual window
- Revenue, order count, AOV, targets, attainment %
- Margin series (cost/profit/margin % on pre-discount gross base)
- Lead times: shipment, first payment, last payment (avg days)
- Product performance table (revenue, discount, cost, profit+margin, AOV, qty)
- Customer performance table (same pattern for linked orders)
- Avg LTV + LTV trend + top customers by LTV (requires `customerId` on orders)
- Web: `/analytics`; Mobile: entry from Profile

---

## 4. Core logics

| Topic | Rule |
|-------|------|
| **Tenancy** | Every resource is scoped by `profileId` from JWT |
| **Order math** | Line total = pack price × pack count; order total after % or amount discount |
| **Stock qty** | `packSize × packCount` per line |
| **Payments** | Installments sum → paidAmount; remaining = max(0, total − paid) |
| **Stock lifecycle** | Products start at 0; restock increases; order create/update decreases; cancel restores |
| **Order update stock** | Restore previous line qtys, then apply new lines in one transaction |
| **Product costs** | Optional; profit = price − cost; margin % = (price − cost) / price × 100 |
| **Analytics actuals** | Shared helper with targets: `status ≠ CANCELLED`, bucket by UTC `orderDate` |
| **Rate base** | Discount %, COGS %, margin % use pre-discount gross so they sum ≈ 100% |
| **Money display** | `formatMoney` compact labels; `formatQty` full digits |
| **Rounding** | Money stored/computed to 4 decimal places |

---

## 5. Platforms

| Client | Role | Highlights |
|--------|------|------------|
| **Web (Next.js 15)** | Primary desktop ops UI | Teal shell, catalog tables + stacked cards ≤900px, View sheets, OptionChips, Targets page, full Analytics |
| **Mobile (Flutter)** | Field CRM & orders | Shared forest-teal tokens, EntityCard metrics, Analytics via Profile; **Targets web-first** (no mobile screen in v1) |
| **API (NestJS)** | System of record | `/api/v1`, JWT, Prisma, throttling, validation |

---

## 6. Business guidelines

- Password minimum 8 characters; never stored in plain text (bcrypt cost 12)
- Profile name unique system-wide; pattern `[A-Za-z0-9._-]{3,64}`
- Orders are immutable-delete in v1 (edit only; cancel to restore stock)
- Payment status is **commercial terms**, not a payment-gateway state
- Invoice status is operational (created/sent), not fiscal e-invoice compliance
- Profile deletion is irreversible and removes all owned data
- LTV / customer performance only include orders with a linked customer

---

## 7. Technical guidelines

| Topic | Standard |
|-------|----------|
| API base | `/api/v1` |
| Auth | Bearer access JWT; refresh via `POST /auth/refresh` |
| Pagination | Default page=1, limit=20, **max 100** |
| Errors | `{ statusCode, error, message, timestamp }` |
| CORS | Configured via `CORS_ORIGIN` (comma-separated) |
| Rate limit | Global throttler (~100 req / 60s); stricter on auth |
| Validation | Whitelist + forbid unknown properties |
| Sandbox | `npm run setup` / `npm run sync` — never overwrite existing `.env` |

---

## 8. Technology stack

| Layer | Technology |
|-------|------------|
| API | NestJS 11, TypeScript, Prisma 6, class-validator, Passport JWT |
| Database | PostgreSQL 16 (Docker Compose locally) |
| Auth | JWT access + refresh, bcrypt cost 12 |
| Web | Next.js 15 (App Router), React 19, Tailwind CSS 4, Recharts |
| Mobile | Flutter (Provider, http, fl_chart, google_fonts, secure storage) |
| Shared | `@umkm-hub/shared` — enums, labels, order total helper |
| Local ops | Docker Compose, `scripts/sync-env.sh` |

Full layout and scripts: root [README.md](../README.md).  
Requirements: [PRD.md](./PRD.md). Variables & formulas: [VARIABLES.md](./VARIABLES.md).

---

## 9. Document map

| Document | Purpose |
|----------|---------|
| [PRD.md](./PRD.md) | Functional & non-functional requirements |
| [PERSONAS.md](./PERSONAS.md) | User personas |
| [USER_STORIES.md](./USER_STORIES.md) | Epics, stories, acceptance criteria |
| [VARIABLES.md](./VARIABLES.md) | Variable catalog + relationship diagrams |
| [METRICS.md](./METRICS.md) | Product metrics & OKRs |
| [DESIGN_GUIDELINES.md](./DESIGN_GUIDELINES.md) | Visual system & UI standards |
| [TRACEABILITY.md](./TRACEABILITY.md) | Requirements → code map |
| [GUARDRAILS.md](./GUARDRAILS.md) | Tech & business limits |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Sandbox & contribution rules |
| [CHANGELOG.md](./CHANGELOG.md) | Development history |
| [PLAN.md](./PLAN.md) | Approved implementation plan |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System architecture overview |
