-- koji bookings: when each reservation or ticket for a trip opens, and whether
-- it has been booked. Idempotent; safe to re-run.
--
-- Private, like koji_verdicts: RLS ON with NO policies, so the anon key can't
-- read or write it. Reads and writes go through /api/admin/bookings
-- (koji_admin cookie), and the calendar feed goes through /api/bookings/ics
-- (a token derived from ADMIN_PASSWORD). The public "Book ahead" logistics
-- rows (column_key = 'book') are separate and stay as they are.
--
-- No confirmation numbers, seat numbers or anything you'd need to get in.
-- This table tracks dates and reminds; it never books anything.
--
-- status is what Nathan set. 'not_open' rows whose opening has passed are
-- *shown* as open (lib/bookings.ts effectiveStatus), so nobody has to flip
-- them by hand at 10:00 JST.

create table if not exists koji_bookings (
  id           bigint generated always as identity primary key,
  trip_id      bigint not null references koji_trips(id) on delete cascade,
  title        text   not null,
  kind         text   not null default 'restaurant'
               check (kind in ('restaurant','train','ticket','tour','hotel','flight','other')),
  what         text,                       -- one line: "Valentine's dinner · Hakone"
  for_date     date,                       -- the day of the reservation itself
  opens_on     date,                       -- the day booking opens (null = no fixed window)
  opens_time   time,                       -- local time at opens_tz; null = sometime that day
  opens_tz     text   not null default 'Asia/Tokyo',
  opens_approx boolean not null default false, -- "~mid-December"
  lead         text,                       -- how far out it opens, e.g. "1 month", "60 days"
  maps_query   text,                       -- place name for a Google Maps search link
  booking_url  text,                       -- the official booking page, optional
  status       text   not null default 'not_open'
               check (status in ('not_open','open','booked','skipped')),
  notes        text   check (notes is null or char_length(notes) <= 1000),
  sort_order   int    not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists koji_bookings_trip_idx on koji_bookings (trip_id);
create index if not exists koji_bookings_opens_idx on koji_bookings (opens_on);

alter table koji_bookings enable row level security;

create or replace function koji_bookings_touch() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists koji_bookings_touch on koji_bookings;
create trigger koji_bookings_touch before update on koji_bookings
  for each row execute function koji_bookings_touch();
