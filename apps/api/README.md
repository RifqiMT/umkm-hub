# UMKM Hub API

NestJS REST system of record for UMKM Hub (`/api/v1`). Product tip: **v1.5.217** docs aligned to code through **v1.5.216**.

## Stack

- NestJS 11 + TypeScript
- Prisma 6 + PostgreSQL 16
- JWT access/refresh + bcrypt
- class-validator, Throttler

## Local run

```bash
# From monorepo root
npm run setup   # once
npm run sync    # after pulls
npm run api:dev # http://localhost:3001/api/v1/health
```

## Modules

`auth`, `profiles`, `products`, `customers`, `orders`, `warehouse`, `revenue-targets`, `analytics`, `geo`, `health`

Notable auth/analytics:

- `POST /auth/register-availability` (anti-enumeration)
- `POST /auth/login` accepts `login` (username or email)
- `GET /analytics?years=&include=&granularity=` (progressive)

## Tests

```bash
npm test
npm run test:cov
```

## Docs

- [`../../docs/`](../../docs/) — PRODUCT, PRD, VARIABLES, ARCHITECTURE, TRACEABILITY
