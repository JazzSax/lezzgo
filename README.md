# Lezzgo — collaborative travel planner

Sign in with OAuth, create travel plans, build day-by-day routes on an
interactive map, and share them (view-only) with friends.

**Stack:** Next.js 14 (App Router, JS) · Tailwind · MapLibre GL JS ·
Supabase (Auth + Postgres + RLS) · Photon geocoding · OpenFreeMap tiles.

This is the **MVP core**. The animated "play" of a route and video export are
planned for Phase 2 (see `docs`/plan).

---

## 1. Prerequisites

- Node 20 LTS (this repo was set up with nvm inside WSL — `nvm use 20`).
- A free [Supabase](https://supabase.com) project.

## 2. Create the Supabase project & schema

1. Create a new project at https://app.supabase.com.
2. Open **SQL Editor** → paste the contents of
   [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) →
   **Run**. This creates all tables, the `handle_new_user` trigger, the
   access-helper functions, and every RLS policy.

## 3. Configure OAuth providers

In Supabase → **Authentication → Providers**, enable and fill credentials for:

- **Google** — create OAuth credentials in Google Cloud Console; authorized
  redirect URL is the one Supabase shows (`https://<project>.supabase.co/auth/v1/callback`).
- **Apple** — requires a paid Apple Developer account ($99/yr); create a
  Services ID + key.
- **Facebook** — create an app in Meta for Developers, add Facebook Login.

In **Authentication → URL Configuration**, set:

- **Site URL**: `http://localhost:3000` (dev) / your production URL.
- **Redirect URLs**: add `http://localhost:3000/auth/callback` and your prod
  equivalent.

## 4. Environment variables

Copy the example and fill in your project values:

```bash
cp .env.local.example .env.local
```

| Variable | Where to find it |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon public key |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` in dev |
| `NEXT_PUBLIC_MAP_STYLE_URL` | Leave as OpenFreeMap, or a MapTiler style URL |
| `PHOTON_BASE_URL` | Leave as `https://photon.komoot.io` |

## 5. Run

```bash
npm install
npm run dev
```

Open http://localhost:3000.

---

## How it works

- **Auth** — `@supabase/ssr` cookie sessions. `middleware.js` refreshes the
  session and guards `/dashboard` and `/plans/*`. On first sign-in a database
  trigger mirrors the user (name + OAuth avatar) into `public.profiles`.
- **Data & permissions** — all access is enforced by Postgres **Row Level
  Security**, not just the UI. A viewer literally cannot `select` a plan they
  weren't given access to. Owners edit; shared users are read-only.
- **Map** — `components/MapView.js` wraps MapLibre. The base is a marker,
  walking rings are computed circles, nearby places are categorized dots, and
  the selected day's route is a line through its ordered stops.
- **Geocoding** — the browser calls `/api/geocode`, which proxies Photon
  server-side (auth-gated, cached). Swap the provider there without touching
  the client.

## Data model

`profiles · plans · plan_shares · days · stops · nearby_places` — see the
migration for columns and policies.

## Manual verification checklist

1. Sign in with Google → a `profiles` row with your avatar is created.
2. New plan → search a base (e.g. "Nipponbashi, Osaka") → base marker + rings.
3. Add a day + a few stops via search, label them, reorder → route line updates.
4. Add nearby places in categories → toggle the category chips.
5. From a second account: get invited → accept on the dashboard → the plan is
   read-only and your avatar appears on it.

## Roadmap (Phase 2)

Animated ride along a route + whole-trip playback, in-browser video export
(MapLibre canvas → `MediaRecorder`), real road-following routes, transport
modes per leg, click-to-drop pins, offline/PWA.
