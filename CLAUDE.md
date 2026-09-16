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

There is also no lockfile and no ESLint config file checked in (`next lint` falls back to Next's defaults; the code contains `eslint-disable-next-line` comments for `@typescript-eslint/no-explicit-any` and `react-hooks/exhaustive-deps`). Deployment is Vercel, tracking `main` (production: `koji-iota.vercel.app`). Per `UPDATE.md`, changes have historically been committed straight to `main`, sometimes via the GitHub web upload UI.

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

`api/weather` is a proxy, not CRUD. It exists because **`archive-api.open-meteo.com` is unreachable from Vercel's network** — it forwards to `historical-forecast-api.open-meteo.com` instead, with `revalidate = 86400` and an explicit `s-maxage=86400` cache header. It is what powers the seasonal-average weather fallback for far-future trips.

## Weather (the most fragile area — see git history)

All of this lives in `src/components/TripView.tsx` and runs client-side in a `useEffect`:
- Days are grouped by unique `lat,lng`, one Open-Meteo request per location, results merged into `weatherMap` keyed by ISO date.
- Live forecast comes straight from `api.open-meteo.com` in the browser; fetches are wrapped in `fetchWithTimeout` (AbortController).
- Trips more than **16 days in the future fall back to seasonal averages**: `fetchSeasonalWeather` / `fetchArchiveYear` fetch the same date range from 1 then 2 years ago **through the `/api/weather` proxy** (`historical-forecast-api` — confirmed reachable from Vercel) and shift the dates forward to match `weatherMap` keys. This path was dead code between commit `baca617` ("claude gave up on weather") and its re-enable; the browser-direct `archive-api.open-meteo.com` call still exists only for *past* trips and must not be moved server-side (unreachable from Vercel).
- Forecast requests **clamp `end_date` to today+16** (`fetchWeather`) — Open-Meteo rejects out-of-range end dates, and without the clamp a trip partially inside the window would get no weather at all.
- WMO weather codes are mapped to emoji + label by `wmoDisplay`; `summarizeWeather` averages highs/lows and picks a dominant condition bucket for the hero card.

## Rendering & presentation conventions

- **Styling is inline React style objects plus CSS custom properties** in `src/app/globals.css`. There is no Tailwind, CSS-in-JS library, or component library. The design tokens (parchment `--bg: #F5F0E8`, `--ink-*`, `--brass`, tag colors, the 18 `--trip-*` theme pairs, `--font-serif` Fraunces / `--font-sans` Manrope / `--font-mono` Geist Mono, `--max-w: 640px`, `--px`) are the vocabulary — use them instead of literal hex values. Fonts load from Google Fonts via `<link>` in `layout.tsx`, not `next/font`.
- The `HeaderTheme` → `{bg, fg}` map is **duplicated** as a JS object in both `src/app/page.tsx` (`THEME_COLORS`) and `TripView.tsx` (`THEMES`), and again as CSS vars. Adding a theme means touching all three.
- Only genuinely responsive/pseudo-selector things are classes in `globals.css` (`.stop-row`, `.stop-tag`, `.logistics-grid`, `.body-content`), with a `max-width: 480px` breakpoint.
- **Desktop is planning mode** (the trip itself is used on phones): at `min-width: 1000px` the column widens to `--max-w: 780px`, the Weather tab grids 3-up (`.weather-list` / `.weather-span`), and Logistics cards grid 2-up (`.logistics-cards`). The itinerary stays a single prose column at every width — don't multi-column it.
- **Markdown is inline-only.** `renderMd` in `src/lib/markdown.ts` calls `marked.parseInline` and post-processes anchors to add `target="_blank" rel="noopener noreferrer"`. It also escapes every lone `~` before parsing (`escapeLoneTildes`) so `~45min` is never read as strikethrough, even when two tildes appear in one string; `~~strike~~` still works. Intentional; don't remove it.
- The trip page is a three-tab client view (`itinerary` / `logistics` / `weather`) driven by `activeTab` state in `TripView`; the tab mirrors to the URL hash (`#logistics`, `#weather`) so a link can open on a tab. No routing.
- **Motion utilities** in `globals.css` (borrowed from clip/stack): `.row-in` staggered entrance (pair with an inline `animationDelay`, capped at 8 steps), `.pressable` scale-on-tap (only on elements that navigate — tabs, trip-card links — never on inert content cards), `.shimmer-anim` skeleton (pair with an inline `backgroundImage` gradient), `.num` tabular numerals, all guarded by `prefers-reduced-motion`. Ease token: `--ease-out`.
- **Today**: see "Trip page shell" below. Day sections are `day-<index>` (index, not row id), stops `stop-<id>`.

## Text-parsing conventions (non-obvious)

Several fields are free-text but are parsed by regex for display, so the authoring format matters:
- `Day.label` is split on a spaced dash (` - `, ` – `, ` — `) into headline + subtitle (`parseDayLabel`).
- `Logistics.value_md` is split on `' - '` into fields, then interpreted per `category` (`flight`, `train`, `hotel`, `book`, `other`) by `parseLogisticsValue` and `condenseRow` — e.g. a flight row reads as `UA970 - Sun, May 24 - ORD to FCO - Departs 3:45 PM - Arrives 7:55 AM`. Hotel labels are auto-linked to a Google Maps search by `hotelLink` — unless the row's value contains "Not booked yet", in which case the QuickStrip shows the label as plain text with a TBD marker (placeholder labels like "London base" make junk maps queries). Flight/train/hotel categories also feed the QuickStrip at the top of the itinerary tab — rows left as `other` never appear there.
- In the public Logistics tab, rows group by `category`, **except `column_key: 'book'` rows, which always group under "Book Ahead"** regardless of category (`LogisticsSection`).
- `Trip.companion` is a formatted string round-tripped by `parseCompanion`/`formatCompanion` in `TripEditor.tsx`.

Editing these regexes changes how already-authored trip data renders — check existing content before tightening them.

## Admin editor notes

`src/app/admin/trips/[id]/TripEditor.tsx` (~1.4k lines) is the whole authoring UI: inline field editors, a theme picker, a companion picker, and `LocationAutocomplete`, which debounces (250ms) against `geocoding-api.open-meteo.com` to fill `location` + `lat/lng` on a trip or day. Setting those coordinates is what enables weather for that day.

## Icons / PWA (from UPDATE.md)

`layout.tsx` declares `manifest: '/manifest.json'`, an SVG + 32px PNG favicon, and `apple-touch-icon.png` at 180px — iOS reads that file specifically, and its absence was why the home screen showed a generic "K". `public/` carries icons at 32/180/192/512. `next.config.js` exists solely to serve `/manifest.json` with `Content-Type: application/manifest+json`. Manifest `theme_color`/`background_color` and the viewport `themeColor` are all parchment `#F5F0E8`; `appleWebApp.statusBarStyle` is `'default'` to match (flip to `'black-translucent'` only if the app goes dark). `KojiMark.tsx` (the inline logo) is proportioned to match `icon.svg` — change them together.

`public/sw.js` (registered by `SWRegister` in `layout.tsx`) provides offline support: network-first with cache fallback for same-origin pages/RSC payloads, cache-first for `/_next/static`. It never intercepts `/api/`, `/admin`, cross-origin, or non-GET requests — the `UpdateBanner` deploy check (HEAD `/`) passes through untouched. Bump its `VERSION` constant to invalidate old caches.

## koma — the shooting mode (2026-09-16)

A private photography-planning layer over an existing itinerary, named for 齣
(*koma*), a single frame of film. Toggled from the camera mark in the
site header (the glass top bar it also lived in is gone); it replaces the itinerary tab's body with
`KomaView` and leaves logistics and weather alone.

**Privacy comes from RLS, not from the UI.** `koma_shots` has RLS enabled with
**no policies at all**, so the anon client in `lib/supabase.ts` cannot read a
row of it. Everything goes through `/api/koma/shots`, which checks the
`koji_admin` cookie and queries with the service key. That route's 401 is also
the authorisation probe: `TripView` fetches it on mount and only renders the
toggle when it gets a 200, so a guest never learns the mode exists. Do not add
a public read policy, and do not fetch shots in the page's Server Component —
reading cookies there would force the ISR-cached trip page dynamic.

**Frames.** A shot is a named picture, not a location. `buildFrames` numbers a
day's shots 1..n in itinerary order: shots inherit their stop's `sort_order`,
and loose shots (`day_id` set, `stop_id` null) fall in at the end under
"Anywhere this day". A shot's time is `at_time` if set, else the parent stop's
`time_label` via `parseTimeLabel` (which handles koji's free-text labels —
"3:15pm", "Noon", bare "11:45").

**The sun chart is the centrepiece.** `lib/sun.ts` is NOAA's solar position
algorithm; `SunTrack` draws the day's real altitude curve with the golden band
(0–6°) and blue band (−6–0°) shaded, and the frames hung *below* the axis so
the curve is never obscured by its own data. Colliding chips are pushed apart
by an iterative relaxation pass while a tick and a slanted leader keep pointing
at the true time. The curve's shape is the information: a low flat arc means
raking light all day, a tall dome means an unusable middle.

Sun times need the location's UTC offset, which koji does not store. It comes
from Open-Meteo `timezone=auto` (`utcOffsetFor`, cached in module scope);
deriving it from longitude is the fallback only, since that is an hour wrong
anywhere on summer time. This is a separate fetch from the weather code on
purpose — don't couple koma to `TripView`'s weather effect.

**Colour.** koma swaps koji's brass for a copper sampled off a Sony E-mount
ring: `--k-copper #B83C01` (5.0:1 on parchment) with `#CF6A21` and `#FBB04F`
for fills and tints. Brass is 2.5:1, which is decorative-only contrast — koma's
labels are the first in koji that survive daylight. The scoped tokens live
under `.koma` in `globals.css`; **sun mode** is `.koma.sun`, which pushes every
role past 7:1 and also goes up a type size and weight, to 2px borders and solid
fills. Under glare a light and a dark UI lose contrast at about the same rate;
what helps is contrast and form, so there is deliberately no dark mode.

**Authoring is SQL**, like the rest of koji's content (see `sql/`). The route
supports POST/PATCH/DELETE and the app writes `status` from the field, but
there is no admin editor yet — `TripEditor` is untouched.

## Trip page shell (2026-09-16)

Only one thing floats over the page: a Liquid Glass tab capsule above Safari's
own bottom bar (`GlassTabBar`), a transparent `position: fixed` wrapper with the
glass (`.glass` in `globals.css`) on a child, which is what Safari 26+ wants.
It is positioned off `env(safe-area-inset-bottom)`; `viewport-fit: cover` in
`layout.tsx` is what makes that inset non-zero, so do not remove it. `html`
carries an explicit background and `color-scheme: light` because Safari tints
its toolbar from it.

There is deliberately **no fixed top bar** (one was tried and removed on
2026-09-16 because three layers rode along with the reader). Instead each day
`<section>` has a glass header that is `position: sticky` under the status bar.
The scroll tracker in `TripView` decides which section is in view and whether
its header has pinned (its offset inside the section exceeds
`DAY_HEADER_MARGIN`); a pinned header folds to one line (date, day number or
"today", subtitle, weather) and tapping it drops the `DayRail` out beneath it.
Picking a day scrolls there (`scrollIntoView`, honouring the section's
`scroll-margin-top`) and folds the rail away; so does any change of pinned day.

Day awareness: `todayIdx` is computed on the client from the phone's local
date against `dateForDay`. During the trip the page opens scrolled to today
(unless the URL carries `#logistics`, `#weather`, `#day-N` or `#stop-N`), the
day chip and header are marked in brass, and a dark "today" segment appears in
the capsule whenever you are not looking at today. The dark hero card also
carries a `DayRail`, which is where day jumping lives from the top of the page.

A hidden tab re-fetches on wake after 10 minutes via `router.refresh()`.

`sql/` holds dated records of content edits applied live through the Supabase
connection, like dashi's root `.sql` files. Read them, don't run them.
