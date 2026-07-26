# Metrics & OKRs — UMKM Hub

| Field | Value |
|-------|-------|
| **Product** | UMKM Hub |
| **Version** | 1.5.217 |
| **Date** | 2026-07-26 |
| **Audience** | Product team, engineering, leadership |
| **Horizon** | 90-day targets unless noted |

---

## 1. Product metrics

| Metric | Friendly name | Definition | Formula | Target (90 days) | Why it matters |
|--------|---------------|------------|---------|------------------|----------------|
| Activated profiles | Activated tenants | Profiles with usable catalog + CRM | `count(profiles where products ≥ 1 AND customers ≥ 1)` | **50** | Onboarding past empty shell |
| Weekly active profiles (WAP) | Weekly active | Profiles with ≥1 mutating API call in 7 days | `distinct profileId` on mutations | **30** | Stickiness |
| Orders per WAP | Order intensity | Orders created per WAP | `orders_created_7d / WAP` | **≥ 3** | Core value loop |
| Stock rejection rate | Oversell prevention | Order attempts rejected for stock | `rejected_stock / order_attempts` | **< 15%** | Warehouse discipline |
| Pipeline coverage | Interested pipeline | Customers marked INTERESTED | `interested / total_customers` | Track baseline | CRM quality |
| Linked-order rate | CRM↔Order link | Orders with `customerId` | `linked / non-cancelled` | Track ↑ | Unlocks LTV |
| Email verified rate | Verified accounts | Profiles with `emailVerifiedAt` set | `verified / activated` | Track ↑ | Trust / recoverability |
| Revenue attainment (annual) | Plan attainment | Actuals vs annual target | `(yearRevenue / annualTarget) × 100` | Track vs plan | Planning usefulness |
| On-plan month rate | On plan | Months hitting ≥100% attainment | see VARIABLES `monthsOnPlanRate` | Track ↑ | Execution quality |
| Analytics viewers | Analytics adoption | Profiles hitting `GET /analytics` in 30d | distinct profiles | Track baseline | Insight loop |
| Dictionary opens | Metric literacy | Profiles opening `/glossary` or mobile Dictionary in 30d | distinct profiles | Track baseline | Shared language |
| Target plan coverage | Planning adoption | Profiles with ≥1 target plan | `with_plan / activated` | Track baseline | Targets pull |
| Installment usage | Payment tracking | Orders with ≥1 installment | `with_installments / orders` | Track baseline | Ops value (Dewi) |

### Metric notes
- **Actuals** exclude `CANCELLED` and use UTC `orderDate` (shared Targets + Analytics).
- Do not optimize vanity registrations without activation.
- Stage margin % (charts) ≠ product-table margin % (gross base)—see VARIABLES.

---

## 2. Product OKRs (example cycle)

### Objective 1 — Reliable order capture
| KR | Description | Target |
|----|-------------|--------|
| KR1 | Order math + installment unit tests green | `npm test` green |
| KR2 | p95 order create API latency (staging) | < **400 ms** |
| KR3 | Cross-tenant data leak findings | **Zero** |

### Objective 2 — CRM adoption
| KR | Description | Target |
|----|-------------|--------|
| KR1 | Customers with `relationshipLevel` set | ≥ **70%** |
| KR2 | Customers with ≥1 promise flag true | ≥ **40%** |
| KR3 | New orders linked to a customer | ≥ **50%** |

### Objective 3 — Insight & planning loop
| KR | Description | Target |
|----|-------------|--------|
| KR1 | Activated profiles with current-year target plan | ≥ **40%** |
| KR2 | WAP that open Analytics ≥1× / month | ≥ **35%** |
| KR3 | WAP that open Dictionary ≥1× / month | ≥ **20%** |

### Objective 4 — Trusted identity
| KR | Description | Target |
|----|-------------|--------|
| KR1 | New registrations with verified email in 7d | Track ↑ |
| KR2 | Register anti-enumeration (no field leak in 409) | **100%** of cases |
| KR3 | Username/email immutability regressions | **Zero** |

### Objective 5 — Platform quality
| KR | Description | Target |
|----|-------------|--------|
| KR1 | Analytics + order + target specs green | CI green |
| KR2 | Web production build | `npm run web:build` green |
| KR3 | Mobile math + glossary sync tests | `flutter test` / glossary sync green |
| KR4 | Progressive analytics first paint (summary+active series) | Track vs full overview |

---

## 3. In-app analytics & stage KPIs (user-facing)

User-facing plain English: **Dictionary** (`/glossary`; mobile Profile → Dictionary). Engineering detail: [VARIABLES.md](./VARIABLES.md).

| KPI | Definition | Persona |
|-----|------------|---------|
| Revenue / Orders / AOV | Non-cancelled totals / count / mean ticket | Sari / Dewi |
| UPT (`avgBasketSize`) | `Σ packCount ÷ orders` | Sari |
| APF | Linked orders ÷ unique customers | Budi / Sari |
| Attainment % | Actual ÷ target × 100 | Sari |
| On plan / Pace / Coverage | Targets FeatureStage rates | Sari |
| Stage margin % | Profit ÷ **net** revenue × 100 | Sari |
| Table margin % | Profit ÷ pre-discount gross × 100 | Sari |
| Ship / Invoice / First pay / Last pay | Lead-time means (days) | Dewi |
| Status mix % | Includes CANCELLED | Dewi |
| Payment mix % | Non-cancelled payment modes | Dewi |
| Avg LTV | Linked revenue ÷ active customers | Budi / Sari |
| Top/Bottom 5 | Products by revenue; customers by LTV | Sari / Budi |
| Packs sold / repeat days | Performance tables | Sari |
| Dictionary terms | ~80 curated glossary entries | All |

---

## 4. Engineering SLIs / SLOs

| SLI | Description | SLO (post-production) |
|-----|-------------|------------------------|
| Availability | Successful non-5xx / total | **99.5%** monthly |
| Auth register / login throttle | Nest Throttler | ~10 / ~20 per min / IP |
| Global API throttle | App-wide | ~**100 / 60s** |
| Analytics window cache | In-process TTL | **45s**; max 64 entries |
| Migration safety | Schema PRs include migrations | **100%** |

---

## 5. Instrumentation checklist (future)

1. Profile-scoped events (never log secrets).  
2. Funnel: register → verify email → first product → first customer → first restock → first order → first analytics → first dictionary.  
3. Separate stock rejection (client vs API).  
4. Progressive analytics timing (summary vs tables).  

---

## 6. Related documents

- [PRODUCT.md](./PRODUCT.md) · [PRD.md](./PRD.md) · [VARIABLES.md](./VARIABLES.md) · [GUARDRAILS.md](./GUARDRAILS.md)
