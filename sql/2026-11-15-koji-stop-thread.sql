-- Superseded the same day: the thread became the stub, and the column comments
-- below were replaced by sql/2026-11-15-koji-stop-stub.sql. The columns stand.

-- koji: the thread. Three nullable text columns on koji_stops that turn a short
-- travel stop into a thread (src/components/TravelThread.tsx): no card, a dotted
-- line down the gap between two stops in the line's colour, the mode in a small
-- ring. Additive and safe to re-run; writes no content. A stop with hop_mode
-- null renders exactly as before, and the app reads stops with select('*'), so
-- it works whether or not this has been applied yet.

alter table koji_stops add column if not exists hop_mode   text;
alter table koji_stops add column if not exists hop_line   text;
alter table koji_stops add column if not exists line_color text;

alter table koji_stops drop constraint if exists koji_stops_hop_mode_check;
alter table koji_stops add constraint koji_stops_hop_mode_check
  check (hop_mode is null or hop_mode in ('train', 'metro', 'bus', 'taxi', 'car', 'walk', 'boat'));
alter table koji_stops drop constraint if exists koji_stops_line_color_check;
alter table koji_stops add constraint koji_stops_line_color_check
  check (line_color is null or line_color ~ '^#[0-9A-Fa-f]{6}$');

comment on column koji_stops.hop_mode   is 'Opts a short travel stop into the thread: train, metro, bus, taxi, car, walk or boat (the glyph in the ring). Ignored on a stop that renders as a journey ticket or an unpicked optional stop.';
comment on column koji_stops.hop_line   is 'The short line after the bold title and a comma on a thread ("Shinjuku to Umegaoka, after hotel breakfast"); lowercase unless it starts with a name. Must say nothing the body does not, and leave out nothing a traveller must not miss.';
comment on column koji_stops.line_color is 'The operator''s own colour for the line, as #RRGGBB (Odakyu #0082C0). Null: the day''s accent. Too pale for small text on parchment, it colours the line and ring only.';
