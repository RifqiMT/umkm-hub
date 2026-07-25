# Product Requirements Document (PRD) — UMKM Hub v1

| Field | Value |
|-------|-------|
| **Product** | UMKM Hub |
| **Version** | 1.5.88 |
| **Date** | 2026-07-25 |
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
- PDF invoicing / fiscal e-invoice compliance
- Push notifications
- Offline-first sync
- Payment gateway integration
- Multi-currency or multi-warehouse locations
- Product images / file attachments
- Mobile revenue-targets screen (web-first)

---

## 4. Functional requirements

### FR-Profile

| ID | Requirement |
|----|-------------|
| FR-P1 | System generates profile UUID |
| FR-P2 | User can register with profile name + password (≥8) |
| FR-P3 | User can login and receive access + refresh JWT |
| FR-P4 | User can update profile name and/or password |
| FR-P5 | User can delete profile (cascade owned data) |

### FR-Product

| ID | Requirement |
|----|-------------|
| FR-PR1 | Product ID = `{INITIALS}_{PACK}_{uuid}` (e.g. Cabai Merah 100 → `CB_100_<uuid>`); unique per profile; regenerates prefix when name or active pack size changes |
| FR-PR2 | Fields: name, unit (pcs/gram/liter), pricePerUnit; for gram/liter exactly one pack (50/100/250/500/1000/custom) with selling price and optional cost. Show unit/pack profit and profit margin % when cost is set. Stock managed via Warehouse |
| FR-PR3 | View / add / modify / delete within owning profile; delete blocked if order lines exist |

### FR-Customer

| ID | Requirement |
|----|-------------|
| FR-C1 | Customer ID = `{NameSegments}{CompanyType}_{uuid}` (e.g. Budi Santoso + Restaurant → `BuSaR_<uuid>`); regenerates when name or company type changes |
| FR-C2 | Required: name, title, companyName, companyType. Optional: email, phone, address, additionalAddress, postalCode, city, province, country, partnershipStage, status, needs, standards, promises, relationshipLevel, approvalPercentage, remarks |
| FR-C3 | When postal code and country are both provided on create/edit, look up locality and auto-fill empty (or previously auto-filled) address, city, and province. Manual edits are preserved |
| FR-C4 | View / add / modify / delete within owning profile; list filterable by status/type/relationship; search matches city/province/country/postal |

### FR-Order

| ID | Requirement |
|----|-------------|
| FR-O1 | Order ID = `YYYY_MM_DD_{uuid}` from order date; regenerates when order date changes |
| FR-O2 | One or more product lines; show stock & pack price per line |
| FR-O3 | Each line: product pack (locked price), pack count, derived stock qty, lineTotal; order-level discount; totalOrderValue from sum(lineTotals) after discount |
| FR-O4 | paymentStatus: cash, consignment, delayed payment |
| FR-O5 | View, add, and modify only (no delete) |
| FR-O6 | orderDate (default today), optional shipmentDate |
| FR-O7 | status: pending, confirmed, shipped, delivered, cancelled; cancelling restores stock for all lines |
| FR-O8 | invoiceStatus: created, sent; optional invoiceDate (defaults to order date on create) |
| FR-O9 | Installments: amount + date; UI may enter amount or % of order total (stored as amount); dates non-decreasing; replaceable on update; sum ≤ totalOrderValue |
| FR-O10 | remainingAmount = totalOrderValue − sum(installments); paidAmount = sum(installments); both computed on read |
| FR-O11 | Stock draw/restore applies per product across all lines in one transaction |
| FR-O12 | Optional customerId link to CRM customer; unlinked orders remain valid |
| FR-O13 | Live stock shortage UX: highlight oversold lines and block save until fixed |

### FR-Warehouse

| ID | Requirement |
|----|-------------|
| FR-W1 | Restock existing products only (select from catalog) |
| FR-W2 | Fields: productId, qtyAdded (> 0), restockDate (default today), optional notes. UI supports Manual qty or By pack (packs × catalog pack size → qtyAdded) |
| FR-W3 | Persist restock history with stockBefore / stockAfter |
| FR-W4 | Increment product.stockQty in a transaction on create |
| FR-W5 | Create + list + view only (no edit/delete of restock rows in v1) |
| FR-W6 | Show current stock, active catalog pack (size + sell/cost/profit/margin), packs-on-hand (stock ÷ pack size), potential revenue/cost/profit, and margin % |

### FR-RevenueTargets

| ID | Requirement |
|----|-------------|
| FR-T1 | Profile-scoped revenue target plan per calendar year |
| FR-T2 | Monthly: Manual (12 amounts) or Systematic (January base + MoM growth % → generated months). Saving months syncs annual target to month sum |
| FR-T3 | Annual: Manual or Systematic (+ optional YoY growth for next-year projection). Saving annual evenly distributes into 12 months (Dec absorbs remainder). Displayed annual always equals month sum when months exist |
| FR-T4 | Actuals = SUM(Order.totalOrderValue) for orderDate in period where status ≠ CANCELLED |
| FR-T5 | Clearing monthly or annual removes the whole year plan so month and annual never diverge |

### FR-Analytics

| ID | Requirement |
|----|-------------|
| FR-A1 | Profile-scoped analytics overview for a calendar year |
| FR-A2 | Monthly series: revenue, order count, AOV, optional monthly target + attainment |
| FR-A3 | Annual series: rolling 5-year window ending at selected year |
| FR-A4 | Actuals use the same rules as FR-T4 (shared aggregation helper) |
| FR-A5 | Web `/analytics` + Flutter Analytics screen (entry from Profile) |
| FR-A6 | Product performance for selected year: revenue, order count, qty sold, discount (+%), estimated cost/profit/margin (+%), AOV |
| FR-A7 | Attainment rate and profit margin rate charts (monthly or annual view) |
| FR-A8 | Shipment duration, first payment duration, last payment duration (avg days), and AOV charts |
| FR-A9 | UX: focus toolbar, KPI snapshot, sectioned chart groups (Performance / Rates / Lead times / Lifetime value); year filter only in Monthly view |
| FR-A10 | Customer LTV: avg LTV on summary/monthly/annual; Average LTV trend + Top customers by LTV (web + mobile) |
| FR-A11 | Customer performance table for linked orders (same metrics family as products) |

### FR-UX

| ID | Requirement |
|----|-------------|
| FR-UX1 | Every delete or clear of persisted data requires an explicit in-app confirmation (not native browser). Show entity context; warn that the action cannot be undone |
| FR-UX2 | On narrow viewports and mobile app, list actions use full-width labeled touch targets (≥44px); create/edit forms keep actions reachable with keyboard open |
| FR-UX3 | Catalog identity polish: Products show name + unit chip + soft SKU; Orders show date + soft order ID; details/shipment live in View sheets |
| FR-UX4 | Money uses compact `formatMoney` (Mn/Bn/Tn/Qd/Qn); quantities use `formatQty` (full digits) |

---

## 5. Non-functional requirements

| ID | Requirement |
|----|-------------|
| NFR-1 | Multi-tenant isolation: all queries filter by JWT `profileId` (no IDOR) |
| NFR-2 | Auth endpoints throttled; global API rate limit applied |
| NFR-3 | Order and warehouse mutations are transactional |
| NFR-4 | Secrets never committed; `.env` gitignored |
| NFR-5 | Pagination hard-capped at 100 |
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
