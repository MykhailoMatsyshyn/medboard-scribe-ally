---
name: remix-and-deploy
description: Fork a Lovable starter into your own GitHub repo and ship it to Vercel with push-to-deploy. Use when starting from a Lovable project and you need a real Git repo plus a live URL, including the env-var wiring and the SPA-routing config that a Vite single-page app needs on Vercel.
---

# Remix a Lovable starter and deploy to Vercel

Turns a Lovable starter into an owned GitHub repo with a live, auto-deploying Vercel URL.
This is a **Vite + React SPA** (not Next.js) — that detail drives the env-var prefix and the
SPA-routing config below.

## Step 1 — Remix the starter and connect GitHub

1. Open the Lovable project → title dropdown → **Remix this project**. This forks it into
   your account so you have an editable copy.
2. In Lovable, connect **GitHub** (project menu → GitHub). Lovable creates a repo and keeps
   it in sync. From here you can also clone and work in your own IDE.

## Step 2 — Run it locally

```bash
git clone <YOUR_GIT_URL>
cd <project>
npm install
cp .env.example .env.local   # fill in your Supabase values
npm run dev                  # Vite dev server, e.g. http://localhost:8080
```

Only `VITE_`-prefixed vars reach the browser. The frontend needs:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...   # anon/publishable key — safe in the browser
```

## Step 3 — Connect Vercel (push-to-deploy, no CLI)

1. Vercel → **Add New → Project** → import the GitHub repo.
2. Framework preset: **Vite**. Build `npm run build`, output `dist` (defaults are correct).
3. **Settings → Environment Variables**: add `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_PUBLISHABLE_KEY` (same values as `.env.local`).
4. Every push to the default branch now auto-deploys. **Never** commit secrets — they live
   only in Vercel's env settings.

## Step 4 — Fix SPA routing (`vercel.json`)

A Vite SPA serves one `index.html`; client routes like `/chat` 404 on reload unless every
path is rewritten to it. Add `vercel.json` at the repo root:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

Rewrites are lower priority than real files, so `/assets/*` still serve normally.

## Gotchas

- **`NEXT_PUBLIC_` vs `VITE_`.** The Supabase–Vercel integration auto-injects vars named
  `NEXT_PUBLIC_*` / unprefixed (Next.js convention). **Vite ignores them** — it only reads
  `VITE_*`. Add `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` yourself, then redeploy.
- **404 on reload** = missing SPA rewrites (Step 4). Works in `npm run dev` (the dev server
  serves index.html for any path) but breaks on Vercel without `vercel.json`.
- **The integration may point at the wrong Supabase project.** If you created a fresh project,
  confirm the `VITE_SUPABASE_URL` in Vercel matches _that_ project's ref, not an old one.
- **Don't commit `.env`.** Keep it git-ignored; ship a `.env.example` with names only.
- **Changing Vercel env requires a redeploy** to take effect (Deployments → Redeploy).
