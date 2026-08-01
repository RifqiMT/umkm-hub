# UMKM Hub — one-page setup checklist

Print this page. Check each box as you go.  
Detailed help: [SETUP-GUIDE-PLAIN-ENGLISH.md](./SETUP-GUIDE-PLAIN-ENGLISH.md)

**Live website:** https://umkm-hub-web.vercel.app

---

## Part 1 — Firebase (~15 min)

- [ ] Open https://console.firebase.google.com/project/umkm-hub-2b955
- [ ] Authentication → Sign-in method → **Email/Password** → Enable
- [ ] Authentication → Settings → Authorized domains → add `umkm-hub-web.vercel.app`
- [ ] Project settings → Your apps → copy **apiKey**, **messagingSenderId**, **appId**
- [ ] Authentication → Settings → Authorized domains → add `umkm-hub-web.vercel.app`
- [ ] **Skip** Templates → Action URL (not needed on Vercel; save often fails)
- [ ] Service accounts → **Generate new private key** → save JSON file (secret!)

---

## Part 2 — Vercel (~10 min)

- [ ] Open https://vercel.com/rifqimtjahyono-3455s-projects/umkm-hub-web/settings/environment-variables
- [ ] Add `NEXT_PUBLIC_FIREBASE_API_KEY` = (apiKey)
- [ ] Add `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` = (messagingSenderId)
- [ ] Add `NEXT_PUBLIC_FIREBASE_APP_ID` = (appId)
- [ ] Deployments → **Redeploy** latest

**Or run in Terminal (paste your 3 values):**

```bash
scripts/add-firebase-to-vercel.sh YOUR_API_KEY YOUR_SENDER_ID YOUR_APP_ID
```

---

## Part 3 — Render API (~20 min)

- [ ] Sign up https://render.com (with GitHub)
- [ ] https://dashboard.render.com/select-repo?type=blueprint → repo **umkm-hub** → Apply
- [ ] Wait until **umkm-hub-api** shows Live
- [ ] Environment → add `FIREBASE_SERVICE_ACCOUNT_JSON` (full JSON file contents)
- [ ] Sign up https://upstash.com → create Redis → add `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` on Render
- [ ] Browser test: https://umkm-hub-api.onrender.com/api/v1/health → `"status":"ok"`

---

## Part 4 — Test (~5 min)

- [ ] https://umkm-hub-web.vercel.app/register — create account
- [ ] Check email → click verify link
- [ ] https://umkm-hub-web.vercel.app/login — sign in
- [ ] `/forgot-password` — reset email arrives

**Check progress anytime:**

```bash
scripts/setup-check.sh
```

**Open all setup websites:**

```bash
scripts/open-setup-links.sh
```

---

## Quick links

| What | URL |
|------|-----|
| Website | https://umkm-hub-web.vercel.app |
| Vercel | https://vercel.com/rifqimtjahyono-3455s-projects/umkm-hub-web |
| Firebase | https://console.firebase.google.com/project/umkm-hub-2b955 |
| Render | https://dashboard.render.com |
| Upstash | https://console.upstash.com |
