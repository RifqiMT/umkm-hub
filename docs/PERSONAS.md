# User Personas — UMKM Hub

| Field | Value |
|-------|-------|
| **Product** | UMKM Hub |
| **Version** | 1.5.277 |
| **Date** | 2026-08-06 |
| **Note** | v1 uses a **single profile per tenant**. Field staff (e.g. Budi) act under the owner’s credentials—there is no separate RBAC account. |

---

## Persona 1 — Sari (Owner-Operator)

| Attribute | Detail |
|-----------|--------|
| **Name** | Sari Wijaya |
| **Role** | Owner-operator of a regional food-ingredient UMKM |
| **Age / context** | Mid-30s; runs warehouse + small sales team |
| **Primary jobs** | Keep stock accurate; know which hotels/restaurants are close to closing; set yearly revenue targets |
| **Goals** | One catalog and one CRM that web and phone both trust; fewer “out of stock” surprises; see attainment vs plan |
| **Frustrations** | Spreadsheet version chaos; forgetting discount deals; restocks recorded only in chat |
| **Needs in product** | Username/email login; product list with optional COGS; warehouse; customer pipeline; quick order entry; Targets + Analytics (Weekly→Annual) + Dictionary on desktop |
| **Devices** | Laptop at warehouse (Chrome), Android phone on supplier visits |
| **Success signal** | Can restock in the morning, take an order in the afternoon, and see weekly/monthly revenue vs target + Dictionary definitions the same evening |

### Typical scenarios
1. Morning: open Warehouse, restock 50 packs of chili paste, confirm stockAfter.
2. Midday: update hotel customer to `CLOSING_FIRST_ORDER`, set approval 80%.
3. Evening: review Stock & sales STR/ITR, Analytics Monthly revenue, On plan / Pace on Targets; check Dictionary for UPT/APF meaning.

---

## Persona 2 — Budi (Sales Field Staff)

| Attribute | Detail |
|-----------|--------|
| **Name** | Budi Pratama |
| **Role** | Field sales for a packaging UMKM (**acts under owner profile in v1**) |
| **Age / context** | Late 20s; visits stores and restaurants daily |
| **Primary jobs** | Log visit outcomes; create sample / first orders on the spot |
| **Goals** | Capture CRM notes without WhatsApp sprawl; create orders with correct pack sizes while looking at shelf stock |
| **Frustrations** | Typing long notes in chat apps; not knowing remaining stock while visiting |
| **Needs in product** | Mobile customer form (status, relationship, promises, address); mobile orders with live stock warnings; Analytics peek from Profile |
| **Devices** | Phone primarily (Android); occasional tablet |
| **Success signal** | Leaves a visit with customer stage updated and a sample order saved—without calling the warehouse |

### Typical scenarios
1. At a store: edit customer → `REQUEST_SAMPLE`, promise on-time delivery, save address via postal lookup.
2. Create multi-line order; link customer; fix stock shortage highlight before save.
3. Later: open Analytics from Profile to see top customers by LTV (once orders are linked).

---

## Persona 3 — Dewi (Ops Admin)

| Attribute | Detail |
|-----------|--------|
| **Name** | Dewi Lestari |
| **Role** | Ops admin — handles invoices/payments offline; uses UMKM Hub as the order system of record |
| **Age / context** | Early 40s; desk-based; reconciles cash / consignment / delayed terms |
| **Primary jobs** | Correct order totals after discount/PPN; track installments vs **amount due**; mark bill sent; download PDF / e-Faktur prep |
| **Goals** | Accurate totals incl. PPN; clear payment terms; editable orders without delete; printable invoices |
| **Frustrations** | Recalculating discounts/tax by hand; remaining balance vs wrong base; cluttered ID columns |
| **Needs in product** | Desktop Orders with live totals + **amountDue**; bill vs invoice collection; installments as amount or % of amountDue; PDF + e-Faktur prep; Profile PKP/PPN; compact money labels |
| **Devices** | Desktop browser (primary) |
| **Success signal** | Can edit qty, recompute discount/PPN, record installments ≤ amountDue, download PDF/fiscal prep, and see bill Sent + Partially/Fully paid without a spreadsheet |

### Typical scenarios
1. Open order View → edit lines → confirm totals, amountDue, and remaining balance.
2. Add installments (40% then 60% of amountDue); verify dates non-decreasing; bill → Sent; invoice derives Partially then Fully paid.
3. Download PDF invoice, Kontra bon PDF, and optional e-Faktur CSV/XML prep; cancel a mistaken order and confirm stock restored.

---

## Persona coverage matrix

| Capability | Sari | Budi | Dewi |
|------------|:----:|:----:|:----:|
| Profile / account | ● | ○ | ○ |
| Products + COGS | ● | ○ | ○ |
| Warehouse | ● | ○ | ○ |
| Sold history | ● | ○ | ○ |
| Stock & sales | ● | ○ | ○ |
| Customers CRM | ● | ● | ○ |
| Order totals | ● | ○ | ○ |
| Orders create/edit | ● | ● | ● |
| Installments / invoice | ○ | ○ | ● |
| PDF / e-Faktur prep | ○ | — | ● |
| Profile PKP / PPN | ● | — | ● |
| Domain statistics | ● | ○ | ○ |
| Revenue targets | ● | ○ | ○ |
| Analytics | ● | ● | ○ |
| Dictionary | ● | ● | ○ |
| Dashboard | ● | ○ | ○ |

● primary · ○ secondary / occasional

---

## Design implications

- **Desktop-first density** for Sari/Dewi (tables, sticky headers on wide, View sheets, Targets, Analytics fullscreen, PDF/fiscal, Stock & sales / Order totals performance Views).
- **Thumb-first mobile** for Budi (cards ≤1100, form dropdowns + filter multi-select, full-width foot actions ≥44px, Dictionary via Profile, NavigationRail on tablet).
- **Filters collapsed by default** on every viewport — expand via Filters toggle.
- **Exclusive focus mode** when opening insight/catalog Views — hide stage/filters/siblings so one sheet owns the page.
- **One visual system** (forest teal + Manrope) so switching devices does not feel like another product.
- **No RBAC UI in v1**—do not imply team roles in copy; prefer “your profile” / “your catalog”.
- **Immutable identity**—copy should not suggest renaming username or changing email after register.
- **Prep ≠ filing**—PDF / e-Faktur copy must not claim DJP submission or legal tax compliance.
