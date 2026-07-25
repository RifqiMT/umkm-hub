# Metrics & OKRs — UMKM Hub

| Field | Value |
|-------|-------|
| **Product** | UMKM Hub |
| **Version** | 1.5.88 |
| **Date** | 2026-07-25 |
| **Audience** | Product team, engineering, leadership |
| **Horizon** | 90-day targets unless noted |

---

## 1. Product metrics

Operational and adoption metrics derived from product usage (instrument in production when telemetry is available; until then, track via DB queries / logs).

| Metric | Friendly name | Definition | Formula | Target (90 days) | Why it matters |
|--------|---------------|------------|---------|------------------|----------------|
| Activated profiles | Activated tenants | Profiles with usable catalog + CRM | `count(profiles where products ≥ 1 AND customers ≥ 1)` | **50** | Proves onboarding past empty shell |
| Weekly active profiles (WAP) | Weekly active | Profiles with ≥1 mutating API call in 7 days | `distinct profileId` on POST/PATCH/DELETE in window | **30** | Habit / stickiness |
| Orders per WAP | Order intensity | Orders created per weekly active profile | `orders_created_7d / WAP` | **≥ 3** | Core value loop health |
| Stock rejection rate | Oversell prevention | Share of order attempts rejected for stock | `rejected_stock / order_attempts` | **< 15%** | Catalog/warehouse discipline |
| Pipeline coverage | Interested pipeline | Customers marked INTERESTED | `interested / total_customers` | Track baseline | CRM quality |
| Linked-order rate | CRM↔Order link | Orders with `customerId` set | `orders_with_customer / orders` (non-cancelled) | Track ↑ | Unlocks LTV & customer analytics |
| Revenue attainment (annual) | Plan attainment | Actuals vs annual target | `(yearRevenue / annualTarget) × 100` | Track vs plan | Planning usefulness |
| Analytics viewers | Analytics adoption | Profiles opening Analytics in 30d | distinct profiles hitting `GET /analytics` | Track baseline | Insight loop |
| Target plan coverage | Planning adoption | Profiles with ≥1 revenue target plan | `profiles_with_plan / activated` | Track baseline | Targets feature pull |
| Installment usage | Payment tracking | Orders with ≥1 installment | `orders_with_installments / orders` | Track baseline | Ops admin value (Dewi) |

### Metric notes
- **Actuals** always exclude `CANCELLED` orders and use `orderDate` (UTC), matching Targets + Analytics ([VARIABLES.md](./VARIABLES.md)).
- **Stock rejection** should count client-blocked saves and API `400` insufficient-stock responses separately once instrumented.
- Do not optimize vanity metrics (raw registrations) without activation.

---

## 2. Product OKRs (example cycle)

### Objective 1 — Reliable order capture
UMKM operators trust order totals and stock after every save.

| KR | Description | Target |
|----|-------------|--------|
| KR1 | Order math + installment unit tests green in CI | ≥ 5 cases; `npm test` green |
| KR2 | p95 order create API latency in staging | < **400 ms** |
| KR3 | Cross-tenant data leak findings in security review | **Zero** |

### Objective 2 — CRM adoption
Field and owner users keep pipeline fields current.

| KR | Description | Target |
|----|-------------|--------|
| KR1 | Customers with `relationshipLevel` set | ≥ **70%** |
| KR2 | Customers with ≥1 promise flag true | ≥ **40%** |
| KR3 | Orders linked to a customer (`customerId`) | ≥ **50%** of new orders |

### Objective 3 — Insight & planning loop
Owners use Targets and Analytics monthly.

| KR | Description | Target |
|----|-------------|--------|
| KR1 | Activated profiles with a current-year target plan | ≥ **40%** |
| KR2 | WAP that open Analytics ≥1× / month | ≥ **35%** |
| KR3 | Profiles with both monthly revenue and attainment viewed | Track qualitative feedback |

### Objective 4 — Platform quality
Web and mobile stay aligned on shared API contracts.

| KR | Description | Target |
|----|-------------|--------|
| KR1 | API unit test suite | All analytics + order + target specs green |
| KR2 | Web production build | `npm run web:build` green |
| KR3 | Mobile math tests | `flutter test` green for `order_math` |

---

## 3. In-app analytics KPIs (user-facing)

These are **product features**, not team OKRs—documented so product/eng share vocabulary with [VARIABLES.md](./VARIABLES.md).

| KPI shown in app | Definition | User persona |
|------------------|------------|--------------|
| Monthly / annual revenue | Sum of non-cancelled `totalOrderValue` | Sari |
| Order count | Count of those orders | Sari / Budi |
| AOV | `revenue / orderCount` | Dewi / Sari |
| Attainment % | `actual / target × 100` | Sari |
| Margin % | Profit / pre-discount gross | Sari |
| Avg shipment / payment days | Lead-time means | Dewi |
| Avg LTV | Linked revenue ÷ active customers | Budi / Sari |
| Product & customer tables | Performance rankings | Sari |

---

## 4. Engineering SLIs / SLOs

| SLI | Description | SLO (post-production) |
|-----|-------------|------------------------|
| Availability | Successful non-5xx responses / total | **99.5%** monthly |
| Auth register throttle | Nest Throttler on register | **10 / min** / IP (or configured) |
| Auth login throttle | Nest Throttler on login | **20 / min** / IP (or configured) |
| Global API throttle | App-wide | ~**100 / 60s** |
| Error budget | Burn from 5xx + auth outages | Review weekly |
| Migration safety | Schema PRs include committed migrations | **100%** of schema PRs |

---

## 5. Instrumentation checklist (future)

When adding telemetry, prefer:

1. Profile-scoped event counts (never log secrets).
2. Funnel: register → first product → first customer → first restock → first order → first analytics view.
3. Separate counters for stock rejection (client vs API).
4. Feature flags only after baseline metrics exist.

---

## 6. Related documents

- [PRODUCT.md](./PRODUCT.md) — benefits & logics  
- [PRD.md](./PRD.md) — requirements  
- [VARIABLES.md](./VARIABLES.md) — formulas  
- [GUARDRAILS.md](./GUARDRAILS.md) — limits that constrain metric design  
