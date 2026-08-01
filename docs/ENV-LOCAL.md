# Local development environment

Run UMKM Hub on your machine **without touching production** (Vercel web, Render API, Render Postgres, Redis Cloud).

| | **Local (this guide)** | **Production** |
|---|------------------------|----------------|
| Web | http://localhost:3000 | https://umkm-hub-web.vercel.app |
| API | http://localhost:3001/api/v1 | https://umkm-hub-api.onrender.com/api/v1 |
| Database | Docker Postgres on `localhost:5432` | Render Postgres |
| Auth | JWT + bcrypt (default) | Firebase Auth |
| Redis | Optional (in-process fallback) | Redis Cloud / Upstash |
| Env files | `apps/api/.env`, `apps/web/.env.local` | Vercel + Render dashboards |
| Check command | `npm run dev:check` | `npm run setup:check` |

---

## First-time setup

From the repo root:

```bash
npm run setup
```

This will:

1. Create `apps/api/.env` and `apps/web/.env.local` from examples (never overwrites existing files)
2. Start Postgres via Docker if nothing is listening on port 5432
3. Install dependencies and run Prisma migrations
4. Seed demo data (sandbox login below)

Then open **two terminals**:

```bash
npm run api:dev   # → http://localhost:3001/api/v1/health
npm run web:dev   # → http://localhost:3000
```

Verify everything:

```bash
npm run dev:check
```

---

## After every pull

```bash
npm run sync
```

Re-applies migrations and refreshes dependencies. Pass `--seed` to reload demo data.

---

## Sandbox login

After `setup` or `npm run sync -- --seed`:

| Field | Value |
|-------|-------|
| Username | `rifqi_tjahyono` |
| Password | `12041994` |

Or register a new account — with Firebase keys **empty**, registration uses legacy JWT auth.

**Local only.** Never reuse these passwords in production.

---

## Auth modes locally

### Recommended: JWT only (no Firebase)

Leave Firebase variables **unset** in both env files:

- **Web:** empty `NEXT_PUBLIC_FIREBASE_*` in `.env.local`
- **API:** no `FIREBASE_SERVICE_ACCOUNT_JSON`

Login accepts **username or email** + password. Email verification links are printed in the API console when `RESEND_API_KEY` is not set.

### Optional: Firebase locally

Only if you need to test Firebase flows on localhost:

1. Add `localhost` under Firebase Console → Authentication → Settings → **Authorized domains**
2. Copy client keys into `apps/web/.env.local`
3. Add a **dev-only** service account JSON to Render-style vars in `apps/api/.env`

Using the **same** Firebase project as production works but is not recommended — test accounts and email flows can interfere with live users.

---

## Database

```bash
npm run db:up       # start Postgres (Docker)
npm run db:down     # stop container
npm run db:migrate  # apply migrations only
npm run db:seed     # reload demo data
```

Default connection (matches `docker-compose.yml`):

```
postgresql://umkm:umkm_secret@localhost:5432/umkm_hub
```

---

## Redis (optional)

Local API runs fine **without** Redis — throttling and analytics cache use an in-process fallback.

To test Redis locally:

```bash
docker run -d --name umkm-redis -p 6379:6379 redis:7-alpine
```

Then in `apps/api/.env`:

```
REDIS_URL="redis://localhost:6379"
```

Do **not** paste your production Redis Cloud URL into local `.env`.

---

## Mobile app

Point Flutter at the local API:

```bash
cd apps/mobile
flutter run --dart-define=API_BASE_URL=http://localhost:3001/api/v1
```

Use your machine's LAN IP instead of `localhost` when running on a physical device.

---

## Keep local separate from production

The sync script runs `scripts/guard-local-env.sh` to warn if local env files contain production hostnames (`onrender.com`, `vercel.app`, hosted Redis, etc.).

**Do not** put production secrets in git-tracked files or commit `.env` / `.env.local`.

| Mistake | Fix |
|---------|-----|
| `NEXT_PUBLIC_API_URL` points to Render | Set `http://localhost:3001/api/v1` in `.env.local` |
| `DATABASE_URL` points to Render Postgres | Use local Docker URL from `.env.example` |
| Copied Firebase service account into local `.env` | Remove it for JWT dev, or use a dev Firebase project |

Strict check:

```bash
bash scripts/guard-local-env.sh --strict
```

---

## Troubleshooting

| Symptom | What to try |
|---------|-------------|
| Postgres not ready | `npm run db:up` then `npm run sync` |
| Port 5432 in use | Stop other Postgres, or change `DATABASE_URL` + `docker-compose.yml` port |
| Login fails | Confirm API is running; use JWT mode (empty Firebase keys) |
| Web calls wrong API | Check `NEXT_PUBLIC_API_URL` in `.env.local`; restart `npm run web:dev` |
| Schema out of date | `npm run db:repair` then restart API; or `npm run db:reset` for a clean local DB |
| `npm run sync` fails on migrations | `npm run db:repair` (renamed migrations) or `npm run db:reset` (wipe local data) |

---

## Related docs

- [CONTRIBUTING.md](./CONTRIBUTING.md) — sync workflow and migration rules
- [ENV-UMKM-HUB-PRODUCTION.md](./ENV-UMKM-HUB-PRODUCTION.md) — Vercel + Render (production only)
- [SETUP-GUIDE-PLAIN-ENGLISH.md](./SETUP-GUIDE-PLAIN-ENGLISH.md) — production deployment walkthrough
