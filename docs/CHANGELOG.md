# Changelog — UMKM Hub

## 2026-07-25 — v1.5.88 Documentation suite refresh
**Author:** Auto (Cursor agent)  
**Impact:** Full audit of monorepo vs product docs. Refreshed README, PRODUCT, PRD (fixed duplicate FR-C3; added FR-C4/O12–O13/A11/UX3–UX4/NFRs), PERSONAS, USER_STORIES (E8), VARIABLES (ERD + formula relationship charts), METRICS/OKRs, DESIGN_GUIDELINES (Manrope-only; full token tables), TRACEABILITY, GUARDRAILS, CONTRIBUTING; added ARCHITECTURE.md; replaced stale apps/api and apps/web READMEs. Version stamps aligned to changelog tip.

## 2026-07-25 — v1.5.87 Dead code cleanup
**Author:** Auto (Cursor agent)  
**Impact:** Removed unused web/API/mobile exports and helpers (`formatCompactMoney`, unused enum calculators, deprecated SKU alias, stale Nest e2e boilerplate). Trimmed unused country lookup data; kept `packages/shared` and SKU backfill scripts.

## 2026-07-25 — v1.5.86 Compact money labels
**Author:** Auto (Cursor agent)  
**Impact:** Shared `formatMoney` uses Mn/Bn/Tn/Qd/Qn across Analytics, Orders, Products, Warehouse, and Targets (web + mobile). Quantities stay full digits via `formatQty`.

## 2026-07-25 — v1.5.85 Analytics LTV graphs
**Author:** Auto (Cursor agent)  
**Impact:** Analytics adds Avg LTV (linked revenue ÷ active customers) on summary/monthly/annual, plus Average LTV trend and Top customers by LTV charts on web and mobile. Requires customers assigned on orders.

## 2026-07-25 — v1.5.84 Analytics customer performance
**Author:** Auto (Cursor agent)  
**Impact:** Orders can link an optional CRM customer; Analytics adds a Customers performance table (same metrics as products). Existing orders stay unlinked until edited.

## 2026-07-25 — v1.5.83 Analytics product AOV
**Author:** Auto (Cursor agent)  
**Impact:** Product Revenue shows average order value underneath (`revenue ÷ order count`).

## 2026-07-25 — v1.5.82 Analytics rate base fix
**Author:** Auto (Cursor agent)  
**Impact:** Discount %, COGS %, and margin % all use pre-discount gross so they sum to ~100%; amounts unchanged (profit still revenue − cost).

## 2026-07-25 — v1.5.81 Analytics COGS percentage
**Author:** Auto (Cursor agent)  
**Impact:** Cost column shows amount + COGS % of revenue (`cost / revenue`); cards/mobile match.

## 2026-07-25 — v1.5.80 Analytics profit + margin combined
**Author:** Auto (Cursor agent)  
**Impact:** Product Profit column shows amount + margin % (separate Margin column removed); cards/mobile match.

## 2026-07-25 — v1.5.79 Analytics discount percentage
**Author:** Auto (Cursor agent)  
**Impact:** Product discount shows amount + % of gross (`discount / (revenue + discount)`).

## 2026-07-25 — v1.5.78 Analytics product discount
**Author:** Auto (Cursor agent)  
**Impact:** Analytics products table/cards include Discount (order discount allocated per product line); revenue remains post-discount.

## 2026-07-25 — v1.5.77 Orders date column polish
**Author:** Auto (Cursor agent)  
**Impact:** Date column shows order date + soft order ID pill; shipment dates stay in View Timeline only.

## 2026-07-25 — v1.5.76 Products identity: ID in, details out
**Author:** Auto (Cursor agent)  
**Impact:** Catalog identity is name + unit chip + soft SKU pill; product details stay in View sheets only—no description clutter in the list.

## 2026-07-25 — v1.5.75 Products identity column polish
**Author:** Auto (Cursor agent)  
**Impact:** Product column uses name + quiet unit/description + monospace SKU (no ID/unit pills); mobile cards match.

## 2026-07-25 — v1.5.74 Orders pack column polish
**Author:** Auto (Cursor agent)  
**Impact:** Pack column uses `size × count` + quiet qty/price line—no repeated PACKS/QTY/PRICE boxes per row.

## 2026-07-25 — v1.5.73 Orders product column polish
**Author:** Auto (Cursor agent)  
**Impact:** Product column shows name + quiet unit/meta line (no pill clutter); order ID moves under Date as monospace text; mobile cards match; denser, clearer hierarchy.

## 2026-07-25 — v1.5.72 Order stock shortage UX
**Author:** Auto (Cursor agent)  
**Impact:** Order form highlights oversold product rows live (qty + stock + alert with max qty), blocks save until fixed; friendlier stock error copy.

## 2026-07-25 — v1.5.71 Catalog table redesign
**Author:** Auto (Cursor agent)  
**Impact:** Shared table tokens, softer zebra/hover, sticky blurred headers, caret sort affordances, cleaner mobile cards; analytics aligned to catalog table classes.

## 2026-07-25 — v1.5.70 Typography unified on Manrope
**Author:** Auto (Cursor agent)  
**Impact:** Web + mobile use one UI family (Manrope) with shared type tokens; removed Fraunces/serif mix so headings and body feel consistent and more professional.

## 2026-07-25 — v1.5.69 Order totals full width
**Author:** Auto (Cursor agent)  
**Impact:** Totals receipt spans the full section width (label left, amount right)—no nested narrow box or dead space.

## 2026-07-25 — v1.5.68 Order totals receipt layout
**Author:** Auto (Cursor agent)  
**Impact:** Totals use a receipt stack (Subtotal → Discount (5%) → Order total) so the math is obvious instead of three side-by-side cards.

## 2026-07-25 — v1.5.67 Order totals clarity
**Author:** Auto (Cursor agent)  
**Impact:** Totals show money off (−amount) with rate subtitle instead of “Percentage”; Order total accented in a single strip; live pricing strip on the form.

## 2026-07-25 — v1.5.66 Order product meta alignment
**Author:** Auto (Cursor agent)  
**Impact:** Pack / Price / Stock facts sit on one full-width row (no awkward wrap); price shows “each”; stock label shortened.

## 2026-07-25 — v1.5.65 Order product meta facts
**Author:** Auto (Cursor agent)  
**Impact:** Product details use labeled Pack / Price / Available facts (wraps on small screens); quantity uses a Qty label instead of ×.

## 2026-07-25 — v1.5.64 Order product remove icon
**Author:** Auto (Cursor agent)  
**Impact:** Product remove uses a trash icon (not ×) so it no longer clashes with the quantity multiplier.

## 2026-07-25 — v1.5.63 Order product row alignment
**Author:** Auto (Cursor agent)  
**Impact:** Product select capped beside × qty + amount (hint under name); remove stays far right—no stretched empty dropdown.

## 2026-07-25 — v1.5.62 Order product row denser
**Author:** Auto (Cursor agent)  
**Impact:** Single-pack products put product × qty × amount on one row; size chips only when multiple packs; dropped card chrome for divider list; quieter stock/price hint.

## 2026-07-25 — v1.5.61 Order product row scan path
**Author:** Auto (Cursor agent)  
**Impact:** Order products use a single scan path (product → size chips × qty → amount) with quieter hints; dropped nested Pack/Packs labels and duplicate discount boxes.

## 2026-07-25 — v1.5.60 Order size × quantity controls
**Author:** Auto (Cursor agent)  
**Impact:** Order product editor replaces confusing Pack/Packs with Size × Quantity; chips show size only; price appears as “each” in the summary row.

## 2026-07-25 — v1.5.59 Simplify order product form
**Author:** Auto (Cursor agent)  
**Impact:** Multi-product order editor drops redundant Unit / Pack price / Stock drawn boxes; each product is a compact card (product + pack + packs qty + draws/subtotal).

## 2026-07-25 — v1.5.58 Avg order value & first payment duration
**Author:** Auto (Cursor agent)  
**Impact:** Analytics adds average order value (revenue ÷ orders) and first payment duration (order → first installment) on summary/monthly/annual, with web + mobile KPI tiles and charts. Existing payment duration is labeled as last payment.

## 2026-07-25 — v1.5.57 Order “line” copy → products
**Author:** Auto (Cursor agent)  
**Impact:** User-facing order copy no longer says “line(s)” / “Line total”; uses Products / Product / Subtotal on web and mobile.

## 2026-07-25 — v1.5.56 Order ID codes
**Author:** Auto (Cursor agent)  
**Impact:** Order ID is `YYYY_MM_DD_{uuid}` from the order date (e.g. `2026_07_25_<uuid>`). Regenerates when the order date changes; shown on web/mobile lists and view.

## 2026-07-25 — v1.5.55 Order line metric column consistency
**Author:** Auto (Cursor agent)  
**Impact:** Order line/installment right columns use a consistent vertical divider, whole-number money display, and one-decimal percents (`0.0% remaining` / `33.3% remaining`) on web and mobile.

## 2026-07-25 — v1.5.54 Customer ID codes
**Author:** Auto (Cursor agent)  
**Impact:** Customer ID is `{NameSegments}{CompanyType}_{uuid}` (e.g. Budi Santoso + Restaurant → `BuSaR_<uuid>`). Regenerates when name or company type changes; shown on web/mobile lists and view.

## 2026-07-25 — v1.5.53 Product SKU codes
**Author:** Auto (Cursor agent)  
**Impact:** Product ID is `{INITIALS}_{PACK}_{uuid}` (e.g. `CB_100_00000000-0000-4000-8000-000000000001`). Generated on create/update from name + active pack + system UUID; shown as a single Product ID in web/mobile.

## 2026-07-25 — v1.5.52 Multi-product orders
**Author:** Auto (Cursor agent)  
**Impact:** Orders support multiple product lines (`OrderLine`). Create/update send `lines[]`; stock draws/restores per product (cancel restores stock); order-level discount; analytics product performance attributes line revenue; web + mobile UIs add/remove lines.

## 2026-07-25 — v1.5.51 Targets month↔annual sync
**Author:** Auto (Cursor agent)  
**Impact:** Annual target always equals the sum of monthly targets. Saving months syncs annual; saving annual still redistributes an even 12-month split; clearing either side clears the plan. Analytics annual attainment uses the month sum when present.

## 2026-07-25 — v1.5.50 Entity IDs visible
**Author:** Auto (Cursor agent)  
**Impact:** Products, customers, and orders show short ID badges in lists/cards and full copyable UUIDs in View sheets (web + mobile).

## 2026-07-25 — v1.5.49 Analytics UX polish
**Author:** Auto (Cursor agent)  
**Impact:** Analytics layout is reorganized into Focus toolbar, richer KPIs (with loading pulse), and sectioned chart groups (Performance / Rates / Lead times) with clearer panels, margin emphasis on products, and responsive stacking.

## 2026-07-25 — v1.5.48 Analytics period controls polish
**Author:** Auto (Cursor agent)  
**Impact:** Analytics period bar is compact; year dropdown shows only for Monthly view (Annual shows the 5-year window hint).

## 2026-07-25 — v1.5.47 Shipment & payment duration charts
**Author:** Auto (Cursor agent)  
**Impact:** Analytics charts average shipment lead time (order → shipment) and payment lead time (order → last installment).

### API
- Monthly/annual/summary include `avgShipmentDays` and `avgPaymentDays` (+ sample sizes)

### Web / Mobile
- Shipment duration and payment duration line charts; Avg ship / Avg pay KPI tiles

## 2026-07-25 — v1.5.46 Attainment & margin rate charts
**Author:** Auto (Cursor agent)  
**Impact:** Analytics adds line charts for target attainment % and profit margin % (monthly or annual), with KPI tiles for both.

### API
- Monthly/annual series and summary include `cost`, `profit`, `marginPercent` (catalog COGS × qty)

### Web / Mobile
- Attainment rate chart (100% reference when targets exist)
- Profit margin rate chart (when product costs are set)

## 2026-07-25 — v1.5.45 Analytics product performance
**Author:** Auto (Cursor agent)  
**Impact:** Analytics lists products for the selected year with revenue, estimated cost, profit, and margin.

### API
- `GET /analytics` includes `products[]` (non-cancelled orders; cost = current catalog `costPerUnit` × qty sold)

### Web / Mobile
- Product performance table (desktop) / cards (narrow + Flutter)

## 2026-07-25 — v1.5.44 Year dropdown filters
**Author:** Auto (Cursor agent)  
**Impact:** Analytics and Targets year pickers use a compact styled dropdown instead of wrapping chip rows — cleaner on phones and tablets.

### Web
- Shared `YearSelect` on `/analytics` and `/targets`

### Mobile
- Analytics year control uses a branded dropdown field

## 2026-07-25 — v1.5.43 Analytics graphs
**Author:** Auto (Cursor agent)  
**Impact:** New Analytics feature charts monthly and annual order revenue (and order counts), with optional target overlays from revenue plans.

### API
- `GET /analytics?year=` — monthly series, 5-year annual window, KPI summary
- Shared `loadOrderActuals` / `bucketOrdersByMonth` (non-cancelled orders by `orderDate`); Targets reuses the same helper

### Web
- `/analytics` page with year chips, Monthly/Annual toggle, KPI strip, Recharts revenue + orders charts
- Nav + Dashboard quick link

### Mobile
- Analytics screen (fl_chart) opened from Profile → Insights

## 2026-07-25 — v1.5.42 Responsive catalog list cards
**Author:** Auto (Cursor agent)  
**Impact:** Customers, orders, warehouse, and products list cards stack cleanly on tablets, phones, and Flutter — identity, details, and metric tiles instead of cramped single-line meta.

### Web
- Catalog cards use identity + stacked details + 2-column metric tiles under ≤900px
- Customer contact (company/city, email, phone) no longer shares one wrapping line with badges
- Warehouse restock history matches the same card pattern
- Soft metric separator and larger touch action footers on narrow widths

### Mobile
- `EntityCard` uses a responsive metric grid, optional detail lines, and clearer hierarchy
- CRM / orders / warehouse / products list cards align with the web layout

## 2026-07-25 — v1.5.41 Mobile installment cards
**Author:** Auto (Cursor agent)  
**Impact:** Installment editor uses stacked touch-friendly cards on narrow screens, tablets, phones, and Flutter.

### Web
- Payment cards: head, Amount/Percent toggle, value, date, Pays/Left stats + progress
- ≤900px stacks full-width with larger tap targets; view rows adapt under 600px

### Mobile
- Matching card layout with mode chips, date tile, pays/left metrics, progress bar

## 2026-07-25 — v1.5.40 Installment date order
**Author:** Auto (Cursor agent)  
**Impact:** Each installment date must be on or after the previous payment; UI clamps dates and API rejects backwards schedules.

### Web / Mobile
- Date inputs use `min` / picker firstDate from the previous row
- Changing an earlier date bumps later rows forward when needed
- New payment defaults to today or the latest installment date

### API
- `assertInstallmentsChronological` on create/update

## 2026-07-25 — v1.5.39 Installment row polish
**Author:** Auto (Cursor agent)  
**Impact:** Installment editor uses a joined Amt/% input, clearer pays/left meta, and a mini progress bar.

## 2026-07-25 — v1.5.38 Compact installment rows
**Author:** Auto (Cursor agent)  
**Impact:** Order installment editor is a single compact row (Amt/% · value · date · remove) with a quiet remaining line.

## 2026-07-25 — v1.5.37 Installment amount or percentage entry
**Author:** Auto (Cursor agent)  
**Impact:** Order installments can be entered as a fixed amount or as a percentage of the order total.

### Web / Mobile
- Per-installment Amount / Percentage chips; % converts to amount from live order total
- Saved values remain amounts (API unchanged)
- View shows each payment’s share of total (%)

## 2026-07-25 — v1.5.36 Installment remaining after each payment
**Author:** Auto (Cursor agent)  
**Impact:** Order installment rows show remaining amount and % after each payment clears.

### Web / Mobile
- View: chronological installment list with right-aligned remaining amount + remaining %
- Form (web): live “after this payment” remaining under each installment row

## 2026-07-25 — v1.5.35 Choice chips for short filters
**Author:** Auto (Cursor agent)  
**Impact:** Short enum filters and form choices use segmented chips instead of plain dropdowns.

### Web
- Shared `OptionChips` control (radiogroup, optional empty, per-option disabled)
- Unified chip track styling for catalog filters, pack chips, and form choices
- Replaced short selects on Orders, Customers, Products, Targets, Warehouse
- Long entity lists (product pickers) stay as selects

### Mobile
- Shared `ChoiceChipGroup` / `ChoiceOption` widgets
- Orders, Customers, and Products enum fields use chips

## 2026-07-25 — v1.5.34 Orders add / edit / view UX
**Author:** Auto (Cursor agent)  
**Impact:** Order create, edit, and view flows are clearer, more responsive, and payment-aware.

### Web
- View: remaining-focused identity, payment progress bar, Line / Timeline / Totals / Installments blocks
- Form: live Line / Total / Paid / Remaining strip; pack chips; live pack facts; chip selectors for discount & invoice; numbered installment rows
- Responsive order summary and installment layout under 900px / 600px

### Mobile
- Form: sticky financial summary, pack fact chips, numbered installment cards
- View: status chips, remaining metric, progress bar, structured installment list

## 2026-07-25 — v1.5.33 Order invoice & installments
**Author:** Auto (Cursor agent)  
**Impact:** Orders track invoice lifecycle and payment installments with an automatic remaining balance.

### API / Data
- `InvoiceStatus` (`CREATED` | `SENT`), `invoiceDate` on Order
- `OrderInstallment` (amount + date); create/update accepts `installments[]` (full replace on update)
- Responses include `installments`, `paidAmount`, `remainingAmount` (derived)
- Rejects installment totals above order total

### Web / Mobile
- Add/edit: invoice status & date; installment rows with live remaining
- View: invoice block + installment schedule + remaining hero metric

## 2026-07-25 — v1.5.32 Postal code address autofill
**Author:** Auto (Cursor agent)  
**Impact:** Customer forms fill address, city, and province when postal code + country are set.

### API
- `GET /geo/postal-lookup?country=&postalCode=` (auth) via Nominatim, Zippopotam fallback
- Country name → ISO alpha-2 mapping

### Web / Mobile
- Customers Address section: postal + country first; debounced lookup populates empty (or previously auto-filled) address/city/province

## 2026-07-25 — v1.5.31 Country searchable combobox
**Author:** Auto (Cursor agent)  
**Impact:** Customer country is picked from a searchable ISO list instead of free typing alone.

### Web
- `CountryCombobox` with typeahead, keyboard nav, clear, and regional priority suggestions (Indonesia first)
- Wired into Customers add/edit Address section

### Mobile (Flutter)
- `CountryField` Autocomplete on customer forms using the same ISO country list

## 2026-07-25 — v1.5.30 View identity hero
**Author:** Auto (Cursor agent)  
**Impact:** View sheets open with a tighter, metric-first identity strip instead of a sparse chip/stock row.

### Web
- `ViewIdentity` uses a 2-column grid: context chips + filled metric panel (no empty middle)
- On narrow screens the metric stacks first as the hero
- Warehouse, Products, Customers, and Orders view sheets share the pattern with context labels

## 2026-07-25 — v1.5.29 Narrow-screen action UX
**Author:** Auto (Cursor agent)  
**Impact:** Catalog cards and forms feel touch-first on phones/tablets; Flutter forms use bottom sheets.

### Web
- Catalog card actions: full-width segmented buttons with icon + label (View/Edit/Delete/Restock)
- Sticky form footers and sticky view/form panel heads under 900px
- Confirm dialogs respect safe-area; shell uses `dvh`; viewport-fit cover
- Phone (600px): taller card actions, shorter auth hero

### Mobile (Flutter)
- `CardActionButton` labeled footers on Products, Customers, Orders, Warehouse
- `showAppFormSheet` keyboard-safe bottom sheets for create/edit/restock
- List bottom padding clears FAB + nav chrome

## 2026-07-25 — v1.5.28 Mobile & narrow-screen UX
**Author:** Auto (Cursor agent)  
**Impact:** Phones, tablets, and narrow web layouts get a clearer drawer, touch targets, and list cards.

### Web
- Overlay nav drawer with backdrop + Escape close
- 900px / 600px breakpoints: scrollable filter chips, stacked actions, safe-area padding, 16px inputs
- Catalog card action footers full-width on touch
- Targets: monthly edit + attainment card lists below 900px (tables were hidden with no fallback)

### Mobile (Flutter)
- `EntityCard` list pattern (metrics + footer actions) on Products, Customers, Orders
- Shorter bottom-nav labels; tighter dialog insets and card margins

## 2026-07-25 — v1.5.27 Confirm dialog UX
**Author:** Auto (Cursor agent)  
**Impact:** Native browser confirms replaced with an in-app dialog matching the design system.

### Added
- `ConfirmProvider` overlay dialog (blur backdrop, tone icons, Escape / click-outside cancel)
- Mobile bottom-sheet layout for confirms

### Changed
- `confirmDelete` / `confirmClear` are async and drive the shared dialog

## 2026-07-25 — v1.5.26 Delete confirmation everywhere
**Author:** Auto (Cursor agent)  
**Impact:** All delete/clear actions require an explicit confirmation dialog.

### Fixed
- Mobile customers: list and view delete now confirm before API call
### Changed
- Web: shared `confirmDelete` / `confirmClear` helpers with entity name + undo warning
- Mobile products: delete dialog includes product name

## 2026-07-25 — v1.5.25 Unified View sheets
**Author:** Auto (Cursor agent)  
**Impact:** View panels across Products, Customers, Orders, and Warehouse share a polished sheet pattern.

### Added
- Shared `ViewSheet` primitives (identity hero, blocks, facts, chips, Escape to close)
- Staggered block animation and denser detail tiles in view sheets

### Changed
- Customers/Orders views rebuilt with identity hero + purpose blocks
- Products/Warehouse views aligned to the same sheet language

## 2026-07-25 — v1.5.24 Customers & Orders table UX
**Author:** Auto (Cursor agent)  
**Impact:** Customers and Orders lists match Products/Warehouse catalog table UX.

### Changed
- Search, status filter chips, sortable columns, clickable rows
- Denser cells (stacked meta), icon actions, mobile catalog cards
- Orders: pack size/packs/qty/price packed into one Pack cell; dates stacked

## 2026-07-25 — v1.5.23 Restock qty / pack modes
**Author:** Auto (Cursor agent)  
**Impact:** Warehouse restock can be entered as manual unit qty or by pack count.

### Added
- Restock entry mode chips: Manual qty | By pack
- Pack mode derives unit qty; qty mode shows pack equivalent
- `qtyFromPackCount` helper + tests

## 2026-07-25 — v1.5.22 Restock pack context
**Author:** Auto (Cursor agent)  
**Impact:** Restock form and restock view show catalog pack, pack-count entry, and packs-added/after.

### Added
- Restock: Pack field, Packs to add (syncs unit qty), pack economics strip, on-hand / adding / after KPIs
- Restock view: pack chip, pack economics, movement tiles with pack equivalents

## 2026-07-25 — v1.5.21 Warehouse pack snapshot
**Author:** Auto (Cursor agent)  
**Impact:** Warehouse inventory shows the product’s active pack and packs-on-hand alongside stock value.

### Added
- Pack column / chip on inventory table and cards
- Pack economics strip on product View (replaces per-unit-only strip)
- Packs-on-hand label (stock ÷ pack size)
- Restock form shows active pack and packs after qty

## 2026-07-25 — v1.5.20 Annual → monthly distribution
**Author:** Auto (Cursor agent)  
**Impact:** Saving an annual revenue target auto-fills 12 evenly split months.

### Changed
- API: annual upsert writes GENERATED monthly rows (even split; Dec gets remainder)
- Clearing annual also clears the monthly breakdown
- Web: preview of monthly split when editing annual

## 2026-07-25 — v1.5.19 Separated monthly / annual targets
**Author:** Auto (Cursor agent)  
**Impact:** Monthly and annual revenue targets are saved and cleared independently.

### Changed
- API: `PUT/DELETE /revenue-targets/:year/monthly` and `/annual` (no more coupled single upsert)
- Annual systematic no longer falls back to monthly sum
- Web Targets: two separate sections with their own Edit / Save / Clear actions

## 2026-07-25 — v1.5.18 Revenue targets
**Author:** Auto (Cursor agent)  
**Impact:** Profiles can set and track monthly/annual revenue goals vs order actuals.

### Added
- Prisma `RevenueTargetPlan` + `RevenueTargetMonth` (manual / systematic modes)
- API `GET/PUT/DELETE /revenue-targets/:year` with attainment vs non-cancelled order totals
- Systematic monthly: January base × compound MoM growth; systematic annual base + YoY projection
- Web `/targets` page (year picker, edit modes, progress table); nav + dashboard link
- Docs: PRD FR-T1–5, VARIABLES, USER_STORIES E6, TRACEABILITY
- Unit tests: `revenue-target-math.spec.ts`

## 2026-07-25 — v1.5.17 Warehouse View sheets
**Author:** Auto (Cursor agent)  
**Impact:** Warehouse View matches Products sheet pattern—no API changes.

### Changed
- Inventory View: identity strip + Unit rates / Inventory value economics strips (same as Products)
- Restock View: identity strip with date/qty + Stock movement strip; Restock again action
- Docs: DESIGN_GUIDELINES warehouse sheet note

## 2026-07-24 — v1.5.16 Warehouse tables redesign
**Author:** Auto (Cursor agent)  
**Impact:** Warehouse inventory and history are easier to scan—no API changes.

### Changed
- Web Warehouse inventory: fewer columns (stock + inventory values); unit rates moved to View
- Sortable headers, unit filter chips, live search, sticky table, icon View/Restock actions
- Restock history: compact before→after stock, sortable, responsive cards
- KPI strip for inventory totals; lists hide while viewing or restocking

## 2026-07-24 — v1.5.15 Pack composer UX
**Author:** Auto (Cursor agent)  
**Impact:** Pack editing is live and less cluttered—no API changes.

### Changed
- Web Products Pack: size chips, live sell/cost fields (no Replace step), single economics preview
- Removed duplicate pack badges / “saved” status bar; edit loads current pack into the composer
- Docs: DESIGN_GUIDELINES pack composer note

## 2026-07-24 — v1.5.14 Product detail & form sheet
**Author:** Auto (Cursor agent)  
**Impact:** Product View/Edit panels are denser and non-redundant—no API changes.

### Changed
- Web Products View: single identity strip + economics strip (removed duplicate Basics/Pricing grids)
- Create/Edit uses the same economics strip; catalog list hides while viewing or editing
- Docs: DESIGN_GUIDELINES product sheet pattern

## 2026-07-24 — v1.5.13 Products catalog table redesign
**Author:** Auto (Cursor agent)  
**Impact:** Products list is clearer and faster to scan—no API changes.

### Changed
- Web Products: replaced dense pack mini-grid with scannable columns (Product, Pack, Sell, Cost, Profit, Margin)
- Live search, unit filter chips, sortable headers, sticky header, icon actions
- Responsive card layout under ~900px; row/card tap opens View
- Docs: DESIGN_GUIDELINES catalog pattern

## 2026-07-24 — v1.5.12 View details across features
**Author:** Auto (Cursor agent)  
**Impact:** Every feature list now supports a read-only View that complements Add, Edit, and Delete—no API changes.

### Added
- Web: View panel with detail grid on Products, Customers, Orders; inventory + restock View on Warehouse
- Mobile: View dialogs (tap row / eye icon) with Edit/Delete shortcuts where applicable
- Shared `DetailGrid` / `DetailItem` (web) and `DetailRow` (mobile)

## 2026-07-24 — v1.5.11 Profit margin %
**Author:** Auto (Cursor agent)  
**Impact:** Products and Warehouse show gross profit margin as a percent of selling price when cost is set.

### Added
- API `profitMarginPercent` = `(pricePerUnit − costPerUnit) / pricePerUnit × 100` (`null` when cost unset or sell ≤ 0)
- Web Products: Margin tile/metric beside profit
- Web Warehouse: Margin column, restock preview, inventory margin total
- Mobile Products/Warehouse show margin %
- Docs: VARIABLES, PRD, PRODUCT

## 2026-07-24 — v1.5.10 Product & warehouse profit
**Author:** Auto (Cursor agent)  
**Impact:** Products and Warehouse show gross profit (sell − cost) when cost is configured—per unit/pack and for inventory stock value.

### Added
- API `unitProfit` and `potentialProfit` on product serialize (`null` when cost unset)
- Web Products: Sell / Cost / Profit metrics in pack snapshot and form previews
- Web Warehouse: unit profit + inventory profit columns and totals
- Mobile Products/Warehouse list and metric tiles include profit
- Docs: VARIABLES, PRD FR-PR2 / FR-W6, stories

## 2026-07-24 — v1.5.9 Unified content sections
**Author:** Auto (Cursor agent)  
**Impact:** Every feature page uses the same section language—clearer scanning on web and mobile without changing business rules.

### Changed
- Web: `ContentSection` + `FormSection` across Dashboard, Products, Warehouse, Customers, Orders, Profile; panel heads with eyebrow/title/description; accented form blocks
- Mobile: `FormSection` + richer `SectionLabel` on lists and product/profile flows; warehouse inventory/history sections
- Docs: design guidelines for section hierarchy

## 2026-07-24 — v1.5.8 Cross-platform UI polish
**Author:** Auto (Cursor agent)  
**Impact:** Web and mobile shells, forms, lists, and empty states feel more professional, calmer, and easier to scan—without changing product rules.

### Changed
- Web: richer tokens/shadows, icon nav, dashboard quick links, sectioned customer form, shared action rows, elevated metrics/empty states
- Mobile: subtitle-only page intros (no AppBar title duplication), MetricTile/StatusChip/SectionLabel, SoftSurface + theme refinements, danger token instead of `Colors.red`
- Docs: design guidelines aligned to the shared visual system

## 2026-07-24 — v1.5.7 Warehouse inventory cost
**Author:** Auto (Cursor agent)  
**Impact:** Warehouse shows unit cost and inventory cost value (stock × costPerUnit) alongside sell value.

### Added
- API `potentialCost` on product serialize (`null` when cost unset)
- Warehouse inventory columns + totals for cost; restock preview includes cost value
- Mobile warehouse cost lines

## 2026-07-24 — v1.5.6 Pack UI polish
**Author:** Auto (Cursor agent)  
**Impact:** Product pack column and form use a consistent sell/cost snapshot layout that is easier to scan on desktop and mobile.

### Changed
- Table Pack column: size chip + Sell/Cost metric tiles (with per-unit rates)
- Form pack section: clearer header, summary tiles, refined list card
- Responsive wrapping for pack metrics

## 2026-07-24 — v1.5.5 Single pack per product
**Author:** Auto (Cursor agent)  
**Impact:** Non-PCS products may only configure one pack size (price + optional cost). Multiple packs are rejected by API and UI.

### Changed
- API validates single selling pack; cost must match that pack size
- Web: Set/Replace pack clears any previous pack
- Mobile: single pack-size picker
- Unit tests for multi-pack rejection

## 2026-07-24 — v1.5.4 Unified pack price + cost UI
**Author:** Auto (Cursor agent)  
**Impact:** Each pack is entered once with selling price and optional cost together (no separate Add cost flow).

### Changed
- Web: single **Packs** section (size + price + cost → Add pack); PCS uses one **Price & cost** section
- Mobile: price/cost fields paired per pack size
- Product list shows price and cost on the same pack line

## 2026-07-24 — v1.5.3 Product cost fields
**Author:** Auto (Cursor agent)  
**Impact:** Products can store optional purchase/COGS alongside selling prices (per pcs or per pack).

### Added
- Optional `costPerUnit`, `cost50`…`cost1000`, `costCustom` (shares `customSize` with selling packs)
- Derived effective cost rate for non-PCS units
- Web “Pack costs” section + Costs column; mobile cost fields
- Unit tests for `resolveCostPerUnit`

## 2026-07-24 — v1.5.2 Customer address fields
**Author:** Auto (Cursor agent)  
**Impact:** Customers can store full postal address for delivery and CRM location context.

### Added
- Optional customer fields: `address`, `additionalAddress`, `postalCode`, `city`, `province`, `country`
- Migration `20260326150000_customer_address_fields`
- Web/mobile customer forms and list display for city/location
- Search includes city, province, country, postal code

## 2026-07-24 — v1.5.1 Stock & revenue owned by Warehouse
**Author:** Auto (Cursor agent)  
**Impact:** Products no longer edit/display stock or potential revenue; Warehouse shows inventory + revenue and handles restocks.

### Changed
- Product create defaults stock to 0; product update no longer accepts `stockQty`
- Web/mobile Products UI focused on catalog/pricing only
- Warehouse inventory table includes stock and potential revenue

## 2026-07-24 — v1.5.0 Warehouse restock
**Author:** Auto (Cursor agent)  
**Impact:** Users can add stock to existing products with a restock date and audit history.

### Added
- `WarehouseRestock` model + migration
- API `POST/GET /warehouse` (create + list/history)
- Web `/warehouse` page and nav item
- Flutter Warehouse tab/screen
- Docs: PRD FR-W1–5, stories, variables, traceability

## 2026-07-24 — v1.4.0 UI polish (web + mobile)
**Author:** Auto (Cursor agent)  
**Impact:** More professional, responsive workspace UI across web and Flutter.

### Changed
- Web: refreshed tokens, sticky/collapsible nav, split auth layout, page headers, empty states, denser tables, dashboard metrics motion
- Mobile: Manrope/Fraunces theme, soft gradient shell, card lists, extended FABs, animated tab switch, shared empty/error widgets
- Design guidelines updated to match new tokens and motion rules

## 2026-07-24 — v1.3.2 Order pack selection (locked price)
**Author:** Auto (Cursor agent)  
**Impact:** Order price comes from the selected product pack; stock qty = pack size × pack count. Manual price entry removed.

### Added
- Order snapshots: `packSizeSnapshot`, `packPriceSnapshot`, `packCount`
- Pack resolver + unit tests
- Web/mobile pack picker with read-only price and derived stock qty

## 2026-07-24 — v1.3.1 Collapsible create/edit forms
**Author:** Auto (Cursor agent)  
**Impact:** Product, customer, and order forms stay collapsed until Add or Edit is selected.

## 2026-07-24 — v1.3.0 Order dates, status, editable unit/price/qty
**Author:** Auto (Cursor agent)  
**Impact:** Orders capture operational fields for fulfillment and pricing clarity.

### Added
- `orderDate` (defaults to today), optional `shipmentDate`
- Order fulfillment `status`: PENDING | CONFIRMED | SHIPPED | DELIVERED | CANCELLED
- Explicit editable `unit`, `price`, and `qty` on create/update (defaults from product when omitted)
- Web/mobile order forms and list columns for the new fields

### Changed
- Order list sorted by order date (newest first)
- API responses include aliases `unit`, `price`, `qty` alongside snapshots

## 2026-07-24 — v1.1.1 Env sync for sandboxes
**Author:** Auto (Cursor agent)  
**Impact:** Any fresh or outdated dev/sandbox can absorb latest changes with one command.

### Added
- `scripts/sync-env.sh` with `npm run setup` / `npm run sync` (DB health wait, installs, migrate deploy, generate, env drift check)
- Root scripts: `db:migrate`, `db:generate`, `db:seed`
- Idempotent Prisma seed (`rifqi_tjahyono` / `12041994` on first create only) with sample products, customers, and one order
- `docs/CONTRIBUTING.md` post-pull checklist

### Changed
- README quick start prefers sync/setup over manual multi-step bootstrap
- Guardrails require sync after pull and committed migrations with schema PRs

## 2026-07-24 — v1.2.3 Customer required fields narrowed
**Author:** Auto (Cursor agent)  
**Impact:** Only name, title, company name, and company type are required; other customer CRM fields are optional.

## 2026-07-24 — v1.2.2 Sandbox profile credentials
**Author:** Auto (Cursor agent)  
**Impact:** Dev/sandbox seed creates `rifqi_tjahyono` / `12041994` only when missing (manual profile edits are preserved).

## 2026-07-24 — v1.2.1 Remove redundant Qty unit
**Author:** Auto (Cursor agent)  
**Impact:** Product units are now **Pcs / Gram / Liter** only. Existing `QTY` values migrate to `PCS`.

## 2026-07-24 — v1.2.0 Pack pricing + potential revenue
**Author:** Auto (Cursor agent)  
**Impact:** Non-PCS products support pack prices (50/100/250/500/1000/custom). Product list shows potential revenue (`stock × unit price`).

### Added
- Pack price fields on Product + migration
- Server-side unit-price derivation and `potentialRevenue` in API responses
- Web/mobile forms and product table column

## 2026-07-24 — v1.1.0 Product unit types
**Author:** Auto (Cursor agent)  
**Impact:** Products distinguish stock/price by `QTY`, `PCS`, `GRAM`, or `LITER`; orders snapshot the unit.

### Added
- `ProductUnit` enum and `Product.unit` field
- `Order.unitSnapshot` for historical display
- Web/mobile unit selectors and labeled stock/price

## 2026-07-24 — v1.0.0 Initial release (scaffolded)
**Author:** Auto (Cursor agent)  
**Impact:** Greenfield delivery of API, web, mobile, and documentation.

### Added
- NestJS API with Profile/Product/Customer/Order modules, JWT auth, Prisma + PostgreSQL schema
- Order total calculation + unit tests
- Next.js web app: login/register, dashboard, products, customers, orders, profile
- Flutter mobile app: auth, products, customers, orders, profile
- Docker Compose for Postgres
- Full `/docs` suite (PRD, personas, stories, variables, metrics, design, traceability, guardrails)

### Notes
- Mobile requires Flutter SDK locally (`flutter create .` to generate platform folders if needed)
- Docker required to run migrations against Postgres
