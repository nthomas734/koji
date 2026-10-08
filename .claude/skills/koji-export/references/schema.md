# koji schema reference

Four tables, all prefixed `koji_`, all in the shared Kura Supabase project.

## koji_trips

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | auto-generated |
| `slug` | text | URL key; unique. e.g. `mexico-city-nov-2025` |
| `title` | text | Display title. e.g. `Mexico City` |
| `subtitle` | text\|null | e.g. `Solo`, `with Deztiny`, `with Mom & Sarah` |
| `eyebrow` | text\|null | Top label. e.g. `Fall - 5 nights` |
| `meta` | text\|null | Sub-description. e.g. `Polanco base - Chapultepec - Roma Norte` |
| `header_theme` | text | one of: `forest` `navy` `plum` `earth` `sand` `ocean` `rust` `slate` |
| `companion` | text\|null | Free text. Used for filtering/grouping in admin. |
| `published` | boolean | Always `false` on export. |
| `created_at` | timestamptz | auto |

**Insert pattern:**
```sql
insert into koji_trips (slug, title, subtitle, eyebrow, meta, header_theme, companion, published)
values ('your-slug', 'Title', 'with X', 'Eyebrow text', 'Meta description', 'earth', 'X', false)
on conflict (slug) do nothing;
```

## koji_days

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | auto-generated |
| `trip_id` | uuid | FK → koji_trips.id |
| `label` | text | Day heading. e.g. `Sunday, May 24 - Departure` |
| `sort_order` | integer | 0-indexed within trip |
| `created_at` | timestamptz | auto |

**Insert pattern:**
```sql
insert into koji_days (trip_id, label, sort_order)
select id, 'Day label here', 0 from koji_trips where slug = 'your-slug'
on conflict do nothing;
```

## koji_stops

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | auto-generated |
| `day_id` | uuid | FK → koji_days.id |
| `title` | text | Stop title. e.g. `Museo Soumaya` |
| `body_md` | text | Markdown: `[Place](maps-url) - description`. Every place must be a Google Maps link. |
| `time_label` | text\|null | Display time. e.g. `7:30`, `PM`, `19:00`. Null if no time given. |
| `tag` | text | Free text tag. See tag guide in SKILL.md. |
| `tag_color` | text | One of: `green` `navy` `amber` `pink` `sky` `emerald` `gray` |
| `sort_order` | integer | 0-indexed within the day |
| `is_optional` | boolean | `true` if stop is marked optional/backup/alternative |
| `created_at` | timestamptz | auto |

**Insert pattern** — look up day_id by slug + sort_order:
```sql
insert into koji_stops (day_id, title, body_md, time_label, tag, tag_color, sort_order, is_optional)
select
  (select d.id from koji_days d
   join koji_trips t on d.trip_id = t.id
   where t.slug = 'your-slug' and d.sort_order = 0),
  'Place Name',
  '[Place Name](https://www.google.com/maps/search/?api=1&query=Place+Name+City) - description',
  '7:30',
  'dinner',
  'amber',
  0,
  false
on conflict do nothing;
```

## koji_logistics

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | auto-generated |
| `trip_id` | uuid | FK → koji_trips.id |
| `column_key` | text | **MUST be exactly `'logistics'` or `'book'`** — check constraint, no other values allowed |
| `label` | text | Row topic. e.g. `Flight out`, `Night 1`, `Laguna CG` |
| `value_md` | text | Detail, Markdown ok. e.g. `**UA 359** - ORD to MEX - Departs 8:55am` |
| `sort_order` | integer | 0-indexed within column |
| `created_at` | timestamptz | auto |

**Insert pattern:**
```sql
insert into koji_logistics (trip_id, column_key, label, value_md, sort_order)
select id, 'logistics', 'Label here', 'Value here', 0
from koji_trips where slug = 'your-slug'
on conflict do nothing;
```

**CRITICAL:** `column_key` has a database check constraint. Only `'logistics'` and `'book'` are allowed. Any other value will throw a constraint violation and abort the transaction.

## Supabase project

- URL: `https://lrbmtcyhqzuyczovajnj.supabase.co`
- SQL Editor: Kura project → SQL Editor → paste → Run

## Common mistakes (also in SKILL.md)

1. **Missing DO block wrapper** — Supabase SQL editor splits the script on quirks in URL/string content and throws errors like `relation "the" does not exist`. Always wrap in `do $koji$ begin ... end $koji$;` with the verify query outside.
2. **Missing cleanup block** — re-runs accumulate duplicate days and the day-id subquery returns multiple rows. Always include the four delete statements at the top of the DO block.
3. **Wrong `column_key`** — only `'logistics'` or `'book'`. Not `'flight'`, not `'hotel'`, not anything else.
4. **Apostrophes** — use `''` (two single quotes). Never `\'`. `Oscar's` → `Oscar''s`.
5. **Raw `&` in URLs** — use `%26`. `Herb & Wood` → `Herb+%26+Wood`.
6. **Hardcoded IDs** — never. Always look up by slug + sort_order.
7. **Apple Maps** — never. Always Google Maps.
8. **Venue websites** — never. Always Google Maps.
9. **Multi-row INSERT for stops** — use one INSERT per stop, not VALUES (...), (...).
10. **Publishing** — always `false`. Never `true` on export.
11. **Special characters** — strip em dashes from comments, replace `€` with `euro`, en dashes with hyphens, middle dots with hyphens, smart quotes with ASCII quotes.
