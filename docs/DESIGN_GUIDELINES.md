# Design Guidelines — UMKM Hub

| Field | Value |
|-------|-------|
| **Product** | UMKM Hub |
| **Version** | 1.5.250 |
| **Date** | 2026-08-01 |
| **Sources of truth** | `apps/web/src/app/globals.css`; `apps/mobile/lib/theme/umkm_theme.dart` |

---

## 1. Visual direction

Calm operational workspace for Indonesian UMKM — **forest teal** brand on a soft mint atmosphere.

**Avoid:** purple SaaS gradients; cream + terracotta broadsheet; heavy glow chrome; Inter/Roboto/system as primary UI face; emoji-as-decoration; multi-layer drop-shadow stacks.

**Do:** one composition per page job; brand-forward shell; Manrope everywhere; soft radial page wash; intentional motion (2–3 patterns).

---

## 2. Color palettes

### 2.1 Core brand & surface (web + mobile)

| Token | Web CSS | Mobile (`UmkmColors`) | Hex | Usage |
|-------|---------|------------------------|-----|-------|
| Brand | `--brand` | `brand` | `#0B6B58` | Primary actions, links hover |
| Brand deep | `--brand-deep` | `brandDeep` | `#064F41` | Titles, emphasis |
| Brand soft | `--brand-soft` | `brandSoft` | `#D3EBE3` | Nav active, soft fills |
| Brand glow | `--brand-glow` | — | `rgba(11,107,88,0.14)` | Focus / soft highlight |
| Background | `--bg` | `bg` | `#EEF5F1` | Page base |
| Background deep | `--bg-deep` | — | `#E2EBE6` | Gradient depth |
| Ink | `--ink` | `ink` | `#14241E` | Body text |
| Muted | `--muted` | `muted` | `#5A6F66` | Secondary text |
| Line | `--line` | `line` | `#C5D4CC` | Borders |
| Line strong | `--line-strong` | — | `#9FB3A9` | Stronger dividers |
| Surface | `--surface` | `surface` | `#FBFEFC` | Panels / cards-when-needed |
| Surface 2 | `--surface-2` | — | `#F4FAF7` | Nested panels |
| Danger | `--danger` | `danger` | `#A33B3B` | Destructive |
| Danger soft | `--danger-soft` | — | `#F8E8E8` | Error panels |
| Shadow | `--shadow` | — | soft elevation | Panels |
| Shadow soft | `--shadow-soft` | — | lighter elevation | Metrics |

### 2.2 Table tokens (web)

| Token | Role |
|-------|------|
| `--table-border` | Soft table outline |
| `--table-header-bg` | Sticky header wash |
| `--table-row-hover` | Brand-soft hover |
| `--table-row-active` | Stronger selection wash |
| `--table-pad-x` / `--table-pad-y` | Cell padding |
| `--table-header-pad-y` | Header padding |
| `--table-min-width` | Horizontal scroll threshold (~44rem) |
| `--table-radius` | Table corner radius |

### 2.3 Radii, space, motion tokens (web)

| Token | Value / notes |
|-------|----------------|
| `--radius` | `1rem` |
| `--radius-sm` | `0.65rem` |
| `--nav-width` | `16rem` (desktop sidebar) |
| `--nav-rail-width` | `4.75rem` (tablet icon rail) |
| `--ease` | `cubic-bezier(0.22, 1, 0.36, 1)` |
| `--space-page` | `clamp(1.25rem, 2.5vw, 2.25rem)` |
| `--measure-prose` | `min(72ch, 100%)` | Long body copy (empty states, glossary definitions) |
| `--measure-prose-wide` | `min(100%, 72rem)` | Soft cap for wide support copy; section/page intros usually `max-width: none` |
| `--touch-min` | `2.75rem` (~44px) touch target floor |
| `--bottom-nav-height` / `--bottom-nav-offset` | Phone bottom bar; sticky form actions clear it |
| `--safe-*` | `env(safe-area-inset-*)` aliases |

### 2.3a Breakpoint contract (web)

| Token | Width | Role |
|-------|-------|------|
| `--bp-tablet` | **1100px** | Stage/metrics compress; tablet icon rail (901–1100) |
| `--bp-nav` | **900px** | Drawer + bottom tabs; tables → cards; form sticky actions |
| `--bp-phone` | **600px** | Full-width CTAs; denser chrome |
| `--bp-narrow` | **480px** | Minimal chrome; stacked filter/analytics FS |

Media queries use these pixel values (CSS custom props are not valid in `@media` ranges; keep literals in sync with the token table).

### 2.4 Status tones (mobile)

`StatusTone.brand | neutral | danger` on `StatusChip` — never use raw `Colors.red`.

### 2.5 Page atmosphere

Body background uses layered radial gradients (teal + soft warm) over `--bg` → `--bg-deep`. Do not replace with flat white.

---

## 3. Typography

| Role | Font | Notes |
|------|------|-------|
| UI / body / headings | **Manrope** | Single family across web + mobile |
| Brand wordmark | Manrope (heavy) | Hierarchy via weight & tracking |

**Web:** `next/font` → `--font-body` / `--font-ui`; `--font-display` aliases body.  
**Mobile:** `GoogleFonts.manrope` + `UmkmType` (`display`, `title`, `body`, `label`) in `umkm_theme.dart`.  
**Section labels:** `SectionLabel` uses `UmkmType.title` (Manrope)—not a second display serif.

### Type scale (web CSS)

| Token | Size |
|-------|------|
| `--text-xs` | 0.72rem |
| `--text-sm` | 0.84rem |
| `--text-md` | 0.95rem |
| `--text-lg` | 1.125rem |
| `--text-xl` | 1.45rem |
| `--text-2xl` | clamp(1.65rem, 2.2vw, 2rem) |

Leading: `--leading-tight` 1.2 · `--leading-snug` 1.35 · `--leading-body` 1.5.  
Tracking: `--tracking-tight` / `--tracking-label`.

---

## 4. Layout & section hierarchy

1. **Page** — `PageHeader` / AppBar + one supporting line  
2. **Content section** — `.umkm-content-section` / `ContentSection` — one job  
3. **Form section** — `.umkm-form-section` / `FormSection` — one topic  
4. **Fields / table / metrics** — atomic content  

Rules:
- One headline + one short supporting line per section  
- Do not nest more than one form-section level  
- Cards only when they contain interaction; no hero cards  
- **Density:** Section heads stretch the panel width. Page/section support lines (`.umkm-sub` in `PageHeader`, `.umkm-panel-desc`, form-section intros) use `max-width: none` so they fill the head—no empty right band on wide layouts. Keep `--measure-prose` for longer body copy (empty states, glossary term definitions). Solo heads (no actions) use `.is-head-solo` / `.is-solo` with tighter padding. Tables, chart grids, and catalog cards fill `.umkm-panel-body`. Lone analytics chart panels span the full grid row (`:only-child`). Empty states stay compact.  

---

## 5. Components

### 5.1 Web

| Component / class | Role |
|-------------------|------|
| `AppShell` | Desktop sidebar; **tablet icon rail** (901–1100); **phone** sticky brand bar + drawer + bottom tabs (Home / Orders / Products / Stock / More) |
| `PageHeader` | Title + support + primary actions |
| Buttons | Filled brand / secondary outline / danger / `.umkm-actions` row |
| Fields | White fill, teal focus ring |
| `OptionChips` | Short enum selection |
| `ViewSheet` | Read-only entity details |
| `ConfirmProvider` | In-app destructive confirms |
| `EntityId` / `.umkm-entity-id.is-soft` | Soft SKU / order ID pills |
| `YearSelect` | Targets year |
| `Targets plan` | Single plan surface (`.umkm-targets-plan`) with By month / By year chips |
| `TimelineFilter` | Analytics timeline (All + multi-select year grid + steppers + Last 3 / This year) |
| `CountryCombobox` | Country field |
| `.umkm-quick-links` | Dashboard navigation with live snippets |
| `.umkm-dashboard*` / `.umkm-dash-domain*` / `.umkm-dash-period*` | Dashboard: stage period panel, workspace board, featured + lean domains, text rail |
| `DashboardPeriodFilter` | Grouped period panel (near / months / longer); scopes order metrics |
| `AppTooltip` / `.umkm-tip*` | Portal metric tooltips: label, exact value, plain-English description, optional formula detail; hover / focus / touch; edge-aware placement |
| Dictionary / `.umkm-glossary-*` | Searchable metric glossary (**101** terms, all with formulas): always-visible feature chips + search, grouped or filtered card grid, expand in-place for meaning + formula; mobile catalog synced via `npm run glossary:sync` |
| Profile / `.umkm-profile*` | Account workspace: identity strip, **Personal details** live preview (monogram + email status + location summary), grouped Name / Email / Location blocks, verify callout, network detect; summary snapshot, credentials with password strength, shortcuts, tips, danger zone; responsive two-column → stacked |
| `/verify-email` | Public auth-style page that consumes email verification tokens |
| `/register` | Split auth layout: teal brand panel + create-profile form; live unified availability (both fields); conflict alert + Sign in CTA; password strength |
| `.umkm-chart-tooltip*` | Analytics chart hover cards (series rows + optional caption) |
| `.umkm-product-sheet` / `.umkm-econ-strip` | Identity + economics in View/Edit |
| `.umkm-pack-composer` | Pack size chips + live sell/cost |
| `.umkm-wh-kpis` | Warehouse KPI strip |
| `.umkm-analytics-lens*` | Period controls + dense snapshot metrics (single section) |
| `.umkm-analytics-*` | Chart panels and legacy KPI helpers |

### 5.2 Mobile

| Widget | Role |
|--------|------|
| `SoftSurface` | Mint gradient shell |
| `EntityCard` | List card with divider metrics |
| `MetricTile` | Summary values |
| `StatusChip` | Status/unit labels |
| `SectionLabel` | Manrope section headings |
| `FormSection` | Form topic blocks |
| `EmptyHint` / `ErrorBanner` | Empty & error states |
| `ChoiceChipGroup` | Enum chips |
| `PageIntro` | Subtitle under AppBar |
| Dictionary (`GlossaryScreen`) | Horizontal feature chips with counts, expandable term tiles (preview → meaning/formula) |
| Profile (`ProfileScreen`) | Identity header, personal-details preview card + grouped Name/Email/Location, workspace snapshot tiles, credentials + confirm password, Analytics/Dictionary shortcuts, tips, danger zone |

### 5.3 Tables & catalogs

- Desktop: `.umkm-table-wrap.umkm-catalog-table-wrap` + sticky blurred header, light zebra, hover, `.is-num`, `.is-actions`
- Sort: `.umkm-th-sort` with `data-dir="asc|desc"` (CSS caret)
- ≤900px: hide table; show `.umkm-catalog-cards` (identity + divider metrics)
- **Feature stage** (list home for Dashboard / Orders / Products / Warehouse / Customers / Targets / Analytics): single section with title, CTA, volume stats, and health rate meters (`.umkm-stage`); ≤1100px volume is hero + 2-col secondaries; ≤600px order is title → metrics → actions (no empty flex gap)
- **Dashboard:** Period panel on the stage; stage stats are period-scoped (Revenue / Orders / Packs + order health). Workspace board: featured Fulfillment + Catalog / Pipeline (hero, two side stats, one spotlight). Slim rail for Warehouse / Targets / Analytics. Stacks ≤1100px / ≤700px
- Orders date filters: compact from/to dropdowns (`.umkm-date-range-filter`) for order / shipment / invoice dates; multi-select for status and payment (Cash / Consignment / Delayed)
- List filters: multi-select dropdown (`.umkm-multi-filter`) for status/unit — empty selection = all; checkbox panel; not chip strips
- ≤900px: filter / period / timeline panels open as **bottom sheets** (`.is-sheet` + `.umkm-filter-sheet-backdrop`) with Done chrome; desktop keeps anchored popovers
- ≤1100px + mobile: filter rows use **collapsible disclosure** (web `CollapsibleFilters` / Flutter `ExpandableFilters`) — **collapsed by default**; summary shows active count badge; desktop (>1100) keeps filters always expanded
- Products catalog also filters **Cost set** and **Pack ready** (same readiness rules as Products stage rates)
- Warehouse inventory also filters **In stock** / **Out of stock** (same rules as Warehouse stage rates)
- **Products:** name + unit chip + soft SKU; details in View only
- **Orders list:** date + soft order ID; shipment in View Timeline only; pack = `size × count` + quiet qty/@ price; **Paid** column = installments ÷ **amountDue** (meter + %); PDF / fiscal prep actions on order detail
- **Stock & sales** (Products, web): dense insight table above Statistics — Stocks primary with current/sold subline; money + STR/ITR/SSR; same catalog filter context
- **Order totals** (Customers, web): commercial + volume columns above Statistics; same Directory filters
- **Sold history** (Warehouse): ledger table above Statistics; **Open order** navigates to Orders view sheet (`?view=`)
- **Domain statistics:** filter-aware mix sections below feature stage (Products / Customers / Orders / Warehouse) — complementary to summary rate meters, not a second dashboard
- **Profile invoicing:** dedicated fiscal identity block (NPWP, PKP, PPN %, taxInclusive, invoice prefix) — calm form density, same tokens as personal details
- Money: `formatMoney` (million / billion / …); chart axes: `formatCompactAxis` (Mn/Bn); Analytics packs/orders/qty: `formatCompactQty` (same magnitude words as money; under 1 million stays full digits)
- Chart value axes: `paddedDomain` — **20% below the series minimum value** and **20% above the maximum value**; `axisTicks` for even labels

### 5.4 Analytics layout

- **Analytics lens** (`.umkm-analytics-lens`): controls-first toolbar + three metric bands (Order quality / Lifetime value / Lead times)
- Period chips: **Weekly / Monthly / Quarterly / Annual** + **TimelineFilter** (All timelines / multi-select years / steppers); status line explains the active scope
- Chart series omit weeks/months/years with **no orders** (API may still return full timeline slots for other consumers)
- Values use compact figure+unit parts; UPT (packs per order) abbreviated like money
- Sectioned chart panels: Performance / Rates / Lead times / Lifetime value / Product value
- Product / LTV rankings: **Top 5** and **Bottom 5** in a dedicated row (`.umkm-analytics-charts-rank`); height scales with row count
- Charts: Recharts (web) / fl_chart (mobile); multi-series use distinct hues (e.g. revenue teal vs target amber) with series swatches in the panel head
- **Progressive paint:** KPIs + active-period charts load before product/customer tables; chart bodies mount near the viewport (web `LazyMount` shimmer / mobile placeholder) so off-screen Recharts/fl_chart trees do not block first paint

### 5.5 Targets layout

- **Feature stage** for annual KPIs + rates; stage CTAs: Edit plan / Clear plan
- **One plan surface** (`.umkm-targets-plan`): Year + **By month / By year** chips; live sync status line
- Monthly: attainment table (desktop) / cards (≤900px); edit uses a 12-cell month grid
- Annual: year-total hero + monthly-shape spark bars (not an empty second section); edit previews even split with live bars
- View switch animates panel enter; reduced-motion respected

---

## 6. Motion

| Pattern | Where |
|---------|--------|
| Subtle rise | Auth / form panels |
| Light fade-in | Main content |
| Staggered rise + hover lift | Dashboard domain panels |
| Panel enter + spark bars | Targets plan / annual shape |
| AnimatedSwitcher | Mobile tab switch |

Respect `prefers-reduced-motion`. Motion creates hierarchy—not noise.

---

## 7. Accessibility

- Visible labels on all inputs  
- Confirm dialogs for delete/clear  
- Color not the sole status signal (text labels for enums)  
- Touch targets ≥44px on mobile / narrow web  
- Selected nav destinations include icons  
- Errors: tinted danger panel; never silent failures  

---

## 8. Content & copy tone

- Operational, clear, Indonesian UMKM-friendly English (or bilingual where product already is)
- Prefer “your profile / catalog / orders” over team/RBAC language
- Stock errors: actionable (“reduce qty to ≤ available”)
- Empty states: one short next action

---

## 9. Related documents

- [PRODUCT.md](./PRODUCT.md)  
- [PERSONAS.md](./PERSONAS.md)  
- [USER_STORIES.md](./USER_STORIES.md) FR-UX  
- [GUARDRAILS.md](./GUARDRAILS.md)  
