# UMKM Hub Web

Next.js 15 ops UI for UMKM Hub — catalog, CRM, orders, warehouse, revenue targets, and analytics against the shared API.

## Stack

- Next.js 15 (App Router) + React 19
- Tailwind CSS 4 + design tokens in `src/app/globals.css`
- Manrope via `next/font`
- Recharts for Analytics

## Local run

From monorepo root (preferred):

```bash
npm run setup
npm run sync
npm run api:dev   # terminal 1
npm run web:dev   # terminal 2 → http://localhost:3000
```

Or from this package:

```bash
cp .env.example .env.local
npm install
npm run dev
```

`NEXT_PUBLIC_API_URL` defaults to `http://localhost:3001/api/v1`.

> Run only one Next process. Do not `npm run build` while `npm run dev` is active (corrupts `.next`).

## Routes

| Path | Purpose |
|------|---------|
| `/login`, `/register` | Auth |
| `/dashboard` | Quick links / overview |
| `/products` | Catalog |
| `/customers` | CRM |
| `/orders` | Multi-line orders |
| `/warehouse` | Stock & restocks |
| `/targets` | Revenue targets |
| `/analytics` | Charts & performance |
| `/profile` | Account |

## Docs

- Design guidelines: [`../../docs/DESIGN_GUIDELINES.md`](../../docs/DESIGN_GUIDELINES.md)
- Product docs index: [`../../docs/README.md`](../../docs/README.md)
