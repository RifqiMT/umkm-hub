# Product Requirements Document (PRD) — UMKM Hub v1

| Field | Value |
|-------|-------|
| **Product** | UMKM Hub |
| **Version** | 1.5.250 |
| **Date** | 2026-07-31 |
| **Status** | Implemented |
| **Owner** | Product + Engineering |

---

## 1. Problem statement

UMKM sellers track customers and orders across WhatsApp, spreadsheets, and memory. That causes:

- Stock mistakes (overselling or under-restocking)
- Lost or fuzzy pipeline (who is close to closing?)
- Inconsistent discounts and payment terms
- No shared view between warehouse laptop and field phone

---

## 2. Goals

| ID | Goal |
|----|------|
| G1 | Profile-gated access to product, customer, warehouse, order, targets, and analytics features |
| G2 | Full CRUD for products and customers; create/view/list warehouse restocks |
| G3 | Create and modify multi-line orders with discount, payment terms, installments, and stock safety |
| G4 | Web + mobile clients on one API |
| G5 | Revenue targets and analytics grounded in the same order-actuals rules |

---

## 3. Non-goals (v1)

- Multi-user teams / RBAC / admin roles (one profile = one tenant owner)
- **Full DJP e-Faktur filing / legal tax compliance** (product ships PDF + CSV/XML **prep** only; seller remains responsible for official submission)
- Push notifications
- Offline-first sync
- Payment gateway integration
- Multi-currency or multi-warehouse locations
- Product images / file attachments
- Mobile revenue-targets screen and mobile PDF download (web-first)
- Mobile warehouse restock **edit** (API + web first)

---

## 4. Functional requirements

### FR-Profile

| ID | Requirement |
|----|-------------|
| FR-P1 | System generates profile UUID |
| FR-P2 | User can register with unique username + unique email + password (≥8); usernames/emails unique case-insensitively (API field `profileName`). Live check via `POST /auth/register-availability` (both fields required) returns only available/taken with one unified message (anti-enumeration); register 409 uses the same copy |
| FR-P2b | Each username stays bound to exactly one unique email (required); email is immutable after registration; Profile UI shows email read-only; `PATCH /profiles/me` rejects email changes |
| FR-P3 | User can login with username or email (+ password) and receive access + refresh JWT |
| FR-P4 | User can update password; username is immutable after registration (unique at create) |
| FR-P5 | User can delete profile (cascade owned data) |
| FR-P6 | Profile UI shows identity metadata, workspace snapshot (catalog/CRM/orders summaries), credential helpers (confirm + strength), and shortcuts to Dictionary/Analytics (web also Targets/Dashboard) |
| FR-P7 | User can set optional first name, last name, and location city/country; location may be detected from client IP (with browser fallback on private networks); city/country sealed at rest, IP hashed; owner can read back city/country. Email is covered by FR-P2b (required + immutable)—not editable here |
| FR-P8 | User can verify the locked email (and account) via emailed one-time link; login remains allowed while unverified; verify endpoint is idempotent for already-verified accounts (handles double-submit / Strict Mode) |
| FR-P9 | Anti-enumeration: register and register-availability never reveal whether username or email collided; one unified taken message + Sign in CTA |
| FR-P10 | Authenticated users can export data (`GET /export?format=json|csv|csv-unified`); allowlisted operators (`DATA_EXPORT_PROFILE_NAMES`) export all profiles, others export own profile only; sealed location decrypted; own-profile includes sealed bcrypt `passwordHash` as `pwd1:…`; all-profiles export includes plaintext `password` from `SANDBOX_EXPORT_PASSWORDS` (no `passwordHash`); IP and verify-token hashes omitted; UI uses `GET /export/eligibility` (`scope`) |
| FR-P11 | Merge-import (`POST /import?format=json|csv-unified`, multipart `file`); same scope rules as export; upsert by UUID id then natural keys (profileName/email, profileId+productId/customerId/orderId, profileId+year, planId+month); in-file duplicates collapsed; location re-sealed; passwords restored from sealed or plaintext export values; new profiles on privileged import may use `IMPORT_BOOTSTRAP_PASSWORD` |
| FR-P12 | Forgot/reset password: `POST /auth/forgot-password` (login = username or email; generic success; anti-enumeration) + `POST /auth/reset-password` (token + new password); HMAC token at rest; TTL 24h; request cooldown 60s; web `/forgot-password` + `/reset-password` |
| FR-P13 | Feature-scoped export/import via `entity=products|customers|orders|warehouse|targets` on full export/import endpoints; Products/Customers/Orders/Warehouse/Targets UIs expose FeatureDataTransfer |
| FR-P14 | Profile invoicing identity: optional businessName, businessPhone, businessAddress, npwp; isPkp; defaultPpnPercent (default 11); taxInclusive; invoicePrefix — used for PDF and e-Faktur prep |
| FR-P15 | Optional Firebase Auth: `GET /auth/config`; `POST /auth/firebase/session` (ID token → API JWT); `POST /auth/firebase/register` (ID token + profileName); JwtAuthGuard accepts Firebase ID token when Admin SDK configured, else legacy access JWT; Profile may store `firebaseUid` |

### FR-Product

| ID | Requirement |
|----|-------------|
| FR-PR1 | Human product code field `Product.productId` = `{INITIALS}_{PACK}_{uuid}` (e.g. Cabai Merah 100 → `CB_100_<uuid>`); unique per profile; regenerates prefix when name or active pack size changes. Distinct from UUID primary key and from `Order.productId` / `OrderLine.productId` FKs |
| FR-PR2 | Fields: name, unit (pcs/gram/liter), pricePerUnit; for gram/liter exactly one pack from **1 / 5 / 10 / 25 / 50 / 100 / 250 / 500 / 1000 / custom** with selling price and optional cost (`priceN`/`costN`). Show unit/pack profit and profit margin % when cost is set. Stock managed via Warehouse |
| FR-PR3 | View / add / modify / delete within owning profile; delete blocked if order lines exist |
| FR-PR4 | Web Stock & sales table above Products Statistics: product (+ id/unit), Stocks (total = current + sold, with current/sold subline), Revenue (allocated net), Discount (+ %), Cost (sold × catalog cost), Profit (revenue − cost), STR (sold÷(sold+current)), ITR (sold÷average inventory; beginning≈current+sold), SSR (current÷sold), Orders, AOV (allocated net ÷ orders), UPT (packs ÷ orders); sold/orders from non-cancelled lines; same catalog filters; paginated `GET /products/stock-sales` |

### FR-Customer

| ID | Requirement |
|----|-------------|
| FR-C1 | Human customer code field `Customer.customerId` = `{NameSegments}{CompanyType}_{uuid}` (e.g. Budi Santoso + Restaurant → `BuSaR_<uuid>`); regenerates when name or company type changes. Distinct from UUID PK and from `Order.customerId` FK |
| FR-C2 | Required: name, title, companyName, companyType. Optional: email, phone, address, additionalAddress, postalCode, city, province, country, npwp (buyer tax ID), partnershipStage, status, needs, standards, promises, relationshipLevel, approvalPercentage, remarks |
| FR-C3 | When postal code and country are both provided on create/edit, look up locality and auto-fill empty (or previously auto-filled) address, city, and province. Manual edits are preserved |
| FR-C4 | View / add / modify / delete within owning profile; list filterable by status/type/relationship; search matches city/province/country/postal |
| FR-C5 | Optional customer NPWP for B2B PDF / e-Faktur buyer identity |
| FR-C6 | Web Order totals table above Customers Statistics: per linked customer, name (+ details), company (+ details), Totals (Σ lineTotal), Discount (Σ lineTotal − totalOrderValue), Order total (Σ totalOrderValue), Orders (active count), Packs (Σ packCount), Cancelled (+ cancel rate), AOV, UPT; money/packs from non-cancelled; same Directory filters; paginated `GET /customers/order-totals` |

### FR-Order

| ID | Requirement |
|----|-------------|
| FR-O1 | Human order code field `Order.orderId` = `YYYY_MM_DD_{uuid}` from order date; regenerates when order date changes. Distinct from UUID primary key |
| FR-O2 | One or more product lines; show stock & pack price per line |
| FR-O3 | Each line: product pack (locked price), pack count, derived stock qty, lineTotal; order-level discount; totalOrderValue from sum(lineTotals) after discount |
| FR-O4 | paymentStatus: cash, consignment, delayed payment |
| FR-O5 | View, add, and modify only (no delete) |
| FR-O6 | orderDate (default today), optional shipmentDate |
| FR-O7 | status: pending, confirmed, shipped, delivered, cancelled; cancelling restores stock for all lines |
| FR-O8 | Bill document: billStatus created/sent; optional billDate (defaults to order date on create). Invoice collection: invoiceStatus created/sent/partially paid/fully paid; optional invoiceDate. When invoiceStatus is omitted, API derives it from installments vs **amountDue** (unpaid → mirrors bill; partial → partially paid; paid in full → fully paid) |
| FR-O9 | Installments: amount + date; UI may enter amount or % of **amount due** (stored as amount); dates non-decreasing; replaceable on update; sum ≤ **amountDue** |
| FR-O10 | paidAmount = sum(installments); remainingAmount = max(0, amountDue − paid); list Paid % = paid ÷ amountDue |
| FR-O11 | Stock draw/restore applies per product across all lines in one transaction |
| FR-O12 | Optional customerId link to CRM customer; unlinked orders remain valid |
| FR-O13 | Live stock shortage UX: highlight oversold lines and block save until fixed |
| FR-O14 | List filterable by order date, shipment date, invoice date (inclusive from/to ranges), fulfillment status, and payment status |
| FR-O15 | Optional paymentDueDate (required in UX when paymentStatus is delayed payment) |
| FR-O16 | Authenticated user can download printable PDF invoice: `GET /orders/:id/invoice/pdf` (web primary; auto-assign fiscalInvoiceNumber when empty) |
| FR-O17 | Authenticated user can download e-Faktur **prep** export: `GET /orders/:id/invoice/fiscal?format=csv|xml` (not DJP submission) |
| FR-O18 | Order may store `fiscalInvoiceNumber` and `includePpn` (null → profile isPkp); `amountDue` is a **computed read DTO** from fiscal breakdown of `totalOrderValue`. v1 UI: Paid % / installments use amountDue; PDF auto-assigns fiscal # when empty; **no dedicated includePpn / fiscal # editors on the order form** |

### FR-Warehouse

| ID | Requirement |
|----|-------------|
| FR-W1 | Restock existing products only (select from catalog) |
| FR-W2 | Fields: productId, qtyAdded (> 0), restockDate (default today), optional notes. UI supports Manual qty or By pack (packs × catalog pack size → qtyAdded) |
| FR-W3 | Persist restock history with stockBefore / stockAfter |
| FR-W4 | Increment product.stockQty in a transaction on create; **edit** adjusts stock by delta in a transaction (`PATCH /warehouse/:id`, web UI) |
| FR-W5 | Create + list + view + **edit**; no delete of restock rows in v1 (mobile edit deferred) |
| FR-W6 | Show current stock, active catalog pack (size + sell/cost/profit/margin), packs-on-hand (stock ÷ pack size), potential revenue/cost/profit, and margin % |
| FR-W7 | Persist **sold history** (`WarehouseSale`) when orders draw stock: qtySold, soldDate, stockBefore/stockAfter, order/orderLine link, pack snapshots; clear + rewrite on order edit; clear on cancel restore |
| FR-W8 | Read-only sold history: `GET /warehouse/sales` (+ `/:id`); web section above Statistics with **Open order** deep-link `/orders?view=<orderUuid>`; mobile after Restock history (list/view only); no create/edit from Warehouse (mutations via Orders) |
| FR-W9 | Idempotent CLI backfill reconstructs missing `WarehouseSale` rows for active order lines (restock+sale replay per product) |

### FR-RevenueTargets

| ID | Requirement |
|----|-------------|
| FR-T1 | Profile-scoped revenue target plan per calendar year |
| FR-T2 | Monthly: Manual (12 amounts) or Systematic (January base + MoM growth % → generated months). Saving months syncs annual target to month sum |
| FR-T3 | Annual: Manual or Systematic (+ optional YoY growth for next-year projection). Saving annual evenly distributes into 12 months (Dec absorbs remainder). Displayed annual always equals month sum when months exist |
| FR-T4 | Actuals = SUM(Order.totalOrderValue) for orderDate in period where status ≠ CANCELLED |
| FR-T5 | One Clear plan removes the whole year (months + annual) so they never diverge; UI is a single plan surface with **By month / By year** view switch and one Edit/Clear |
| FR-T6 | Targets FeatureStage KPIs: Annual target, Annual actual, Next year projection; rates **Attainment**, **On plan** (months with attainment ≥ 100 ÷ months with target > 0), **Pace** (YTD actual ÷ sum of targets for elapsed UTC months), **Coverage** (months with target ÷ 12) |

### FR-Analytics

| ID | Requirement |
|----|-------------|
| FR-A1 | Profile-scoped analytics overview for a calendar year, multiple years (`years=2024,2025`), or all timelines (`years=all`) |
| FR-A2 | Monthly series: revenue, order count, AOV, optional monthly target + attainment for every month in the Timeline filter (selected year(s) or full app timeline when All); **charts omit months with zero orders** |
| FR-A2b | Quarterly series: revenue, order count, AOV, optional quarterly target (sum of the three monthly plan amounts) + attainment for every UTC calendar quarter in the Timeline filter; **charts omit quarters with zero orders** |
| FR-A3 | Annual series: rolling window ending at selected year; multi-year shows selected years only; **All timelines** loads full app year range; **charts omit years with zero orders** |
| FR-A4 | Actuals use the same rules as FR-T4 (shared aggregation helper) |
| FR-A5 | Web `/analytics` + Flutter Analytics screen (entry from Profile) |
| FR-A6 | Product performance for selected scope: revenue, order count, qty sold, packs sold, discount (+%), estimated cost/profit/margin (+%), AOV, first/avg repeat order days |
| FR-A6b | Customer performance: same metric family as products, including first repeat days (1st→2nd order) and avg repeat days (mean consecutive gaps); null when fewer than 2 orders |
| FR-A7 | Attainment rate and profit margin rate charts (weekly, monthly, quarterly, or annual view) |
| FR-A8 | Shipment duration, invoice duration, first/last payment duration, AOV, UPT, and average purchase frequency charts |
| FR-A9 | UX: analytics lens (Weekly/Monthly/Quarterly/Annual + TimelineFilter multi-select years / All), sectioned chart groups |
| FR-A10 | Customer LTV: avg LTV on summary/series; Average LTV trend + Top **and Bottom** 5 customers by LTV (web + mobile) |
| FR-A11 | Customer performance table for linked orders (same metrics family as products, including packs sold) |
| FR-A12 | Product revenue: avg product revenue on summary/series; Average product revenue trend + Top **and Bottom** 5 products by revenue (web + mobile) |
| FR-A13 | Units Per Transaction (UPT): Σ(packCount) ÷ orders; Performance chart + lens KPI (API field `avgBasketSize`) |
| FR-A14 | Weekly series: every ISO week in the Timeline filter (selected year(s) or full app timeline when All); day-weighted monthly target distribution + attainment when a 12-month plan exists; **charts omit weeks with zero orders** |
| FR-A15 | Average purchase frequency (APF): linked orders ÷ distinct customers; Performance chart + lens KPI |
| FR-A16 | Order status % mix (includes CANCELLED) and payment mode % mix (CASH / CONSIGNMENT / DELAYED_PAYMENT on non-cancelled orders) on weekly/monthly/quarterly/annual timeline charts (web + mobile) |
| FR-A17 | Single Graph \| Table control in the Analytics lens / Period header switches all chart panels (web + mobile); table shows the same metric values as the graph |
| FR-A18 | Fullscreen focuses Analytics chart/table panels only: web Fullscreen API on a stable charts host + chart-first cinema UI with period + Graph/Table toggles, bottom Previous/Next + scrubber; prev/next swaps panels without re-entering FS; mobile immersive with matching controls; Esc/close exits |
| FR-A19 | Progressive analytics load: `GET /analytics` accepts `include` + `granularity` to skip unused work; clients fetch summary+active series first, then product/customer tables; remaining series on period change; web code-splits Recharts and lazy-mounts panels; mobile lazy-builds charts near the viewport |
| FR-A20 | Web Analytics: Table view exports CSV (raw numerics); Graph view exports max-quality PNG (vector SVG→canvas, 6–8× / ≥~3200px wide, lossless); both use the same panel header tool slot (incl. fullscreen); catalog tables keep CSV |


### FR-Dashboard

| ID | Requirement |
|----|-------------|
| FR-D1 | Web `/dashboard` loads order, product, and customer summary endpoints in parallel |
| FR-D2 | Feature stage shows period-scoped Revenue, Orders, Packs plus order-health rates (margin, paid-in-full, discount, cancelled) |
| FR-D3 | Workspace board with interactive domain panels for Orders (featured), Products, and Customers; slim rail links Warehouse / Targets / Analytics |
| FR-D4 | Period filter (All time / Today / Tomorrow / This week / This month / Next month / This quarter / Next quarter / This year) scopes order summary by `orderDate`; catalog and CRM summaries remain workspace-wide |

### FR-UX

| ID | Requirement |
|----|-------------|
| FR-UX1 | Every delete or clear of persisted data requires an explicit in-app confirmation (not native browser). Show entity context; warn that the action cannot be undone |
| FR-UX2 | On narrow viewports and mobile app, list actions use full-width labeled touch targets (≥44px); create/edit forms keep actions reachable with keyboard open |
| FR-UX3 | Catalog identity polish: Products show name + unit chip + soft SKU; Orders show date + soft order ID; details/shipment live in View sheets |
| FR-UX4 | Money uses compact `formatMoney` (million/billion/…); tooltips use `formatMoneyExact`; chart axes use `formatCompactAxis`; quantities use `formatQty` (full digits) or compact words for large KPIs |
| FR-UX5 | Dictionary / Glossary: searchable plain-English definitions and formulas for user-facing metrics across Dashboard, Products, Warehouse, Customers, Orders, Targets, Analytics; feature browse + expandable term detail (web nav + mobile Profile entry) |
| FR-UX6 | Responsive chrome: tablet icon rail (901–1100); phone bottom tabs (Home / Orders / Products / Stock / More) + drawer; filter panels open as bottom sheets ≤900px; filter rows collapsible (collapsed by default ≤1100 + mobile); sticky form actions clear bottom nav + safe areas; touch targets ≥44px |
| FR-UX7 | UI language: users can pick a target language; clients call `POST /translate/batch` (JWT) or `batch-public` on auth screens; batch ≤40 texts × ≤500 chars; cache translations; keep product names/human entity IDs in source language where catalog identity requires |
| FR-UX8 | Filter-aware **statistics** breakdown sections on Products, Customers, Orders, and Warehouse (enum/geo/stock mix alongside summary rates) |

---

## 5. Non-functional requirements

| ID | Requirement |
|----|-------------|
| NFR-1 | Multi-tenant isolation: all queries filter by JWT `profileId` (no IDOR) |
| NFR-2 | Auth endpoints throttled; global API rate limit applied; export/import ~5/hour |
| NFR-3 | Order and warehouse mutations are transactional |
| NFR-4 | Secrets never committed; `.env` gitignored |
| NFR-5 | Pagination default limit 20; hard-capped at **500_000** (`LIST_PAGE_MAX`) |
| NFR-6 | Order math and analytics helpers covered by unit tests |
| NFR-7 | Accessibility: visible labels; color not sole status signal; confirm destructive actions |

---

## 6. Success metrics

See [METRICS.md](./METRICS.md).

---

## 7. Acceptance criteria (release)

- All FR items covered by API + appropriate clients (Targets web-first exception documented)
- Order math, revenue-target math, and analytics unit tests pass
- Traceability matrix in [TRACEABILITY.md](./TRACEABILITY.md) stays current with FR IDs
- Sandbox can be brought current with `npm run setup` / `npm run sync`
