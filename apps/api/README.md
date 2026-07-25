# UMKM Hub API

NestJS REST system of record for UMKM Hub (`/api/v1`).

## Stack

- NestJS 11 + TypeScript
- Prisma 6 + PostgreSQL 16
- JWT access/refresh + bcrypt
- class-validator, Throttler

## Local run

From monorepo root (preferred):

```bash
npm run setup   # once
npm run sync    # after pulls
npm run api:dev # http://localhost:3001/api/v1/health
```

Or from this package:

```bash
cp .env.example .env
npm install
npx prisma migrate deploy
npm run start:dev
```

## Modules

`auth`, `profiles`, `products`, `customers`, `orders`, `warehouse`, `revenue-targets`, `analytics`, `geo`, `health`

## Tests

```bash
npm test
npm run test:cov
```

## Docs

- Product & PRD: [`../../docs/`](../../docs/)
- Architecture: [`../../docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md)
- Variables / formulas: [`../../docs/VARIABLES.md`](../../docs/VARIABLES.md)
- Traceability: [`../../docs/TRACEABILITY.md`](../../docs/TRACEABILITY.md)
