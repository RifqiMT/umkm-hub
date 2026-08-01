# Product Documentation — UMKM Hub

| Field | Value |
|-------|-------|
| **Product name** | UMKM Hub |
| **Version** | 1.5.259 |
| **Date** | 2026-08-01 |
| **Status** | Implemented (v1) |
| **Audience** | Product, engineering, design, operations |
| **Code tip aligned** | v1.5.259 |
| **Docs stamp** | 1.5.259 |

---

## 1. Overview

**UMKM Hub** is a multi-tenant **CRM + inventory + order workspace** for Indonesian micro and small enterprises (UMKM)—especially food and packaging suppliers selling to restaurants, hotels, and stores.

Each seller operates under a single **Profile** (tenant). That profile owns products, customers, warehouse restocks, orders, revenue targets, and analytics. Web (Next.js) and mobile (Flutter) clients share one NestJS REST API and PostgreSQL system of record.

The product replaces fragmented WhatsApp chats, spreadsheets, and memory with:

- A priced product catalog with pack sizes (incl. 1/5/10/25 g·L) and optional COGS
- Structured B2B customer pipeline and delivery address (optional buyer NPWP)
- Multi-line pack-based orders with discounts, installments, **bill vs invoice collection**, **payment due date**, and stock control
- **Printable PDF invoices** and **e-Faktur prep** (CSV/XML) using seller PKP/PPN settings — prep aids, not DJP filing
- **Stock & sales** and **Order totals** insight tables (web) plus filter-aware **statistics**
- Warehouse restock history (create + **edit** on web), **sold history** (order stock draws; Open order on web), and inventory valuation
- Yearly revenue targets with attainment / on-plan / pace / coverage
- Analytics (W/M/Q/Y) plus Dictionary (~101 terms), optional UI language, export/import, forgot/reset password
- Production auth via **Firebase**; optional **Redis/Upstash** for throttling + analytics cache

---

## 2. Product benefits

| # | Benefit | Outcome |
|---|---------|---------|
| 1 | **Single source of truth** | Stock, prices, CRM, and orders stay aligned across devices |
| 2 | **Safer order capture** | Totals, stock checks, amount due (incl. PPN when PKP) |
| 3 | **Structured B2B CRM** | Pipeline fields + optional buyer NPWP |
| 4 | **Invoice readiness** | PDF download + e-Faktur CSV/XML prep from profile fiscal identity |
| 5 | **Warehouse visibility** | Restock create/edit (web), sold history + Open order, valuation |
| 6 | **Catalog & CRM insight** | Stock & sales (STR/ITR/SSR) + Order totals volume (web) |
| 7 | **Revenue planning** | Manual/systematic targets with FeatureStage rates |
| 8 | **Decision-ready analytics** | Multi-granularity charts + domain statistics breakdowns |
| 9 | **Portable data** | JSON/CSV export/import + feature-scoped transfer |
| 10 | **Shared language** | Dictionary (~101 terms) + optional UI translate |
| 11 | **Trustworthy identity** | Firebase or legacy JWT; immutable username/email; verify; sealed location |

---

## 3. Feature domains

### 3.1 Profile & access
- Register/login (username or email); immutable username + email; forgot/reset password; email verify
- Personal details + sealed location; workspace snapshot; Account chip
- **Invoicing identity:** business name/phone/address, NPWP, PKP flag, default PPN % (default 11), tax inclusive, invoice prefix
- Export/import (own or allowlisted all-profiles; `entity=` feature scope); UI language

### 3.2 Products
- CRUD; gram/liter packs **1 / 5 / 10 / 25 / 50 / 100 / 250 / 500 / 1000 / custom** + optional COGS; human `productId`; Warehouse-managed stock
- **Stock & sales** table (web, `GET /products/stock-sales`): Stocks (total with current/sold detail), Revenue (gross primary + net subline), Discount (+%), Cost (+%), Profit (+%), STR, ITR, SSR, Orders, AOV, UPT above Statistics
- **Product performance View** (web): exclusive focus mode (hides stage/filters/catalog/siblings); catalog View unchanged
- Filter-aware summary + **statistics** breakdowns; feature transfer

### 3.3 Customers
- CRUD + postal geo; human `customerId`; optional **buyer NPWP**
- **Order totals** table (web, `GET /customers/order-totals`): Totals / Discount / Order total / Orders / Packs / Cancelled (+ rate) / AOV / UPT above Statistics
- **Order performance View** (web): exclusive focus mode (same as other feature Views)
- Summary + **statistics**; feature transfer

### 3.4 Orders
- Multi-line packs; discount; payment terms; status lifecycle; installments
- **Bill** (CREATED/SENT + billDate) vs **invoice collection** (CREATED/SENT/PARTIALLY_PAID/FULLY_PAID + invoiceDate)
- Collection status derived vs **`amountDue`** (read DTO from fiscal breakdown; not a DB column)
- Optional `paymentDueDate` (UX-required for delayed payment)
- API fields `fiscalInvoiceNumber` / `includePpn` (null → profile `isPkp`); **no dedicated order-form controls in v1** — PDF auto-assigns fiscal # when empty
- **PDF:** `GET /orders/:id/invoice/pdf` (web); **Fiscal prep:** `…/fiscal?format=csv|xml`
- Summary + **statistics**; feature transfer; pagination max 500_000

### 3.5 Warehouse
- Restock create + **edit** (web `PATCH /warehouse/:id`); list/view; no delete in v1
- **Sold history** ledger (`WarehouseSale`) dual-written on order stock draw/restore; read-only `GET /warehouse/sales`; web **Open order** → `/orders?view=<uuid>`; CLI backfill for pre-ledger orders
- **Sold View** (web): exclusive focus mode (hides stage/filters/inventory siblings)
- Summary + **statistics**; feature transfer

### 3.6 Revenue targets (web-first)
- Per-year Manual/Systematic; FeatureStage rates; feature transfer

### 3.7 Analytics
- W/M/Q/Y; progressive load; UPT/APF; mix %; Top/Bottom; CSV/PNG export (web)

### 3.8 Dictionary · Dashboard
- Glossary; period-scoped dashboard board (web)

---

## 4. Core logics

| Topic | Rule |
|-------|------|
| **Tenancy** | JWT `profileId` on every resource query |
| **Human IDs** | `Product.productId`, `Customer.customerId`, `Order.orderId` ≠ UUID PKs/FKs |
| **Order math** | Line = pack × count; `totalOrderValue` after discount |
| **Amount due** | `amountDue = computeFiscalBreakdown(totalOrderValue, PKP/PPN/taxInclusive/includePpn).total` |
| **PPN (PKP)** | Non-PKP: DPP=total, PPN=0. Inclusive: DPP=total/(1+r), PPN=total−DPP. Exclusive: DPP=total, PPN=DPP×r, total=DPP+PPN |
| **Installments** | Sum ≤ **`amountDue`**; `remainingAmount = max(0, amountDue − paid)` |
| **Invoice derive** | Unpaid → mirror bill; partial → PARTIALLY_PAID; paid ≥ amountDue → FULLY_PAID |
| **Bill vs fiscal** | Bill/collection status = ops; PDF/e-Faktur files = documents/prep — **not** DJP filing compliance |
| **Analytics actuals** | Non-cancelled; UTC `orderDate` (shared with targets) |
| **Export passwords** | Own=`pwd1:`; privileged=`SANDBOX_EXPORT_PASSWORDS` |
| **Pagination** | Default 20; max **500_000** |

---

## 5. Platforms

| Client | Role | Notes |
|--------|------|-------|
| **Web** | Primary ops | Targets; Analytics CSV/PNG; PDF/fiscal; warehouse edit; Stock & sales; Order totals; Sold history Open order; statistics; invoicing |
| **Mobile** | Field CRM/orders | Profile invoicing; Sold history list/view; Analytics/Dictionary; **web-first:** Targets, PDF/fiscal, restock edit, Stock & sales, Order totals, statistics UI, Open order |
| **API** | System of record | `/api/v1` incl. Firebase session/register, invoice PDF/fiscal, stock-sales, order-totals, warehouse sales, Redis-backed throttle/cache when configured |

---

## 6. Business guidelines

- Password ≥8; bcrypt 12; anti-enumeration on register/forgot-password
- Username + email unique and immutable
- Orders: no delete; cancel restores stock
- Payment status = commercial terms (not PSP)
- PDF/e-Faktur prep supports UMKM ops; **legal DJP submission remains seller responsibility**
- LTV/customer analytics require order→customer link
- Cross-tenant export/import only for allowlisted operators

---

## 7. Technical guidelines

| Topic | Standard |
|-------|----------|
| API base | `/api/v1` |
| Auth | JWT (legacy) and/or Firebase Auth; register-availability; verify; forgot/reset |
| Invoice | `GET /orders/:id/invoice/pdf`, `…/fiscal?format=csv\|xml` |
| Insights | `GET /products/stock-sales`, `GET /customers/order-totals`, `GET /warehouse/sales` |
| Pagination | Default 20; max 500_000 |
| Cache / limits | Optional Redis/Upstash for throttle + analytics cache |
| Env | See CONTRIBUTING / ENV-LOCAL / DEPLOY — Firebase, Redis, location, reset, export, Resend |
| Sandbox | `npm run setup` / `sync` — never overwrite `.env` |

---

## 8. Technology stack

| Layer | Technology |
|-------|------------|
| API | NestJS 11, Prisma 6, PostgreSQL 16, JWT/bcrypt, optional Firebase Admin + Redis/Upstash |
| Web | Next.js 15, React 19, Tailwind 4, Recharts, Firebase client (prod) |
| Mobile | Flutter (Provider, fl_chart, Manrope) |
| Shared | `@umkm-hub/shared` (enums, pack sizes, helpers) |
| Local | Docker Compose, `scripts/sync-env.sh` |

---

## 9. Document map

[PRD](./PRD.md) · [PERSONAS](./PERSONAS.md) · [USER_STORIES](./USER_STORIES.md) · [VARIABLES](./VARIABLES.md) · [METRICS](./METRICS.md) · [DESIGN_GUIDELINES](./DESIGN_GUIDELINES.md) · [TRACEABILITY](./TRACEABILITY.md) · [GUARDRAILS](./GUARDRAILS.md) · [ARCHITECTURE](./ARCHITECTURE.md) · [CONTRIBUTING](./CONTRIBUTING.md) · [CHANGELOG](./CHANGELOG.md) · [PLAN](./PLAN.md)
