# UMKM Hub — Implementation Plan

**Status:** Approved & implemented (v1 scaffold complete)  
**Approved:** 2026-07-24  
**Implementation complete through Steps A–E.**  
**Docs refresh:** 2026-07-25 (v1.5.88) — see [CHANGELOG.md](./CHANGELOG.md); living product docs supersede outdated plan snippets where they diverge.

---

## 1. Product Overview

**UMKM Hub** is a multi-tenant CRM + inventory + order platform for Indonesian MSMEs (UMKM). Each user profile owns its own products, customers, and orders. Access is gated by profile login (name + password).

### Benefits
- Centralize product stock and pricing
- Track B2B customer pipeline (partnership stage, status, relationship level)
- Create orders with discounts and payment terms
- Same backend for web and mobile clients

---

## 2. Recommended Tech Stack (Scalable)

| Layer | Choice | Why |
|-------|--------|-----|
| **API** | NestJS (Node.js + TypeScript) | Modular, typed, strong DI, easy horizontal scale |
| **ORM / DB** | Prisma + PostgreSQL | Relational fit for products/orders; migrations; indexes |
| **Auth** | JWT (access + refresh) + bcrypt | Stateless API; works for web + mobile |
| **Web** | Next.js 15 (App Router) + TypeScript + Tailwind | SSR/SPA hybrid; one deploy; SEO-ready marketing later |
| **Mobile** | Flutter (iOS + Android) | One codebase; strong offline-ready patterns later |
| **Validation** | Zod (web) + class-validator (API) + Dart models | Shared contract discipline |
| **API contract** | OpenAPI from NestJS | Generate typed clients for web/mobile later |
| **Deploy (target)** | API + Postgres on Railway/Render; Web on Vercel; Mobile via stores | Clear scale path |
| **Caching (phase 2)** | Redis | Session/rate-limit; product catalog cache |
| **Files (phase 2)** | S3-compatible storage | Product images if needed |

### Why not alternatives
- **Firebase-only**: harder relational order math + reporting later
- **React Native only**: Flutter gives more consistent UI for form-heavy CRM
- **Monolith PHP**: slower typed client sync across web/mobile
- **MongoDB**: order line totals, stock checks, and FKs are clearer in Postgres

### Monorepo layout
```
UMKM Hub/
├── apps/
│   ├── api/          # NestJS
│   ├── web/          # Next.js
│   └── mobile/       # Flutter
├── packages/
│   └── shared/       # Shared enums, DTO shapes, constants (TS)
├── docs/             # Product docs, PRD, personas, etc.
├── docker-compose.yml
└── README.md
```

---

## 3. Domain Model

### Profile (User account)
| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID (auto) | Primary key |
| `profileName` | string | Unique login name |
| `passwordHash` | string | Never stored plain |
| `createdAt` / `updatedAt` | datetime | Audit |

Profile owns all Product, Customer, Order rows (multi-tenant isolation by `profileId`).

### Product
| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID (auto) | |
| `profileId` | FK | Owner |
| `name` | string | |
| `stockQty` | decimal | Volume/qty |
| `pricePerUnit` | decimal | Selling price per qty/volume (derived from packs for non-PCS) |
| `costPerUnit` | decimal? | Optional purchase/COGS per unit (derived from pack costs for non-PCS) |
| `details` | text | Free-form |
| `createdAt` / `updatedAt` | datetime | |

### Customer
| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID (auto) | |
| `profileId` | FK | Owner |
| `name` | string | |
| `title` | string | |
| `companyName` | string | |
| `companyType` | enum | `RESTAURANT`, `HOTEL`, `STORE` |
| `email` | string | optional |
| `phone` | string | optional |
| `address` | string | Street / primary line |
| `additionalAddress` | string | Apt, RT/RW, landmark |
| `postalCode` | string | |
| `city` | string | |
| `province` | string | |
| `country` | string | |
| `partnershipStage` | enum | `WHATSAPP`, `EMAIL`, `DIRECT_VISIT` |
| `status` | enum | `NOT_INTERESTED`, `DOUBTFUL`, `INTERESTED`, `OTHERS` |
| `customerNeeds` | text | |
| `desiredStandards` | text | |
| `promiseAnnualBonus` | boolean | Customer promise |
| `promiseOnTimeDelivery` | boolean | |
| `promisePackagingBox` | boolean | |
| `relationshipLevel` | enum | `NEGOTIATION`, `REQUEST_SAMPLE`, `CLOSING_FIRST_ORDER`, `WILL_CONTACT`, `INITIAL_APPROACH` |
| `approvalPercentage` | int 0–100 | |
| `remarks` | text | |
| `createdAt` / `updatedAt` | datetime | |

### Order
| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID (auto) | |
| `profileId` | FK | Owner |
| `productId` | FK | Selected product |
| `orderDate` | date | Defaults to today |
| `shipmentDate` | date? | Optional planned/actual ship date |
| `productQty` | decimal | Stock units ordered (`packSize × packCount`) |
| `packSizeSnapshot` | decimal | Selected pack size (1 for PCS) |
| `packPriceSnapshot` | decimal | Selling price for one pack (locked from product) |
| `packCount` | decimal | Number of packs / pieces |
| `unitSnapshot` | enum | Unit on order (`unit` in API); from product |
| `unitPriceSnapshot` | decimal | `packPrice / packSize` (internal rate) |
| `stockQtySnapshot` | decimal | Stock shown at order time |
| `lineTotal` | decimal | `unitPrice × productQty` |
| `discountType` | enum | `PERCENTAGE`, `AMOUNT` |
| `discountValue` | decimal | % or absolute amount |
| `totalOrderValue` | decimal | After discount |
| `status` | enum | `PENDING`, `CONFIRMED`, `SHIPPED`, `DELIVERED`, `CANCELLED` |
| `paymentStatus` | enum | `CASH`, `CONSIGNMENT`, `DELAYED_PAYMENT` |
| `createdAt` / `updatedAt` | datetime | |

**Order rules (business logic)**
1. Product must belong to same profile.
2. `lineTotal = pricePerUnit × productQty` (use snapshot price).
3. If `PERCENTAGE`: `total = lineTotal × (1 - discountValue/100)`.
4. If `AMOUNT`: `total = max(0, lineTotal - discountValue)`.
5. On create/modify: optionally decrement/adjust stock (configurable; default **yes** on create).
6. **No delete order** in v1 (per requirements: add + modify only). Soft-cancel flag optional in phase 2.

### WarehouseRestock
| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID (auto) | |
| `profileId` | FK | Owner |
| `productId` | FK | Existing product only |
| `qtyAdded` | decimal | Stock units added (> 0) |
| `restockDate` | date | Defaults to today |
| `notes` | text | Optional |
| `unitSnapshot` | enum | Copied from product |
| `stockBefore` / `stockAfter` | decimal | Snapshots around increment |
| `createdAt` / `updatedAt` | datetime | |

**Warehouse rules**
1. Product must belong to same profile.
2. `stockAfter = stockBefore + qtyAdded`; product.stockQty updated in the same transaction.
3. Create + list only in v1 (no edit/delete restock rows).
4. Product delete cascades restock history.

---

## 4. API Design (NestJS)

Base: `/api/v1`

### Auth / Profile
- `POST /auth/register` — create profile
- `POST /auth/login` — returns JWT
- `POST /auth/refresh`
- `GET /profiles/me`
- `PATCH /profiles/me` — update name/password
- `DELETE /profiles/me` — delete profile + cascade owned data (with confirm)

### Products
- `GET /products` — list (pagination, search)
- `POST /products`
- `GET /products/:id`
- `PATCH /products/:id`
- `DELETE /products/:id`

### Customers
- `GET /customers` — list (filters: status, companyType, relationshipLevel)
- `POST /customers`
- `GET /customers/:id`
- `PATCH /customers/:id`
- `DELETE /customers/:id`

### Orders
- `GET /orders`
- `POST /orders`
- `GET /orders/:id`
- `PATCH /orders/:id`
- *(no DELETE in v1)*

### Warehouse
- `GET /warehouse` — restock history (optional `search` by product name)
- `POST /warehouse` — restock existing product (`productId`, `qtyAdded`, `restockDate?`, `notes?`)
- `GET /warehouse/:id`
- *(no edit/delete restock in v1)*

All resource routes require `Authorization: Bearer <accessToken>` and enforce `profileId` scoping.

---

## 5. Web App (Next.js) — Screens

1. **Login / Register**
2. **Dashboard** — counts: products, customers, open pipeline, recent orders
3. **Products** — table + create/edit/delete modal or page
4. **Customers** — table + rich form (all CRM fields)
5. **Orders** — list + create/edit with product picker (shows stock & price)
6. **Profile settings** — edit name/password, delete account

UI direction: clean B2B ops tool (not marketing landing). Preserve form clarity over decorative cards. Responsive desktop-first with usable mobile browser.

---

## 6. Mobile App (Flutter) — Screens

Mirror web capabilities:
1. Auth (login/register)
2. Home dashboard
3. Products list + form
4. Customers list + form
5. Orders list + form
6. Profile settings

Shared API base URL via env/config. Secure token storage: `flutter_secure_storage`.

---

## 7. Implementation Steps (Incremental)

### Step A — Foundation
1. Docker Compose: PostgreSQL
2. NestJS scaffold + Prisma schema + migrations
3. Auth module (register/login/JWT)
4. Seed script (demo profile) — **done:** `apps/api/prisma/seed.ts` via `npm run setup` / `npm run db:seed`
5. Env sync for sandboxes — **done:** `scripts/sync-env.sh` (`npm run setup` / `npm run sync`)

### Step B — Core API
1. Products CRUD + tests
2. Customers CRUD + tests
3. Orders create/update + calculation tests + stock update
4. OpenAPI export

### Step C — Web
1. Next.js app + auth flow
2. Products UI
3. Customers UI
4. Orders UI
5. Profile settings
6. Basic E2E smoke tests

### Step D — Mobile
1. Flutter project + API client
2. Auth + secure storage
3. Products / Customers / Orders / Profile screens
4. Widget/integration tests for forms & calculations

### Step E — Documentation (per product standards)
Update `/docs` with:
- README (root)
- Product Documentation
- PRD
- User Personas
- User Stories (epics + AC)
- Variables catalog + Mermaid relationship diagrams
- Metrics / OKRs
- Design Guidelines
- Traceability Matrix
- Guardrails
- Changelog

---

## 8. Testing Strategy

| Layer | Coverage focus |
|-------|----------------|
| API unit | Discount math, stock rules, ownership guards |
| API e2e | Auth → CRUD flows |
| Web | Form validation, auth redirect |
| Mobile | Form validation, token persistence |
| Target | ≥80% on calculation + auth paths |

---

## 9. Edge Cases & Guardrails

- Duplicate `profileName` → 409
- Wrong password → 401 (generic message)
- Cross-profile resource access → 404 (no leak)
- Order qty > stock → 400 with clear message (or warning mode; default **reject**)
- Discount % outside 0–100 → 400
- Discount amount > line total → clamp to 0 total or reject (default **reject**)
- Delete product with existing orders → block or soft-archive (default **block**)
- Password min length 8; bcrypt cost ≥ 10
- Never log passwords or tokens
- Rate-limit auth endpoints (phase 1 simple throttle)

---

## 10. Performance Notes

- Indexes: `profileId` on products/customers/orders; unique `profileName`
- Pagination default page size 20
- Order create uses DB transaction (stock + order)
- No N+1: Prisma `include` product on order list
- Benchmark before adding Redis (phase 2)

---

## 11. Out of Scope (v1)

- Multi-user teams under one UMKM
- Product images
- Invoicing / PDF
- Push notifications
- Offline sync
- Role-based admin

---

## 12. Approval Checklist

Please confirm or adjust:

- [ ] Stack: NestJS + Postgres + Next.js + Flutter
- [ ] Multi-tenant by Profile (JWT)
- [ ] Orders: create + modify only (no delete)
- [ ] Stock decremented on order create
- [ ] Orders support multiple product lines
- [ ] Proceed Step A → B → C → D → E incrementally

**Reply `Approved` (with any adjustments) to begin Step A.**
