# Deploying UMKM Hub to Production (Vercel)

This guide covers production deployment with **Firebase Authentication** (free tier) and **Upstash Redis** (free tier).

## Architecture

```
┌─────────────┐     Firebase ID token      ┌──────────────┐
│  Next.js    │ ─────────────────────────► │  NestJS API  │
│  (Vercel)   │     + JWT fallback         │  (Railway/   │
└─────────────┘                            │   Render)    │
       │                                   └──────┬───────┘
       │ Firebase Auth                             │
       ▼ (login/register/reset/verify)             ├── PostgreSQL
┌─────────────┐                                   └── Upstash Redis
│  Firebase   │                                       (rate limits + cache)
└─────────────┘
```

## 1. Firebase (Authentication)

1. Create a project at [Firebase Console](https://console.firebase.google.com).
2. Enable **Email/Password** under Authentication → Sign-in method.
3. Add your production domain under Authentication → Settings → Authorized domains.
4. Create a **Web app** and copy the client config into Vercel env vars (`NEXT_PUBLIC_FIREBASE_*`). See `apps/web/.env.example`.
5. Generate a **Service account** key (Project settings → Service accounts) for the API:
   - Set `FIREBASE_SERVICE_ACCOUNT_JSON` on the API host, **or**
   - Set `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`.
6. Customize email action URLs (Authentication → Templates):
   - **Email verification:** `https://YOUR_DOMAIN/verify-email`
   - **Password reset:** `https://YOUR_DOMAIN/reset-password`

### Auth flows

| Flow | Firebase (production) | Legacy API (local dev) |
|------|----------------------|------------------------|
| Register | Firebase createUser → `POST /auth/firebase/register` | `POST /auth/register` |
| Login | Firebase signIn → `POST /auth/firebase/session` | `POST /auth/login` |
| Forgot password | Firebase `sendPasswordResetEmail` | `POST /auth/forgot-password` |
| Verify email | Firebase action link → `/verify-email?mode=verifyEmail&oobCode=…` | Custom token link |
| Reset password | Firebase action link → `/reset-password?mode=resetPassword&oobCode=…` | Custom token link |

When Firebase env vars are absent, the web app automatically falls back to legacy API auth (sandbox login still works locally).

## 2. Upstash Redis (Storage)

1. Create a free database at [Upstash](https://upstash.com).
2. Copy **REST URL** and **REST Token** to the API environment:
   ```
   UPSTASH_REDIS_REST_URL=https://…
   UPSTASH_REDIS_REST_TOKEN=…
   ```
3. Redis powers:
   - **Distributed rate limiting** (shared across API instances)
   - **Analytics window cache** (45s TTL, shared)

Without Redis, the API falls back to in-process storage (fine for single-instance local dev).

## 3. Deploy Web to Vercel

**Team:** [rifqimtjahyono-3455s-projects](https://vercel.com/rifqimtjahyono-3455s-projects)  
**Suggested URLs:** `https://umkm-hub-web.vercel.app` (web) · `https://umkm-hub-api.onrender.com` (API)

Print a copy-paste env block:

```bash
scripts/print-production-env.sh
# Or with your actual URLs after first deploy:
scripts/print-production-env.sh https://your-app.vercel.app https://your-api.onrender.com
```

One-command web deploy (requires `npx vercel login` first):

```bash
scripts/deploy-vercel.sh
```

Manual deploy:

Required Vercel environment variables:

| Variable | Example |
|----------|---------|
| `NEXT_PUBLIC_API_URL` | `https://api.yourdomain.com/api/v1` |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | From Firebase web app config |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `your-project.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `your-project` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | `your-project.appspot.com` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Numeric |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | `1:…:web:…` |

`vercel.json` is included in `apps/web/`.

## 4. Deploy API

**Option A — Render (blueprint included):**

1. Push this repo to GitHub (`RifqiMT/umkm-hub`).
2. Open [Render Blueprint](https://dashboard.render.com/select-repo?type=blueprint) → select the repo → apply `render.yaml`.
3. In Render dashboard, set `FIREBASE_SERVICE_ACCOUNT_JSON`, `UPSTASH_REDIS_REST_*` (and adjust `CORS_ORIGIN` if your Vercel URL differs).
4. Copy the service URL (e.g. `https://umkm-hub-api.onrender.com`) → set `NEXT_PUBLIC_API_URL=https://…/api/v1` on Vercel.

**Option B — Docker (Railway / Fly / any host):**

```bash
docker build -t umkm-hub-api apps/api
docker run -p 3001:3001 --env-file apps/api/.env umkm-hub-api
```

Required API environment variables (see `apps/api/.env.example`):

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Token signing (mobile + session exchange) |
| `CORS_ORIGIN` | Your Vercel domain(s), comma-separated |
| `APP_PUBLIC_URL` | Vercel web URL |
| `FIREBASE_*` | Firebase Admin SDK |
| `UPSTASH_REDIS_REST_*` | Redis |

Run migrations on deploy:

```bash
npm run prisma:deploy
```

## 5. Database migration

The Firebase migration adds `Profile.firebaseUid` and makes `passwordHash` optional:

```bash
cd apps/api
npx prisma migrate deploy
```

Existing bcrypt accounts continue to work. New Firebase registrations skip `passwordHash`.

## 6. CORS

Set `CORS_ORIGIN` to include all web origins:

```
CORS_ORIGIN=https://your-app.vercel.app,https://yourdomain.com
```

## 7. Mobile (Flutter)

The mobile app uses the same Firebase project when you pass matching `--dart-define` flags (see `apps/mobile/README.md`). Auth flows mirror the web app; password reset and email verification links open in the device browser.

```bash
flutter run \
  --dart-define=API_BASE_URL=https://api.yourdomain.com/api/v1 \
  --dart-define=FIREBASE_API_KEY=... \
  --dart-define=FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com \
  --dart-define=FIREBASE_PROJECT_ID=your-project \
  --dart-define=FIREBASE_STORAGE_BUCKET=your-project.appspot.com \
  --dart-define=FIREBASE_MESSAGING_SENDER_ID=... \
  --dart-define=FIREBASE_APP_ID=...
```

## Local development

Without Firebase/Redis configured, everything works as before with sandbox credentials (`rifqi_tjahyono` / `12041994`).

To test Firebase locally, copy `apps/web/.env.example` → `apps/web/.env.local` and fill in Firebase keys. Add `localhost` to Firebase authorized domains.
