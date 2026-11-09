-- koji stays, day icons, travel durations and optional-stop notes.
-- Additive and idempotent; safe to re-run. Trips with no stays render as before.
--
-- koji_stays: one row per place you sleep. It drives three things on the trip
-- page: the stays strip in the hero, the town colour under each day pill, and
-- the chapter heading before the first day in each town. A stay covers the
-- nights check_in .. check_in + nights - 1, so the day you leave belongs to the
-- next stay (or to none, on the way home).

create table if not exists koji_stays (
  id          bigint generated always as identity primary key,
  trip_id     bigint not null references koji_trips(id) on delete cascade,
  place       text   not null,                 -- the town: "Onomichi"
  local_name  text,                            -- "尾道"
  check_in    date   not null,
  nights      int    not null check (nights > 0),
  color       text   not null default 'blue'
              check (color in ('blue','green','violet','rose','teal','red','amber','olive')),
  hotel       text,                            -- "onomichi club"
  hotel_query text,                            -- Google Maps search text, defaults to hotel + place
  booked      boolean not null default false,
  desk_hours  text,                            -- "desk until 9pm"
  intro_md    text,                            -- one or two lines: why you're here
  photo_url   text,
  sort_order  int    not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists koji_stays_trip_idx on koji_stays (trip_id, check_in);

alter table koji_stays enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'koji_stays' and policyname = 'koji_public_read_stays') then
    create policy koji_public_read_stays on koji_stays for select using (true);
  end if;
end $$;

-- One emoji on the day pill, for the days that matter.
alter table koji_days  add column if not exists icon text;
-- "3½ h · 2 changes" on a travel stop's pill.
alter table koji_stops add column if not exists duration_label text;
-- On an optional stop: how long it takes or where it fits ("+1½ h · after Taichoro").
alter table koji_stops add column if not exists fit_label text;
-- An optional stop the owner moved into the plan from the "if there's time"
-- list. It stays optional (so "remove" can put it back) but shows in the timeline.
alter table koji_stops add column if not exists added boolean not null default false;
