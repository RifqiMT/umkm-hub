# Design Guidelines — UMKM Hub

| Field | Value |
|-------|-------|
| **Product** | UMKM Hub |
| **Version** | 1.5.88 |
| **Date** | 2026-07-25 |
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
| `--nav-width` | `16rem` |
| `--ease` | `cubic-bezier(0.22, 1, 0.36, 1)` |
| `--space-page` | `clamp(1.25rem, 2.5vw, 2.25rem)` |

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

---

## 5. Components

### 5.1 Web

| Component / class | Role |
|-------------------|------|
| `AppShell` | Sticky sidebar + main; collapsible on small screens |
| `PageHeader` | Title + support + primary actions |
| Buttons | Filled brand / secondary outline / danger / `.umkm-actions` row |
| Fields | White fill, teal focus ring |
| `OptionChips` | Short enum selection |
| `ViewSheet` | Read-only entity details |
| `ConfirmProvider` | In-app destructive confirms |
| `EntityId` / `.umkm-entity-id.is-soft` | Soft SKU / order ID pills |
| `YearSelect` | Analytics / targets year |
| `CountryCombobox` | Country field |
| `.umkm-quick-links` | Dashboard navigation |
| `.umkm-product-sheet` / `.umkm-econ-strip` | Identity + economics in View/Edit |
| `.umkm-pack-composer` | Pack size chips + live sell/cost |
| `.umkm-wh-kpis` | Warehouse KPI strip |
| `.umkm-analytics-*` | Focus toolbar, KPI strip, chart panels |

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

### 5.3 Tables & catalogs

- Desktop: `.umkm-table-wrap.umkm-catalog-table-wrap` + sticky blurred header, light zebra, hover, `.is-num`, `.is-actions`
- Sort: `.umkm-th-sort` with `data-dir="asc|desc"` (CSS caret)
- ≤900px: hide table; show `.umkm-catalog-cards` (identity + divider metrics)
- **Products:** name + unit chip + soft SKU; details in View only
- **Orders:** date + soft order ID; shipment in View Timeline only; pack = `size × count` + quiet qty/@ price
- Money: `formatMoney` (Mn/Bn/Tn/Qd/Qn); qty: `formatQty`

### 5.4 Analytics layout

- Focus toolbar (Monthly / Annual)
- KPI snapshot strip
- Sectioned panels: Performance / Rates / Lead times / Lifetime value
- Year filter **only** in Monthly view
- Stack under 900px; charts: Recharts (web) / fl_chart (mobile)

---

## 6. Motion

| Pattern | Where |
|---------|--------|
| Subtle rise | Auth / form panels |
| Light fade-in | Main content |
| Staggered rise + soft hover | Dashboard metrics |
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
