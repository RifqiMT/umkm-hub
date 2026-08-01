# Changelog — UMKM Hub

## 2026-08-01 — v1.5.265 Documentation suite refresh (post-1.5.264)
**Author:** Auto (Cursor agent)  
**Impact:** Full re-audit vs code tip **v1.5.264**. Fixed Order totals **Revenue** (gross/net) wording in PRODUCT/USER_STORIES; performance View + exclusive focus mode ACs; Dictionary count **102**; FR-UX6 responsive (tablet cards, non-sticky feature chrome, NavigationRail); ARCHITECTURE Redis optional-v1 (not phase 2). Aligned VARIABLES Gross/Net friendly names. Stamps → **1.5.265**.

## 2026-08-01 — v1.5.264 Dead code cleanup
**Author:** Auto (Cursor agent)  
**Impact:** Demoted unused web/API module-local types (feature-stage, analytics/order/product/warehouse helpers, billing/invoice share types, DTOs like `MonthAmountDto`) and removed the unused `MultiSelectOption` re-export. Kept ops seed/backfill/repair scripts, seed-math exports, and lint/test tooling deps.

## 2026-08-01 — v1.5.263 Feature section spacing rhythm (narrow + mobile)
**Author:** Auto (Cursor agent)  
**Impact:** Shared CSS tokens unify FeatureStage and content-section padding/gaps on tablet/phone/narrow. Stage volume uses a full-width hero divider and equal secondary columns; stage actions share equal grid tracks (stack under 480). Flutter Order pulse, SectionLabel, MetricTile, and warehouse KPI grids use `UmkmSpace` with consistent inset (no double horizontal padding).

## 2026-08-01 — v1.5.262 Non-sticky feature chrome on narrow + mobile
**Author:** Auto (Cursor agent)  
**Impact:** On tablets/phones/narrow web, feature View/Edit panel heads, form action footers, filter-sheet heads, profile dock/nav, and table headers no longer stick — they scroll with content. App shell brand bar + bottom nav stay fixed. Flutter form/view sheets also scroll title + body + actions as one column (no pinned footer).

## 2026-08-01 — v1.5.261 Responsive UX continuation (all phases)
**Author:** Auto (Cursor agent)  
**Impact:** Web adds staggered card/stage/view motion (reduced-motion safe), stickier form actions on phones, and denser Analytics touch chrome. Flutter finishes Sold history view sheets, adds PageIntro pulse metrics (Products/Customers), stacks order line qty/pack controls on narrow sheets, and tightens Login on small phones.

## 2026-08-01 — v1.5.260 Responsive UX pass (web + mobile)
**Author:** Auto (Cursor agent)  
**Impact:** Web tablets (≤1100) use catalog/insight **cards** instead of horizontal tables; phone FeatureStage rates collapse behind a disclosure; filter sheets and list pager are touch-friendlier; view sheets stick under phone chrome. Flutter adds spacing tokens, `showAppViewSheet` (Products/Customers/Warehouse/Orders), compact card actions on narrow phones, tablet **NavigationRail**, and Analytics metric **cards** under 600px.

## 2026-08-01 — v1.5.259 Exclusive View focus mode for insight tables
**Author:** Auto (Cursor agent)  
**Impact:** Opening View from Products Stock & sales, Customers Order totals, or Warehouse Sold history enters page **focus mode**: FeatureStage, filters, sibling tables, and statistics hide so only the View sheet shows (same pattern as catalog/directory/inventory View). Performance sheets render at page level.

## 2026-08-01 — v1.5.258 Performance View sheets for Stock & sales / Order totals
**Author:** Auto (Cursor agent)  
**Impact:** Stock & sales View opens a **product performance** sheet (stocks, money, STR/ITR/SSR, AOV/UPT), not the catalog product sheet. Order totals View opens an **order performance** sheet for that customer. Catalog/directory View is unchanged.

## 2026-08-01 — v1.5.257 View from Stock & sales / Order totals
**Author:** Auto (Cursor agent)  
**Impact:** Products Stock & sales and Customers Order totals rows open the same product/customer View sheet as the catalog/directory (row click, card tap, or View action).

## 2026-08-01 — v1.5.256 Combined Revenue column (gross + net)
**Author:** Auto (Cursor agent)  
**Impact:** Stock & sales, Order totals, and Analytics product/customer tables use one **Revenue** column: gross primary, `Gross · Net …` subline (same stack pattern as Stocks). CSV still exports Gross revenue and Net revenue as separate fields.

## 2026-08-01 — v1.5.255 Gross revenue vs Net revenue labels
**Author:** Auto (Cursor agent)  
**Impact:** Money tables label columns **Gross revenue** and **Net revenue** (not bare Gross/Revenue/Order total) on Stock & sales, Order totals, and Analytics product/customer (web + mobile + CSV). Section copy and glossary spell out before vs after discount.

## 2026-08-01 — v1.5.254 Gross revenue on money tables
**Author:** Auto (Cursor agent)  
**Impact:** Explicit **Gross** (pre-discount) on Products Stock & sales, Analytics product/customer tables (web + mobile + CSV), and Customers Order totals (Totals label → Gross). API adds `grossRevenue` (`revenue + discount`; Order totals also keeps `totals`). Column order: Gross → Discount → Revenue → Cost → Profit.

## 2026-08-01 — v1.5.253 Stock & sales Cost / Profit % of gross
**Author:** Auto (Cursor agent)  
**Impact:** Products Stock & sales Cost and Profit columns show percent-of-gross sub-lines (same basis as Discount % and Analytics: Discount % + Cost % + Margin % ≈ 100%). API adds `costPercent` and `marginPercent`.

## 2026-08-01 — v1.5.252 Import merge across apps (warehouse sales + child natural keys)
**Author:** Auto (Cursor agent)  
**Impact:** Export/import now includes `warehouseSales` (merge by unique `orderLineId`). Order lines, installments, and restocks merge by natural keys when UUIDs differ across apps. Feature Orders export/import carries related products, customers, and sales; Warehouse includes sales. UI copy clarifies merge by id and natural keys. Orders also restore `paymentDueDate` on merge.

## 2026-08-01 — v1.5.251 Order form narrow-screen cleanup
**Author:** Auto (Cursor agent)  
**Impact:** Create/Modify order no longer shows a header **Cancel** (it duplicated the sticky footer Cancel on phones/tablets). Summary hides Paid/Remaining until editing or installments exist, and hides Subtotal when it equals Total. Mobile order sheet uses the same compact summary.

## 2026-08-01 — v1.5.250 Documentation suite refresh (post-1.5.249)
**Author:** Auto (Cursor agent)  
**Impact:** Full re-audit vs code tip **v1.5.249**. Aligned PRODUCT/PRD/USER_STORIES/VARIABLES/METRICS/TRACEABILITY/ARCHITECTURE/GUARDRAILS/PERSONAS/DESIGN/PLAN/READMEs to shipped Stock & sales (STR/ITR/SSR + money columns), Customer Order totals (volume columns), Warehouse Sold history (dual-write, backfill, Open order web deep-link), pack sizes **1/5/10/25**, Firebase Auth + Upstash Redis, Dictionary **101** terms. Softened includePpn/fiscal # UI claims (API fields; PDF auto-number). Expanded mobile web-first gaps. Stamps → **1.5.250**.

## 2026-08-01 — v1.5.249 Dead code cleanup
**Author:** Auto (Cursor agent)  
**Impact:** Demoted unused web exports (`PROFILE_NAV`, section filter/health types) and API `buildCustomerOrderTotalsCustomerWhere`; removed unused `FirebaseUser` re-export. Deleted accidental `tsc` emit beside API scripts/prisma seeds and gitignored `*.js`/`*.js.map`/`*.d.ts` there. Kept ops scripts and nested types.

## 2026-08-01 — v1.5.248 Dictionary covers Stock & sales and Order totals
**Author:** Auto (Cursor agent)  
**Impact:** Feature Dictionary gains Products Stock & sales metrics (Stocks, Current/Sold, Revenue, Discount, Cost, Profit, STR, ITR, SSR, product orders), Customers Order totals metrics, Warehouse sold-date/order-ref, and updated AOV/UPT/product money feature tags. Section intros refreshed; mobile glossary regenerated.

## 2026-08-01 — v1.5.247 ITR uses average inventory
**Author:** Auto (Cursor agent)  
**Impact:** Product Stock & sales **ITR** is now `sold ÷ average inventory`, with average = (beginning + ending) ÷ 2 and beginning ≈ current + sold. The prior `sold ÷ current` formula produced extreme ratios when on-hand stock was tiny.

## 2026-08-01 — v1.5.246 Stock & sales money columns
**Author:** Auto (Cursor agent)  
**Impact:** Product Stock & sales adds **Revenue**, **Discount** (with %), **Cost**, and **Profit**. Revenue/discount use discount-allocated line shares (same as Analytics); cost is sold × catalog `costPerUnit` (null when unset); profit is revenue − cost.

## 2026-08-01 — v1.5.245 Stock & sales combined Stocks column
**Author:** Auto (Cursor agent)  
**Impact:** Product Stock & sales table merges Current and Sold into one **Stocks** column: total (current + sold) as the primary figure, with Current and Sold on the secondary line. API fields unchanged.

## 2026-08-01 — v1.5.244 Section copy polish
**Author:** Auto (Cursor agent)  
**Impact:** Table, header, and section descriptions rewritten in plain professional English without em-dashes (Stock & sales, Order totals, Sold/Restock history, Analytics performance sections, Profile, Customers address help, Dictionary intros). Mobile glossary regenerated from web catalog.

## 2026-08-01 — v1.5.243 Stock & sales formula audit
**Author:** Auto (Cursor agent)  
**Impact:** Product Stock & sales **AOV** now uses discount-allocated net line revenue (same share rule as Analytics `allocateLineRevenue`), not pre-discount `lineTotal`. Customer Order totals discount aggregation floors negative offs at 0. STR/ITR/SSR/total/current/sold unchanged; unit tests cover allocation + clamps.

## 2026-08-01 — v1.5.242 Product stock column split
**Author:** Auto (Cursor agent)  
**Impact:** Stock & sales columns are now **Total stocks** (= current + sold), **Current stocks** (on-hand), **Sold stocks**. STR/ITR/SSR use current on-hand.

## 2026-08-01 — v1.5.241 Product stock & sales table
**Author:** Auto (Cursor agent)  
**Impact:** Products page gains a **Stock & sales** section above Statistics (mirrors Customers Order totals). Columns: Total/Current/Sold stocks, STR, ITR, SSR, Orders, AOV, UPT. API: `GET /products/stock-sales` (catalog-filter-aware).

## 2026-08-01 — v1.5.240 Customer order totals volume columns
**Author:** Auto (Cursor agent)  
**Impact:** Order totals table adds Orders, Packs, Cancelled (+ cancel rate), AOV, and UPT (packs ÷ orders). Cancelled counted separately; money/packs still from non-cancelled linked orders.

## 2026-08-01 — v1.5.239 Customer order totals table
**Author:** Auto (Cursor agent)  
**Impact:** New filter-aware `GET /customers/order-totals` aggregates linked non-cancelled orders per customer (Totals / Discount / Order total). Web Customers page shows an **Order totals** section above Statistics (name + details, company + details, money columns). Mobile unchanged in v1.

## 2026-08-01 — v1.5.238 Narrow feature-stage density
**Author:** Auto (Cursor agent)  
**Impact:** Fixed phone/tablet feature-stage dead space (copy `flex-basis` inflating height when the stage stacks). Narrow layout is now title → metrics → actions; volume stats use hero + 2-col secondary grid. Applies across Dashboard / Orders / Products / Customers / Warehouse / Targets / Analytics.

## 2026-08-01 — v1.5.237 Open order from Sold history
**Author:** Auto (Cursor agent)  
**Impact:** Sold history “Open order” deep-links to `/orders?view=<orderUuid>` and opens that order’s view sheet. Fixed React Strict Mode race that skipped opening the sheet after navigation.

## 2026-08-01 — v1.5.236 Warehouse sold history backfill
**Author:** Auto (Cursor agent)  
**Impact:** Idempotent CLI `npm run backfill:warehouse-sales -w api` (or `npx tsx src/warehouse/backfill-sales.ts`) reconstructs `WarehouseSale` for existing non-cancelled order lines by replaying restocks + sales per product. Dual-write still covers new/edited orders going forward.

## 2026-08-01 — v1.5.235 Warehouse Sold history
**Author:** Auto (Cursor agent)  
**Impact:** New `WarehouseSale` ledger dual-written when orders draw/restore stock (before → sold → after + order ref). Read-only `GET /warehouse/sales` (+ `/:id`). Web Sold history section above Warehouse Statistics; Flutter Sold history after Restock history. Historical rows via backfill script (v1.5.236). Apply migration via `npm run sync` / `prisma migrate deploy`.

## 2026-08-01 — v1.5.234 Profile Personal details UX polish
**Author:** Auto (Cursor agent)  
**Impact:** Personal details feels clearer and more modern on web + Flutter: live identity preview (monogram, name, email, location), Verified/Unverified status chips, tighter Name / Email / Location grouping, stronger verify callout, detect/clear location actions. No API contract changes.

## 2026-07-31 — v1.5.233 Documentation suite refresh (fiscal / PDF / statistics)
**Author:** Auto (Cursor agent)  
**Impact:** Full re-audit vs code tip **v1.5.232**. Documented previously shipped capabilities: Profile invoicing identity (NPWP, PKP, PPN %, taxInclusive, invoicePrefix); Customer NPWP; Order `amountDue` / `includePpn` / `fiscalInvoiceNumber` / `paymentDueDate`; PDF (`GET …/invoice/pdf`) + e-Faktur prep (`…/fiscal?format=csv|xml`); installments and Paid % vs **amountDue**; domain **statistics** embedded on `GET …/summary`; warehouse `PATCH` (web). Narrowed non-goals to **full DJP filing** (not PDF prep). Updated PRODUCT, PRD, USER_STORIES, PERSONAS, VARIABLES (+ charts), METRICS, GUARDRAILS, TRACEABILITY, ARCHITECTURE, DESIGN, PLAN, READMEs. Stamps → **1.5.233**.

## 2026-07-31 — v1.5.232 Dead code cleanup
**Author:** Auto (Cursor agent)  
**Impact:** Demoted unused web stats/billing helpers and API statistics/invoice internals (`compactOrderReferenceLiteral`, `invoicePdfTemplateRef`, enum key constants, warehouse re-exports). Seed demo helpers made module-private. Kept ops scripts and nested types.

## 2026-07-31 — v1.5.231 Documentation suite refresh (post-1.5.230)
**Author:** Auto (Cursor agent)  
**Impact:** Full re-audit vs tip **v1.5.230**. Documented bill vs invoice collection, scoped export/import (`pwd1:` + `SANDBOX_EXPORT_PASSWORDS`), feature `entity=` transfer, forgot/reset password, UI translate, human entity ID rename (`productId`/`customerId`/`orderId`), pagination max **500_000**. Fixed FR-P10 “secrets omitted”, NFR-5 cap 100, privileged “bcrypt hashes” wording. Stamps → 1.5.231.

## 2026-07-31 — v1.5.230 Dead code cleanup (translation layer)
**Author:** Auto (Cursor agent)  
**Impact:** Removed unused translation helpers (`useTrMap`, `Tr`/`TrInline`/`TrNode`, dead ui-language runtime wrappers, `allTranslateLanguageCodes`, unused number/catalog/cache exports) and demoted Google Translate client constants. Kept seed/backfill/repair scripts.

## 2026-07-31 — v1.5.229 Dead code cleanup
**Author:** Auto (Cursor agent)  
**Impact:** Removed unused web helpers (`downloadSeriesTableCsv`, `filterLanguages`, `allTranslateLanguageCodes`, `resolveListLimit`, `INVOICE_STATUSES`) and deprecated API export-allowlist aliases. Demoted in-file-only exports (`downloadBlob`, `downloadAuthenticatedFile`, `isUiTranslationActive`, feature-export entity list, import merge stats type). Kept seed/backfill scripts.

## 2026-07-31 — v1.5.228 Export password hashes (sealed vs privileged plaintext)
**Author:** Auto (Cursor agent)  
**Impact:** Own-profile exports include the bcrypt password hash sealed as `pwd1:…` (AES-GCM). Allowlisted operator (`rifqi_tjahyono`) all-profile exports include plaintext bcrypt hashes for full sandbox restore. Import restores password hashes from sealed or plaintext export values.

## 2026-07-31 — v1.5.227 Unified JSON/CSV data import (merge)
**Author:** Auto (Cursor agent)  
**Impact:** Profile page adds **Import JSON** and **Import unified CSV** (`POST /import?format=json|csv-unified`). Merge-import upserts by id and natural keys (profileName/email, profileId+sku, profileId+year, planId+month); duplicates in the file are collapsed. Allowlisted users (`rifqi_tjahyono`) merge all profiles; others merge own profile only. Location re-sealed on import; passwords never imported.

## 2026-07-31 — v1.5.226 Fix orders schema drift error
**Author:** Auto (Cursor agent)  
**Impact:** Idempotent repair migration for bill/invoice columns and enum values. API returns a clear “run npm run sync” message instead of a generic 500 when the DB schema is behind the code.

## 2026-07-30 — v1.5.225 Bill & invoice collection on orders
**Author:** Auto (Cursor agent)  
**Impact:** Orders split **bill** (status created/sent + bill date) from **invoice collection** (created, sent, partially paid, fully paid + invoice date). Invoice status is derived from installments and bill status on save; web and mobile show live preview. List rows show bill/invoice labels; API serializes `billDate`.

## 2026-07-27 — v1.5.224 Fix Add order button (lazy catalog deadlock)
**Author:** Auto (Cursor agent)  
**Impact:** Orders “Add order” no longer stays permanently disabled when the product catalog is lazy-loaded. Click loads catalog first; empty catalog shows a clear error; button shows Loading… while fetching.

## 2026-07-27 — v1.5.223 Max-quality analytics PNG export
**Author:** Auto (Cursor agent)  
**Impact:** Chart PNG export prefers vector SVG→canvas, uses 6–8× pixel ratio (min ~3200px wide), high image-smoothing, and lossless PNG encoding.

## 2026-07-27 — v1.5.222 Analytics CSV button + raw numeric export
**Author:** Auto (Cursor agent)  
**Impact:** CSV control moved into the same panel header tools as PNG (incl. fullscreen). Series/rank/catalog CSV exports use raw numeric values (no compact money/qty/% display formatting).

## 2026-07-27 — v1.5.221 Analytics table CSV + chart PNG export
**Author:** Auto (Cursor agent)  
**Impact:** Analytics panels: CSV download on every series/rank table (Table view) and product/customer catalog tables; high-resolution PNG (3×) on every graph panel (Graph view + fullscreen). Helpers in `lib/analytics-export.ts` (`html-to-image` + SVG fallback).

## 2026-07-27 — v1.5.220 Unified CSV export
**Author:** Auto (Cursor agent)  
**Impact:** Added `GET /export?format=csv-unified` — one CSV with a leading `table` column covering all entities. Profile UI: Download unified CSV alongside JSON and CSV ZIP.

## 2026-07-27 — v1.5.219 Scoped data export for all users
**Author:** Auto (Cursor agent)  
**Impact:** Every authenticated user can export JSON/CSV. Allowlisted names (`DATA_EXPORT_PROFILE_NAMES`, default `rifqi_tjahyono`) still dump **all** profiles; others get **own-profile** only (`scope` in eligibility + export payload). Profile UI copy follows scope.

## 2026-07-27 — v1.5.218 Privileged cross-tenant data export
**Author:** Auto (Cursor agent)  
**Impact:** Allowlisted profile (`rifqi_tjahyono` by default via `DATA_EXPORT_PROFILE_NAMES`) can download all profiles + business data as JSON or CSV (ZIP). Sealed city/country decrypted to plaintext; `passwordHash`, `locationIpHash`, and verify-token hashes omitted. Profile UI export section + `GET /api/v1/export` / `eligibility`.

## 2026-07-26 — v1.5.217 Documentation suite refresh (post-1.5.216)
**Author:** Auto (Cursor agent)  
**Impact:** Full re-audit against tip **v1.5.216**. Aligned PRODUCT/PRD/USER_STORIES/VARIABLES/METRICS/TRACEABILITY/ARCHITECTURE/GUARDRAILS/PERSONAS/DESIGN/READMEs to live analytics (10-year window, Weekly/Quarterly, progressive `include`/`granularity`, UPT/APF, mix %, Top/Bottom 5), Targets FeatureStage rates (On plan / Pace / Coverage), and profile identity (required immutable email + username, anti-enumeration, verify, sealed location). Fixed contradictions (optional email; 5-year window; stage margin base). Version stamps → 1.5.217.

## 2026-07-26 — v1.5.216 Dead code cleanup
**Author:** Auto (Cursor agent)  
**Impact:** Removed unused web shim (`analytics-period.ts`), deprecated timeline aliases, unused readiness/glossary/filter helpers, dead warehouse list DTO, and unused ISO-week debug helper. Demoted internals that were only used in-file. Kept seed/backfill scripts and nested API types.

## 2026-07-26 — v1.5.215 Register conflict copy polish
**Author:** Auto (Cursor agent)  
**Impact:** Simplified create-profile conflict wording (plain English): “already in use” + short sign-in guidance; CTA label “Sign in”.

## 2026-07-26 — v1.5.214 Live register availability (unified)
**Author:** Auto (Cursor agent)  
**Impact:** Create profile checks uniqueness in real time once username + email are both valid (`POST /auth/register-availability`). Response is only available/taken with one message—never which field collided. Web/mobile show Checking… / Available / Already in use + Sign in before Create is enabled.

## 2026-07-26 — v1.5.213 Register taken → Sign in CTA
**Author:** Auto (Cursor agent)  
**Impact:** When username or email is taken, Create profile shows a clear “already taken” alert with a Sign in instead button; both fields share the same hint + Sign in link (still does not reveal which field collided).

## 2026-07-26 — v1.5.212 Register conflict UX
**Author:** Auto (Cursor agent)  
**Impact:** Create profile always allows submit (validates on click), scrolls to the conflict alert, and marks username + email with the same unified taken message so the 409 is obvious without live per-field probes.

## 2026-07-26 — v1.5.211 Register anti-enumeration
**Author:** Auto (Cursor agent)  
**Impact:** Registration no longer reveals whether username or email is taken. `POST /auth/register` returns one unified 409 message; public live availability endpoints removed. Web/mobile Create profile show format hints only, then a single conflict alert + Sign in.

## 2026-07-26 — v1.5.210 Create-profile UX polish
**Author:** Auto (Cursor agent)  
**Impact:** Register page redesigned: stronger brand panel, compact field status, password show/hide + strength, clearer disabled CTA, staggered motion, improved mobile stacking.

## 2026-07-26 — v1.5.209 Username immutable + unique
**Author:** Auto (Cursor agent)  
**Impact:** Username stays unique at registration and cannot be changed afterward (`PATCH /profiles/me` rejects `profileName` changes). Web + mobile Profile show username read-only; credentials save is password-only.

## 2026-07-26 — v1.5.208 Rename “Profile name” → “Username”
**Author:** Auto (Cursor agent)  
**Impact:** User-facing copy uses Username (login, register, Profile credentials, API error/availability messages). API field remains `profileName` for compatibility.

## 2026-07-26 — v1.5.207 Email locked to profile name
**Author:** Auto (Cursor agent)  
**Impact:** Once a profile name is registered with an email, that email cannot be changed (`PATCH /profiles/me` rejects email updates). Web + mobile Profile show the email as read-only with a permanent-link notice; verification still works for the locked address.

## 2026-07-26 — v1.5.206 Profile name ↔ unique email required
**Author:** Auto (Cursor agent)  
**Impact:** Every profile must have a unique email bound at registration (`POST /auth/register` requires `email`). Email can no longer be cleared. Public `GET /auth/email-availability` for create-profile live checks. DB: `Profile.email` NOT NULL + migration backfill for legacy rows. Web/mobile Create profile collect email; Profile personal details require email.

## 2026-07-26 — v1.5.205 Unique profile name + email (case-insensitive)
**Author:** Auto (Cursor agent)  
**Impact:** Profile names and emails are unique case-insensitively (DB `LOWER()` unique indexes + app checks). Login/register/rename/availability treat `Foo`/`foo` and mixed-case emails as the same. `GET /profiles/me/email-availability` + live email status on web/mobile Profile. Clear taken-email copy. Migration `20260726230000_case_insensitive_profile_uniques`.

## 2026-07-26 — v1.5.204 Live profile-name availability
**Author:** Auto (Cursor agent)  
**Impact:** `GET /auth/profile-name-availability?profileName=` returns whether a name is free (throttled). Web Create profile + Profile credentials check as you type (~350ms debounce) with available/taken status; Create is blocked while taken. Mobile register mode shows the same live helper text.

## 2026-07-26 — v1.5.203 Duplicate profile name messaging
**Author:** Auto (Cursor agent)  
**Impact:** Register and profile rename return a clear 409 explaining that the profile name is already taken (includes the name; register also suggests signing in). Web Create profile shows the message + Sign in link; mobile register helper text notes uniqueness. Race on create (`P2002`) uses the same copy.

## 2026-07-26 — v1.5.202 Email verify Strict Mode + dev link UX
**Author:** Auto (Cursor agent)  
**Impact:** Fixed false “Invalid or expired” on `/verify-email` (React Strict Mode double-submit). Verify is idempotent once the account is verified; web dedupes in-flight requests + session cache. Profile refreshes verification badges on focus; when Resend is unset, Profile shows a clear “Open verification link” callout instead of a quiet log-only send.

## 2026-07-26 — v1.5.201 Email + account verification
**Author:** Auto (Cursor agent)  
**Impact:** Profiles can verify email (and account) via one-time link. `POST /profiles/me/email/send-verification` (auth) + `POST /auth/verify-email` (public). Tokens hashed at rest, 24h TTL, resend cooldown. Resend optional (`RESEND_API_KEY`); otherwise API logs/returns `devVerifyUrl`. Web `/verify-email` page + Profile badges/send; mobile Profile send + status. Changing email clears verification. Migration `20260726220000_email_verification`.

## 2026-07-26 — v1.5.200 Login with profile name or email
**Author:** Auto (Cursor agent)  
**Impact:** `POST /auth/login` accepts `login` (profile name or email; `profileName` still works). Email match is case-insensitive; emails are stored lowercased. Web + mobile login labels updated. Generic invalid-credentials message avoids user enumeration.

## 2026-07-26 — v1.5.199 Profile location UX + sealed storage
**Author:** Auto (Cursor agent)  
**Impact:** Fixed buggy location UI: city/country now round-trip (AES-GCM sealed at rest, decrypted for the owner); IP stays one-way HMAC. Equal-width location grid + matched country combobox styling. Detect falls back to browser ipapi.co on localhost/private IP. Legacy `h1:` digests prompt re-entry.

## 2026-07-26 — v1.5.198 Profile location/IP HMAC at rest
**Author:** Auto (Cursor agent)  
**Impact:** City, country, and client IP are stored only as HMAC-SHA256 digests (`h1:<hex>`) via `PROFILE_LOCATION_SECRET` / `JWT_ACCESS_SECRET`. API never returns plaintext location or digests—only `locationSet`. Legacy plaintext rows are re-hashed on read. Added `locationIpHash` migration. UI shows “Location on file (hashed)” with replace/clear.

## 2026-07-26 — v1.5.197 Profile personal details + IP location
**Author:** Auto (Cursor agent)  
**Impact:** Profiles can store first name, last name, email, and city/country. New `POST /profiles/me/detect-location` resolves city/country from the client IP (ipapi.co; IP not stored). Web + mobile Profile forms include Detect from network, Country combobox, and separate Save for personal vs credentials. Migration `20260726200000_profile_personal_fields`.

## 2026-07-26 — v1.5.196 Shell account chip (no nav logout)
**Author:** Auto (Cursor agent)  
**Impact:** Removed the redundant sidebar Log out + “Signed in” block. Nav footer is a compact Account chip (monogram + name) that opens Profile; Log out stays on the Profile page only.

## 2026-07-26 — v1.5.195 Profile workspace snapshot & polish
**Author:** Auto (Cursor agent)  
**Impact:** Profile is now a clearer account home: two-column layout (desktop), workspace snapshot (products / customers / orders / margin from summary APIs), password show/hide + strength cue, confirm password, shortcuts (Dictionary / Analytics / Targets / Dashboard), and security tips. Mobile aligned with identity strip, snapshot tiles, confirm password, and the same shortcut/tips model.

## 2026-07-26 — v1.5.194 Profile account workspace UI
**Author:** Auto (Cursor agent)  
**Impact:** Profile redesigned as an account workspace: identity strip (monogram, member since, last updated, copyable ID), clearer credentials with confirm-password + client validation, Log out + Discard, and a stronger danger panel. Delete now returns to `/login`. Dropped Quick links (already in nav).

## 2026-07-26 — v1.5.193 Dictionary toolbar & visibility
**Author:** Auto (Cursor agent)  
**Impact:** Dictionary no longer looks empty: feature chips always visible (search + count on one row), removed left-nav/hidden-chip layout that left a blank panel, dropped opacity animations that could hide sections, simpler single-column flow with card grid below.

## 2026-07-26 — v1.5.192 Dictionary card layout (no sticky clip)
**Author:** Auto (Cursor agent)  
**Impact:** Rebuilt Dictionary terms as a responsive card grid. Removed sticky term headers/`overflow:hidden` that clipped titles (e.g. AOV). No auto-open on search; expand keeps title + meaning + formula in one card. Section chrome simplified.

## 2026-07-26 — v1.5.191 Dictionary expand layout fix
**Author:** Auto (Cursor agent)  
**Impact:** Fixed orphan “How it is calculated” panels on phone: sticky toolbar no longer covers term titles; accordion opens one term at a time; open title stays pinned with its body; mobile terms are separate cards (no CrossFade gap). Search auto-opens only the top match.

## 2026-07-26 — v1.5.190 Dictionary catalog completeness
**Author:** Auto (Cursor agent)  
**Impact:** Dictionary expanded to **80** terms with formulas for every entry. Added Next year, Annual growth %, LTV buyers, Products sold, Product margin % (pre-discount table base), product/customer revenue·discount·cost·profit amounts, unit/pack economics, packs on hand, stock before/after, order discount. Aliases aligned to short UI labels (Subtotal, Attainment, Cancel, Sell value…). Mobile catalog now generated from web (`scripts/sync-glossary-mobile.ts`). Clarified stage vs table Margin; fixed Analytics Attainment tip; METRICS.md updated.

## 2026-07-26 — v1.5.189 Dictionary UX polish
**Author:** Auto (Cursor agent)  
**Impact:** Dictionary search is flatter and faster to use: unique A–Z results (no duplicate terms across features), match highlighting, formula cues, auto-open top matches, clearable search (`/` focus), active filter chips, section “Only this” + jump-to-section browse. Mobile aligned. Docs/changelog updated.

## 2026-07-26 — v1.5.188 Dictionary UI refresh
**Author:** Auto (Cursor agent)  
**Impact:** Dictionary redesigned for denser, clearer browsing. Web: sticky search, desktop feature nav + mobile chip rail with counts, expandable term rows (preview → full meaning/formula), “Also on” hints, clearer empty-state reset. Mobile matches search/chip/expand model. Shorter page intro. Design Guidelines + user story AC updated.

## 2026-07-26 — v1.5.187 Section intro density (no dead band)
**Author:** Auto (Cursor agent)  
**Impact:** Page and section support copy no longer sits in a narrow prose band inside wide panels. Dictionary intros, Analytics `ContentSection` descriptions, and form-section help lines fill the head width; solo heads are slightly tighter. Design Guidelines updated.

## 2026-07-26 — v1.5.186 Performance Phase 4 (SQL value, leaner lists, analytics cache)
**Author:** Auto (Cursor agent)  
**Impact:** Warehouse/product inventory value via SQL `SUM(stock×price/cost)` (no row hydrate). Order list drops installment rows — `paidAmount`/`remainingAmount`/`installmentCount` from page groupBy; View/Edit still load full order (mobile now fetches `GET /orders/:id` too). Analytics shares a ~45s in-process window cache so progressive series→tables reuse the same order load.

## 2026-07-26 — v1.5.185 Performance Phase 3 (analytics progressive load)
**Author:** Auto (Cursor agent)  
**Impact:** Analytics loads faster for first paint. API: `include` (`summary|series|products|customers`) and `granularity` (`weekly|monthly|quarterly|annual|all`) skip unused series/table work; omitted params keep full overview. Web: dynamic Recharts workspace chunk, viewport `LazyMount` for chart panels, progressive core→tables fetch + on-demand series when switching period. Flutter: same progressive API + viewport-lazy fl_chart build. Docs: FR-A19.

## 2026-07-26 — v1.5.184 Performance Phase 2 (lists & summaries)
**Author:** Auto (Cursor agent)  
**Impact:** Leaner order list (slim includes, default limit 20; View/Edit fetch full order). Customer/product/warehouse summaries use SQL counts/aggregates instead of hydrating every row for rates. New DB indexes for `(profileId, updatedAt)`, order date+status, shipment/invoice dates, stockQty. Warehouse UI skips restock refetch when only unit/stock filters change.

## 2026-07-26 — v1.5.183 Performance Phase 1 (load paths)
**Author:** Auto (Cursor agent)  
**Impact:** Faster list/analytics/dashboard loads. API: removed SKU backfill from list hot paths; analytics drops redundant order-actuals fetches, parallelizes year window loads, single-range mix query. Web: stale-while-revalidate on dashboard/analytics; dashboard refetches only orders summary on period change; Orders defers product/customer catalog until create/edit. Flutter: lazy IndexedStack keeps visited tabs alive; warehouse uses `Future.wait` + keeps prior list while refreshing.

## 2026-07-26 — v1.5.182 Collapsible filters (narrow + mobile)
**Author:** Auto (Cursor agent)  
**Impact:** Catalog, glossary, and analytics period filters collapse by default on tablet/phone (≤1100) and Flutter. Expand to reveal controls; active-count badge when filters are applied. Desktop (>1100) stays always expanded.

## 2026-07-26 — v1.5.181 Responsive shell & narrow UX
**Author:** Auto (Cursor agent)  
**Impact:** Professional tablet/phone chrome across web + Flutter. Web: breakpoint tokens, tablet icon rail (901–1100), phone bottom tabs + More drawer, filter bottom sheets, sticky actions clear bottom nav/safe areas, denser stage/catalog/analytics on ≤480. Flutter: branded AppBar, nav haptics/transitions, richer EntityCard + Profile Insights hub. Docs: DESIGN_GUIDELINES breakpoints, FR-UX6.

## 2026-07-26 — v1.5.180 Analytics fullscreen lens controls
**Author:** Auto (Cursor agent)  
**Impact:** Fullscreen includes **Weekly/Monthly/Quarterly/Annual** and **Graph/Table** toggles (synced with the lens). Stable panel keys keep cinema open across period changes. Mobile immersive overlay exposes the same controls.

## 2026-07-26 — v1.5.179 Analytics fullscreen bottom-nav UX
**Author:** Auto (Cursor agent)  
**Impact:** Fullscreen cinema redesign: chart-first stage, compact header, **Previous/Next titled controls in the bottom dock**, scrubber dots, responsive stack on narrow screens. Mobile immersive matches (progress bar + bottom neighbors). Side peeks/edge chevrons removed.

## 2026-07-26 — v1.5.178 Analytics fullscreen seamless prev/next
**Author:** Auto (Cursor agent)  
**Impact:** Native FS stays on a stable Analytics charts **host**; prev/next only swaps the active panel (no exit/enter flicker). Enter fade runs on first open only; inactive panels/section chrome hidden inside the host.

## 2026-07-26 — v1.5.177 Analytics fullscreen panel-only scope
**Author:** Auto (Cursor agent)  
**Impact:** Native Fullscreen API targets Analytics chart/table surfaces only (not `documentElement` / app shell). CSS cover remains the fallback.

## 2026-07-26 — v1.5.176 Analytics fullscreen chart fill fix
**Author:** Auto (Cursor agent)  
**Impact:** Fullscreen charts now fill the stage (grid `1fr` row + flex basis 0). Remount/ResizeObserver after layout so Recharts measures the tall stage; stop forcing SVG surface height (fixes scrambled Y-axis). Guard native FS enter race so cinema mode doesn’t drop mid-open.

## 2026-07-26 — v1.5.175 Analytics fullscreen cinema polish
**Author:** Auto (Cursor agent)  
**Impact:** Fullscreen polish: progress bar, direction-aware stage motion, chart canvas frame, hover edge chevrons, prev/next peeks with subtitles, titled filmstrip (nearby charts), swipe-to-switch, clearer “Viewing n of m” status.

## 2026-07-26 — v1.5.174 Analytics fullscreen cinema UX
**Author:** Auto (Cursor agent)  
**Impact:** Fullscreen UX redesign: Graph/Table badge, titled **Previous/Next** peeks with index, clickable progress dots, keyboard hints, stage motion, responsive rails→stacked peeks. Mobile gets neighbor title buttons + dot scrubber.

## 2026-07-26 — v1.5.173 Analytics fullscreen chart-only focus
**Author:** Auto (Cursor agent)  
**Impact:** Fullscreen targets the **chart/table panel element** (not the whole app shell). Prev/next moves native fullscreen to the next panel; layout stays chart-first with compact chrome.

## 2026-07-26 — v1.5.172 Analytics fullscreen in-place (permanent)
**Author:** Auto (Cursor agent)  
**Impact:** Permanent Analytics fullscreen fix: panels expand **in place** (no portals / remounts / flushSync). Browser Fullscreen API targets `documentElement` once; prev/next only swaps the active panel class. Esc / close / ← → remain.

## 2026-07-26 — v1.5.171 Analytics fullscreen rewrite
**Author:** Auto (Cursor agent)  
**Impact:** Rewrote Analytics fullscreen shell: no stage portal / dual-mount; shell renders the active chart body via `getBody()` after panels update; keeps prev/next + Fullscreen API without the prior blank/crash loops.

## 2026-07-26 — v1.5.170 Analytics fullscreen flushSync crash
**Author:** Auto (Cursor agent)  
**Impact:** Fixed React crash (`flushSync was called from inside a lifecycle method`) when opening Analytics fullscreen; stage node binds in `useLayoutEffect` instead.

## 2026-07-26 — v1.5.169 Analytics fullscreen stability
**Author:** Auto (Cursor agent)  
**Impact:** Fixed buggy fullscreen: charts no longer mount in two places (blank/jumping graphs); stage bind is synchronous; mobile deck builds fresh slide instances with stable keys and full-size layout.

## 2026-07-26 — v1.5.168 Analytics fullscreen chart navigation
**Author:** Auto (Cursor agent)  
**Impact:** In Analytics fullscreen, move between charts/tables without exiting: web prev/next + ←/→ keys; mobile prev/next + swipe. Counter shows position in the deck.

## 2026-07-26 — v1.5.167 Analytics true browser / immersive fullscreen
**Author:** Auto (Cursor agent)  
**Impact:** Chart fullscreen uses the **browser Fullscreen API** (edge-to-edge viewport; Esc/close exits) with a CSS fallback, plus chart resize after enter. Mobile opens an **immersive** edge-to-edge view (hides system UI) instead of a padded dialog card.

## 2026-07-26 — v1.5.166 Analytics chart fullscreen mode
**Author:** Auto (Cursor agent)  
**Impact:** Each Analytics graph/table panel has a **Fullscreen** control. Web opens a modal overlay (Esc / backdrop / close to exit); mobile pushes a fullscreen dialog. Respects the shared Graph | Table lens toggle.

## 2026-07-26 — v1.5.165 Analytics tooltip period growth
**Author:** Auto (Cursor agent)  
**Impact:** Analytics graph tooltips show **vs prior period** growth: **%** for levels (revenue, orders, AOV, lead times, …) and **bps** for rate mixes (attainment, margin, status/payment shares). Web + mobile touch tooltips.

## 2026-07-26 — v1.5.164 Analytics unify Graph | Table in lens
**Author:** Auto (Cursor agent)  
**Impact:** **Graph | Table** is a single control in the Analytics lens / Period header (web + mobile). It switches all chart panels at once; per-panel toggles removed.

## 2026-07-26 — v1.5.163 Analytics graph / table view toggle
**Author:** Auto (Cursor agent)  
**Impact:** Every Analytics chart panel (web + mobile) has a **Graph | Table** toggle. Table view shows the same period/series values in a compact table. Product/customer performance catalogs stay tables-only (no chart toggle).

## 2026-07-26 — v1.5.162 Analytics order status & payment mix charts
**Author:** Auto (Cursor agent)  
**Impact:** Analytics adds stacked **% order status** (includes Cancelled) and **% payment mode** (Cash / Consignment / Delayed; non-cancelled) charts on the Weekly / Monthly / Quarterly / Annual timeline. Web + mobile. API attaches `statusShares` / `paymentShares` on period points.

## 2026-07-26 — v1.5.161 Analytics invoice duration chart
**Author:** Auto (Cursor agent)  
**Impact:** Analytics Lead times adds **Invoice duration** (avg days order → invoice) on summary, weekly/monthly/quarterly/annual series, lens KPI, and chart. Web + mobile.

## 2026-07-26 — v1.5.160 Analytics combine repeat columns
**Author:** Auto (Cursor agent)  
**Impact:** Product/customer **1st repeat** and **Avg repeat** share one **Repeat** column (primary = first gap; subline = avg). Web cards + mobile metrics match.

## 2026-07-26 — v1.5.159 Analytics first repeat order duration
**Author:** Auto (Cursor agent)  
**Impact:** Product and customer tables add **1st repeat** (`firstRepeatOrderDays`) — UTC days from first → second order; `—` when fewer than two orders. Shown beside avg repeat. Web + mobile.

## 2026-07-26 — v1.5.158 Analytics avg repeat order duration
**Author:** Auto (Cursor agent)  
**Impact:** Product and customer performance tables include **avg repeat order duration** (`avgRepeatOrderDays`) — mean UTC days between consecutive orders for that product/customer; `—` when fewer than two orders. Web + mobile.

## 2026-07-26 — v1.5.157 Analytics rank tooltips: AOV + UPT
**Author:** Auto (Cursor agent)  
**Impact:** Top/Bottom 5 product & customer tooltips (web) and rank row details (mobile) include **AOV** and **UPT** (packs ÷ orders). APF is omitted at this grain (needs unique buyers, not available per product/customer row).

## 2026-07-26 — v1.5.156 Analytics Quarterly view
**Author:** Auto (Cursor agent)  
**Impact:** Analytics adds **Quarterly** alongside Weekly / Monthly / Annual. `GET /analytics` returns `quarterly[]` (UTC Q1–Q4; targets = sum of the three monthly plan amounts). Charts omit empty quarters. Web + mobile.

## 2026-07-26 — v1.5.155 Analytics compact pack & qty figures
**Author:** Auto (Cursor agent)  
**Impact:** Analytics pack counts, order counts, and related product quantities use the same compact magnitude style as money (e.g. `1.00 trillion`). Product/customer lists show packs sold; rank tooltips and lens KPIs match. Web + mobile.

## 2026-07-26 — v1.5.154 Analytics rank tooltips: orders + packs
**Author:** Auto (Cursor agent)  
**Impact:** Top/Bottom 5 product & customer ranking tooltips (web) and rank row details (mobile) show **order count** and **packs sold** alongside revenue. API `products[]` / `customers[]` now include `packsSold`.

## 2026-07-26 — v1.5.153 Analytics rank axis abbreviations
**Author:** Auto (Cursor agent)  
**Impact:** Top/Bottom 5 product & customer chart axes use compact abbreviations (e.g. `D.S.Ten 1000`, `B. Santoso`); full names remain in tooltips (web) / muted subtitle (mobile).

## 2026-07-26 — v1.5.152 Analytics charts skip empty periods
**Author:** Auto (Cursor agent)  
**Impact:** Weekly / Monthly / Annual Analytics charts omit timeline slots with **zero orders** so sparse timelines no longer stretch graphs with blank points. Web + mobile.

## 2026-07-26 — v1.5.151 Sandbox: balanced sell-down to 1Tn packs
**Author:** Auto (Cursor agent)  
**Impact:** One-time data: reassigned customers on ~44k existing orders (round-robin across 18 accounts) and created new balanced multi-line orders so every product sold down to **1,000,000,000,000 packs** on hand. Script: `apps/api/scripts/seed-sell-down-balanced.ts`.

## 2026-07-26 — v1.5.150 Sandbox: high-profile customers
**Author:** Auto (Cursor agent)  
**Impact:** One-time data: upgraded 3 existing customers to fuller high-profile CRM cards (IDs kept for order history) and added **15** new hotel / restaurant / store accounts across major Indonesian cities. Script: `apps/api/scripts/seed-high-profile-customers.ts`.

## 2026-07-26 — v1.5.149 Sandbox: Kambing SKUs + 2Tn packs
**Author:** Auto (Cursor agent)  
**Impact:** One-time data: added **Daging Kambing** Giling / Paha / Tenderloin (1000 g) with sell/cost between Ayam and Sapi analogs; set **all 14** catalog products to **2,000,000,000,000 packs** on hand. Script: `apps/api/scripts/seed-kambing-and-restock-packs.ts`.

## 2026-07-26 — v1.5.148 Analytics bottom-5 rankings
**Author:** Auto (Cursor agent)  
**Impact:** Analytics adds **Bottom 5 products by revenue** and **Bottom 5 customers by LTV** beside Top 5. Rankings sit in their own row (so they no longer stretch beside tall average charts). Lowest-first order; muted bar color. Web + mobile.

## 2026-07-26 — v1.5.147 Analytics top-5 rankings
**Author:** Auto (Cursor agent)  
**Impact:** Analytics ranking charts show **Top 5 products by revenue** and **Top 5 customers by LTV** (was 8). Chart height scales with row count to cut empty space when fewer than five ranks exist. Web + mobile.

## 2026-07-26 — v1.5.146 Section density (less dead space)
**Author:** Auto (Cursor agent)  
**Impact:** Shared web section chrome no longer caps titles in a narrow band inside wide panels. Prose uses `--measure-prose` / `--measure-prose-wide`; solo headers tighten; tables/charts fill the body; lone Analytics charts span full width. Mobile section intros/empty states denser. Design Guidelines updated.

## 2026-07-26 — v1.5.145 Dictionary copy & sections
**Author:** Auto (Cursor agent)  
**Impact:** Dictionary terms and feature sections rewritten into fuller plain-English explanations (what is counted, what is left out, why it matters). Web/mobile group terms under feature intros; formulas labeled “How it is calculated.”

## 2026-07-26 — v1.5.144 Dictionary / Glossary
**Author:** Auto (Cursor agent)  
**Impact:** New **Dictionary** feature with plain-English metric definitions and formulas across Dashboard, Products, Warehouse, Customers, Orders, Targets, and Analytics. Web: `/glossary` + nav. Mobile: Profile → Dictionary. Search and feature filters included.

## 2026-07-26 — v1.5.143 Analytics timeline-aligned weeks/months
**Author:** Auto (Cursor agent)  
**Impact:** Weekly and Monthly charts now cover the full Timeline filter (every ISO week / calendar month in the selected years, or the full app timeline when All)—no more last-52 / last-24 truncation. Weekly series bucketing kept O(n).

## 2026-07-26 — v1.5.142 Analytics weekly target distribution
**Author:** Auto (Cursor agent)  
**Impact:** Weekly Analytics now shows targets and attainment when a 12-month plan exists. Each ISO week gets a day-weighted share of the monthly amounts it intersects (web + mobile).

## 2026-07-26 — v1.5.141 Orders summary bind-limit fix
**Author:** Auto (Cursor agent)  
**Impact:** `GET /orders/summary` no longer loads every matching order id into `IN (...)`. That hit Postgres’ ~32k bind limit on large seeded catalogs and left the Orders stage stuck on `···`. Summary now filters via shared WHERE/SQL predicates.

## 2026-07-26 — v1.5.140 Summary UX & filter correctness
**Author:** Auto (Cursor agent)  
**Impact:** Stage KPIs no longer flash to empty while reloading. Catalog counts show “Showing X of Y” from `meta.total`. Products pack-ready no longer overwrites search; warehouse stock status is applied server-side on `/products`. Orders stage tips clarify non-cancelled volume vs list totals.

## 2026-07-26 — v1.5.139 Filter-aware server summaries
**Author:** Auto (Cursor agent)  
**Impact:** Products, Customers, and Warehouse stage KPIs now come from filter-aware `GET …/summary` APIs (full filtered set), not the current page of rows. List and summary share the same search/chip filters with request sequencing; removed client `feature-summary` recompute.

## 2026-07-26 — v1.5.138 Stability: stale KPIs & filter races
**Author:** Auto (Cursor agent)  
**Impact:** Fixed cross-feature races: AppTooltip no longer opens after disable; Products stage follows committed search; Dashboard/Analytics/Orders clear stale KPIs while reloading; Orders list/summary ignore out-of-order responses; chart qty axes keep decimals; nested Paid tips use embedded mode; warehouse filtered stage no longer shows unfiltered restock dates.

## 2026-07-26 — v1.5.137 Readable magnitude labels
**Author:** Auto (Cursor agent)  
**Impact:** Compact KPI chips use plain English (**million / billion / trillion / quadrillion**) instead of cryptic **Mn/Bn/Qd**. Hover tips show full digits; chart axes keep short labels for space. Magnitude chips restyled as calm readable pills.

## 2026-07-26 — v1.5.136 Tooltip polish
**Author:** Auto (Cursor agent)  
**Impact:** Metric tips use value-first layout, formula pills, tone accent bars, trigger-aligned carets, hover bridge to the bubble, single-open behavior, loading disable, and clearer dotted cues on inline figures. Chart cards match the same visual language.

## 2026-07-26 — v1.5.135 Metric tooltips UX
**Author:** Auto (Cursor agent)  
**Impact:** Replaced native `title` metric hints with shared **AppTooltip** (label, exact value, plain-English description, optional formula). Wired across FeatureStage, Dashboard, Orders/Products/Customers/Warehouse/Targets/Analytics lens + chart hovers. Touch/focus friendly; forest-teal bubble styling.

## 2026-07-26 — v1.5.134 Stability: customers labels + mobile smoke test
**Author:** Auto (Cursor agent)  
**Impact:** Fixed Customers status filter TypeScript error (`label` could be null). Replaced stale Flutter counter widget test with an UMKM Hub app smoke test.

## 2026-07-26 — v1.5.133 Orders payment status filter
**Author:** Auto (Cursor agent)  
**Impact:** Orders list/summary accept `paymentStatus` (Cash / Consignment / Delayed payment) via multi-select, matching Status filter behavior.

## 2026-07-26 — v1.5.132 Order payment math alignment
**Author:** Auto (Cursor agent)  
**Impact:** List **Paid %** and stage **Paid in full** share the same fully-paid rule (`paid ≥ total − 0.00005`). Unit tests cover the 3/12 → 25% case and cancelled exclusion from the denominator.

## 2026-07-26 — v1.5.131 Orders table payment rate
**Author:** Auto (Cursor agent)  
**Impact:** Orders catalog table and cards show **Paid** (installments ÷ total × 100) with a compact meter; hover title shows paid vs total money.

## 2026-07-26 — v1.5.130 Filter-aware feature summaries
**Author:** Auto (Cursor agent)  
**Impact:** Feature stage KPIs now follow active filters. **Orders** reloads `/orders/summary` with the same search/status/date windows as the list. **Products / Customers / Warehouse** recompute stage metrics from the filtered in-view rows. Dashboard period presets use the local calendar (matching order dates).

## 2026-07-26 — v1.5.129 Dashboard compact quantities
**Author:** Auto (Cursor agent)  
**Impact:** Dashboard KPIs (packs, on-hand stock, order counts) use compact Mn/Bn/Tn/Qd/Qn figures like money; hover/`title` still shows full digits.

## 2026-07-26 — v1.5.128 Dashboard composition polish
**Author:** Auto (Cursor agent)  
**Impact:** Dashboard stage focuses on period-scoped **Revenue / Orders / Packs** and order-health rates. Period control is a grouped panel (Near term / Months & quarters / Longer). Workspace board uses a featured Fulfillment panel + lean Catalog/Pipeline panels (hero + side stats + one spotlight rate) and a slim text rail for Warehouse / Targets / Analytics.

## 2026-07-26 — v1.5.127 Dashboard layout UX
**Author:** Auto (Cursor agent)  
**Impact:** Dashboard UX refresh: stage + period caption, three clickable domain panels (Fulfillment / Catalog / Pipeline) with open metrics and slim rate meters, and a quiet secondary strip for Warehouse / Targets / Analytics. Less nested chrome; stronger hierarchy and motion; stacks cleanly on narrow viewports.

## 2026-07-26 — v1.5.126 Dashboard period filter
**Author:** Auto (Cursor agent)  
**Impact:** Dashboard stage CTA is a **Period** select (All time / Today / Tomorrow / This week / This month / Next month / This quarter / Next quarter / This year). Order metrics use `GET /orders/summary?orderDateFrom&orderDateTo`; product and customer bands stay workspace-wide. Default: This month. Weeks are ISO Mon–Sun (UTC).

## 2026-07-26 — v1.5.125 Dashboard stage CTA cleanup
**Author:** Auto (Cursor agent)  
**Impact:** Dashboard stage keeps only **New order**; the secondary Analytics button was removed as redundant with nav and quick links.

## 2026-07-26 — v1.5.124 Dashboard product/customer/order metrics
**Author:** Auto (Cursor agent)  
**Impact:** Dashboard loads `/orders/summary`, `/products/summary`, and `/customers/summary` in parallel. Feature stage shows Revenue / Orders / Customers plus workspace health rates. Three bands surface volume tiles and rate meters for fulfillment, catalog & stock, and CRM pipeline; quick links show live snippets.

## 2026-07-26 — v1.5.123 Average purchase frequency
**Author:** Auto (Cursor agent)  
**Impact:** Analytics adds **Average purchase frequency (APF)** = linked orders ÷ unique customers. Summary/weekly/monthly/annual series, Performance chart, and lens **APF** KPI (web + mobile). Requires customers linked on orders.

## 2026-07-26 — v1.5.122 Revenue target line fix
**Author:** Auto (Cursor agent)  
**Impact:** Restored the amber **Target** line on the Analytics Revenue chart. A stacked Area+Line on the same `target` series prevented Recharts from drawing the line; now a single Line plots with `null`-safe values.

## 2026-07-26 — v1.5.121 Analytics chart polish
**Author:** Auto (Cursor agent)  
**Impact:** Revenue chart uses distinct **teal bars** vs **amber target line**, gradient fills, series swatches, richer tooltips, and smoother animation. Orders / AOV / UPT share the clearer palette; mobile target rods use amber instead of muted grey.

## 2026-07-26 — v1.5.120 UPT uses product packs
**Author:** Auto (Cursor agent)  
**Impact:** Units Per Transaction now averages **pack counts** (`Σ packCount ÷ orders`), not stock units (`productQty`). Matches order pack economics (`productQty = packSize × packCount`).

## 2026-07-26 — v1.5.119 Units Per Transaction graph
**Author:** Auto (Cursor agent)  
**Impact:** Analytics Performance chart and lens KPI rename **Average basket size → Units Per Transaction (UPT)** — average packs sold per order. Same API field `avgBasketSize`; web + mobile copy updated.

## 2026-07-26 — v1.5.118 Targets plan surface UX
**Author:** Auto (Cursor agent)  
**Impact:** Targets replaces dual Monthly/Annual sections with one **plan surface**: Year + **By month / By year** chips, live sync caption, month edit grid, and a real annual read view (year total + monthly shape spark). Switching views animates; Edit/Clear stay on the stage.

## 2026-07-26 — v1.5.117 Analytics multi-timeline filter
**Author:** Auto (Cursor agent)  
**Impact:** Analytics timeline accepts **multiple years** (`years=2024,2025,2026` or `years=all`). Summary/products/customers aggregate the selection; monthly spans those years; weekly uses last 52 weeks when multi/all; annual shows selected years (or rolling window for a single year). Web `TimelineFilter` stays open while toggling years, with Last 3 / This year / Done. Legacy `year` query still works.

## 2026-07-26 — v1.5.116 Analytics timeline filter
**Author:** Auto (Cursor agent)  
**Impact:** Analytics replaces the plain year `<select>` with a **TimelineFilter**: prev/next steppers, custom panel with All timelines + year grid + “This year”, and an inline caption for rolling window / all-scope. Targets keep `YearSelect`.

## 2026-07-26 — v1.5.115 Targets plan actions consolidated
**Author:** Auto (Cursor agent)  
**Impact:** Targets no longer shows duplicate **Edit/Clear monthly** and **Edit/Clear annual** pairs (both clears removed the same plan). One **Edit plan / Clear plan** on the stage; **Set from annual** remains a quiet alternate entry. Monthly and annual sections are display/edit surfaces for the same synced plan.

## 2026-07-26 — v1.5.114 Analytics lens grouping polish
**Author:** Auto (Cursor agent)  
**Impact:** Analytics lens simplified to controls-first toolbar + three metric bands (Order quality / Lifetime value / Lead times). Values use figure+unit compact parts; removed redundant Period title.

## 2026-07-26 — v1.5.113 Analytics period: Weekly + All timelines
**Author:** Auto (Cursor agent)  
**Impact:** Analytics lens redesigned (Period title + controls). Adds **Weekly** charts (ISO weeks; last 52 when All). Timeline select includes **All timelines** (`year=all`): lifetime summary KPIs, trailing 24 months / 52 weeks / full year range. Avg basket uses compact qty formatting.

## 2026-07-26 — v1.5.112 Average basket size
**Author:** Auto (Cursor agent)  
**Impact:** Analytics adds **average basket size** (stock units ÷ orders) on summary/monthly/annual, with a Performance line chart on web + mobile and an Avg basket lens/KPI tile. Formula lives in `basket-series.ts`.

## 2026-07-26 — v1.5.111 Analytics lens (period + snapshot)
**Author:** Auto (Cursor agent)  
**Impact:** Merged Analytics Focus toolbar and Snapshot into one **lens** section (`.umkm-analytics-lens`): compact Monthly/Annual + year controls with a dense 7-metric strip (orders, AOV, LTV, product, ship, first/last pay). Removes redundant “Monthly · year” title and card grid; stacks 7→4→2 columns.

## 2026-07-26 — v1.5.110 Targets & Analytics feature stages
**Author:** Auto (Cursor agent)  
**Impact:** Targets and Analytics list homes use the shared **feature stage** (volume + rate meters). Targets: annual target/actual/next year + attainment/on-plan/pace/coverage. Analytics: revenue/target/profit + attainment/margin/YoY/pace. Snapshot tiles trimmed to avoid duplicating stage KPIs.

## 2026-07-26 — v1.5.109 Filter dropdown clipping fix
**Author:** Auto (Cursor agent)  
**Impact:** Multi-select and date-range filter panels portal to `document.body` with fixed anchoring so labels/menus are no longer clipped by catalog toolbar overflow. Mobile filter row wraps instead of horizontal scroll.

## 2026-07-26 — v1.5.108 Catalog count cleanup
**Author:** Auto (Cursor agent)  
**Impact:** Catalog toolbars no longer echo active filter labels in the count line (Orders / Products / Warehouse / Customers). Count stays; filters speak for themselves.

## 2026-07-26 — v1.5.107 Warehouse stock status filter
**Author:** Auto (Cursor agent)  
**Impact:** Warehouse inventory filters add **In stock** / **Out of stock** (stockQty > 0), aligned with Warehouse stage rates.

## 2026-07-26 — v1.5.106 Products cost & pack filters
**Author:** Auto (Cursor agent)  
**Impact:** Products catalog filters add **Cost set** (cost set / no cost) and **Pack ready** (pack ready / not ready), aligned with Products stage health rates.

## 2026-07-26 — v1.5.105 Analytics product revenue charts
**Author:** Auto (Cursor agent)  
**Impact:** Analytics now mirrors customer LTV with a **Product value** block: average product revenue trend + top products by revenue (web + mobile). Summary adds `avgProductRevenue` / `productSaleCount`.

## 2026-07-26 — v1.5.104 Feature stages (Products / Warehouse / Customers)
**Author:** Auto (Cursor agent)  
**Impact:** Products, Warehouse, and Customers list homes now use the same **feature stage** composition as Orders (title + CTA + volume + rate meters). New summary endpoints: `GET /products/summary`, `GET /warehouse/summary`, `GET /customers/summary`. Shared CSS class `.umkm-stage` (was Orders-only).

## 2026-07-26 — v1.5.103 Orders date filters
**Author:** Auto (Cursor agent)  
**Impact:** Orders list filters by **Order date**, **Shipment date**, and **Invoice date** (inclusive from/to). API accepts `orderDateFrom`/`To`, `shipmentDateFrom`/`To`, `invoiceDateFrom`/`To` on `GET /orders`. Web uses compact date-range dropdowns next to Status.

## 2026-07-26 — v1.5.102 Orders stage (single section)
**Author:** Auto (Cursor agent)  
**Impact:** Merged Orders page title + Order pulse into one **Orders stage** composition (brand title, date span subtitle, CTA, volume, health rates). Removed the separate Overview header for a simpler list home.

## 2026-07-26 — v1.5.101 Orders list pagination
**Author:** Auto (Cursor agent)  
**Impact:** Orders list no longer stops at the first 50/100 rows. API supports search/status/sort paging (`GET /orders`); web shows page controls with “Showing X–Y of Z”; mobile adds **Load more**. Order pulse summary was already full-catalog.

## 2026-07-26 — v1.5.100 Multi-select filter fixes
**Author:** Auto (Cursor agent)  
**Impact:** Fixed catalog multi-select bugs: selecting every option no longer hides blank statuses; **Show all** replaces ambiguous Clear/all; null-safe matching; panel overflow/z-index polish.

## 2026-07-26 — v1.5.99 Multi-select catalog filters
**Author:** Auto (Cursor agent)  
**Impact:** Replaced chip strip filters with a multi-select dropdown (`MultiSelectFilter`) on Orders/Customers (status) and Products/Warehouse (unit). Empty selection = all; checkboxes allow combining values.

## 2026-07-26 — v1.5.98 Order pulse meters
**Author:** Auto (Cursor agent)  
**Impact:** Order pulse denser volume band + animated rate meters (label/value + fill) and labeled active span; responsive 2×2 rates under ~1100px (web + mobile).

## 2026-07-26 — v1.5.97 Order pulse health rates
**Author:** Auto (Cursor agent)  
**Impact:** Order pulse now includes **cancellation**, **profit margin**, **discount**, and **full-payment** rates from `GET /orders/summary` (web + mobile). Formulas: cancelled÷all; (revenue−COGS)÷revenue; discount÷line totals; fully paid÷active.

## 2026-07-26 — v1.5.96 Order pulse refinement
**Author:** Auto (Cursor agent)  
**Impact:** Tightened Order pulse into a card-free ribbon: split magnitude typography (e.g. `407.84` + `Qd`), hairline-separated orders/packs, and a full-width animated date rail — less dead space, clearer hierarchy (web + mobile).

## 2026-07-26 — v1.5.95 Orders “Order pulse” overview
**Author:** Auto (Cursor agent)  
**Impact:** Replaced the five flat Orders KPI cards with a single **Order pulse** composition (hero revenue, date span track, orders + packs facts). Compact qty/date labels for huge volumes; responsive stack on narrow viewports; matching mobile pulse card.

## 2026-07-26 — v1.5.94 Packs in stock label
**Author:** Auto (Cursor agent)  
**Impact:** Warehouse now states **Packs in stock** explicitly (count × pack size) on product view, inventory list/cards, and mobile — not only a quiet `N × size` hint under On hand.

## 2026-07-26 — v1.5.93 Warehouse pack information
**Author:** Auto (Cursor agent)  
**Impact:** Warehouse surfaces active pack everywhere it was missing: mobile inventory/view/restock (incl. by-pack entry) and web restock history pack size + packs-added/before/after sublines. Inventory list on web already had a Pack column.

## 2026-07-26 — v1.5.92 Chart domain matches 20% min/max rule
**Author:** Auto (Cursor agent)  
**Impact:** Restored Analytics Y-axis domain to exactly 20% below the series minimum value and 20% above the maximum (e.g. 11→8.8, 31→37.2), with even tick marks — no longer using range-based padding that drifted from the requirement.

## 2026-07-26 — v1.5.91 Chart axis readability
**Author:** Auto (Cursor agent)  
**Impact:** Fixed buggy Analytics axes (uneven/repeated % ticks) by padding 20% of the data *range* with nice tick bounds; replaced Unicode ÷/− in chart formulas with ASCII so subtitles render correctly.

## 2026-07-26 — v1.5.90 Chart Y-axis padding
**Author:** Auto (Cursor agent)  
**Impact:** Analytics charts use a standardized value-axis domain: 20% below the series minimum and 20% above the maximum (web + mobile), so lead-time and rate charts share consistent headroom.

## 2026-07-26 — v1.5.89 Clarify % of target labels
**Author:** Auto (Cursor agent)  
**Impact:** Replaced vague “Attainment” UI copy with “% of target” / “% of revenue target” and explicit actual ÷ target hints on Analytics and Targets (web + mobile).

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
