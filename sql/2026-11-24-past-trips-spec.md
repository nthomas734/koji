# Past trips as records: the spec (2026-11-24)

Nathan's koji app (trip itineraries; Supabase project `lrbmtcyhqzuyczovajnj`, tables `koji_*`) holds past
trips that still read like plans. Japan 2025 and Japan 2026 were rebuilt on 2026-11-23 as records of what
happened. This spec is how to give another past trip the same treatment. The worked example is
`/Users/nathan/Documents/GitHub/koji-worktrees/past-trips/sql/2026-11-23-japan-2026-record.md`; read it.
`CLAUDE.md` in that folder documents every column and how it renders (read "Journey tickets", "The stub",
"Text-parsing conventions", "Editing itinerary content from a cloud session"). Look at
https://koji-iota.vercel.app/trips/japan-2026 to see the target.

## Rule zero: only what evidence supports
State as fact only what one of these confirms: (a) Nathan's photos, (b) a booking/airline email in his Gmail,
(c) what the trip's own rows already say was booked. Never invent a place, time, train or meal. A planned
stop with no evidence either way stays, reworded neutrally (see Voice). A planned stop the evidence
contradicts is moved or removed. List everything you could not settle in your report.

## Evidence
- **Photos**: `~/Pictures/2026/<YYYY-MM-DD>/` (full-size JPGs from a Sony a7 V). **The camera clock is on US
  Central time** and the folder is named by camera date. Read each frame's EXIF time and offset tag, convert
  to the trip's local time (Rome = Central + 7 h; London = Central + 6 h, then + 5 h... work it out per date
  from the real UTC offsets, don't trust this line), and **validate against something in frame** (a clock, a
  dated event, daylight) before using any time. Build labelled contact sheets and view every frame at
  thumbnail size; enlarge to read signs. Scratch files go under
  `/Users/nathan/Documents/Code/mockups/past-trips-photos/<slug>/` only. Never modify anything under
  `~/Pictures` or `~/Documents/Photos`.
- **Gmail** (connector tools): search for airline, rail and hotel confirmations for the trip dates. Use
  search with minimal/summary views first; open a full thread only when you need its times (they are long).
  A flight's real date, number, airports and times beat what koji says.
- Identify a place only from what is in the frame (a readable sign, an unmistakable landmark). Give each
  identification a confidence; only "certain" becomes a stop, "likely" may be worded as "around X".

## What to change in koji (apply live with the Supabase `execute_sql` tool)
One `do $$ ... $$` block per logical step, guarded so it can't hit another trip (join through
`koji_trips.slug`), then a read-back query. Other sessions edit other trips: touch only your trip's rows.
`koji_history` records every change, so nothing is unrecoverable, but do not delete what you can't justify.

1. **Dates.** If emails or photos show the trip's real start/end differ from `date_start`/`date_end`, fix
   them. A day's date is `date_start + its position`, so adding or removing a first day shifts everything:
   renumber `sort_order` and fix the weekday in every `label` ("Sat, Feb 28 - Off to Tokyo").
2. **Day labels**: `Ddd, Mon D - headline` (short weekday and month: "Tue, May 26 - Trevi, the Pantheon,
   the Colosseum"). Headline says what the day was. Give each day an `icon` (one emoji) where one is
   obvious, and set `lat`/`lng`/`location_label`/`tz` to where the day was spent (weather uses them).
3. **Times**: 12-hour, lowercase, no space: `7:55am`, `about 2:00pm`, `morning`, `evening`. Use a clock time
   only where a photo or booking gives it; otherwise the part of day.
4. **Tags**: Title Case ("Sightseeing", "Coffee", "Dinner", "Travel", "Flight", "Hotel", "Explore",
   "Lunch", "Work"). `tag_color` must stay one of the values already used in the table.
5. **Voice.** Short noun-phrase sentences, like the Japan 2026 rows: "Ramen at [X](link)." / "A slow walk
   along [the canal](link)." No instructions or advice to a future traveller ("book ahead", "confirm",
   "bring", "if there's time", "go early"), no prices, no "optional". Where evidence shows it happened you
   may use past tense ("before the stalls closed"). No "we skipped X" notes. No private remarks. Keep it
   warm but plain; no em-dash asides. Names of the people as the rows already use them.
6. **Optional stops** (`is_optional`): one the evidence shows happened becomes a plain stop
   (`is_optional=false`, `fit_label=null`, `maybe_kind/maybe_head=null`). One with no evidence: leave it
   exactly as it is and list it in your report for Nathan to decide. Do not delete undecided optionals.
7. **New stops** for places the photos show that the plan lacks: time from the frames, a one- or
   two-sentence body, a Google Maps search link `https://www.google.com/maps/search/?api=1&query=Words+Like+This`
   on the place name.
8. **Flights** (`tag` 'Flight'): title like "UA 970 to Rome", `time_label` the departure, `arrive_label`
   like `7:55am CEST · Mon` (zone abbreviation, then the weekday if it lands on another day). That makes
   it render as a ticket. A separate "Land at X" stop on the arrival day stays a plain card.
9. **Trains / long drives** (45 min or more): set `from_name`, `to_name` (station or town), `duration_label`
   ("1 h 35", "about 2 h · 1 change"), `service_label` for a named train ("Frecciarossa 9520" only if the
   number is known, else "Frecciarossa"). Leave `from_local`/`to_local` null (those are for Japan/China).
   For a drive, title it so it contains the word "drive" or "Drive" (a car glyph is being added for that).
10. **Short hops** (under 45 min: a taxi, an Uber, the Tube, a short walk between sights): `hop_mode` one of
    train, metro, bus, taxi, car, walk, boat; `hop_line` one sentence starting with a capital that says
    nothing the body doesn't; `duration_label` if known. Leave `line_color` null.
11. **Stays** (`koji_stays`, one row per hotel run, none exist yet for these trips): `place` (the town),
    `check_in`, `nights`, `hotel`, `hotel_query` (maps search words), `booked=true`, `color` (one of blue,
    green, red, amber, teal, rose, violet; a different one per place, reuse for a return to the same
    place), `intro_md` one sentence on what that stay was, `sort_order`. Look at the Japan 2026 rows for
    the shape. `local_name` only if the place has a non-English name worth showing (Roma, Firenze).
12. **Stay photo.** Pick one of Nathan's frames per stay (no stranger as the subject, no family faces
    close up), crop 21:9, resize to 1400x600 JPEG q82 with Pillow, upload to the public bucket as
    `koji-photos/stays/<slug>-<n>.jpg`:
    `set -a; . /Users/nathan/Documents/GitHub/koji/.env; set +a; curl -s -o /dev/null -w '%{http_code}' -X POST "$NEXT_PUBLIC_SUPABASE_URL/storage/v1/object/koji-photos/stays/NAME.jpg" -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" -H "Content-Type: image/jpeg" -H "x-upsert: true" --data-binary @NAME.jpg`
    (never print the key), then set `koji_stays.photo_url` to
    `https://lrbmtcyhqzuyczovajnj.supabase.co/storage/v1/object/public/koji-photos/stays/NAME.jpg`.
    These unedited frames are ungraded; choose well-exposed ones. Skip a stay with no good frame.
13. **Logistics** (`koji_logistics`): flights `category='flight'` as
    `**UA 970** - Sun, May 24 - ORD to FCO - Departs 3:45pm - Arrives Mon 7:55am`; hotels `category='hotel'`
    as `May 25-27 - [Hotel name](maps link) - short note`, with the **place as the label** ("Rome",
    "Florence"); trains `category='train'`. **Remove confirmation numbers, seat numbers and prices: the
    page is public.** Leave `column_key='book'` rows alone (the app is being changed to hide them on past
    trips). Planning notes (`category='other'`) that only made sense beforehand: leave them and list them
    in your report.
14. Do not touch `koji_dinner_options`, `koji_dinner_votes`, `koji_verdicts`, `koma_*`, `koji_bookings`,
    `parts`, `voters`, or any other trip.

## Check and report
After applying, read the trip back from the database and load `https://koji-iota.vercel.app/trips/<slug>`
(it refreshes within about a minute; fetch with a cache-busting query) to confirm it renders: stays in the
header, tickets, no "optional" or advice wording left in the stops you rewrote.
Report: (1) dates/flight corrections with the evidence; (2) day by day, what the photos showed and what you
changed; (3) stops added, moved, removed; (4) **undecided list**: every optional or planned stop with no
evidence, by date and title; (5) logistics notes you left; (6) anything you could not do. Be exact about
which days had no photos.
