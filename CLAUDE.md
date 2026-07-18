# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev     # next dev — local dev server
npm run build   # next build
npm run start   # next start — serve the production build
npm run lint    # next lint
```

There is **no test setup** in this repo — no test runner, no test files, no test script. Do not invent test commands. Verification is done by running `npm run build` and exercising the app in the browser.

There is also no lockfile, no `.gitignore`, and no ESLint config file checked in (`next lint` falls back to Next's defaults; the code contains `eslint-disable-next-line` comments for `@typescript-eslint/no-explicit-any` and `react-hooks/exhaustive-deps`). Deployment is Vercel, tracking `main` (production: `koji-iota.vercel.app`). Per `UPDATE.md`, changes have historically been committed straight to `main`, sometimes via the GitHub web upload UI.

## Environment

Copy `.env.example`. Four variables, all required:
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`, `ADMIN_PASSWORD`.

## What this is

Koji is a single-user trip-itinerary publisher: a public read-only Next.js 15 App Router site (React 19, TypeScript, no CSS framework) backed by Supabase, plus a password-gated admin CRUD panel at `/admin` for authoring the itineraries.

## Domain model

Four Supabase tables, all prefixed `koji_`, in a strict parent→child chain. Types live in `src/lib/supabase.ts` and are the single source of truth:

```
koji_trips  (slug, title/subtitle/eyebrow/meta, header_theme, companion,
             date_start/date_end, location + lat/lng, published, sort_order)
  ├─ koji_logistics  (column_key: 'logistics' | 'book', category, label, value_md)
  └─ koji_days       (label, sort_order, optional per-day lat/lng + location_label)
       └─ koji_stops (time_label, tag, tag_color, title, body_md, is_optional, sort_order)
```

Conventions that hold everywhere:
- **Ordering is explicit.** Every child table has `sort_order`; nothing relies on insertion order. The nested day+stop fetch orders stops via `.order('sort_order', { referencedTable: 'koji_stops' })`.
- **Dates are derived, not stored per day.** A `Day` has no date column. The date for day *i* is `trip.date_start + i` (`dateForDay` in `TripView.tsx`). This is what keys the weather map.
- **Coordinates cascade.** A day uses `day.lat/lng` if set, else falls back to `trip.lat/lng`. Days sharing coordinates are batched into one weather request.
- **`published` is the only visibility gate.** Public queries (`getTrips`, `getTripBySlug`) filter `.eq('published', true)`; the admin panel reads unfiltered via the service-key client and shows a "draft" badge.
- **`tag` is free-form text, `tag_color` is a strict enum.** The pill label is whatever string you type; only the color is constrained (`TagColor`). Likewise `header_theme` is an 18-value `HeaderTheme` enum.

## Data flow

- **Public pages** (`/` and `/trips/[slug]`) are async Server Components with `export const revalidate = 60`. They read through the anon Supabase client in `src/lib/supabase.ts` (RLS-enforced) and pass fully-resolved props into the client component `TripView`.
- **Admin pages** are Server Components that check the cookie themselves and `redirect('/admin/login')`, then fetch with `supabaseAdmin()` (service key, bypasses RLS) and hand data to the client editor.
- **Admin writes** never touch Supabase from the browser. `TripEditor` holds `useState` copies of trip/logistics/days, updates local state optimistically, and `fetch`es the `/api/admin/*` routes. There is no `router.refresh()` after save — local state *is* the post-save truth until reload.

## Auth model

Deliberately minimal single-password auth, no Supabase Auth:
- `POST /api/admin/auth` compares the submitted password to `ADMIN_PASSWORD` and, on match, sets the plaintext password as the value of an httpOnly `koji_admin` cookie (30 days).
- Every protected surface re-checks `cookie === process.env.ADMIN_PASSWORD`. `src/lib/auth.ts` exports `isAuthenticated()` / `checkAuth()`, but **the API routes and admin pages do not use it** — each file duplicates a local `authed()` helper inline. If you change the auth scheme, grep for `koji_admin` rather than trusting `lib/auth.ts` to be the chokepoint.
- The service key is only ever used server-side (`supabaseAdmin()`), never exported to the client.

## API routes (`src/app/api/`)

`admin/trips`, `admin/trips/[id]`, `admin/days`, `admin/stops`, `admin/logistics` — thin CRUD wrappers over Supabase. Consistent shape: auth check → parse body → `supabaseAdmin()` call → `{ error }` with 500 or `{ ok: true }` / `{ <entity>: data }`. Collection routes take the row id as a **query param** (`?id=`) for PATCH/DELETE; only trips use a dynamic segment.

`api/weather` is a proxy, not CRUD. It exists because **`archive-api.open-meteo.com` is unreachable from Vercel's network** — it forwards to `historical-forecast-api.open-meteo.com` instead, with `revalidate = 86400` and an explicit `s-maxage=86400` cache header.

## Weather (the most fragile area — see git history)

All of this lives in `src/components/TripView.tsx` and runs client-side in a `useEffect`:
- Days are grouped by unique `lat,lng`, one Open-Meteo request per location, results merged into `weatherMap` keyed by ISO date.
- Live forecast comes straight from `api.open-meteo.com` in the browser; fetches are wrapped in `fetchWithTimeout` (AbortController).
- Trips more than **16 days in the future are skipped entirely** — the seasonal-average fallback (`fetchSeasonalWeather` / `fetchArchiveYear`, which fetch the same date range from 1 then 2 years ago and shift the dates forward to match `weatherMap` keys) is still in the file but is currently **dead code**, disabled because the archive API is unreachable from Vercel. Commit `baca617` ("claude gave up on weather") is that retreat. Don't re-enable the archive path without confirming reachability.
- WMO weather codes are mapped to emoji + label by `wmoDisplay`; `summarizeWeather` averages highs/lows and picks a dominant condition bucket for the hero card.

## Rendering & presentation conventions

- **Styling is inline React style objects plus CSS custom properties** in `src/app/globals.css`. There is no Tailwind, CSS-in-JS library, or component library. The design tokens (parchment `--bg: #F5F0E8`, `--ink-*`, `--brass`, tag colors, the 18 `--trip-*` theme pairs, `--font-serif` Fraunces / `--font-sans` Manrope / `--font-mono` Geist Mono, `--max-w: 640px`, `--px`) are the vocabulary — use them instead of literal hex values. Fonts load from Google Fonts via `<link>` in `layout.tsx`, not `next/font`.
- The `HeaderTheme` → `{bg, fg}` map is **duplicated** as a JS object in both `src/app/page.tsx` (`THEME_COLORS`) and `TripView.tsx` (`THEMES`), and again as CSS vars. Adding a theme means touching all three.
- Only genuinely responsive/pseudo-selector things are classes in `globals.css` (`.stop-row`, `.stop-tag`, `.logistics-grid`, `.body-content`), with a `max-width: 480px` breakpoint.
- **Markdown is inline-only.** `renderMd` in `src/lib/markdown.ts` calls `marked.parseInline` and post-processes anchors to add `target="_blank" rel="noopener noreferrer"`. It also overrides marked's `del` renderer so a single `~` (as in `~45min`, `~1.5 hrs` in itinerary text) is **not** treated as strikethrough — this is intentional; don't remove it.
- The trip page is a three-tab client view (`itinerary` / `logistics` / `weather`) driven by `activeTab` state in `TripView` — no routing, no URL state.

## Text-parsing conventions (non-obvious)

Several fields are free-text but are parsed by regex for display, so the authoring format matters:
- `Day.label` is split on a spaced dash (` - `, ` – `, ` — `) into headline + subtitle (`parseDayLabel`).
- `Logistics.value_md` is split on `' - '` into fields, then interpreted per `category` (`flight`, `train`, `hotel`, `book`, `other`) by `parseLogisticsValue` and `condenseRow` — e.g. a flight row reads as `UA970 - Sun, May 24 - ORD to FCO - Departs 3:45 PM - Arrives 7:55 AM`. Hotel labels are auto-linked to a Google Maps search by `hotelLink`.
- `Trip.companion` is a formatted string round-tripped by `parseCompanion`/`formatCompanion` in `TripEditor.tsx`.

Editing these regexes changes how already-authored trip data renders — check existing content before tightening them.

## Admin editor notes

`src/app/admin/trips/[id]/TripEditor.tsx` (~1.4k lines) is the whole authoring UI: inline field editors, a theme picker, a companion picker, and `LocationAutocomplete`, which debounces (250ms) against `geocoding-api.open-meteo.com` to fill `location` + `lat/lng` on a trip or day. Setting those coordinates is what enables weather for that day.

## Icons / PWA (from UPDATE.md)

`layout.tsx` declares `manifest: '/manifest.json'`, an SVG + 32px PNG favicon, and `apple-touch-icon.png` at 180px — iOS reads that file specifically, and its absence was why the home screen showed a generic "K". `public/` carries icons at 32/180/192/512. `next.config.js` exists solely to serve `/manifest.json` with `Content-Type: application/manifest+json`. Manifest `theme_color`/`background_color` and the viewport `themeColor` are all parchment `#F5F0E8`; `appleWebApp.statusBarStyle` is `'default'` to match (flip to `'black-translucent'` only if the app goes dark). `KojiMark.tsx` (the inline logo) is proportioned to match `icon.svg` — change them together.
