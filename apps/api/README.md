# UMKM Hub API

NestJS REST system of record (`/api/v1`). Docs **v1.5.233** · code tip **v1.5.232**.

## Stack

NestJS 11 · Prisma 6 · PostgreSQL 16 · JWT + bcrypt · Throttler

## Local run

```bash
npm run setup && npm run sync   # monorepo root
npm run api:dev                 # http://localhost:3001/api/v1/health
```

## Modules

`auth` (incl. forgot/reset) · `profiles` (incl. invoicing identity) · `products` · `customers` · `orders` (incl. invoice PDF + e-Faktur prep) · `warehouse` (create + patch) · `revenue-targets` · `analytics` · `geo` · `export`/`import` · `translate` · `health`

## Notable contracts

- `GET /export?format=json|csv|csv-unified` [& `entity=`]
- `POST /import?format=json|csv-unified` [& `entity=`]
- `GET /analytics?years=&include=&granularity=`
- `GET /orders/:id/invoice/pdf` · `GET /orders/:id/invoice/fiscal?format=csv|xml`
- `GET …/summary` (products, customers, orders, warehouse) — headline rates + embedded **`statistics`**
- `PATCH /warehouse/:id`
- Pagination max `LIST_PAGE_MAX` = **500_000**
- Payment math uses **`amountDue`** (fiscal breakdown of `totalOrderValue`)

## Docs

[`../../docs/`](../../docs/) — PRODUCT, PRD, VARIABLES, ARCHITECTURE, TRACEABILITY
