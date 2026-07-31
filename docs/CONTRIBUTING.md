# Contributing — UMKM Hub

| Field | Value |
|-------|-------|
| **Product** | UMKM Hub |
| **Version** | 1.5.233 |
| **Related** | [ARCHITECTURE.md](./ARCHITECTURE.md), [GUARDRAILS.md](./GUARDRAILS.md), root [README.md](../README.md) |

---

## Keep every sandbox current

Schema, dependency, and env-template changes only work on a machine after installs + Prisma migrate. Use the root sync path so no sandbox drifts:

| When | Command |
|------|---------|
| First clone / new machine | `npm run setup` |
| After every pull / merge / teammate change | `npm run sync` |
| Need sandbox data again | `npm run sync -- --seed` or `npm run db:seed` |

What `scripts/sync-env.sh` does:

1. Creates missing `.env` / `.env.local` from examples (**never overwrites** existing files)
2. Warns if local env files are missing keys present in `.env.example`
3. Uses Postgres already on `localhost:5432` if reachable; otherwise starts Docker Compose and waits until healthy
4. Installs `apps/api`, `apps/web`, and `packages/shared` (`npm ci` when lockfile exists)
5. Runs `prisma migrate deploy` + `prisma generate`
6. Seeds sandbox data on `setup` (or when `--seed` is passed)
7. Runs `flutter pub get` when Flutter is on `PATH` (skip with `--skip-mobile`)

---

## Schema / migration rules

- Never ship Prisma schema changes without a committed migration under `apps/api/prisma/migrations/`
- Author new migrations with `cd apps/api && npm run prisma:migrate`
- Sandboxes apply migrations with `npm run sync` or `npm run db:migrate` — do **not** rely on API boot to migrate
- Document breaking env keys in the PR and add them to `.env.example`

---

## Env files

| App | Template | Local (gitignored) |
|-----|----------|--------------------|
| API | `apps/api/.env.example` | `apps/api/.env` |
| Web | `apps/web/.env.example` | `apps/web/.env.local` |

Notable optional API keys (never commit real values): `PASSWORD_RESET_SECRET`, `PROFILE_LOCATION_SECRET`, `DATA_EXPORT_PROFILE_NAMES`, `SANDBOX_EXPORT_PASSWORDS`, `IMPORT_BOOTSTRAP_PASSWORD`, `RESEND_API_KEY`, `APP_PUBLIC_URL`.

If `npm run sync` warns about a missing key, copy the new line from the example into your local file and set a value.

Mobile API base URL is typically passed at run time:

```bash
flutter run --dart-define=API_BASE_URL=http://localhost:3001/api/v1
```

---

## Sandbox credentials

After `setup` / seed (created only if missing; never overwrites manual edits):

- Profile: `rifqi_tjahyono`
- Password: `12041994`

Treat as **local-dev only** — never reuse in production.

---

## Documentation updates

When you change user-visible behavior, formulas, or UI tokens:

1. Add a [CHANGELOG.md](./CHANGELOG.md) entry
2. Update [VARIABLES.md](./VARIABLES.md) / [TRACEABILITY.md](./TRACEABILITY.md) / [DESIGN_GUIDELINES.md](./DESIGN_GUIDELINES.md) as needed
3. Align version stamps on [PRODUCT.md](./PRODUCT.md) and [PRD.md](./PRD.md) with the changelog tip

See the docs index: [README.md](./README.md).

---

## Tests before merge

```bash
cd apps/api && npm test
cd apps/web && npm run build
# optional: cd apps/mobile && flutter test
```

---

## Manual alternative

See root [README.md](../README.md) “Manual steps” if you cannot run Docker or prefer step-by-step commands.

---

## Git & secrets

- Do not commit `.env`, tokens, or production secrets
- Do not push or force-push without explicit team approval
- Prefer small, reviewable PRs aligned with [GUARDRAILS.md](./GUARDRAILS.md)
