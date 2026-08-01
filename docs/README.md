# UMKM Hub Documentation Index

Canonical product and engineering documentation for **UMKM Hub** (v1.5.259). Start with the product overview, then use the matrix below by role.

---

## Quick start for readers

| If you need… | Open |
|--------------|------|
| What the product is and why it exists | [PRODUCT.md](./PRODUCT.md) |
| Formal requirements | [PRD.md](./PRD.md) |
| Who we build for | [PERSONAS.md](./PERSONAS.md) |
| Stories & acceptance criteria | [USER_STORIES.md](./USER_STORIES.md) |
| Formulas & field definitions | [VARIABLES.md](./VARIABLES.md) |
| Success metrics & OKRs | [METRICS.md](./METRICS.md) |
| UI tokens & patterns | [DESIGN_GUIDELINES.md](./DESIGN_GUIDELINES.md) |
| FR → code mapping | [TRACEABILITY.md](./TRACEABILITY.md) |
| What we must not break / expand silently | [GUARDRAILS.md](./GUARDRAILS.md) |
| System shape | [ARCHITECTURE.md](./ARCHITECTURE.md) |
| Sandbox & contribution rules | [CONTRIBUTING.md](./CONTRIBUTING.md) |
| Historical development log | [CHANGELOG.md](./CHANGELOG.md) |
| Approved implementation plan | [PLAN.md](./PLAN.md) |
| Repo bootstrap | [../README.md](../README.md) |
| Local development env | [ENV-LOCAL.md](./ENV-LOCAL.md) |
| Production deployment env | [ENV-UMKM-HUB-PRODUCTION.md](./ENV-UMKM-HUB-PRODUCTION.md) |

---

## Document catalog

| Document | Purpose | Audience |
|----------|---------|----------|
| [PRODUCT.md](./PRODUCT.md) | Overview, benefits, features, logics, business & tech guidelines, stack | All |
| [PRD.md](./PRD.md) | Goals, non-goals, functional & non-functional requirements | Product, Eng |
| [PERSONAS.md](./PERSONAS.md) | Sari, Budi, Dewi — goals, devices, scenarios | Product, Design |
| [USER_STORIES.md](./USER_STORIES.md) | Epics E1–E8, stories, AC, FR map | Product, Eng |
| [VARIABLES.md](./VARIABLES.md) | Variable catalog, ERD, formula relationship charts | Eng, Product |
| [METRICS.md](./METRICS.md) | Product metrics, OKRs, SLIs, in-app KPI glossary | Product, Leadership |
| [DESIGN_GUIDELINES.md](./DESIGN_GUIDELINES.md) | Color palettes, typography, components, motion, a11y | Design, Eng |
| [TRACEABILITY.md](./TRACEABILITY.md) | Enterprise FR → API/web/mobile/tests matrix | Eng, QA |
| [GUARDRAILS.md](./GUARDRAILS.md) | Technical, business, performance, platform limits | All builders |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System diagram, modules, data & client architecture | Eng |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Sync, migrations, env drift, sandbox credentials | Eng |
| [CHANGELOG.md](./CHANGELOG.md) | Versioned development history | All |
| [PLAN.md](./PLAN.md) | Approved v1 implementation plan (historical) | Eng, Product |

---

## Coverage checklist (documentation standard)

| Topic | Covered in |
|-------|------------|
| Product overview & benefits | PRODUCT |
| Features & core logics (amountDue, PDF/fiscal, Stock & sales, Order totals, Sold history, statistics) | PRODUCT, PRD, VARIABLES |
| Business guidelines | PRODUCT, GUARDRAILS |
| Tech guidelines & stack (Firebase, Redis/Upstash) | PRODUCT, ARCHITECTURE, README |
| Personas & user stories | PERSONAS, USER_STORIES |
| Variables + formulas + charts | VARIABLES |
| Product & OKR metrics | METRICS |
| Design tokens & components | DESIGN_GUIDELINES |
| Traceability (FR → API/web/mobile) | TRACEABILITY |
| Guardrails (tech + business + perf) | GUARDRAILS |
| Changelog | CHANGELOG |

**Code tip aligned:** v1.5.259 · **Docs stamp:** 1.5.259

When shipping a user-visible change: update **CHANGELOG**, bump version stamps on PRODUCT/PRD if needed, and adjust VARIABLES / TRACEABILITY / DESIGN when formulas, FR coverage, or UI tokens change.
