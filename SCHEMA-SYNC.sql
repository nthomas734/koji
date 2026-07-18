-- koji — SCHEMA-SYNC.sql
-- ============================================================
-- What this is: the complete koji_ schema as it exists in the live Kura
-- Supabase project (project lrbmtcyhqzuyczovajnj). Reverse-engineered from
-- the live database on 2026-07-18 by introspection only.
--
-- This repo had NO committed migration file — the schema had only ever been
-- applied by hand in the Supabase SQL Editor. This file is therefore the
-- first written record of it, and on its own is enough to recreate koji's
-- database from empty.
--
-- Additive only: it creates what is missing and never drops, renames, or
-- retypes anything. Fully idempotent — running it against the current live
-- database is a no-op, and it is safe to re-run.
--
-- Schema only. Trip/day/stop content is loaded separately via the
-- koji-export SQL flow.
--
-- Note on RLS: koji is a published-itinerary reader. The live policies grant
-- anon SELECT only (and only on published trips) — there are no anon write
-- policies. Writes go through the SQL Editor / service role. That is
-- reproduced faithfully below; do not add write policies to "fix" it.
-- ============================================================

-- ---------- 1. trigger function ----------

create or replace function public.koji_set_updated_at()
returns trigger
language plpgsql
as $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

-- ---------- 2. tables (parents first) ----------

create table if not exists koji_trips (
  id           bigserial primary key,
  slug         text unique not null,
  title        text not null,
  subtitle     text not null,
  eyebrow      text not null,
  meta         text not null,
  header_theme text not null default 'forest'
    check (header_theme in (
      'forest','navy','plum','earth','sand','ocean','rust','slate','oxblood',
      'fog','pewter','pacific','shrine','marigold','lagoon','cobalt','linen','stone'
    )),
  companion    text,
  date_start   date,
  date_end     date,
  cover_image  text,
  published    boolean not null default true,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  location     text,
  lat          numeric,
  lng          numeric
);

create table if not exists koji_days (
  id             bigserial primary key,
  trip_id        bigint not null references koji_trips(id) on delete cascade,
  label          text not null,
  sort_order     integer not null default 0,
  created_at     timestamptz not null default now(),
  lat            numeric,
  lng            numeric,
  location_label text
);

create table if not exists koji_stops (
  id          bigserial primary key,
  day_id      bigint not null references koji_days(id) on delete cascade,
  time_label  text,
  tag         text not null default 'note',
  tag_color   text not null default 'gray'
    check (tag_color in ('green','navy','amber','pink','sky','emerald','gray','brass')),
  title       text not null,
  body_md     text not null default '',
  is_optional boolean not null default false,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists koji_logistics (
  id         bigserial primary key,
  trip_id    bigint not null references koji_trips(id) on delete cascade,
  column_key text not null check (column_key in ('logistics','book')),
  label      text not null,
  value_md   text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  category   text not null default 'other'
);

-- ---------- 3. indexes ----------

create index if not exists koji_trips_slug_idx      on koji_trips(slug);
create index if not exists koji_trips_published_idx on koji_trips(published);
create index if not exists koji_days_trip_idx       on koji_days(trip_id, sort_order);
create index if not exists koji_stops_day_idx       on koji_stops(day_id, sort_order);
create index if not exists koji_logistics_trip_idx  on koji_logistics(trip_id, column_key, sort_order);

-- ---------- 4. triggers ----------

drop trigger if exists koji_trips_updated_at on koji_trips;
create trigger koji_trips_updated_at
  before update on koji_trips
  for each row execute function koji_set_updated_at();

drop trigger if exists koji_stops_updated_at on koji_stops;
create trigger koji_stops_updated_at
  before update on koji_stops
  for each row execute function koji_set_updated_at();

-- ---------- 5. row level security ----------

alter table koji_trips     enable row level security;
alter table koji_days      enable row level security;
alter table koji_stops     enable row level security;
alter table koji_logistics enable row level security;

drop policy if exists koji_public_read_trips     on koji_trips;
drop policy if exists koji_public_read_days      on koji_days;
drop policy if exists koji_public_read_stops     on koji_stops;
drop policy if exists koji_public_read_logistics on koji_logistics;

create policy koji_public_read_trips     on koji_trips     for select using (published = true);
create policy koji_public_read_days      on koji_days      for select using (true);
create policy koji_public_read_stops     on koji_stops     for select using (true);
create policy koji_public_read_logistics on koji_logistics for select using (true);
