# Production environment — UMKM Hub

Project-specific checklist for **Firebase `umkm-hub-2b955`** and **Vercel** ([rifqimtjahyono-3455s-projects](https://vercel.com/rifqimtjahyono-3455s-projects)).

---

## Firebase project (known values)

| Setting | Value |
|---------|--------|
| Project ID | `umkm-hub-2b955` |
| Auth domain | `umkm-hub-2b955.firebaseapp.com` |
| Storage bucket | `umkm-hub-2b955.firebasestorage.app` |
| Console | [console.firebase.google.com/project/umkm-hub-2b955](https://console.firebase.google.com/project/umkm-hub-2b955) |
| Authentication | [Authentication settings](https://console.firebase.google.com/project/umkm-hub-2b955/authentication/providers) |
| Web app config | [Project settings → Your apps](https://console.firebase.google.com/project/umkm-hub-2b955/settings/general) |

### Firebase setup (one-time)

1. **Enable Email/Password** — [Sign-in method](https://console.firebase.google.com/project/umkm-hub-2b955/authentication/providers) → Email/Password → Enable.
2. **Register a Web app** (if not done) — Project settings → Add app → Web → nickname e.g. `umkm-hub-web`.
3. Copy **apiKey**, **messagingSenderId**, and **appId** from the SDK snippet (only secrets you need from the client config).
4. **Authorized domains** — Authentication → Settings → add:
   - `localhost` (local dev)
   - Your Vercel URL after first deploy, e.g. `umkm-hub-web.vercel.app`
   - Custom domain if you add one later
5. **Email templates** — Authentication → Templates → customize action URL:
   - Verification: `https://YOUR_VERCEL_DOMAIN/verify-email`
   - Password reset: `https://YOUR_VERCEL_DOMAIN/reset-password`
6. **Service account (API)** — Project settings → Service accounts → Generate new private key → use as `FIREBASE_SERVICE_ACCOUNT_JSON` on the API host (single-line JSON string).
7. **Android / iOS** (mobile) — Add apps in the same project; download `google-services.json` / `GoogleService-Info.plist` when building store releases.

---

## Vercel — web app

Deploy from **`apps/web`** (not repo root).

| Setting | Value |
|---------|--------|
| Team | [rifqimtjahyono-3455s-projects](https://vercel.com/rifqimtjahyono-3455s-projects) |
| Root Directory | `apps/web` |
| Framework | Next.js |
| Build Command | `npm run build` |
| Install Command | `npm install` |

### Environment variables (Vercel → Project → Settings → Environment Variables)

Replace `YOUR_API_URL` with your hosted API (Railway, Render, etc.).  
Replace `AIza…`, `123…`, `1:…:web:…` with values from the Firebase web app config.

```env
NEXT_PUBLIC_API_URL=https://YOUR_API_URL/api/v1

NEXT_PUBLIC_FIREBASE_API_KEY=AIza…
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=umkm-hub-2b955.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=umkm-hub-2b955
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=umkm-hub-2b955.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdef123456
```

Deploy:

```bash
npm run deploy:vercel
# or: scripts/deploy-vercel.sh
```

Manual:

```bash
cd apps/web
npx vercel link    # select team rifqimtjahyono-3455s-projects
npx vercel --prod
```

**Default production URLs** (adjust if you pick different project names):

| Service | URL |
|---------|-----|
| Web (Vercel) | **https://umkm-hub-web.vercel.app** (live) |
| API (Render) | **https://umkm-hub-api.onrender.com** (live) |
| Vercel dashboard | [umkm-hub-web](https://vercel.com/rifqimtjahyono-3455s-projects/umkm-hub-web) |

Print env vars: `npm run deploy:env`

After deploy, copy the production URL (e.g. `https://umkm-hub-web.vercel.app`) and:

1. Add it to Firebase **Authorized domains**
2. Update Firebase **email template** action URLs
3. Set API `CORS_ORIGIN` and `APP_PUBLIC_URL` to that URL

---

## API host — Render (recommended)

1. Push repo to GitHub: `https://github.com/RifqiMT/umkm-hub`
2. [Create Render Blueprint](https://dashboard.render.com/select-repo?type=blueprint) from `render.yaml`
3. Set secrets in Render dashboard: `FIREBASE_SERVICE_ACCOUNT_JSON`, `UPSTASH_REDIS_REST_*`
4. API URL → `https://umkm-hub-api.onrender.com` (or your chosen service name)

```env
DATABASE_URL=postgresql://…
JWT_ACCESS_SECRET=<long-random-string>
JWT_REFRESH_SECRET=<long-random-string>
CORS_ORIGIN=https://YOUR_VERCEL_DOMAIN.vercel.app
APP_PUBLIC_URL=https://YOUR_VERCEL_DOMAIN.vercel.app
PORT=3001

# Firebase Admin — project umkm-hub-2b955
FIREBASE_PROJECT_ID=umkm-hub-2b955
# Option A (recommended): paste full service account JSON as one line
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"umkm-hub-2b955",…}
# Option B: individual fields from the same JSON file
# FIREBASE_CLIENT_EMAIL=firebase-adminsdk-…@umkm-hub-2b955.iam.gserviceaccount.com
# FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n…\n-----END PRIVATE KEY-----\n"

# Upstash Redis (free tier) — https://upstash.com
UPSTASH_REDIS_REST_URL=https://….upstash.io
UPSTASH_REDIS_REST_TOKEN=…
```

Run migration once:

```bash
cd apps/api && npx prisma migrate deploy
```

---

## Mobile (same Firebase project)

```bash
flutter run \
  --dart-define=API_BASE_URL=https://YOUR_API_URL/api/v1 \
  --dart-define=FIREBASE_API_KEY=AIza… \
  --dart-define=FIREBASE_AUTH_DOMAIN=umkm-hub-2b955.firebaseapp.com \
  --dart-define=FIREBASE_PROJECT_ID=umkm-hub-2b955 \
  --dart-define=FIREBASE_STORAGE_BUCKET=umkm-hub-2b955.firebasestorage.app \
  --dart-define=FIREBASE_MESSAGING_SENDER_ID=123456789012 \
  --dart-define=FIREBASE_APP_ID=1:123456789012:web:abcdef123456
```

Use the **same apiKey / appId** as the web app unless you registered separate Android/iOS apps (then use those app configs).

---

## Local dev with Firebase

```bash
cp apps/web/.env.example apps/web/.env.local
# Fill NEXT_PUBLIC_FIREBASE_API_KEY, MESSAGING_SENDER_ID, APP_ID from Firebase console
npm run api:dev
npm run web:dev
```

---

## Quick verification

| Check | How |
|-------|-----|
| Firebase enabled | `POST https://YOUR_API/api/v1/auth/config` → `{ "firebaseEnabled": true }` |
| Web login | Sign in at `/login` with a Firebase user |
| CORS | Browser network tab — API calls return 200, not CORS errors |
| Redis | API logs: `Redis connected (Upstash REST)` on startup |

See also [DEPLOY-VERCEL.md](./DEPLOY-VERCEL.md) for architecture and auth flow details.
