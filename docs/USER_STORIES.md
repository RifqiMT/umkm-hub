# User Stories — UMKM Hub

| Field | Value |
|-------|-------|
| **Product** | UMKM Hub |
| **Version** | 1.5.88 |
| **Date** | 2026-07-25 |
| **Format** | Epic → Story → Acceptance criteria (AC) |
| **Personas** | Sari (owner), Budi (field), Dewi (ops) — see [PERSONAS.md](./PERSONAS.md) |

---

## Epic E1 — Profile access

### US-1.1 Register
**As** an UMKM owner, **I want** to create a profile with name and password, **so that** I can access product/customer/order features.  
**AC:** Unique name; password ≥8; JWT returned; profile UUID generated; invalid input returns clear validation errors.

### US-1.2 Login
**As** a returning user, **I want** to sign in, **so that** I can continue my work.  
**AC:** Invalid credentials return generic 401 (no user enumeration); valid returns access + refresh tokens; refresh renews session without re-entering password.

### US-1.3 Update / delete profile
**As** a user, **I want** to change credentials or delete my account.  
**AC:** Name uniqueness enforced; password change requires valid new password ≥8; delete requires confirmation; delete cascades owned data.

---

## Epic E2 — Products

### US-2.1 Manage products
**As** Sari, **I want** to view/add/edit/delete products with unit, a single selling pack (or pcs price), optional cost, and see profit and margin %, **so that** the catalog is ready for warehouse and orders.  
**AC:** View is read-only; exactly one pack for gram/liter; costs optional and aligned to that pack; profit and margin % shown when cost is set; stock is not edited on Products; delete blocked if orders exist; list shows name + unit chip + soft SKU (details in View only).

### US-2.2 Product identity
**As** Sari, **I want** product IDs that reflect name and pack, **so that** I can recognize SKUs in lists and sheets.  
**AC:** ID format `{INITIALS}_{PACK}_{uuid}`; prefix regenerates when name or active pack size changes; UUID portion remains the stable system key.

---

## Epic E3 — Customers

### US-3.1 Manage CRM customers
**As** Budi, **I want** to view/add/edit CRM customers with company type, stage, status, address, promises, and relationship level, **so that** I know who to follow up and where to deliver.  
**AC:** View is read-only; enums validated; address optional; list filterable by status/type/relationship (API); search matches city/province/country/postal.

### US-3.2 Postal locality fill
**As** Budi, **I want** postal code + country to suggest locality, **so that** I type less on the phone.  
**AC:** Lookup runs when both postal and country are set; fills empty or previously auto-filled address/city/province; manual edits preserved.

### US-3.3 Customer identity
**As** Budi, **I want** customer IDs derived from name and company type, **so that** IDs are recognizable in the field.  
**AC:** Format `{NameSegments}{R|H|S}_{uuid}`; regenerates when name or company type changes.

---

## Epic E4 — Orders

### US-4.1 Create order
**As** Dewi, **I want** to view and create/modify orders with one or more product packs (locked prices) and pack counts with order dates, status, discount, and payment terms, **so that** totals are correct and stock updates.  
**AC:** View is read-only; each line price from selected pack only; stock qty = pack size × pack count; order discount applies to sum of lines; order date defaults to today; insufficient stock rejected; cancel restores stock; optional customer link.

### US-4.2 Modify order
**As** Dewi, **I want** to adjust an existing order (lines, dates, status, discount, customer), **so that** corrections do not require delete.  
**AC:** Lines can be added/removed (min 1); stock restores previous draw then re-applies; CANCELLED restores stock; totals recalculate; dates and payment terms persist.

### US-4.3 Installments & invoice
**As** Dewi, **I want** to record installment payments and invoice status, **so that** I know remaining balance and whether the invoice was sent.  
**AC:** Installments as amount or % of total (stored as amount); dates non-decreasing; sum ≤ total; paidAmount/remainingAmount on read; invoiceStatus created/sent; invoiceDate optional.

### US-4.4 Stock shortage UX
**As** Budi, **I want** clear feedback when a line exceeds stock, **so that** I fix qty before save.  
**AC:** Oversold rows highlighted live (qty + stock + max); save blocked until fixed; friendlier stock error copy from API.

### US-4.5 Order identity & list polish
**As** Dewi, **I want** a scannable order list, **so that** I find orders without clutter.  
**AC:** Date column = bold order date + soft order ID; product = name + quiet meta; pack = `size × count` + quiet qty/@ price; shipment only in View Timeline.

---

## Epic E5 — Warehouse

### US-5.1 Restock product
**As** Sari, **I want** to add stock to an existing product with a restock date, view inventory/restock details, and see sell/cost/profit/margin, **so that** inventory stays accurate after deliveries arrive.  
**AC:** Product picker only; qty > 0; restock date defaults to today; Manual or By pack entry; stock increments; View shows read-only details; inventory shows stock, sell/cost/profit, margin % when cost set; history shows before/after; no edit/delete of restock rows.

---

## Epic E6 — Revenue targets

### US-6.1 Set monthly and annual targets
**As** Sari, **I want** to set revenue targets for a year manually or systematically, **so that** I can track attainment against real orders.  
**AC:** Manual monthly = 12 amounts; Systematic monthly = January base + MoM %; Manual/Systematic annual supported; annual equals sum of months when months exist; saving annual redistributes even 12-month split (Dec remainder); clearing either side clears year plan; actuals exclude CANCELLED; attainment per month and year; **web `/targets`** (mobile deferred).

---

## Epic E7 — Analytics

### US-7.1 View monthly and annual graphs
**As** Sari, **I want** to see revenue and order-count graphs by month or year, **so that** I can spot trends against targets.  
**AC:** Focus toolbar Monthly/Annual; year dropdown only for Monthly (Annual = 5-year window); KPI snapshot; charts grouped Performance / Rates / Lead times / Lifetime value; target series when plan exists; empty state when no orders; web + mobile (Profile entry).

### US-7.2 Product & customer performance
**As** Sari, **I want** product and customer performance for the year, **so that** I know what and who drives revenue.  
**AC:** Product table: revenue, discount (+%), cost (+%), profit+margin, AOV, qty, order count; customer table for linked orders with same metric family; rates use pre-discount gross base.

### US-7.3 Lifetime value
**As** Budi, **I want** average LTV and top customers by LTV, **so that** I prioritize accounts.  
**AC:** Avg LTV = linked revenue ÷ distinct customers with linked orders; shown on summary/monthly/annual; Average LTV trend + Top customers charts; unlinked orders omitted from LTV views.

---

## Epic E8 — Cross-cutting UX & platform

### US-8.1 Confirm destructive actions
**As** any user, **I want** a clear confirmation before delete/clear, **so that** I do not lose data by accident.  
**AC:** In-app confirm dialog; entity name/context when available; irreversible warning.

### US-8.2 Narrow viewport / mobile actions
**As** Budi, **I want** reachable actions on a phone, **so that** I can save forms with the keyboard open.  
**AC:** Full-width labeled targets ≥44px; sticky/bottom actions on create/edit.

### US-8.3 Compact money
**As** Dewi, **I want** large amounts shortened consistently, **so that** tables stay readable.  
**AC:** `formatMoney` uses Mn/Bn/Tn/Qd/Qn from 1e6; `formatQty` keeps full digits for stock/qty.

---

## Story → requirement map (summary)

| Epic | Primary FR IDs |
|------|----------------|
| E1 Profile | FR-P1–P5 |
| E2 Products | FR-PR1–PR3 |
| E3 Customers | FR-C1–C4 |
| E4 Orders | FR-O1–O13 |
| E5 Warehouse | FR-W1–W6 |
| E6 Targets | FR-T1–T5 |
| E7 Analytics | FR-A1–A11 |
| E8 UX | FR-UX1–UX4 |

Full FR text: [PRD.md](./PRD.md). Traceability: [TRACEABILITY.md](./TRACEABILITY.md).
