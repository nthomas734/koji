-- koji: the stub replaces the thread (same day). Comments only: the three
-- columns from sql/2026-11-15-koji-stop-thread.sql are unchanged, but a short
-- hop now renders as a stub (src/components/TravelStub.tsx), the full ticket's
-- torn-off end, and hop_line sits on its own line under the title. Seven hop
-- lines that had started lower-case (they used to follow the title after a
-- comma) were capitalised the same day; see the PR.

comment on column koji_stops.hop_mode   is 'Opts a short travel stop into the stub (the journey ticket''s torn-off end): train, metro, bus, taxi, car, walk or boat, the glyph before the title. Ignored on a stop that renders as a journey ticket or an unpicked optional stop.';
comment on column koji_stops.hop_line   is 'The stub''s second line, under the title ("Shinjuku to Umegaoka, after hotel breakfast"). A sentence of its own, so it starts with a capital. Must say nothing the body does not, and leave out nothing a traveller must not miss.';
comment on column koji_stops.line_color is 'The operator''s own colour for the line, as #RRGGBB (Odakyu #0082C0). The stub''s wash is a pale tint of it, the text its deep tone. Null: the day''s accent.';
