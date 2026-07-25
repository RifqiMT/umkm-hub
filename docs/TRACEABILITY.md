# Enterprise Traceability Matrix — UMKM Hub

| Field | Value |
|-------|-------|
| **Product** | UMKM Hub |
| **Version** | 1.5.88 |
| **Date** | 2026-07-25 |
| **Purpose** | Map PRD requirements → API → clients → tests/docs |

---

## 1. Requirements matrix

| Requirement | API | Web | Mobile | Tests / Docs |
|-------------|-----|-----|--------|--------------|
| FR-P1 Profile UUID | Prisma `@default(uuid())` | Profile shows id | ProfileScreen | VARIABLES.md |
| FR-P2 Register | `POST /auth/register` | `/register` | LoginScreen register | `auth.service.spec.ts` |
| FR-P3 Login JWT | `POST /auth/login` | `/login` | LoginScreen | `auth.service.spec.ts` |
| FR-P4 Update profile | `PATCH /profiles/me` | `/profile` | ProfileScreen | — |
| FR-P5 Delete profile | `DELETE /profiles/me` | `/profile` | ProfileScreen | Cascade schema |
| FR-PR1 Product ID | Products SKU builder | `/products` | ProductsScreen | `product-sku.spec.ts` |
| FR-PR2 Pack pricing + COGS | `/products` CRUD | `/products` | ProductsScreen | `product-pricing.spec.ts`, `product-pack-math.spec.ts` |
| FR-PR3 Product CRUD / delete guard | ProductsService | `/products` | ProductsScreen | ProductsService |
| FR-C1 Customer ID | Customer SKU builder | `/customers` | CustomersScreen | `customer-sku.spec.ts` |
| FR-C2 Customer fields | `/customers` | `/customers` | CustomersScreen | CustomersService |
| FR-C3 Postal geo fill | `GET /geo/postal-lookup` | Customer form | Customer form | `postal-lookup.util.spec.ts` |
| FR-C4 Customer CRUD + filters | `/customers` query | `/customers` | CustomersScreen | — |
| FR-O1 Order ID | Order SKU builder | `/orders` | OrdersScreen | `order-sku.spec.ts` |
| FR-O2–O3 Multi-line + discount | `/orders` + `order-math` | `/orders` | OrdersScreen | `order-math.spec.ts` |
| FR-O4 Payment status | Order enum | `/orders` | OrdersScreen | shared enums |
| FR-O5 No delete | No DELETE route | Edit/cancel only | Edit/cancel only | PRD non-goal |
| FR-O6 Dates | orderDate / shipmentDate | `/orders` | OrdersScreen | — |
| FR-O7 Status + cancel stock | OrdersService txn | `/orders` | OrdersScreen | OrdersService |
| FR-O8 Invoice | invoiceStatus / invoiceDate | `/orders` | OrdersScreen | — |
| FR-O9–O10 Installments | OrderInstallment | `/orders` | OrdersScreen | `order-installments.spec.ts` |
| FR-O11 Stock txn | OrdersService | Live stock UI | Live stock UI | `order-packs.spec.ts` |
| FR-O12 Customer link | `Order.customerId` | Order form | Order form | customer-performance / LTV |
| FR-O13 Stock shortage UX | 400 stock errors | Live row alerts | Live row alerts | USER_STORIES US-4.4 |
| FR-W1–W6 Warehouse | `/warehouse` | `/warehouse` | WarehouseScreen | `warehouse-dates.spec.ts` |
| FR-T1–T5 Revenue targets | `/revenue-targets` | `/targets` | — (web-first) | `revenue-target-math.spec.ts` |
| FR-A1–A5 Analytics core | `GET /analytics` | `/analytics` | Profile → Analytics | `order-actuals.spec.ts` |
| FR-A6 Product performance | `products[]` | Product table/cards | Product cards | `product-performance.spec.ts` |
| FR-A7 Rate charts | margin / attainment series | Rate charts | Rate charts | `margin-series.spec.ts` |
| FR-A8 Lead times + AOV | duration series | Lead-time + AOV charts | Same | `duration-series.spec.ts` |
| FR-A9 Analytics UX | — | Focus toolbar, KPIs, sections | Sectioned panels | DESIGN_GUIDELINES |
| FR-A10 LTV | `avgLtv`, top customers | LTV charts | LTV charts | `ltv-series.spec.ts` |
| FR-A11 Customer performance | `customers[]` | Customer table/cards | Customer cards | `customer-performance.spec.ts` |
| FR-UX1 Confirm delete | — | ConfirmProvider | Dialogs | DESIGN_GUIDELINES |
| FR-UX2 Touch targets | — | ≤900px cards/actions | ≥44px actions | USER_STORIES E8 |
| FR-UX3 Catalog identity | — | Soft ID pills | Matching cards | DESIGN_GUIDELINES |
| FR-UX4 Compact money | — | `format-money.ts` | `format_money.dart` | VARIABLES.md |
| NFR isolation | JwtAuthGuard + profileId | Token storage | Secure storage | GUARDRAILS |
| Sandbox sync | `scripts/sync-env.sh` | — | `flutter pub get` | CONTRIBUTING.md |
| Sandbox seed | `prisma/seed.ts` | login seed user | login seed user | `npm run db:seed` |

---

## 2. Code map

| Area | Path |
|------|------|
| API entry | `apps/api/src/main.ts` |
| App module | `apps/api/src/app.module.ts` |
| Schema | `apps/api/prisma/schema.prisma` |
| Migrations | `apps/api/prisma/migrations/` |
| Auth | `apps/api/src/auth/` |
| Products | `apps/api/src/products/` |
| Customers | `apps/api/src/customers/` |
| Orders | `apps/api/src/orders/` |
| Warehouse | `apps/api/src/warehouse/` |
| Revenue targets | `apps/api/src/revenue-targets/` |
| Analytics | `apps/api/src/analytics/` |
| Geo | `apps/api/src/geo/` |
| Shared package | `packages/shared/src/` |
| Web shell | `apps/web/src/components/AppShell.tsx` |
| Web pages | `apps/web/src/app/(app)/` |
| Web tokens | `apps/web/src/app/globals.css` |
| Mobile entry | `apps/mobile/lib/main.dart` |
| Mobile theme | `apps/mobile/lib/theme/umkm_theme.dart` |
| Env sync | `scripts/sync-env.sh` |
| Demo seed | `apps/api/prisma/seed.ts` |
| Plan | `docs/PLAN.md` |

---

## 3. API surface (v1)

| Resource | Base path | Methods (summary) |
|----------|-----------|-------------------|
| Health | `/api/v1/health` | GET |
| Auth | `/api/v1/auth` | register, login, refresh |
| Profiles | `/api/v1/profiles/me` | GET, PATCH, DELETE |
| Products | `/api/v1/products` | CRUD |
| Customers | `/api/v1/customers` | CRUD |
| Orders | `/api/v1/orders` | create, list, get, patch |
| Warehouse | `/api/v1/warehouse` | create, list, get |
| Revenue targets | `/api/v1/revenue-targets` | years, get/put/delete by year |
| Analytics | `/api/v1/analytics` | GET `?year=` |
| Geo | `/api/v1/geo/postal-lookup` | GET |

---

## 4. Known coverage gaps (documented)

| Gap | Status |
|-----|--------|
| Mobile revenue targets UI | Deferred (web-first); API ready |
| Web automated unit/E2E suite | Rely on `npm run build` + API tests |
| Multi-user RBAC | Explicit non-goal v1 |

Related: [PRD.md](./PRD.md) · [USER_STORIES.md](./USER_STORIES.md) · [ARCHITECTURE.md](./ARCHITECTURE.md)
