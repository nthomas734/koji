-- Applied live 2026-09-16. Record only — do not re-run blindly.
-- koma: the private shooting plan layered over koji itineraries.
--
-- RLS is ON with NO policies, so the anon key cannot read this table at all.
-- Every read goes through /api/koma/shots, which checks the koji_admin cookie
-- and queries with the service key. Dez opening a trip sees the itinerary
-- exactly as before and never learns the mode exists.

create table if not exists koma_shots (
  id          bigint generated always as identity primary key,
  trip_id     bigint not null references koji_trips(id) on delete cascade,
  day_id      bigint references koji_days(id)  on delete cascade,
  stop_id     bigint references koji_stops(id) on delete set null,
  title       text not null,
  subtitle    text,
  shot_type   text,
  lens        text,
  focal_hint  text,
  light       text,
  at_time     text,
  position_md text,
  tech_md     text,
  notes_md    text,
  ref_url     text,
  priority    text not null default 'want'    check (priority in ('must','want','maybe')),
  status      text not null default 'planned' check (status in ('planned','got','missed','skipped')),
  status_note text,
  lat numeric, lng numeric,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists koma_shots_trip_idx on koma_shots (trip_id, sort_order);
create index if not exists koma_shots_day_idx  on koma_shots (day_id, sort_order);
create index if not exists koma_shots_stop_idx on koma_shots (stop_id, sort_order);

alter table koma_shots enable row level security;

create or replace function koma_shots_touch() returns trigger
  language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
drop trigger if exists koma_shots_touch_trg on koma_shots;
create trigger koma_shots_touch_trg before update on koma_shots
  for each row execute function koma_shots_touch();

-- Reference images. Public bucket with unguessable paths: the shot plan is the
-- private part, and a public bucket avoids signed-URL expiry in an offline PWA.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('koma-refs','koma-refs', true, 10485760,
        array['image/jpeg','image/png','image/webp','image/avif'])
on conflict (id) do update set public = true;
