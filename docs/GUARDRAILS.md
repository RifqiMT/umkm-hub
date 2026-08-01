# Guardrails — UMKM Hub

| Field | Value |
|-------|-------|
| **Product** | UMKM Hub |
| **Version** | 1.5.250 |
| **Date** | 2026-08-01 |
| **Purpose** | Technical and business limitations that constrain product development |

---

## 1. Technical guardrails

| Guardrail | Rationale |
|-----------|-----------|
| Never commit secrets (`.env` gitignored); rotate JWT secrets for production | Prevent credential leaks |
| Do not log passwords, tokens, or full Authorization headers | Security & compliance hygiene |
| Profile location/IP: city/country sealed AES-256-GCM (`loc1:…`) at rest; IP one-way HMAC (`h1:…`); never plaintext IP in DB; decrypt city/country only for the authenticated owner **or** a privileged data-export allowlist (`DATA_EXPORT_PROFILE_NAMES`) | Privacy |
| Email verify tokens: store HMAC only; single-use; 24h TTL; do not log raw tokens; resend cooldown | Security |
| All resource queries filter by `profileId` from JWT (no IDOR), **except** allowlisted `GET /export` / `POST /import` which may merge all tenants (`scope=all-profiles`) | Multi-tenant isolation |
| Data export/import: every authenticated user may export/import own data (`scope=own-profile`); merge-import upserts by id + natural keys (parents, order lines, installments, restocks, warehouse sales by `orderLineId`); dumps include `warehouseSales`; own-profile exports seal `passwordHash` as `pwd1:…`; allowlisted `all-profiles` dumps include plaintext `password` from `SANDBOX_EXPORT_PASSWORDS` (no `passwordHash`); `locationIpHash` and verification token hashes never included; optional `entity=` feature scope (Orders carries related products/customers/sales); throttle ≤5/hour | Abuse + secret hygiene |
| Order create/update runs in a DB transaction with stock updates | Consistency under concurrency |
| Installment sum must be ≤ **`amountDue`** (fiscal total), not raw `totalOrderValue` alone | Correct collection when PPN applies |
| Warehouse restock create/edit runs in a DB transaction (stock + history snapshots) | Auditability |
| Order stock draws dual-write `WarehouseSale` (before/after) in the same transaction; order edit clears + rewrites sales; cancel clears sales when restoring stock | Auditable sold history |
| Sold history is read-only from Warehouse UI — mutations only via Orders | Clear ownership of inventory mutations |
| Historical sold rows use CLI backfill (`backfill:warehouse-sales`); do not invent before/after on the list hot path | Keep API reads lean; one-time ops for legacy data |
| Reject order qty > available stock | Prevent negative inventory |
| Reject warehouse `qtyAdded` ≤ 0 on create; edit adjusts stock by signed delta with validation | Data integrity |
| Reject discount % > 100 or amount > line total | Commercial sanity |
| Block product delete when order lines exist | Referential integrity (`onDelete: Restrict`) |
| Auth + global endpoints throttled (Nest Throttler) | Abuse resistance |
| Pagination default limit 20; hard-capped at **500_000** (`LIST_PAGE_MAX`) | Large sandbox catalogs; still DoS-bounded |
| Do not auto-migrate on API process start | Sandboxes use `sync` / `migrate deploy` |
| Never overwrite existing local `.env` / `.env.local` from automation | Protect local secrets & overrides |
| Schema PRs without committed Prisma migration are rejected | Sandbox compatibility |
| Money math uses 4 decimal places; shared helpers for order/target/analytics | Avoid drift across clients |
| Prefer measured caching: Redis/Upstash when configured for multi-instance; else short in-process TTL | Performance Guardrail — profile first |

---

## 2. Business guardrails

| Guardrail | Rationale |
|-----------|-----------|
| One profile = one tenant owner; **no RBAC / team seats in v1** | Scope control; personas share credentials consciously |
| Username unique (case-insensitive) and **immutable** after registration | Stable login identity |
| Email required, unique (case-insensitive), and **immutable** after registration | 1:1 with username; anti-account takeover via email change |
| Register / register-availability never reveal which of username or email collided | Anti-enumeration |
| Orders may include multiple lines; discount is **order-level** only | Simpler commercial model |
| **No order delete** in v1 — edit or cancel | Audit trail; stock restore via cancel |
| Payment status is **terms classification**, not PSP result | Avoid false “paid” semantics |
| Bill status is operational (created/sent) + bill date; invoice status tracks collection from installments vs **amountDue** | Ops collection — not DJP filing |
| PDF + e-Faktur CSV/XML are **prep aids**; seller remains responsible for official DJP submission | Legal scope |
| Profile deletion is irreversible and removes owned data | Explicit user confirmation required |
| Analytics LTV & customer performance only include orders with `customerId` | Honest metrics; unlinked orders omitted |
| Revenue targets: clearing monthly **or** annual clears the **whole year** | Prevent month/annual divergence |
| Annual displayed target always equals sum of months when months exist | Single source of plan truth |
| Product stock is **not** edited on Products UI — Warehouse only (create + **web edit**) | Clear ownership of inventory mutations |
| Gram/liter products allow **exactly one** active pack from sizes **1…1000 + custom** | Avoid ambiguous pricing |
| Sold history is read-only from Warehouse UI — mutations only via Orders; historical gaps need backfill CLI | Clear ownership of inventory mutations |
| Mobile **Targets**, **PDF/fiscal**, warehouse **edit**, **Stock & sales**, **Order totals**, **statistics UI**, Sold history **Open order** deferred (web-first) | Focus field app on CRM/orders |

---

## 3. Performance guardrails

| Guardrail | Guidance |
|-----------|----------|
| Indexes on `profileId` (+ common filters) | Keep list queries selective |
| Avoid N+1 on order list | `include` lines + products as needed |
| No SKU backfill on list/read hot paths | Use CLI/migration scripts only (`backfillMissingSkus`) |
| Derive analytics actuals from the window load | Do not re-fetch the same non-cancelled orders for monthly buckets |
| Analytics progressive `include` / `granularity` | Default (omitted) remains full overview; clients should request only needed parts for first paint |
| Analytics window cache (~45s; Redis/Upstash when configured, else in-process) | Reuse order/catalog load across progressive requests; cap map size |
| Order list stays lean | Slim select + `lineCount`/`installmentCount`/`paidAmount`; full lines/installments via `GET /orders/:id` |
| Prefer SQL aggregates for summaries | Inventory value via `SUM(stock×price)`; avoid hydrating all products for stage KPIs |
| No >10% regression on critical paths without benchmarks | Order create, analytics year load |
| Suggest pagination / indexes before new hot paths | Especially analytics window queries |
| Compact money formatting is display-only | Do not change stored precision for UI |

---

## 4. Platform & sandbox guardrails

| Guardrail | Guidance |
|-----------|----------|
| Docker (or equivalent `DATABASE_URL`) for local Postgres | Default Compose: Postgres 16 |
| Flutter SDK required to run mobile | Source complete under `apps/mobile` |
| Every sandbox runs `npm run sync` (or `setup` once) after pull | Migrations + deps |
| Web: one `next` process; don’t `build` while `dev` is running | Avoid corrupted `.next` |
| Mobile API base via `--dart-define=API_BASE_URL=…` | Emulator often `10.0.2.2` |
| Shared enums live in `packages/shared` | Keep web/API labels aligned |

---

## 5. Product development process guardrails

| Guardrail | Guidance |
|-----------|----------|
| Complex features: plan first, wait for approval | See `docs/PLAN.md` pattern |
| Incremental change — one coherent slice at a time | Prefer small PRs |
| Tests for happy path, edges, errors before finalize | API Jest + mobile math tests |
| Docs stay version-aligned with CHANGELOG tip | Update PRODUCT/PRD stamps |
| No Git commit/push without explicit user approval | Team Git Safety rule |
| No secrets in docs examples beyond published sandbox seed | Sandbox password is local-dev only |

---

## 6. Explicit out-of-scope (do not silently expand)

- Multi-user teams / roles / invitations  
- Offline sync / conflict resolution  
- Push notifications  
- **Full DJP e-Faktur filing / legal tax compliance** (PDF + CSV/XML prep are in-product; official submission is out of scope)  
- Payment gateway capture/settle  
- Multi-warehouse / multi-currency  
- Product images / attachments  

If a stakeholder asks for these, treat as a **new PRD cycle**, not a “small fix”.

---

## 7. Related documents

- [PRD.md](./PRD.md) non-goals  
- [CONTRIBUTING.md](./CONTRIBUTING.md)  
- [METRICS.md](./METRICS.md)  
- [ARCHITECTURE.md](./ARCHITECTURE.md)  
