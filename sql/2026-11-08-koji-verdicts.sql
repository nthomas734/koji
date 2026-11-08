-- koji verdicts: Nathan's private "was it worth it" call on each place.
-- Idempotent; safe to re-run.
--
-- Private, not hidden. koma ships its shots with the trip page under a public
-- read policy; verdicts must not. RLS is ON with NO policies, so the anon key
-- cannot read or write this table at all. Every read and write goes through
-- /api/verdicts (koji_admin cookie) or /api/verdicts/share (bearer token for
-- the iOS Shortcut), both using the service key. Someone opening a trip link
-- gets an itinerary with no trace of this, not even in the HTML.
--
-- One row per place:
--   - a planned stop      -> stop_id set,  client_key 'stop:<stop_id>'
--   - an unplanned place  -> stop_id null, client_key 'x:<uuid>' (added in the
--                            app), 'share:<uuid>' (iOS Shortcut) or
--                            'photo:<...>' (post-trip photo rebuild)
-- client_key is what every write upserts on, so a tap queued offline and
-- replayed twice still lands as one row.

create table if not exists koji_verdicts (
  id          bigint generated always as identity primary key,
  client_key  text   not null unique,
  trip_id     bigint not null references koji_trips(id) on delete cascade,
  day_id      bigint references koji_days(id)  on delete set null,
  stop_id     bigint references koji_stops(id) on delete set null,
  -- Snapshot of the place, so the row still means something if the stop is
  -- edited or deleted later, and so unplanned places have a name at all.
  title       text   not null,
  maps_url    text,
  source_url  text,
  verdict     text   check (verdict in ('back','once','skip')),
  note        text   check (note is null or char_length(note) <= 500),
  source      text   not null default 'stop' check (source in ('stop','app','share','photo')),
  visited_on  date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists koji_verdicts_trip_idx on koji_verdicts (trip_id);
create index if not exists koji_verdicts_stop_idx on koji_verdicts (stop_id);

alter table koji_verdicts enable row level security;

create or replace function koji_verdicts_touch() returns trigger
  language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
drop trigger if exists koji_verdicts_touch_trg on koji_verdicts;
create trigger koji_verdicts_touch_trg before update on koji_verdicts
  for each row execute function koji_verdicts_touch();
