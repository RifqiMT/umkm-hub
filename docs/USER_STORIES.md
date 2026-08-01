# User Stories — UMKM Hub

| Field | Value |
|-------|-------|
| **Product** | UMKM Hub |
| **Version** | 1.5.265 |
| **Date** | 2026-08-01 |
| **Format** | Epic → Story → Acceptance criteria (AC) |
| **Personas** | Sari (owner), Budi (field), Dewi (ops) — see [PERSONAS.md](./PERSONAS.md) |

---

## Epic E1 — Profile access

### US-1.1 Register
**As** an UMKM owner, **I want** to create a profile with username, email, and password, **so that** I can access product/customer/order features.  
**AC:** Unique username + unique email (case-insensitive); password ≥8; live `POST /auth/register-availability` shows Available / Already in use without revealing which field collided; register 409 uses the same unified message + Sign in CTA; JWT returned; profile UUID generated.

### US-1.2 Login
**As** a returning user, **I want** to sign in with my username or email, **so that** I can continue my work.  
**AC:** Accepts `login` (username or email) + password; email match case-insensitive; invalid credentials return generic 401; valid returns access + refresh tokens.

### US-1.3 Update password / delete profile
**As** a user, **I want** to change my password or delete my account.  
**AC:** Username and email are immutable (read-only on Profile); password change requires ≥8 + confirmation match; delete requires confirmation and cascades owned data.

### US-1.4 Profile workspace home
**As** a user, **I want** my Profile page to show who I am and what this workspace owns, **so that** I can manage security and jump to useful tools quickly.  
**AC:** Identity strip (monogram, member since, last updated, copyable ID); snapshot counts for products/customers/orders (+ margin when available); shortcuts to Dictionary and Analytics (plus Targets/Dashboard on web); Account chip in shell opens Profile; Log out only on Profile.

### US-1.5 Personal details & location
**As** a user, **I want** to save my name and location on Profile, **so that** the account feels personal.  
**AC:** Optional first/last name; email shown read-only (set at register); city/country editable; **Detect from network** seals city/country + hashes IP; local/private networks fall back or prompt manual entry.

### US-1.6 Verify email & account
**As** a user, **I want** to verify my locked email address, **so that** my account is confirmed.  
**AC:** Send verification issues a 24h single-use link; opening it sets `emailVerifiedAt` and `accountVerifiedAt`; resend throttled; unverified users can still sign in; verify is idempotent; invalid/expired links show a clear error; when Resend unset, Profile may show Open verification link (`devVerifyUrl`).

### US-1.7 Data export (own or all profiles)
**As** any signed-in user, **I want** to download my profile data as JSON or CSV, **so that** I can back up or review it.  
**As** an allowlisted operator (`rifqi_tjahyono` by default), **I want** the same export to include every profile, **so that** I can audit the full sandbox.  
**AC:** `GET /export/eligibility` returns `{ allowed: true, scope }`; `GET /export?format=json|csv|csv-unified` requires JWT; `scope=all-profiles` only for `DATA_EXPORT_PROFILE_NAMES`; otherwise `own-profile`; sealed city/country decrypted; own-profile `passwordHash` sealed as `pwd1:…`; all-profiles dump uses plaintext `password` from `SANDBOX_EXPORT_PASSWORDS` (no `passwordHash`); `locationIpHash` and verify-token hashes omitted; throttled (~5/hour).

### US-1.8 Data import (merge, own or all profiles)
**As** any signed-in user, **I want** to merge-import a unified JSON or unified CSV export into my profile, **so that** I can restore or sync data without duplicates.  
**As** an allowlisted operator, **I want** to import all profiles from a full export, **so that** I can restore the whole sandbox.  
**AC:** `POST /import?format=json|csv-unified` with multipart `file`; same scope rules as export; upsert by id then natural keys (`Product.productId` / `Customer.customerId` / `Order.orderId`, order lines by orderId+productId+sortOrder, installments by orderId+date+amount, restock fingerprint, `WarehouseSale.orderLineId`); dumps include `warehouseSales`; in-file duplicates collapsed; location re-sealed; password restored from sealed or plaintext export; throttled.

### US-1.9 Forgot / reset password
**As** a user who forgot my password, **I want** to reset it via email link without revealing whether my login exists, **so that** I can regain access safely.  
**AC:** Login shows Forgot password; `POST /auth/forgot-password` with username or email returns generic success; email (or `devResetUrl` when Resend unset) carries 24h single-use link; `/reset-password` sets new password ≥8; cooldown 60s; tokens HMAC-hashed at rest.

### US-1.10 Feature-scoped data transfer
**As** Sari, **I want** to export or import only Products (or Customers / Orders / Warehouse / Targets), **so that** I can move one domain without a full dump.  
**AC:** UI FeatureDataTransfer on those pages; API `entity=` query on export/import; Orders dumps include related products, customers, and warehouse sales; Warehouse dumps include products, restocks, and sales; merge by id and natural keys; feature dumps are authenticated-profile scoped.

### US-1.11 Invoicing identity
**As** Sari, **I want** to save my business NPWP, PKP, and default PPN settings on Profile, **so that** invoices and e-Faktur prep use the right seller identity.  
**AC:** Profile invoicing section: business name/phone/address, NPWP, isPkp, defaultPpnPercent, taxInclusive, invoicePrefix; used by PDF/fiscal endpoints.

---

## Epic E2 — Products

### US-2.1 Manage products
**As** Sari, **I want** to view/add/edit/delete products with unit, a single selling pack (or pcs price), optional cost, and see profit and margin %, **so that** the catalog is ready for warehouse and orders.  
**AC:** Exactly one pack for gram/liter from sizes **1/5/10/25/50/100/250/500/1000/custom**; costs optional; profit/margin % when cost set; stock not edited on Products; delete blocked if orders exist; list shows name + unit chip + soft SKU; feature stage + summary rates respect list filters.

### US-2.2 Product identity
**As** Sari, **I want** product IDs that reflect name and pack, **so that** I can recognize SKUs in lists and sheets.
**AC:** ID format `{INITIALS}_{PACK}_{uuid}`; prefix regenerates when name or active pack size changes.

### US-2.3 Product stock & sales
**As** Sari, **I want** a per-product stock vs sales table above Products Statistics, **so that** I can see STR, ITR, SSR, AOV, and UPT without leaving the catalog.  
**AC:** Columns: product, Stocks (total with current/sold detail), Revenue (gross primary + Gross·Net subline), Discount (+%), Cost (+%), Profit (+%), STR, ITR (sold÷avg inventory), SSR, orders, AOV (allocated net), UPT; catalog filters apply; paginated `GET /products/stock-sales`; row/View opens **product performance** sheet in exclusive focus mode (not catalog sheet); **web-first**.

---

## Epic E3 — Customers

### US-3.1 Manage CRM customers
**As** Budi, **I want** to view/add/edit CRM customers with company type, stage, status, address, promises, and relationship level, **so that** I know who to follow up and where to deliver.  
**AC:** View read-only; enums validated; address optional; list filterable; search matches locality; summary rates filter-aware.

### US-3.2 Postal locality fill
**As** Budi, **I want** postal code + country to suggest locality, **so that** I type less on the phone.  
**AC:** Lookup fills empty or previously auto-filled address/city/province; manual edits preserved.

### US-3.3 Customer identity
**As** Budi, **I want** customer IDs derived from name and company type, **so that** IDs are recognizable in the field.  
**AC:** Format `{NameSegments}{R|H|S}_{uuid}`; regenerates when name or company type changes.

### US-3.4 Customer order totals
**As** Sari, **I want** a per-customer table of order totals above Customers Statistics, **so that** I can see commercial volume without leaving CRM.  
**AC:** Columns: customer name (+ details), company (+ details), **Revenue** (gross primary + Gross·Net subline; API totals/grossRevenue + orderTotal), Discount, Orders, Packs, Cancelled (+ cancel rate), AOV, UPT; money/packs from non-cancelled linked orders; cancelled counted separately; same Directory filters; paginated `GET /customers/order-totals`; row/View opens **order performance** sheet in exclusive focus mode (not CRM sheet); **web-first**.

---

## Epic E4 — Orders

### US-4.1 Create order
**As** Dewi, **I want** to create/modify multi-line pack orders with dates, status, discount, and payment terms, **so that** totals are correct and stock updates.  
**AC:** Locked pack prices; stock qty = pack size × pack count; insufficient stock rejected; cancel restores stock; optional customer link.

### US-4.2 Modify order
**As** Dewi, **I want** to adjust an existing order without delete, **so that** corrections stay auditable.  
**AC:** Lines add/remove (min 1); stock restore-then-apply; CANCELLED restores stock; totals recalculate.

### US-4.3 Bill, invoice, installments & amount due
**As** Dewi, **I want** to track bill delivery, invoice collection, installments, and PPN-aware amount due, **so that** I know what remains unpaid.  
**AC:** Bill status/date; invoice collection statuses; installments sum ≤ **amountDue**; remaining/Paid % vs amountDue; unpaid invoice mirrors bill when derived; optional paymentDueDate for delayed payment; `amountDue` from API read DTO; fiscal # auto on PDF when empty; includePpn/fiscalInvoiceNumber are API fields without dedicated order-form editors in v1.

### US-4.6 PDF & e-Faktur prep
**As** Dewi, **I want** to download a printable PDF and e-Faktur prep files for an order, **so that** I can send documents and prepare tax filing.  
**AC:** Web downloads `GET /orders/:id/invoice/pdf` and `…/fiscal?format=csv|xml`; uses profile invoicing identity + customer NPWP when set; auto invoice number when empty; files are prep aids—not DJP submission.

### US-4.4 Stock shortage UX
**As** Budi, **I want** clear feedback when a line exceeds stock, **so that** I fix qty before save.  
**AC:** Oversold rows highlighted live; save blocked until fixed.

### US-4.5 Order list & filters
**As** Dewi, **I want** a scannable, filterable order list, **so that** I find orders quickly.  
**AC:** Date + soft order ID; paginated; filters for status/payment/order/shipment/invoice dates; summary rates match filters.

---

## Epic E5 — Warehouse

### US-5.1 Restock product
**As** Sari, **I want** to add or correct stock for an existing product with a restock date and see inventory valuation, **so that** inventory stays accurate.  
**AC:** Product picker only; Manual or By pack; create increments stock; **web can edit** restock (PATCH adjusts stock by delta); history before/after; no delete; summary + statistics filter-aware.

### US-5.2 Domain statistics
**As** Sari, **I want** breakdown statistics on Products / Customers / Orders / Warehouse, **so that** I see mix rates beyond headline KPIs.  
**AC:** Statistics sections respect list filters; data from `statistics` on domain `GET …/summary`; show enum/geo/stock buckets as implemented in `*-statistics.ts`.

### US-5.3 Sold history
**As** Sari, **I want** to see stock drawn by orders (date, product, qty sold, before/after, order ref), **so that** I can audit outbound inventory without leaving Warehouse.  
**AC:** Entries appear when active orders draw stock (dual-write); empty until dual-write or `npm run backfill:warehouse-sales -w api`; web Sold history above Statistics with exclusive Sold View (focus mode) + **Open order** → `/orders?view=<uuid>`; mobile after Restock history (list/view; Open order web-only); view-only mutations via Orders; search by product/notes/order id.

---

## Epic E6 — Revenue targets

### US-6.1 Set monthly and annual targets
**As** Sari, **I want** to set revenue targets for a year manually or systematically, **so that** I can track progress against real orders.  
**AC:** Manual/Systematic monthly and annual; annual equals month sum when months exist; single Edit plan / Clear plan; **By month | By year** switch; FeatureStage shows Annual target / actual / Next year and rates **Attainment / On plan / Pace / Coverage**; actuals exclude CANCELLED; **web `/targets`** (mobile deferred).

---

## Epic E7 — Analytics

### US-7.1 Multi-granularity graphs
**As** Sari, **I want** to see revenue and order graphs by week, month, quarter, or year, **so that** I can spot trends against targets.  
**AC:** Lens: Weekly/Monthly/Quarterly/Annual + Timeline (years / All); snapshot KPIs (orders, AOV, UPT, APF, LTV, product, lead times); Graph | Table; fullscreen cinema with prev/next; progressive `include`/`granularity` load; empty periods omitted; weekly targets day-weighted; quarterly targets = sum of 3 months; web + mobile (Profile entry).

### US-7.2 Product & customer performance
**As** Sari, **I want** product and customer performance for the selected timeline, **so that** I know what and who drives revenue.  
**AC:** Tables include revenue, packs sold, discount (+%), cost (+%), profit+margin, AOV, qty, order count, first/avg repeat days; table margin % uses pre-discount gross; stage/chart margin % uses net revenue.

### US-7.3 Lifetime value & rankings
**As** Budi, **I want** average LTV and Top/Bottom customer and product rankings, **so that** I prioritize accounts and SKUs.  
**AC:** Avg LTV on summary/series; Top **and Bottom** 5 customers by LTV; Top **and Bottom** 5 products by revenue; unlinked orders omitted from LTV/customer views.

### US-7.4 Panel export
**As** Sari, **I want** to download each analytics table as CSV and each graph as a high-resolution PNG, **so that** I can share or archive a specific view.  
**AC:** CSV only in Table view and PNG only in Graph view, both in the panel header tools (and fullscreen); catalog sections keep a CSV control; PNG is max practical quality (vector SVG→canvas, 6–8× / ≥~3200px wide, lossless); CSV uses raw numerics; filenames slug from panel/title.

---

## Epic E8 — Cross-cutting UX & platform

### US-8.1 Confirm destructive actions
**As** any user, **I want** a clear confirmation before delete/clear, **so that** I do not lose data by accident.  
**AC:** In-app confirm; entity context; irreversible warning.

### US-8.2a Metric dictionary
**As** any user, **I want** a Dictionary of metrics in plain English, **so that** I understand KPIs without reading engineering docs.  
**AC:** Web `/glossary` with search + feature browse + expandable terms (~**102** entries incl. Stock & sales / Order totals / Sold history); mobile Profile → Dictionary; catalogs synced via `npm run glossary:sync`.

### US-8.2 Narrow viewport / mobile actions
**As** Budi, **I want** reachable actions on a phone, **so that** I can save forms with the keyboard open.  
**AC:** Touch targets ≥44px; catalog/insight cards ≤1100; tablet NavigationRail; on narrow, feature View/form chrome scrolls with content (shell nav stays fixed); sticky/bottom actions where desktop density allows; responsive chrome (rail / bottom tabs / filter sheets).

### US-8.3 Compact money
**As** Dewi, **I want** large amounts shortened consistently, **so that** tables stay readable.  
**AC:** `formatMoney` compact words; `formatMoneyExact` in tooltips; `formatQty` full digits.

### US-8.4 Dashboard period board
**As** Sari, **I want** a dashboard that shows period-scoped order health and workspace domains, **so that** I start the day oriented.  
**AC:** Period filter scopes order summary; catalog/CRM summaries workspace-wide; Orders featured with Products/Customers panels; rail to Warehouse/Targets/Analytics.

### US-8.5 UI language
**As** any user, **I want** to switch the UI language, **so that** I can operate the app in a language I read well.  
**AC:** Language control in shell/Profile; auth pages use public translate batch; product names and human entity IDs stay source language; batch ≤40×500 chars; graceful degrade if translate fails.

---

## Story → requirement map (summary)

| Epic | Primary FR IDs |
|------|----------------|
| E1 Profile | FR-P1–P15 |
| E2 Products | FR-PR1–PR4 |
| E3 Customers | FR-C1–C6 |
| E4 Orders | FR-O1–O18 |
| E5 Warehouse | FR-W1–W8 |
| E6 Targets | FR-T1–T6 |
| E7 Analytics | FR-A1–A20 |
| E8 UX / Dashboard | FR-UX1–UX8, FR-D1–D4 |

Full FR text: [PRD.md](./PRD.md). Traceability: [TRACEABILITY.md](./TRACEABILITY.md).
