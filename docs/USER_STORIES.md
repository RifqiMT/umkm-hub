# User Stories — UMKM Hub

| Field | Value |
|-------|-------|
| **Product** | UMKM Hub |
| **Version** | 1.5.217 |
| **Date** | 2026-07-26 |
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

---

## Epic E2 — Products

### US-2.1 Manage products
**As** Sari, **I want** to view/add/edit/delete products with unit, a single selling pack (or pcs price), optional cost, and see profit and margin %, **so that** the catalog is ready for warehouse and orders.  
**AC:** View is read-only; exactly one pack for gram/liter; costs optional; profit/margin % when cost set; stock not edited on Products; delete blocked if orders exist; list shows name + unit chip + soft SKU; feature stage + summary rates respect list filters.

### US-2.2 Product identity
**As** Sari, **I want** product IDs that reflect name and pack, **so that** I can recognize SKUs in lists and sheets.  
**AC:** ID format `{INITIALS}_{PACK}_{uuid}`; prefix regenerates when name or active pack size changes.

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

---

## Epic E4 — Orders

### US-4.1 Create order
**As** Dewi, **I want** to create/modify multi-line pack orders with dates, status, discount, and payment terms, **so that** totals are correct and stock updates.  
**AC:** Locked pack prices; stock qty = pack size × pack count; insufficient stock rejected; cancel restores stock; optional customer link.

### US-4.2 Modify order
**As** Dewi, **I want** to adjust an existing order without delete, **so that** corrections stay auditable.  
**AC:** Lines add/remove (min 1); stock restore-then-apply; CANCELLED restores stock; totals recalculate.

### US-4.3 Installments & invoice
**As** Dewi, **I want** to record installments and invoice status, **so that** I know remaining balance and whether the invoice was sent.  
**AC:** Amount or % of total (stored as amount); dates non-decreasing; sum ≤ total; paidAmount/remainingAmount/Paid % on read; invoiceStatus created/sent.

### US-4.4 Stock shortage UX
**As** Budi, **I want** clear feedback when a line exceeds stock, **so that** I fix qty before save.  
**AC:** Oversold rows highlighted live; save blocked until fixed.

### US-4.5 Order list & filters
**As** Dewi, **I want** a scannable, filterable order list, **so that** I find orders quickly.  
**AC:** Date + soft order ID; paginated; filters for status/payment/order/shipment/invoice dates; summary rates match filters.

---

## Epic E5 — Warehouse

### US-5.1 Restock product
**As** Sari, **I want** to add stock with a restock date and see inventory valuation, **so that** inventory stays accurate.  
**AC:** Product picker only; Manual or By pack; history before/after; no edit/delete of restock rows; summary rates filter-aware.

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

---

## Epic E8 — Cross-cutting UX & platform

### US-8.1 Confirm destructive actions
**As** any user, **I want** a clear confirmation before delete/clear, **so that** I do not lose data by accident.  
**AC:** In-app confirm; entity context; irreversible warning.

### US-8.2a Metric dictionary
**As** any user, **I want** a Dictionary of metrics in plain English, **so that** I understand KPIs without reading engineering docs.  
**AC:** Web `/glossary` with search + feature browse + expandable terms; mobile Profile → Dictionary; catalogs synced; stage/analytics/order/warehouse metrics covered.

### US-8.2 Narrow viewport / mobile actions
**As** Budi, **I want** reachable actions on a phone, **so that** I can save forms with the keyboard open.  
**AC:** Touch targets ≥44px; sticky/bottom actions; responsive chrome (rail / bottom tabs / filter sheets).

### US-8.3 Compact money
**As** Dewi, **I want** large amounts shortened consistently, **so that** tables stay readable.  
**AC:** `formatMoney` compact words; `formatMoneyExact` in tooltips; `formatQty` full digits.

### US-8.4 Dashboard period board
**As** Sari, **I want** a dashboard that shows period-scoped order health and workspace domains, **so that** I start the day oriented.  
**AC:** Period filter scopes order summary; catalog/CRM summaries workspace-wide; Orders featured with Products/Customers panels; rail to Warehouse/Targets/Analytics.

---

## Story → requirement map (summary)

| Epic | Primary FR IDs |
|------|----------------|
| E1 Profile | FR-P1–P9 |
| E2 Products | FR-PR1–PR3 |
| E3 Customers | FR-C1–C4 |
| E4 Orders | FR-O1–O14 |
| E5 Warehouse | FR-W1–W6 |
| E6 Targets | FR-T1–T6 |
| E7 Analytics | FR-A1–A19 |
| E8 UX / Dashboard | FR-UX1–UX6, FR-D1–D4 |

Full FR text: [PRD.md](./PRD.md). Traceability: [TRACEABILITY.md](./TRACEABILITY.md).
