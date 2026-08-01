# UMKM Hub — Setup guide (plain English)

This guide is for anyone setting up UMKM Hub for real users, **without needing a technical background**. Take it one section at a time. Each step says exactly where to click and what to copy.

---

## What you already have

| Piece | Status | Link |
|-------|--------|------|
| Website (web app) | **Live** | https://umkm-hub-web.vercel.app |
| Vercel account / project | **Done** | [umkm-hub-web on Vercel](https://vercel.com/rifqimtjahyono-3455s-projects/umkm-hub-web) |
| Firebase project | **Created** | [umkm-hub-2b955](https://console.firebase.google.com/project/umkm-hub-2b955) |
| GitHub repo connected to Vercel | **Done** | Pushing code can auto-update the website |
| Backend API (server) | **Not live yet** | You will set this up in Part 3 |
| Login / sign-up fully working online | **Almost** | Needs Part 1 + Part 2 + Part 3 |

**Simple picture:**

- **Website** = what people open in the browser (already online).
- **Firebase** = handles passwords, sign-up, “forgot password”, email verification (free tier).
- **API (backend)** = the brain that stores products, orders, customers (you will host this on Render).
- **Database** = where business data is saved (PostgreSQL, comes with Render).
- **Redis (Upstash)** = helps the API stay fast and fair when many people use it (free tier).

---

## Part 1 — Finish Firebase (about 15 minutes)

Firebase is Google’s free service for login and passwords. Your project is already named **umkm-hub-2b955**.

### Step 1.1 — Open Firebase

1. Go to: https://console.firebase.google.com/project/umkm-hub-2b955  
2. Sign in with the same Google account you used to create the project.

### Step 1.2 — Turn on email + password login

1. In the left menu, click **Build** → **Authentication** (or **Authentication** directly).
2. Click **Get started** if you see it.
3. Open the **Sign-in method** tab.
4. Click **Email/Password**.
5. Turn **Enable** ON (the first toggle).
6. Click **Save**.

### Step 1.3 — Add your website as an allowed domain

1. Still in **Authentication**, open **Settings** (tab at the top).
2. Scroll to **Authorized domains**.
3. Click **Add domain**.
4. Type exactly: `umkm-hub-web.vercel.app`
5. Click **Add**.

(`localhost` is usually already there — that’s for testing on your own computer.)

### Step 1.4 — Copy three values from Firebase (you need these in Part 2)

1. Click the **gear icon** next to “Project Overview” → **Project settings**.
2. Scroll down to **Your apps**.
3. If you **don’t** see a web app (</> icon):
   - Click **Add app** → choose **Web** (`</>`).
   - Nickname: `umkm-hub-web` → **Register app**.
4. You will see a block of code called `firebaseConfig`. You only need **three lines** — write them down or keep the tab open:

   | Name in Firebase | Name for Vercel (Part 2) |
   |------------------|---------------------------|
   | `apiKey` | `NEXT_PUBLIC_FIREBASE_API_KEY` |
   | `messagingSenderId` | `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` |
   | `appId` | `NEXT_PUBLIC_FIREBASE_APP_ID` |

   Example shape (yours will be different):

   ```
   apiKey: "AIzaSy........"
   messagingSenderId: "123456789012"
   appId: "1:123456789012:web:abc123def456"
   ```

### Step 1.5 — Fix “verify email” and “reset password” links in emails

When Firebase sends emails, links must point to **your** website.

1. In Firebase, go to **Authentication** → **Templates** (tab).
2. **Email address verification** → click the pencil (edit).
3. Click **Customize action URL** (or similar).
4. Set the URL to:  
   `https://umkm-hub-web.vercel.app/verify-email`
5. Save.
6. **Password reset** → edit the same way.
7. Set the URL to:  
   `https://umkm-hub-web.vercel.app/reset-password`
8. Save.

### Step 1.6 — Download the “service account” file (for the API in Part 3)

This is a secret file — **do not** post it publicly or commit it to GitHub.

1. **Project settings** (gear icon) → **Service accounts** tab.
2. Click **Generate new private key** → **Generate key**.
3. A `.json` file downloads to your computer. Keep it safe — you’ll paste its contents into Render in Part 3.

---

## Part 2 — Add Firebase keys to Vercel (about 10 minutes)

Vercel hosts your website. Some settings are already there; you only add the **three missing Firebase values** from Step 1.4.

### Step 2.1 — Open environment variables

1. Go to: https://vercel.com/rifqimtjahyono-3455s-projects/umkm-hub-web/settings/environment-variables  
2. You should see variables like `NEXT_PUBLIC_API_URL` already listed.

### Step 2.2 — Add each missing variable

For **each** row below, click **Add New** (or **Add Environment Variable**):

| Key (name) | Value (paste from Firebase) | Environments to tick |
|------------|----------------------------|----------------------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | your `apiKey` | Production, Preview, Development |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | your `messagingSenderId` | Production, Preview, Development |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | your `appId` | Production, Preview, Development |

Click **Save** after each one.

**Already set (do not change unless you know why):**

- `NEXT_PUBLIC_API_URL` = `https://umkm-hub-api.onrender.com/api/v1` (works after Part 3)
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` = `umkm-hub-2b955.firebaseapp.com`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID` = `umkm-hub-2b955`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` = `umkm-hub-2b955.firebasestorage.app`

### Step 2.3 — Redeploy the website

After adding variables, Vercel must rebuild the site:

1. Open: https://vercel.com/rifqimtjahyono-3455s-projects/umkm-hub-web  
2. Click **Deployments**.
3. On the latest deployment, click **⋯** (three dots) → **Redeploy** → confirm.

Wait until status shows **Ready** (usually 1–2 minutes).

---

## Part 3 — Put the API online with Render (about 20 minutes)

The website talks to an **API server**. Render can host it for free (with limits). The repo already includes a file `render.yaml` that describes what to create.

### Step 3.1 — Create a Render account

1. Go to: https://render.com  
2. Sign up (easiest: **Sign in with GitHub** using the same account as `RifqiMT/umkm-hub`).

### Step 3.2 — Deploy from GitHub (Blueprint)

1. Go to: https://dashboard.render.com/select-repo?type=blueprint  
2. Connect GitHub if asked — allow access to **umkm-hub**.
3. Select the **umkm-hub** repository.
4. Render reads `render.yaml` and proposes:
   - **umkm-hub-api** (web service)
   - **umkm-hub-db** (database)
5. Click **Apply** / **Create**.

Wait until the API service shows **Live** (first deploy can take 5–10 minutes).

**If deploy fails with `nest: not found` or exit 127:** open **umkm-hub-api** → **Settings** → set **Build Command** to:

`NPM_CONFIG_PRODUCTION=false npm ci && npm run build`

Set **Start Command** to `bash scripts/render-start.sh` and **Root Directory** to `apps/api`. Then **Manual Deploy** → **Deploy latest commit**.

**If deploy fails with Prisma `P3009` (failed migration):** the database has a broken first deploy. On Render this is safe to reset because you have no real data yet:

1. Open **umkm-hub-db** → **Settings** → **Delete Database** (or **Reset** if shown).
2. Re-create via **Blueprint** → **Manual Sync**, or create a new free Postgres and link `DATABASE_URL` on the API service.
3. Deploy again — migrations will run in the correct order.

Your API address will look like:  
`https://umkm-hub-api.onrender.com`

### Step 3.3 — Add secret settings on Render

1. In Render dashboard, open the **umkm-hub-api** service.
2. Go to **Environment** (left menu).
3. Add or edit these (Render may have created some automatically):

| Key | What to put |
|-----|-------------|
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Open the `.json` file from Step 1.6 in a text editor. Copy **the entire file** as **one line** (or paste multi-line — Render accepts both). |
| `CORS_ORIGIN` | `https://umkm-hub-web.vercel.app,http://localhost:3000` |
| `APP_PUBLIC_URL` | `https://umkm-hub-web.vercel.app` |
| `FIREBASE_PROJECT_ID` | `umkm-hub-2b955` |

4. Click **Save Changes**. Render will restart the service.

### Step 3.4 — Add Redis (Upstash, free)

1. Go to: https://upstash.com — sign up (free).
2. Create a new **Redis** database (choose a region close to you).
3. On the database page, copy:
   - **UPSTASH_REDIS_REST_URL**
   - **UPSTASH_REDIS_REST_TOKEN**
4. In Render → **umkm-hub-api** → **Environment**, add:

| Key | Value |
|-----|--------|
| `UPSTASH_REDIS_REST_URL` | paste from Upstash |
| `UPSTASH_REDIS_REST_TOKEN` | paste from Upstash |

5. Save — service restarts again.

### Step 3.5 — Check the API is healthy

Open in your browser:

`https://umkm-hub-api.onrender.com/api/v1/health`

You should see something like:

```json
{"status":"ok","service":"umkm-hub-api"}
```

If you see an error, wait a few minutes and try again (free tier “cold starts” can be slow).

---

## Part 4 — Test everything (5 minutes)

### Test A — Website loads

Open: https://umkm-hub-web.vercel.app/login  
You should see the UMKM Hub login page.

### Test B — Create an account

1. Click **Create a profile** (or go to `/register`).
2. Choose a username, email, and password (8+ characters).
3. Submit.

If something fails:

- **“Firebase is not configured”** → Part 2 not finished; redeploy Vercel.
- **Network error / failed to fetch** → Part 3 API not live yet; check Render logs.
- **Email already in use** → try another email or use **Sign in**.

### Test C — Email verification

1. Check your inbox (and spam) for Firebase verification email.
2. Click the link — it should open `umkm-hub-web.vercel.app/verify-email`.

### Test D — Sign in again

Go to `/login`, use your email and password.

### Test E — Forgot password

1. Go to `/forgot-password`.
2. Enter your email.
3. Check email for reset link → should open `/reset-password` on your site.

---

## Part 5 — Optional: mobile app

The Flutter app uses the **same Firebase project**. When building the app, your developer (or you with Flutter installed) passes the same Firebase values. See `apps/mobile/README.md` or ask a developer to run:

```bash
flutter run \
  --dart-define=API_BASE_URL=https://umkm-hub-api.onrender.com/api/v1 \
  --dart-define=FIREBASE_API_KEY=<your apiKey> \
  --dart-define=FIREBASE_AUTH_DOMAIN=umkm-hub-2b955.firebaseapp.com \
  --dart-define=FIREBASE_PROJECT_ID=umkm-hub-2b955 \
  --dart-define=FIREBASE_STORAGE_BUCKET=umkm-hub-2b955.firebasestorage.app \
  --dart-define=FIREBASE_MESSAGING_SENDER_ID=<your id> \
  --dart-define=FIREBASE_APP_ID=<your appId>
```

---

## Quick troubleshooting

| Problem | Likely cause | Fix |
|---------|--------------|-----|
| Login page loads but sign-in fails | API not running | Part 3 — check Render service is Live |
| “Invalid API key” or Firebase errors | Missing Vercel env vars | Part 2 — add 3 Firebase keys, redeploy |
| CORS / blocked by browser | API doesn’t trust your website | Render: `CORS_ORIGIN` must include `https://umkm-hub-web.vercel.app` |
| Verification email link broken | Wrong Firebase template URL | Part 1.5 — fix action URLs |
| API very slow first time | Render free tier sleeps | Normal — wait ~30s and retry |
| Can’t register — conflict | Username or email taken | Try different username **and** email |

---

## Important links (bookmark these)

| What | URL |
|------|-----|
| Live website | https://umkm-hub-web.vercel.app |
| Vercel project | https://vercel.com/rifqimtjahyono-3455s-projects/umkm-hub-web |
| Firebase project | https://console.firebase.google.com/project/umkm-hub-2b955 |
| Render dashboard | https://dashboard.render.com |
| Upstash (Redis) | https://console.upstash.com |
| GitHub repo | https://github.com/RifqiMT/umkm-hub |

---

## What I (the assistant) could not do for you automatically

These steps need **your** Google / GitHub login and secret keys only you can see:

1. Copy **apiKey**, **messagingSenderId**, **appId** from Firebase → Vercel (Part 2).
2. Download **service account JSON** → Render (Part 3.3).
3. Create **Upstash** account and paste Redis URL/token (Part 3.4).
4. Click **Apply** on Render Blueprint (Part 3.2).

Once those are done, login, registration, forgot password, and email verification should work end-to-end on production.

---

## Need help?

If you get stuck, note:

1. **Which step** (e.g. “Part 2, Step 2.2”).
2. **Exact error message** on screen (screenshot helps).
3. Whether https://umkm-hub-api.onrender.com/api/v1/health works in the browser.

That’s enough for a developer to pinpoint the issue quickly.
