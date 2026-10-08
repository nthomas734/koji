---
name: koji-export
description: >-
  Use this skill whenever Nathan wants to take an itinerary planned in chat (typically via the itinerary-builder skill, often delivered as a .docx) and load it into his koji trip-itinerary app. Triggers: "export to koji", "format this for koji", "build the SQL for koji", "upload this trip to koji", or any phrasing about getting an itinerary into the koji site/app/database. Output is always a single .sql file that Nathan pastes into the Kura Supabase SQL Editor. The skill knows the koji schema (koji_trips, koji_days, koji_stops, koji_logistics), the allowed tag colors and column_keys, the Google-Maps-only link rule, and the safe-execution wrapper that prevents SQL editor quirks. Do NOT use for non-koji exports or for building the itinerary itself (that's itinerary-builder).
---

# koji-export

This skill turns a chat-planned itinerary into a single `.sql` file ready to paste into the Kura SQL Editor. One paste, one Run, trip is in koji.

## The execution wrapper — non-negotiable

**Every export wraps the entire script in a single `DO $koji$ ... $koji$;` block.**

```sql
do $koji$
begin
  -- all cleanup, inserts, etc. here
end $koji$;

-- verify query goes AFTER the DO block
select t.title, count(distinct d.id) as days, count(distinct s.id) as stops, count(distinct l.id) as logistics_rows
from koji_trips t
left join koji_days d on d.trip_id = t.id
left join koji_stops s on s.day_id = d.id
left join koji_logistics l on l.trip_id = t.id
where t.slug = 'your-slug'
group by t.title;
```

Why: Supabase's SQL editor has historically split multi-statement scripts in ways that misinterpret content inside string literals (URLs with `&`, special punctuation, em dashes in comments). Wrapping the whole script in a single `DO` block makes it one statement from the editor's perspective — it cannot be split, period. Verify query sits outside the block so its results display.

Never deliver a koji export without the DO block wrapper. The verify query is the only thing that goes outside it.

## Generate the SQL programmatically — never hand-write strings

Hand-written SQL with apostrophes, em dashes, URLs, and special characters is how things break. Always write a small Python script that generates the SQL via helper functions, then read the output. Helpers must:

- Use `s.replace("'", "''")` for every user-supplied string before interpolation
- URL-encode place names: spaces → `+`, `&` → `%26`, apostrophes → `%27`
- Output one INSERT statement per stop (not multi-row VALUES)
- Look up `day_id` via subquery on `slug + sort_order` (never hardcode UUIDs)
- Use `on conflict do nothing` on every insert for idempotency

Minimal helper template:

```python
def q(s): return s.replace("'", "''")

def maps(name, query=None):
    q_str = (query or name).replace(' ', '+').replace('&', '%26').replace("'", '%27')
    return f"https://www.google.com/maps/search/?api=1&query={q_str}"

def link(name, query=None):
    return f"[{name}]({maps(name, query)})"

def stop_insert(slug, day_sort, title, body_md, time_label, tag, tag_color, sort_order, is_optional=False):
    opt = 'true' if is_optional else 'false'
    tl = f"'{q(time_label)}'" if time_label else 'null'
    return f"""insert into koji_stops (day_id, title, body_md, time_label, tag, tag_color, sort_order, is_optional)
select
  (select d.id from koji_days d join koji_trips t on d.trip_id = t.id where t.slug = '{q(slug)}' and d.sort_order = {day_sort}),
  '{q(title)}',
  '{q(body_md)}',
  {tl}, '{q(tag)}', '{q(tag_color)}', {sort_order}, {opt}
on conflict do nothing;"""
```

## Characters to avoid in string values

Some characters have caused historical issues in Supabase's SQL editor — strip or replace them in `value_md`, `body_md`, day labels, and titles:

- **Em dashes (`—`) inside comment lines** — strip from all `-- comments`; use plain `-- comment` style only. Em dashes inside quoted strings are fine but err on the side of replacing with ` - ` in label/value text.
- **Box-drawing chars (`──`, `═`, etc.)** — never use these for decorative comment dividers. Use plain `-- SECTION` instead.
- **Euro symbol (`€`)** — has caused statement-split issues. Replace `€2` with `2 euro` in value strings.
- **En dashes (`–`)** — replace with regular hyphens (`-`).
- **Smart quotes (`'` `'` `"` `"`)** — never. Use straight ASCII quotes only.
- **Middle dot (`·`)** — replace with ` - ` in string values (it's been fine in some editors but inconsistent).

The DO block wrapper makes most of these safe, but treating strings as plain ASCII is belt-and-suspenders.

## Cleanup block — always include

Right after `do $koji$ begin`, insert these deletes so re-running the script is safe and idempotent:

```sql
delete from koji_logistics where trip_id = (select id from koji_trips where slug = 'your-slug');
delete from koji_stops where day_id in (select d.id from koji_days d join koji_trips t on d.trip_id = t.id where t.slug = 'your-slug');
delete from koji_days where trip_id = (select id from koji_trips where slug = 'your-slug');
delete from koji_trips where slug = 'your-slug';
```

Without this, repeated runs accumulate duplicate days/stops and the day-id subquery returns multiple rows ("more than one row returned by a subquery used as an expression" error).

## Validate before delivering — use pglast

Before handing Nathan a .sql file, parse it with the real Postgres parser to catch syntax errors:

```python
import pglast
try:
    parsed = pglast.parse_sql(sql)
    print(f"OK: {len(parsed)} statements")
except pglast.parser.ParseError as e:
    # location attribute points to the byte offset of the error
    print(f"ERROR at offset {e.location}: {sql[max(0,e.location-100):e.location]}[HERE]{sql[e.location:e.location+100]}")
```

`pip install --break-system-packages pglast` if it isn't already available. This is the actual Postgres C parser exposed via Python — if it parses, real Postgres will parse it. Don't rely on naive quote-counting validators; they get confused by `&` and `;` inside URLs.

## Schema reference

See `references/schema.md` for the full column reference. Quick reminders:

- **`koji_trips.header_theme`** — one of: `forest`, `navy`, `plum`, `earth`, `sand`, `ocean`, `rust`, `slate`
- **`koji_trips.published`** — always `false` on export. Nathan flips it in the admin when ready.
- **`koji_stops.tag_color`** — one of: `green`, `navy`, `amber`, `pink`, `sky`, `emerald`, `gray`
- **`koji_logistics.column_key`** — exactly `'logistics'` or `'book'`. Any other value triggers a check constraint violation.

## Tag suggestions

Auto-assign based on stop type. Free-text `tag` field, but use a consistent vocabulary:

| Tag | Color | When |
|---|---|---|
| `flight` | `sky` | Airline departures/arrivals |
| `travel` | `gray` | Trains, transfers, airport runs, checkouts |
| `hotel` | `navy` | Hotel check-in |
| `coffee` | `emerald` | Espresso, cafés |
| `lunch` | `amber` | Midday meal |
| `dinner` | `amber` | Evening meal |
| `gelato` | `pink` | Gelato, dessert |
| `spa` | `pink` | Spa, wellness |
| `sightseeing` | `navy` | Monuments, landmarks |
| `tour` | `navy` | Guided tours, museum entries |
| `explore` | `green` | Neighborhood wandering, parks, walks |
| `work` | `gray` | Work blocks, work-related meals (sales club events) |

## Workflow

1. Read the itinerary from the current chat (or from an uploaded .docx via the file-reading skill)
2. Confirm the slug, theme, and companion subtitle with Nathan in one compact block before generating
3. Write a Python generator script (one per export, kept disposable)
4. Run the generator, validate with pglast
5. Save the .sql to `/mnt/user-data/outputs/` with the slug as the filename
6. Present the file with a one-line summary of expected verify counts (days/stops/logistics)
7. After Nathan reports the verify counts, the job is done

## Common mistakes — flag these proactively

1. **No DO block wrapper** → Supabase SQL editor splits the script and throws bogus errors like `relation "the" does not exist`
2. **No cleanup block** → re-runs throw `more than one row returned by a subquery used as an expression`
3. **Wrong `column_key`** → only `'logistics'` or `'book'`; check constraint violation otherwise
4. **Apostrophes** → use `''` (two single quotes). Never `\'`
5. **Raw `&` in URLs** → must be `%26`
6. **Hardcoded IDs** → never; always look up by slug + sort_order
7. **Apple Maps or venue websites** → never; always Google Maps search URLs
8. **`published: true`** → never on export; Nathan flips it in the admin
9. **Decorative box-drawing characters in comments** → strip them; use plain `-- SECTION` comments only
10. **Euro symbol, em dashes, smart quotes in string values** → replace with ASCII equivalents
