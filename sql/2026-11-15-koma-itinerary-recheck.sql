-- 2026-11-15: Japan 2027 koma re-checked against the updated itinerary (applied via Supabase MCP).
update koma_shots set at_time='09:45' where id=124 and trip_id=16;  -- Naoshima port: ferry lands 9:45
update koma_shots set at_time='14:15' where id=105 and trip_id=16;  -- Honmura stop is 2:00
update koma_shots set stop_id=705, priority='maybe',
  status_note='Only if you swap Yanaka in for Naka-Meguro: it is an "Or" stop now, and both want the same golden hour.'
  where id=101 and trip_id=16;
-- New: 129 Kawazu cherry blossoms (day 133, stop 605), 130 On the Ekimae ferry (day 140, stop 808).
-- Coordinates from OSM: Tachibashi bridge 34.745466,138.994512; Ekimae ferry pier 34.403438,133.193746.
update koma_carry set lenses = array['70-200mm','20-70mm'] where day_id=133;
