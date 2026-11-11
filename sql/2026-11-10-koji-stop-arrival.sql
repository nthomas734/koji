-- koji: when a journey arrives, for the ticket's right-hand side. Safe to re-run.
-- "4:30pm JST · Fri" or "12:45pm PT": a zone after the time marks a trip that
-- crosses zones, and the ticket then names the departure zone too.
alter table koji_stops add column if not exists arrive_label text;
comment on column koji_stops.arrive_label is 'When a journey arrives, as the ticket shows it: "4:30pm JST · Fri", "12:45pm PT". A zone after the time marks a trip that crosses zones.';

update koji_stops set arrive_label = '4:30pm JST · Fri' where id = 587;  -- UA 39
update koji_stops set arrive_label = '12:45pm PT'       where id = 665;  -- UA 38 home
