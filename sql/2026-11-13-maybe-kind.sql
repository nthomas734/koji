-- What kind of optional stop this is, so the page can place it (review G):
--   extra    (default) an add-on, in time order, under "if there's time"
--   instead  replaces replaces_stop_id; drawn right under that stop
--   swap     another way to do the whole day; drawn at the top of the day
-- maybe_head overrides the run's heading ("pick one", "or, if you're up early").
alter table koji_stops
  add column if not exists maybe_kind text check (maybe_kind in ('extra','instead','swap')),
  add column if not exists replaces_stop_id bigint references koji_stops(id) on delete set null,
  add column if not exists maybe_head text;
