# Enterprise Traceability Matrix — UMKM Hub

| Field | Value |
|-------|-------|
| **Product** | UMKM Hub |
| **Version** | 1.5.265 |
| **Date** | 2026-08-01 |
| **Purpose** | Map PRD requirements → API → clients → tests/docs |

---

## 1. Requirements matrix

| Requirement | API | Web | Mobile | Tests / Docs |
|-------------|-----|-----|--------|--------------|
| FR-P1 Profile UUID | Prisma `@default(uuid())` | Profile shows id | ProfileScreen | VARIABLES.md |
| FR-P2 Register | `POST /auth/register`; `POST /auth/register-availability` (unified available/taken) | `/register` live check + conflict CTA | LoginScreen register live check | `registration-conflict.util.spec.ts` |
| FR-P2b Unique email | `PATCH /profiles/me` rejects email changes; email NOT NULL + immutable | Profile email read-only | ProfileScreen email read-only | `email-conflict.util.spec.ts` |
| FR-P3 Login JWT | `POST /auth/login` (`login` or `profileName`) | `/login` | LoginScreen | `login-identifier.util.spec.ts` |
| FR-P4 Update profile | `PATCH /profiles/me` (password/personal; rejects username/email changes) | `/profile` username+email read-only | ProfileScreen | — |
| FR-P5 Delete profile | `DELETE /profiles/me` | `/profile` | ProfileScreen | Cascade schema |
| FR-P6 Profile workspace UI | Summaries: `/products|customers|orders/summary` | `/profile` (`.umkm-profile*`) | ProfileScreen | US-1.4 |
| FR-P7 Personal details + IP location | `PATCH /profiles/me`; `POST /profiles/me/detect-location` | `/profile` personal form | ProfileScreen personal | `ip-location.util.spec.ts` |
| FR-P8 Email/account verify | `POST …/email/send-verification`; `POST /auth/verify-email` | `/verify-email`, Profile badges | ProfileScreen verify | `email-verification.util.spec.ts` |
| FR-P9 Register anti-enumeration | Unified 409 + `POST /auth/register-availability` | `/register` conflict CTA | LoginScreen register | `registration-conflict.util.spec.ts` |
| FR-P10 Data export | `GET /export`, `GET /export/eligibility`; own=`pwd1:` hash; all-profiles=`password` via `SANDBOX_EXPORT_PASSWORDS` | `/profile` Export | FeatureDataTransfer / Profile | `export-allowlist.spec.ts`, `export-password.util.spec.ts` |
| FR-P11 Merge import | `POST /import?format=json|csv-unified`; natural keys for parents + lines/installments/restocks/sales (`orderLineId`) | `/profile` Import | Profile / FeatureDataTransfer | `import.service` / `import-dedupe` / `import.spec.ts` |
| FR-P12 Forgot/reset password | `POST /auth/forgot-password`, `reset-password` | `/forgot-password`, `/reset-password` | Login forgot flow | password-reset specs |
| FR-P13 Feature-scoped transfer | `entity=` on export/import | FeatureDataTransfer on domain pages | FeatureDataTransfer | `export-entities.ts` |
| FR-P14 Invoicing identity | Profile fiscal fields on `PATCH /profiles/me` | `/profile` invoicing section | ProfileScreen invoicing | VARIABLES Profile fiscal; US-1.11 |
| FR-P15 Firebase Auth | `GET /auth/config`; `POST /auth/firebase/session`; `POST /auth/firebase/register`; guard accepts Firebase ID token | Firebase web flows | Firebase mobile when configured | `firebase-auth.service.ts`; ENV-LOCAL / DEPLOY |
| FR-PR1 Product code | `Product.productId` builder | `/products` | ProductsScreen | `product-sku.spec.ts` |
| FR-PR2 Pack pricing + COGS | `/products` CRUD | `/products` | ProductsScreen | `product-pricing.spec.ts`, `product-pack-math.spec.ts` |
| FR-PR3 Product CRUD / delete guard | ProductsService | `/products` | ProductsScreen | ProductsService |
| FR-PR4 Product stock & sales | `GET /products/stock-sales` | `ProductStockSalesSection` + exclusive **Product performance** View (`ProductStockSalesPerformanceView`, page focusMode) | — (web-first) | `product-stock-sales.spec.ts` |
| FR-C1 Customer code | `Customer.customerId` builder | `/customers` | CustomersScreen | `customer-sku.spec.ts` |
| FR-C2 Customer fields | `/customers` | `/customers` | CustomersScreen | CustomersService |
| FR-C3 Postal geo fill | `GET /geo/postal-lookup` | Customer form | Customer form | `postal-lookup.util.spec.ts` |
| FR-C4 Customer CRUD + filters | `/customers` query | `/customers` | CustomersScreen | — |
| FR-C5 Customer NPWP | `Customer.npwp` | Customer form | Customer form | VARIABLES; US-3.x |
| FR-C6 Customer order totals | `GET /customers/order-totals` | `CustomerOrderTotalsSection` + exclusive **Order performance** View (`CustomerOrderTotalsPerformanceView`, page focusMode) | — (web-first) | `customer-order-totals.spec.ts` |
| FR-O1 Order code | `Order.orderId` builder | `/orders` | OrdersScreen | `order-sku.spec.ts` |
| FR-O2–O3 Multi-line + discount | `/orders` + `order-math` | `/orders` | OrdersScreen | `order-math.spec.ts` |
| FR-O4 Payment status | Order enum | `/orders` | OrdersScreen | shared enums |
| FR-O5 No delete | No DELETE route | Edit/cancel only | Edit/cancel only | PRD non-goal |
| FR-O6 Dates | orderDate / shipmentDate | `/orders` | OrdersScreen | — |
| FR-O7 Status + cancel stock | OrdersService txn | `/orders` | OrdersScreen | OrdersService |
| FR-O8 Bill + invoice collection | `billStatus`/`billDate` + derived `invoiceStatus`/`invoiceDate` vs **amountDue** | `/orders` live preview | OrdersScreen | `order-installments.spec.ts`; `fiscal-invoice.ts` |
| FR-O9–O10 Installments | OrderInstallment; sum ≤ **amountDue** | `/orders` | OrdersScreen | `order-installments.spec.ts` |
| FR-O11 Stock txn | OrdersService | Live stock UI | Live stock UI | `order-packs.spec.ts` |
| FR-O12 Customer link | `Order.customerId` | Order form | Order form | customer-performance / LTV |
| FR-O13 Stock shortage UX | 400 stock errors | Live row alerts | Live row alerts | USER_STORIES US-4.4 |
| FR-O14 Date range filters | `OrderListQueryDto` date from/to + status/paymentStatus | `DateRangeFilter` + multi-select on Orders | — | VARIABLES list filters |
| FR-O15 Payment due date | `Order.paymentDueDate` | Order form (required UX for delayed) | Order form | VARIABLES |
| FR-O16 PDF invoice | `GET /orders/:id/invoice/pdf` | Orders download PDF | — (web-first) | `invoice.service.ts`, `invoice-pdf.ts` |
| FR-O17 e-Faktur prep | `GET /orders/:id/invoice/fiscal?format=csv\|xml` | Orders fiscal download | — (web-first) | `fiscal-invoice.ts` |
| FR-O18 amountDue / includePpn / fiscal # | `resolveOrderAmountDue`; Order fields | Paid % / PDF auto # (no form editors) | Order math via amountDue | VARIABLES; PRODUCT |
| FR-W1–W4, W6 Warehouse core | `/warehouse` create/list/get/summary | `/warehouse` | WarehouseScreen | `warehouse-dates.spec.ts` |
| FR-W5 Warehouse edit | `PATCH /warehouse/:id` (stock delta) | `/warehouse` edit | — (mobile edit deferred) | WarehouseService |
| FR-W7 Sold ledger write | `OrdersService.drawStockWithSales` / `clearOrderSales` | — | — | Order create/update/cancel tx |
| FR-W8 Sold history read | `GET /warehouse/sales`, `GET /warehouse/sales/:id` | Sold history + exclusive Sold View (`WarehouseSoldHistoryView`, page focusMode) + **Open order** `/orders?view=` | WarehouseScreen Sold history | `serialize-warehouse-sale.spec.ts` |
| FR-W9 Sold history backfill | `src/warehouse/backfill-sales.ts` / `npm run backfill:warehouse-sales -w api` | — | — | CLI idempotent insert |
| FR-T1–T5 Revenue targets | `/revenue-targets` | `/targets` | — (web-first) | `revenue-target-math.spec.ts` |
| FR-T6 Targets stage rates | annual + month actuals | `feature-stage-metrics.ts` on `/targets` | — | VARIABLES targets stage rates |
| FR-A1–A5 Analytics core | `GET /analytics` | `/analytics` | Profile → Analytics | `order-actuals.spec.ts` |
| FR-A6 Product performance | `products[]` | Product table/cards | Product cards | `product-performance.spec.ts` |
| FR-A6b First/avg repeat order days | `firstRepeatOrderDays`, `avgRepeatOrderDays` on products/customers | Combined Repeat column (1st + avg sub) | Combined Repeat metric | `repeat-order-duration.spec.ts` |
| FR-A7 Rate charts | margin / attainment series (W/M/Q/Y) | Rate charts | Rate charts | `margin-series.spec.ts` |
| FR-A10 LTV + Top/Bottom | `avgLtv`, customer ranks | Top/Bottom 5 LTV | Top/Bottom 5 LTV | `ltv-series.spec.ts` |
| FR-A12 Product revenue + Top/Bottom | `avgProductRevenue`, product ranks | Top/Bottom 5 revenue | Top/Bottom 5 revenue | `product-revenue-series.spec.ts` |
| FR-A8 Lead times + AOV | duration series (ship/invoice/pay) | Lead-time + AOV charts | Same | `duration-series.spec.ts` |
| FR-A13 Units Per Transaction | `basket-series.ts` (`avgBasketSize`) | UPT chart + lens | UPT chart + KPI | `basket-series.spec.ts` |
| FR-A15 Avg purchase frequency | `purchase-frequency-series.ts` | APF chart + lens | APF chart + KPI | `purchase-frequency-series.spec.ts` |
| FR-A16 Status & payment mix | `status-payment-series.ts` + attach on overview series | Stacked % mix charts | Stacked % mix charts | `status-payment-series.spec.ts` |
| FR-A17 Chart Graph/Table toggle | — | Lens `chartView` + `ChartPanel`/`SeriesTable` | Period Display chips + `_ChartCard`/`_MetricTable` | — |
| FR-A18 Chart fullscreen | — | `AnalyticsFullscreenProvider` (host FS) + `ChartPanel.is-fullscreen` | `_FsDeck` + `_ImmersiveFullscreenChart` | — |
| FR-D1–D4 Dashboard KPIs | `GET …/summary` (+ orderDate window) | `/dashboard` period + domains | — | `dashboard-period.spec.ts`, DESIGN_GUIDELINES |
| FR-A9 Analytics UX | — | Lens (Weekly/Monthly/Quarterly/Annual + multi-year TimelineFilter), chart sections | Same | DESIGN_GUIDELINES |
| FR-A2b Quarterly series | `iso-week.ts` (`listCalendarQuartersInYears`), `quarter-series.ts` | Quarterly charts + targets | Quarterly charts + targets | `quarter-series.spec.ts`, `iso-week.spec.ts` |
| FR-A14 Weekly series | `iso-week.ts` (`listIsoWeeksInCalendarYears`), `week-series.ts`, `weekly-target.ts`, `analytics-period.ts` | Weekly charts + targets (full timeline) | Weekly charts + targets | `iso-week.spec.ts`, `weekly-target.spec.ts`, `analytics-period.spec.ts` |
| FR-A11 Customer performance | `customers[]` | Customer table/cards | Customer cards | `customer-performance.spec.ts` |
| FR-A19 Progressive analytics | `include` + `granularity` query | AnalyticsWorkspace progressive + LazyMount | analytics_screen progressive + `_ViewportLazy` | `analytics-query.spec.ts` |
| FR-A20 Analytics panel export | Client CSV/PNG via `lib/analytics-export.ts` | ChartPanel PNG; SeriesTable + catalog CSV | — | `analytics-export.test.ts` |
| Perf inventory SQL | `product-inventory-sql` | Warehouse/Products summary | — | `product-inventory-sql.spec.ts` |
| Perf lean order list | `orderListSelect` + installment groupBy | Orders list (full on view) | Orders list + fetch on view/edit | `order-installments.spec.ts` |
| FR-UX1 Confirm delete | — | ConfirmProvider | Dialogs | DESIGN_GUIDELINES |
| FR-UX4 Metric tooltips | — | `AppTooltip` + FeatureStage / Analytics chart cards | — | DESIGN_GUIDELINES |
| FR-UX5 Dictionary / Glossary | — | `/glossary` + `lib/glossary/*` | Profile → Dictionary (`glossary_screen.dart`) | USER_STORIES US-8.2a; METRICS §3 |
| FR-UX2 Touch targets | — | ≤900px cards/actions | ≥44px actions | USER_STORIES E8 |
| FR-UX6 Responsive chrome | — | AppShell rail/bottom nav; tablet cards ≤1100; non-sticky feature chrome on narrow; filter sheets; `CollapsibleFilters`; `--bp-*` | home_shell + NavigationRail + `ExpandableFilters` | DESIGN_GUIDELINES §2.3a; PRD FR-UX6 |
| FR-UX7 UI language | `POST /translate/batch`, `batch-public` | LanguageSelect + translate client | TranslateService / ui languages | translate module |
| FR-UX8 Domain statistics | `statistics` object on `GET …/summary` (filter-aware) | Products/Customers/Orders/Warehouse stats sections | — | `*-statistics.ts`; US-5.2 |
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
| Export / import | `apps/api/src/export/` |
| Translate | `apps/api/src/translate/` |
| Products | `apps/api/src/products/` |
| Product stock & sales | `apps/api/src/products/product-stock-sales.ts` |
| Customers | `apps/api/src/customers/` |
| Customer order totals | `apps/api/src/customers/customer-order-totals.ts` |
| Orders | `apps/api/src/orders/` |
| Invoice PDF / fiscal | `apps/api/src/orders/invoice.service.ts`, `invoice-pdf.ts`, `fiscal-invoice.ts`, `invoice.controller.ts` |
| Domain statistics | `apps/api/src/**/**-statistics.ts`, `common/statistics-buckets.ts` |
| Warehouse | `apps/api/src/warehouse/` (restock + sales + backfill) |
| Firebase auth | `apps/api/src/auth/firebase-*.ts` |
| Redis | `apps/api/src/redis/` |
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
| Auth | `/api/v1/auth` | register, register-availability, login, refresh, verify-email, forgot/reset-password; **config**; **firebase/session**; **firebase/register** |
| Profiles | `/api/v1/profiles/me` | GET, PATCH, DELETE; detect-location; email send-verification |
| Export | `/api/v1/export` | GET eligibility; GET `?format=json|csv|csv-unified` [& `entity=`] |
| Import | `/api/v1/import` | POST multipart `?format=json|csv-unified` [& `entity=`] |
| Translate | `/api/v1/translate` | POST `batch` (JWT), `batch-public` |
| Products | `/api/v1/products` | CRUD + `GET summary` (incl. `statistics`) + **`GET stock-sales`** |
| Customers | `/api/v1/customers` | CRUD + `GET summary` (incl. `statistics`) + **`GET order-totals`** |
| Orders | `/api/v1/orders` | create, list, get, patch, `GET summary` (incl. `statistics`); `GET :id/invoice/pdf`; `GET :id/invoice/fiscal` |
| Warehouse | `/api/v1/warehouse` | create, list, get, **patch**, `GET summary` (incl. `statistics`); **`GET sales`**, **`GET sales/:id`** |
| Revenue targets | `/api/v1/revenue-targets` | years, get/put/delete by year |
| Analytics | `/api/v1/analytics` | GET `?years=` / `year=` + `include` + `granularity` |
| Geo | `/api/v1/geo/postal-lookup` | GET |

---

## 4. Known coverage gaps (documented)

| Gap | Status |
|-----|--------|
| Mobile revenue targets UI | Deferred (web-first); API ready |
| Mobile PDF / e-Faktur download | Deferred (web-first); API ready |
| Mobile warehouse restock edit | Deferred (web-first); API + web ready |
| Mobile Stock & sales table | Deferred (web-first); API ready |
| Mobile Order totals table | Deferred (web-first); API ready |
| Mobile domain statistics sections | Deferred (web-first); summary `statistics` API ready |
| Mobile Open order from Sold history | Deferred (web-first deep-link) |
| Web automated unit/E2E suite | Rely on `npm run build` + API tests |
| Multi-user RBAC | Explicit non-goal v1 |
| Official DJP e-Faktur filing | Explicit non-goal — prep CSV/XML only |
| Order-form includePpn / fiscal # editors | API fields only; PDF auto-numbers |

Related: [PRD.md](./PRD.md) · [USER_STORIES.md](./USER_STORIES.md) · [ARCHITECTURE.md](./ARCHITECTURE.md)
