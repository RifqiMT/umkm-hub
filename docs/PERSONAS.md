# User Personas — UMKM Hub

| Field | Value |
|-------|-------|
| **Product** | UMKM Hub |
| **Version** | 1.5.88 |
| **Date** | 2026-07-25 |
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
| **Needs in product** | Simple login; product list with optional COGS; warehouse restock + history; customer pipeline; quick order entry; Targets + Analytics on desktop |
| **Devices** | Laptop at warehouse (Chrome), Android phone on supplier visits |
| **Success signal** | Can restock in the morning, take an order in the afternoon, and see monthly revenue vs target the same evening |

### Typical scenarios
1. Morning: open Warehouse, restock 50 packs of chili paste, confirm stockAfter.
2. Midday: update hotel customer to `CLOSING_FIRST_ORDER`, set approval 80%.
3. Evening: review Analytics monthly revenue and attainment; adjust Targets for next quarter.

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
| **Primary jobs** | Correct order totals after discount changes; track installments and remaining balance; mark invoice sent |
| **Goals** | Accurate totals; clear payment terms; editable orders without delete; clean catalog tables |
| **Frustrations** | Recalculating discounts by hand; unclear remaining balance; cluttered ID columns |
| **Needs in product** | Desktop Orders with live totals receipt; installments as amount or %; payment progress; View Timeline for shipment; compact money labels |
| **Devices** | Desktop browser (primary) |
| **Success signal** | Can edit qty, recompute discount, record two installments, and see remainingAmount without a spreadsheet |

### Typical scenarios
1. Open order View → edit lines → confirm totals and remaining balance.
2. Add installments (40% then 60%); verify dates non-decreasing; invoice status → Sent.
3. Cancel a mistaken order and confirm stock restored in Warehouse.

---

## Persona coverage matrix

| Capability | Sari | Budi | Dewi |
|------------|:----:|:----:|:----:|
| Profile / account | ● | ○ | ○ |
| Products + COGS | ● | ○ | ○ |
| Warehouse | ● | ○ | ○ |
| Customers CRM | ● | ● | ○ |
| Orders create/edit | ● | ● | ● |
| Installments / invoice | ○ | ○ | ● |
| Revenue targets | ● | ○ | ○ |
| Analytics | ● | ● | ○ |

● primary · ○ secondary / occasional

---

## Design implications

- **Desktop-first density** for Sari/Dewi (tables, sticky headers, View sheets).
- **Thumb-first mobile** for Budi (cards, chips, full-width actions ≥44px).
- **One visual system** (forest teal + Manrope) so switching devices does not feel like another product.
- **No RBAC UI in v1**—do not imply team roles in copy; prefer “your profile” / “your catalog”.
