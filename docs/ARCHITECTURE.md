# Architecture — UMKM Hub

| Field | Value |
|-------|-------|
| **Product** | UMKM Hub |
| **Version** | 1.5.265 |
| **Date** | 2026-08-01 |

---

## 1. System overview

```mermaid
flowchart TB
  subgraph Clients
    Web[Next.js Web :3000]
    Mobile[Flutter Mobile]
  end

  subgraph API["NestJS API :3001 /api/v1"]
    Auth[Auth JWT + Firebase]
    Domain[Products Customers Orders Warehouse Targets Analytics Geo]
    Invoice[Invoice PDF + e-Faktur prep]
    Stats[Domain statistics]
    Insights[Stock-sales + Order-totals + Sold history]
    Cache[Redis / Upstash optional]
  end

  DB[(PostgreSQL 16)]
  Shared["packages/shared enums + pack sizes + helpers"]

  Web -->|HTTPS JSON Bearer| Auth
  Mobile -->|HTTPS JSON Bearer| Auth
  Auth --> Domain
  Domain --> Invoice
  Domain --> Stats
  Domain --> Insights
  Domain --> DB
  Invoice --> DB
  Insights --> DB
  Domain -.-> Cache
  Web -.-> Shared
  API -.-> Shared
```

**Tenancy model:** JWT `sub` = `profileId` (or Firebase ID token resolved to profile). Every domain query is scoped to that profile.

---

## 2. Repository layout

```
UMKM Hub/
├── apps/
│   ├── api/          # NestJS system of record
│   ├── web/          # Next.js ops UI
│   └── mobile/       # Flutter field client
├── packages/
│   └── shared/       # TS enums, labels, calculateOrderTotals
├── docs/             # Product & engineering documentation
├── scripts/
│   └── sync-env.sh   # Sandbox bootstrap / sync
├── docker-compose.yml
├── package.json      # Root orchestration scripts
└── README.md
```

Root scripts use `npm --prefix` (not a full Turborepo/pnpm workspace).

---

## 3. API architecture

| Concern | Implementation |
|---------|----------------|
| Framework | NestJS 11 modular controllers/services |
| ORM | Prisma 6 |
| Auth | Passport JWT (~15m access / ~7d refresh) **or** Firebase ID token when Admin SDK configured |
| Validation | class-validator whitelist + forbid unknown |
| Errors | Global filter → `{ statusCode, error, message, timestamp }` |
| Throttling | `@nestjs/throttler` — Redis/Upstash storage when configured, else in-memory |
| Cache | Optional Redis/Upstash for analytics window cache |
| Health | `GET /api/v1/health` |

### Domain modules
`auth` (legacy + Firebase), `profiles`, `products` (incl. stock-sales), `customers` (incl. order-totals), `orders` (incl. invoice PDF/fiscal + WarehouseSale dual-write), `warehouse` (restock + sold history), `revenue-targets`, `analytics`, `geo`, `export`, `import`, `translate`, `redis`, `prisma`, `health`

### Invoice & fiscal prep
- `GET /orders/:id/invoice/pdf` — printable PDF (`invoice-pdf.ts`); auto-assigns `fiscalInvoiceNumber` when empty
- `GET /orders/:id/invoice/fiscal?format=csv|xml` — e-Faktur-oriented **prep** export (`fiscal-invoice.ts`); **not** DJP submission
- Seller identity from Profile (`businessName`, `npwp`, `isPkp`, `defaultPpnPercent`, `taxInclusive`, `invoicePrefix`)
- Buyer NPWP from `Customer.npwp` when linked
- **`amountDue`** = fiscal breakdown total of `totalOrderValue` (read DTO); installments and Paid % use amountDue

### Domain insights (web-primary)
- `GET /products/stock-sales` — STR / ITR / SSR + money columns (`product-stock-sales.ts`)
- `GET /customers/order-totals` — linked commercial + volume columns (`customer-order-totals.ts`)
- `GET /warehouse/sales` — sold ledger rows; dual-written in order stock txn; backfill CLI for history

### Domain statistics
Filter-aware mix breakdowns embedded on `GET …/summary` responses for products, customers, orders, and warehouse (`statistics` via `*-statistics.ts`, `statistics-buckets.ts`), alongside headline summary rates.

### Privileged / scoped data export & import
Every authenticated user may call:
- `GET /api/v1/export/eligibility` → `{ allowed, scope }`
- `GET /api/v1/export?format=json|csv|csv-unified` [& `entity=products|customers|orders|warehouse|targets`]
- `POST /api/v1/import?format=json|csv-unified` [& `entity=`] (multipart `file`)

Allowlisted `profileName` values (`DATA_EXPORT_PROFILE_NAMES`, default `rifqi_tjahyono`) get `scope=all-profiles`; everyone else gets `own-profile`. City/country decrypted on export. **Own-profile** includes sealed bcrypt `passwordHash` (`pwd1:…`). **All-profiles** includes plaintext `password` from `SANDBOX_EXPORT_PASSWORDS` (no `passwordHash`). IP and verify-token hashes omitted. Throttled (~5/hour). Import restores passwords from sealed or plaintext values; location re-sealed.

### Auth extras
- Forgot/reset password: HMAC tokens (`PasswordResetToken`), TTL 24h, cooldown 60s
- Firebase (optional): `GET /auth/config`, `POST /auth/firebase/session`, `POST /auth/firebase/register`; Profile.`firebaseUid`; see ENV-LOCAL / DEPLOY-VERCEL
- Translate: `POST /translate/batch` + `batch-public` (≤40×500 chars)

### Critical transactional paths
1. **Order create/update** — validate stock, write lines/installments (sum ≤ **amountDue**), adjust `Product.stockQty`, dual-write **WarehouseSale**
2. **Order cancel** — restore stock for all lines; clear related WarehouseSale rows
3. **Warehouse restock create** — increment stock + write history snapshots
4. **Warehouse restock edit** (`PATCH /warehouse/:id`) — adjust stock by qty delta + refresh snapshots
5. **PDF download** — may persist `fiscalInvoiceNumber` if previously empty
6. **Sold history backfill** — idempotent CLI reconstructs WarehouseSale for pre-ledger orders

### Shared aggregation
`loadOrderActuals` powers both **Targets** and **Analytics** so attainment never drifts.

### Analytics contract
`GET /api/v1/analytics` accepts:

| Query | Values | Notes |
|-------|--------|-------|
| `years` (preferred) / `year` | omit → current UTC year; `all`; `2024,2025` | Timeline scope (`analytics-period.ts`) |
| `include` | `summary,series,products,customers` | Progressive load; omit → all |
| `granularity` | `weekly\|monthly\|quarterly\|annual\|all` | Which series to build |

Single-year annual context loads a rolling **10-year** window. Window cache: Redis/Upstash when configured, else in-process TTL **45s** (`analytics-cache.ts`).

### Auth & profile identity
- Register requires unique username + email (case-insensitive); `POST /auth/register-availability` is anti-enumerating
- Login accepts `login` (username or email) **or** Firebase session exchange when enabled
- Username and email immutable after register; email verify via one-time link (or Firebase emailVerified sync)
- Location city/country sealed (AES-GCM); IP hashed (HMAC)
- Optional `firebaseUid` links Profile to Firebase Auth

---

## 4. Data model (summary)

Profile owns: Product, Customer, Order, WarehouseRestock, WarehouseSale, RevenueTargetPlan, EmailVerificationToken, PasswordResetToken.  
Profile fiscal identity: `businessName`, `businessPhone`, `businessAddress`, `npwp`, `isPkp`, `defaultPpnPercent`, `taxInclusive`, `invoicePrefix`.  
Human codes: `Product.productId`, `Customer.customerId`, `Order.orderId` (distinct from UUID PKs/FKs).  
Customer may store `npwp` for B2B buyer identity.  
Order has: OrderLine[], OrderInstallment[], WarehouseSale[] (1:1 per line when stock drawn), optional Customer FK, bill + invoice collection fields, `paymentDueDate`, `fiscalInvoiceNumber`, `includePpn`; reads expose **`amountDue`**.  
RevenueTargetPlan has: RevenueTargetMonth[12].

Full field catalog: [VARIABLES.md](./VARIABLES.md). Schema: `apps/api/prisma/schema.prisma`.

---

## 5. Web architecture

| Concern | Implementation |
|---------|----------------|
| Framework | Next.js 15 App Router, React 19 |
| Styling | Tailwind CSS 4 + `globals.css` design tokens |
| Auth UX | Login/register/verify-email; token in client storage; `lib/api.ts` |
| Charts | Recharts (code-split; progressive panels) |
| Shell | `AppShell` (sidebar / tablet rail / phone bottom tabs) |
| Glossary | `/glossary` + `lib/glossary/*` |

Routes: `/dashboard`, `/products`, `/customers`, `/orders`, `/warehouse`, `/targets`, `/analytics`, `/glossary`, `/profile`, `/verify-email`.

---

## 6. Mobile architecture

| Concern | Implementation |
|---------|----------------|
| Framework | Flutter, Provider |
| HTTP | `api_service.dart` |
| Session | `session_controller.dart` + secure storage |
| Charts | fl_chart (viewport-lazy) |
| Theme | `umkm_theme.dart` (Manrope + UmkmColors) |
| Glossary | Profile → Dictionary (`glossary_catalog.dart`, synced from web) |

Screens: login, home shell tabs (products, customers, orders, warehouse, profile), analytics + dictionary (from profile).  
**Targets:** API-ready; UI web-first in v1.

---

## 7. Cross-cutting concerns

| Concern | Approach |
|---------|----------|
| IDOR prevention | Always `where: { profileId, … }` |
| Enums | Prisma enums + `packages/shared` + mobile Dart mirrors |
| Money display | Client `formatMoney` / `formatQty` / exact tooltips |
| Analytics progressive load | Clients fetch summary+active series first, then tables |
| Env | `.env.example` templates; sync never overwrites |
| Local DB | Docker Compose Postgres 16 |

---

## 8. Deployment targets (planned)

| Component | Target |
|-----------|--------|
| API + Postgres | Railway / Render (or equivalent) |
| Web | Vercel |
| Mobile | App stores |

Redis/Upstash for distributed throttling + analytics cache is **optional in v1** when configured (falls back to in-memory / in-process). Object storage remains **phase 2** — only after measured need ([GUARDRAILS.md](./GUARDRAILS.md)).

---

## 9. Related documents

- [PRODUCT.md](./PRODUCT.md)  
- [TRACEABILITY.md](./TRACEABILITY.md)  
- [CONTRIBUTING.md](./CONTRIBUTING.md)  
- [PLAN.md](./PLAN.md)  
