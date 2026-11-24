-- 2026-11-23 · Japan 2025 and Japan 2026: the touches Japan 2027 already has.
-- Applied live through the Supabase connection. Read it, don't run it.
--
-- What changed and where each fact came from:
--   * Logistics rows were all category 'other', so the Logistics tab showed one
--     "Other" pile. They now sit under flight / hotel / bags / info.
--   * Japan 2025's flights are Delta 7 and Delta 8, from the Delta award receipt
--     (confirmation issued 2024-10-23): LAX 9:55am Tue Feb 25 -> HND 3:05pm Wed
--     Feb 26; HND 5:20pm Tue Mar 11 -> LAX 11:40am the same day. The landing
--     stop said 3:00pm; it is 3:05pm. The flight home now has its arrival, so
--     it renders as a ticket.
--   * Two shinkansen legs on Japan 2025 get station names and the train, from
--     the stops' own bodies (Hikari from Odawara to Kyoto; Nozomi from
--     Shin-Osaka to Tokyo). No departure time was kept, so time_label stays
--     "morning": the ticket shows without clock times (isJourney's second way
--     in, same PR).
--   * Short hops become stubs (hop_mode / hop_line), wording from the bodies.
--     line_color stays null: no operator colour was sourced.
--   * Day icons where the day has an obvious one.
--
-- Left alone on purpose, waiting on Nathan: "To Hakone" on Mar 3 2025 (the body
-- says Romancecar or shinkansen, not which) and Japan 2026's three shinkansen
-- legs (boarding station and train not recorded anywhere).

do $koji$
declare
  t25 bigint; t26 bigint;
begin
  select id into t25 from koji_trips where slug = 'japan-2025';
  select id into t26 from koji_trips where slug = 'japan-2026';

  -- ── Japan 2025 · logistics ────────────────────────────────────────────────
  update koji_logistics set category = 'flight', label = 'Flight out',
    value_md = '**DL 7** - Tue, Feb 25 - LAX to HND - Departs 9:55am - Arrives Wed 3:05pm'
    where trip_id = t25 and label = 'Flight in' and category = 'other';
  update koji_logistics set category = 'flight',
    value_md = '**DL 8** - Tue, Mar 11 - HND to LAX - Departs 5:20pm - Arrives 11:40am same day'
    where trip_id = t25 and label = 'Flight home' and category = 'other';
  update koji_logistics set category = 'hotel'
    where trip_id = t25 and category = 'other'
      and label in ('Tokyo', 'Hakone', 'Kyoto', 'Osaka', 'Tokyo, last night');

  -- ── Japan 2025 · flights ──────────────────────────────────────────────────
  update koji_stops s set time_label = '3:05pm',
    body_md = 'Delta 7 from Los Angeles, which left on Tuesday morning. Bags and customs, then into the city to drop the bags at the hotel.'
    from koji_days d where s.day_id = d.id and d.trip_id = t25
      and d.sort_order = 10 and s.sort_order = 0 and s.time_label = '3:00pm';
  update koji_stops s set title = 'DL 8 to LA', arrive_label = '11:40am PT · Tue'
    from koji_days d where s.day_id = d.id and d.trip_id = t25
      and d.sort_order = 140 and s.sort_order = 30 and s.arrive_label is null;

  -- ── Japan 2025 · tickets ──────────────────────────────────────────────────
  update koji_stops s set from_name = 'Gora', to_name = 'Kyoto',
    from_local = '強羅', to_local = '京都',
    service_label = 'ひかり Hikari', duration_label = 'about 3 h · 2 changes'
    from koji_days d where s.day_id = d.id and d.trip_id = t25
      and d.sort_order = 70 and s.sort_order = 0 and s.from_name is null;
  update koji_stops s set from_name = 'Shin-Osaka', to_name = 'Tokyo',
    from_local = '新大阪', to_local = '東京',
    service_label = 'のぞみ Nozomi', duration_label = '2 h 30'
    from koji_days d where s.day_id = d.id and d.trip_id = t25
      and d.sort_order = 130 and s.sort_order = 0 and s.from_name is null;

  -- ── Japan 2025 · stubs ────────────────────────────────────────────────────
  update koji_stops s set hop_mode = 'train', duration_label = '24 min',
    hop_line = 'Kanda to Ueno on the Keihin-Tohoku line'
    from koji_days d where s.day_id = d.id and d.trip_id = t25
      and d.sort_order = 20 and s.sort_order = 10 and s.hop_mode is null;
  update koji_stops s set hop_mode = 'train', duration_label = '15 min',
    hop_line = 'Keihin-Tohoku line south, or a 30-minute walk'
    from koji_days d where s.day_id = d.id and d.trip_id = t25
      and d.sort_order = 20 and s.sort_order = 30 and s.hop_mode is null;
  update koji_stops s set hop_mode = 'train', duration_label = 'about 1 h',
    hop_line = 'Hibiya line to Hatchobori, then the JR Keiyo line'
    from koji_days d where s.day_id = d.id and d.trip_id = t25
      and d.sort_order = 30 and s.sort_order = 0 and s.hop_mode is null;
  update koji_stops s set hop_mode = 'train', duration_label = 'about 40 min',
    hop_line = 'Kyoto Station to Kintetsu-Nara, a short walk from the park'
    from koji_days d where s.day_id = d.id and d.trip_id = t25
      and d.sort_order = 100 and s.sort_order = 0 and s.hop_mode is null;
  update koji_stops s set hop_mode = 'train'
    from koji_days d where s.day_id = d.id and d.trip_id = t25
      and d.sort_order = 100 and s.sort_order = 40 and s.hop_mode is null;
  update koji_stops s set hop_mode = 'train',
    hop_line = 'JR special rapid, about 30 minutes, then the subway down to Namba'
    from koji_days d where s.day_id = d.id and d.trip_id = t25
      and d.sort_order = 110 and s.sort_order = 0 and s.hop_mode is null;

  -- ── Japan 2025 · day icons ────────────────────────────────────────────────
  update koji_days d set icon = v.icon
    from (values (20, '🏛'), (30, '🎢'), (40, '🛍'), (50, '🖼'),
                 (80, '🏮'), (110, '🐋'), (120, '🏯')) as v(so, icon)
    where d.trip_id = t25 and d.sort_order = v.so and d.icon is null;

  -- ── Japan 2026 · logistics ────────────────────────────────────────────────
  update koji_logistics set category = 'flight'
    where trip_id = t26 and category = 'other'
      and label in ('Nathan out', 'To Sapporo', 'Back to Tokyo', 'Dez out',
                    'Marshall and Francesca out', 'To Fukuoka', 'Dez home',
                    'Marshall and Francesca home', 'Fukuoka to Haneda', 'Nathan home');
  update koji_logistics set category = 'hotel'
    where trip_id = t26 and category = 'other'
      and label in ('Tokyo', 'Osaka', 'Osaka, night off', 'Osaka, celebration',
                    'Sapporo', 'Tokyo, together', 'Osaka, together', 'Ito',
                    'Tokyo, finale', 'Fukuoka');
  update koji_logistics set category = 'info'
    where trip_id = t26 and category = 'other' and label in ('Work schedule', 'IC card');
  update koji_logistics set category = 'bags'
    where trip_id = t26 and category = 'other' and label = 'Luggage';

  -- ── Japan 2026 · stubs ────────────────────────────────────────────────────
  update koji_stops s set hop_mode = 'train', duration_label = '35 min',
    hop_line = 'JR from Sapporo, then a walk to the canal'
    from koji_days d where s.day_id = d.id and d.trip_id = t26
      and d.sort_order = 17 and s.sort_order = 0 and s.hop_mode is null;
  update koji_stops s set hop_mode = 'train'
    from koji_days d where s.day_id = d.id and d.trip_id = t26
      and d.sort_order = 17 and s.sort_order = 30 and s.hop_mode is null;
  update koji_stops s set hop_mode = 'train', duration_label = 'about 40 min',
    hop_line = 'From Namba. Comfortable shoes, and a small towel for the deer'
    from koji_days d where s.day_id = d.id and d.trip_id = t26
      and d.sort_order = 25 and s.sort_order = 0 and s.hop_mode is null;

  -- ── Japan 2026 · day icons ────────────────────────────────────────────────
  update koji_days d set icon = v.icon
    from (values (3, '⛩'), (4, '☕'), (5, '☕'), (7, '🚄'), (8, '🏮'), (9, '🌃'),
                 (10, '🍜'), (11, '🍣'), (13, '🍸'), (17, '⚓'), (21, '⚾'),
                 (22, '🏛'), (23, '🚄'), (24, '🌃'), (27, '🚄'), (28, '🌸'),
                 (33, '🏮')) as v(so, icon)
    where d.trip_id = t26 and d.sort_order = v.so and d.icon is null;
end
$koji$;
