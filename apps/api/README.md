# UMKM Hub API

NestJS REST system of record (`/api/v1`). Docs **v1.5.281** · code tip **v1.5.281**.

## Stack

NestJS 11 · Prisma 6 · PostgreSQL 16 · JWT/bcrypt (+ optional Firebase Admin) · Throttler (+ optional Redis/Upstash)

## Local run

```bash
npm run setup && npm run sync   # monorepo root — Docker Postgres + migrations
npm run api:dev                 # http://localhost:3001/api/v1/health
npm run dev:check               # verify local env (not production)
```

Local env template: `.env.example` → copy to `.env`. See [docs/ENV-LOCAL.md](../../docs/ENV-LOCAL.md).

## Modules

`auth` (legacy + Firebase session/register) · `profiles` (incl. invoicing identity) · `products` (incl. stock-sales) · `customers` (incl. order-totals) · `orders` (invoice PDF/fiscal + WarehouseSale dual-write) · `warehouse` (create/patch + sales) · `revenue-targets` · `analytics` · `geo` · `export`/`import` · `translate` · `redis` · `health`

## Notable contracts

- `GET /auth/config` · `POST /auth/firebase/session` · `POST /auth/firebase/register`
- `GET /export?format=json|csv|csv-unified` [& `entity=`]
- `POST /import?format=json|csv-unified` [& `entity=`]
- `GET /analytics?years=&include=&granularity=`
- `GET /orders/:id/invoice/pdf` · `GET /orders/:id/kontra-bon/pdf` · `GET /orders/:id/invoice/fiscal?format=csv|xml`
- `GET /products/stock-sales` · `GET /customers/order-totals` · `GET /warehouse/sales`
- `GET …/summary` — headline rates + embedded **`statistics`**
- `PATCH /warehouse/:id`
- Pagination max `LIST_PAGE_MAX` = **500_000**
- Payment math uses **`amountDue`** (fiscal breakdown of `totalOrderValue`)

## Docs

[`../../docs/`](../../docs/) — PRODUCT, PRD, VARIABLES, ARCHITECTURE, TRACEABILITY
