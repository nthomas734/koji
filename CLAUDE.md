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
- **The home page splits trips into upcoming and past** (`splitTrips` in `page.tsx`): a trip is past once `date_end` (else `date_start`) is before today; undated trips count as upcoming. Upcoming sort soonest first, past most recent first, `sort_order` as the tie-break. `sort_order` alone no longer decides the home page order.
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

- **The serif stack leads with `AmpSerif`, and that is deliberate.** Fraunces
  draws a stylised et-ligature for `&` which reads as a symbol at heading sizes
  ("Land & to the Cotswolds" looked like "Land ⊗ to the Cotswolds" on a phone).
  A `@font-face` in `globals.css` scoped to `unicode-range: U+0026` pulls the
  ampersand from a system serif while everything else stays Fraunces. Don't
  remove it from `--font-serif`, and don't rewrite day labels to avoid `&`.
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

**Hidden, not locked** — the same call daizu makes for `/barista`. It shipped
auth-gated on 2026-09-16 and was deliberately opened the same day: the gate
depended on an admin cookie surviving on a phone mid-trip, and the mode was
undiscoverable. Now `koma_shots` and `koma_rolls` have public read policies and
the shots come down with the trip page, so koma works logged out and offline
from the SW cache. Entry is a **350ms long-press on `KomaMark`**, which must
stay an icon: a long-press on text raises iOS's Copy/Look Up callout and the
gesture never reaches the handler. `-webkit-touch-callout` and `user-select`
off are what actually stop Safari claiming it.

Hidden applies to the entrance, not to every verb on a public URL.
`/api/koma/shots` allows **GET and a PATCH of `status`/`status_note`
unauthenticated** — marking a frame "got" has to work in the street — while
`POST`, `DELETE` and a PATCH of any other field still need the `koji_admin`
cookie. An unauthenticated DELETE here would be a wipe-the-plan-before-the-trip
button. Keep that split if you touch the route.

Accepted trade: the shot plan is in the trip page's HTML and is readable by
anyone who loads it. It is not secret, only unadvertised.

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

Sun times need the location's UTC offset, which koji does not store.
`utcOffsetFor` gets it in **two steps, and the split matters**: Open-Meteo is
asked only for the IANA zone at the coordinate, and `zoneOffsetSec()` then
derives the offset for the trip's date from that zone with `Intl`. Do not put
the date back into the Open-Meteo call — it serves a rolling ~fortnight window
and anything outside it 400s. That bug shipped: every day of a trip a month out
fell through to the longitude fallback and rendered an hour early, golden hour
included, and would have corrected itself silently as the window rolled
forward. `sql/sun-audit.md` has the full account. The Intl step also gets DST
transitions inside a trip right, which a single offset never can.

This is a separate fetch from the weather code on purpose — don't couple koma
to `TripView`'s weather effect.

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

### Rolls (2026-09-16)

A **roll** is one outing's worth of frames — the word the UI already used, and
the pair to koma meaning *frame*. A roll either hangs off a koji trip day, or
stands alone in `koma_rolls` with its own `roll_date` and coordinates, which is
all `sunDay()` needs. A check constraint on `koma_shots` keeps every frame owned
by exactly one of `trip_id` or `roll_id` — never both, never neither.

`/koma` lists the standalone rolls; `/koma/[slug]` renders one. `KomaRollView`
reuses `KomaDay` by handing it a **synthetic stop-less Day** (negative id, so it
can never collide with a real `koji_days` row) and rewriting its shots to
`stop_id: null`, so they all fall into the loose group in sort order. Curve,
clock, sun mode and the frame sheet come along unchanged — don't fork them.

`KomaDay` is deliberately generic: it takes `eyebrow`, `heading`, `lat`, `lng`
rather than a trip and a day index, so both callers drive it the same way.

An undated roll draws today's curve at its own coordinates. The shape of the
light barely moves day to day, so it is honest enough to plan against; it just
will not place a now-line unless the date matches.

Entry is the same everywhere: long-press `KomaMark`. On the itineraries list
(`KomaHomeMark`) it routes to `/koma`; on a trip page it toggles the mode.

### Sketches (2026-09-16)

`KomaSketch` draws a composition diagram from a short spec. The rule, learned by
breaking it: **two different pictures must never get the same drawing.** The
first version had one `macro` bullseye standing in for a rose, a pair of hands,
a seam of rivets and moving water, and one `subject` person-glyph standing in
for cattle, a deer, a tree and a plume of steam. Nathan's report was that it was
"not always clear the shot I want to get", and he was right: the diagram said
"round thing, centred" or "a person", neither of which was true.

The archetype set is now grouped by what the picture *is*, and `subject` takes a
typed glyph (`person|group|animal|bird|tree|plume`) plus an optional `near` for
a subject that fills the frame rather than sits small in it — a raven at 200mm
and a figure three blocks away are opposite instructions.

Every archetype annotates itself in-frame; the caption underneath is a reminder,
not the explanation. The caption gets its own band at y=362 because text printed
over the drawing is unreadable, which is half of what "unclear" meant.

If a frame does not fit an archetype, **add one** rather than borrowing the
nearest. `fill` is the deliberate exception: it is used for eight frames that
genuinely share one instruction (fill the frame, no edge inside), and there the
title and caption carry the subject.

### Working offline (2026-09-16)

koma is used on a phone, one-handed, in places with no bars. Three things had
to change before that was true rather than claimed.

**`at_time` goes through `parseClock`, never `parseTimeLabel`.** The label
parser guesses at koji's free-text stop times and pushes a bare hour under 7
into the afternoon — right for "5:15" on a travel day, and it hung the Cuyamaca
roll's 06:30 and 06:55 dawn frames at 18:30 and 18:55. `parseClock` is strict
and returns null rather than a plausible number, and a check constraint on
`koma_shots.at_time` keeps the 24-hour convention out of the realm of habit.

**Status writes go through `lib/komaQueue.ts`, not straight to `fetch`.** The
tap updates state, lands in a localStorage queue, and the queue drains on
reconnect and on visibility change. `usePendingStatus()` renders the queued
status *over* what the page was served with, so a reload before the queue
drains still shows what you marked. Do not "simplify" this back to an awaited
fetch: the old version only moved state on `res.ok`, which on the Tube meant
the button did nothing at all.

**The offset says which of three sources answered it.** First the stored `tz`
on the day, trip or roll — the zone at a coordinate never changes, so it lives
in the database and ships in the page HTML: no request, right offline, right
from six thousand miles away, right across the BST boundary inside the trip.
Failing that, Open-Meteo. Failing that, the phone's own zone when it is within
90 minutes of solar time for that longitude (right when you are standing in the
place, correctly refused when you are not). Failing that, longitude. `OffsetSource` is returned rather than swallowed and
the chart prints a ⚑ whenever it is a guess. The negative cache has a TTL —
the first version cached a failure forever, so one dead spot poisoned the
session — and the in-flight promise is shared, so eleven `KomaDay`s make one
request.

Reference photographs are cross-origin (Supabase storage) and the service
worker skipped every cross-origin request, so the nine interiors were broken
squares offline. `sw.js` now cache-firsts the `koma-refs` bucket, matched on
host *and* path, and caches opaque responses explicitly — an `<img>` to another
origin is no-cors, so `res.ok` is false even on success. The rows load their
references eagerly for the same reason: the worker can only cache what was
fetched, and lazy loading made a photograph's survival depend on whether you
had scrolled past its row while online.

### The carry (2026-09-16)

"Carry today" used to be read off the day's planned frames, which is backwards.
The frame list is what got written down, not what the day is: the Warner Bros
day had one frame on it and the card said `40mm`, on a day that wants all three
lenses; the Tower/Borough day's five frames are all 70-200, so it said to bring
only the zoom on a day that includes St Paul's interior.

`koma_carry` holds a written call — `lenses[]` in carry order plus `body_md`
arguing it — one row per `day_id` *or* `roll_id`, same check constraint as
`koma_shots`. When a row exists it wins; otherwise the derived list still shows
and **labels itself as derived**, so a day nobody has thought about cannot pass
for a decision.

Total weight comes from `lensWeight()` in `LensMark`, never from the database —
it cannot drift from the list that way. `fmtWeight` switches to kilos at 1000g,
which is the point: "all three" and "leave the zoom at the flat" read
identically until you see 1.34kg against 544g.

The notes are the one place in koji that uses `renderBlockMd`. `renderMd` is
`parseInline` on purpose — koji's bodies are single paragraphs that space
themselves with `<br><br>` — and a carry note run through it comes out as one
line with literal `- ` in it. They also need `.koma-carry-md`: `.body-content`
assumes paper, and its green links and ink-black bold both vanish on the dark
card.

### Prerendering (2026-09-16)

`/trips/[slug]` and `/koma/[slug]` need `generateStaticParams` or they are not
prerendered at all — a dynamic segment without it cannot be, so the
`export const revalidate = 60` sitting above them did nothing and every load
ran five sequential Supabase queries with `no-store` and no cached fallback.
Both slug lists swallow errors and return `[]`: a Supabase blip during a build
should degrade to on-demand rendering, not fail the deploy. `dynamicParams`
stays default so a slug added after a build still renders on request.

60 seconds was chosen, not inherited: on the trip a static page from the edge
on a bad connection beats second-fresh data, and a SQL edit during planning can
wait a minute.

## Trip page shell (2026-09-16)

Nothing floats over the trip page. A fixed glass top bar and a floating tab
capsule were both tried and removed on 2026-09-16: on a text-heavy page three
layers rode along with the reader. The three tabs (`HeroTabs`) are pills
inside the dark hero card at the top; Logistics and Weather are reference
pages reached by scrolling up. Glass (`.glass` in `globals.css`) is now used
only for the day headers.

Each day `<section>` has a glass header that is `position: sticky` under the
status bar. The scroll tracker in `TripView` decides which section is in view
and whether its header has pinned (its offset inside the section exceeds
`DAY_HEADER_MARGIN`); a pinned header folds to one line (date, day number or
"today", subtitle, weather) and tapping it drops the `DayRail` out beneath it.
Picking a day scrolls there (`scrollIntoView`, honouring the section's
`scroll-margin-top`) and folds the rail away; so does any change of pinned day.
During the trip, a folded header for any day other than today carries a brass
"today" chip that jumps there.

Day awareness: `todayIdx` is computed on the client from the phone's local
date against `dateForDay`. During the trip the page opens scrolled to today
(unless the URL carries `#logistics`, `#weather`, `#day-N` or `#stop-N`), and
the day chip and header are marked in brass. The hero's `DayRail` is where day
jumping lives from the top of the page.

`viewport-fit: cover` in `layout.tsx` stays (safe-area insets pad the header
and the bottom of the page), and `html` carries an explicit background and
`color-scheme: light` because Safari tints its toolbar from it.

A hidden tab re-fetches on wake after 10 minutes via `router.refresh()`.

`sql/` holds dated records of content edits applied live through the Supabase
connection, like dashi's root `.sql` files. Read them, don't run them.
