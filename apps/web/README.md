# UMKM Hub Web

Next.js 15 ops UI for UMKM Hub — catalog, CRM, orders, warehouse, revenue targets, analytics, dictionary, and dashboard.

Product tip: **v1.5.217** docs · code through **v1.5.216**.

## Stack

- Next.js 15 (App Router) + React 19
- Tailwind CSS 4 + `src/app/globals.css` tokens
- Manrope via `next/font`
- Recharts (code-split analytics)

## Local run

```bash
npm run setup && npm run sync   # monorepo root
npm run api:dev                 # terminal 1
npm run web:dev                 # → http://localhost:3000
```

`NEXT_PUBLIC_API_URL` defaults to `http://localhost:3001/api/v1`.

> Run only one Next process. Do not `build` while `dev` is active.

## Routes

| Path | Purpose |
|------|---------|
| `/login`, `/register`, `/verify-email` | Auth |
| `/dashboard` | Period board |
| `/products`, `/customers`, `/orders`, `/warehouse` | Ops |
| `/targets` | Revenue targets (web-first) |
| `/analytics` | Charts & performance |
| `/glossary` | Metric Dictionary |
| `/profile` | Account workspace |

## Docs

- [Design guidelines](../../docs/DESIGN_GUIDELINES.md)
- [Docs index](../../docs/README.md)
