-- Japan 2027 booking windows, seeded into koji_bookings (trip slug japan-2027).
-- Source: japan-2027-booking-windows.md, compiled 2026-11-10. Applied live through
-- the Supabase connector; this file is the record. Nothing here is booked.
-- Idempotent: a row is skipped if the trip already has one with that title.
DO $koji$
DECLARE t bigint;
BEGIN
  SELECT id INTO t FROM koji_trips WHERE slug = 'japan-2027';
  IF t IS NULL THEN RAISE EXCEPTION 'trip japan-2027 not found'; END IF;

  INSERT INTO koji_bookings (trip_id, title, kind, what, for_date, opens_on, opens_time, opens_tz, opens_approx, window_type, lead, maps_query, booking_url, status, notes, sort_order)
  SELECT t, v.title, v.kind, v.what, v.for_date::date, v.opens_on::date, v.opens_time::time, 'Asia/Tokyo', v.approx, v.wtype, v.lead, v.maps, v.url, v.status, v.notes, v.ord
  FROM (VALUES
    ('Dez: Fukuoka to Haneda (ANA)', 'flight', 'Add to her UA 38 award, one ticket, bags through to LAX', '2027-02-22', NULL, NULL, false, 'opens', NULL, 'Fukuoka Airport', NULL, 'open',
     'Call United, not ana.co.jp (that makes a separate ticket). Aim for a 12:30-1pm departure, landing by ~3.', 10),
    ('Itoh Dining by Nobu', 'restaurant', 'Valentine''s dinner, Hakone, 7pm', '2027-02-14', NULL, NULL, false, 'opens', NULL, 'Itoh Dining by Nobu Hakone', 'https://www.tablecheck.com/en/shops/itoh-dining/reserve', 'open',
     'Window not published; book as soon as the TableCheck calendar shows February. Phone 0460-83-8209. Backup: Hyatt Regency Hakone Dining Room.', 20),
    ('Sushi counter (Tatsumi)', 'restaurant', 'Fukuoka, Sun 7pm, must be open Sundays', '2027-02-21', '2026-12-15', NULL, true, 'opens', 'about 2 months', 'Tatsumi Sushi Souhonten Fukuoka', NULL, 'not_open',
     'Book via Gurunavi, byFood or phone 092-263-1661. Closed Mondays.', 30),
    ('Nikuichi', 'restaurant', 'Wagyu yakiniku, Fukuoka, 6pm', '2027-02-19', '2027-01-05', NULL, true, 'opens', '~6 weeks', 'Nikuichi Fukuoka yakiniku', NULL, 'not_open',
     'Window not published; book early January. Dinner gets busy.', 40),
    ('LAO LEE', 'restaurant', 'Nagasaki, 5pm', '2027-02-20', '2027-01-05', NULL, true, 'opens', '~6 weeks', 'LAO LEE Nagasaki', NULL, 'not_open',
     'Window not published; book early January. Festival Saturday; check Saturday hours.', 50),
    ('Birthday izakaya', 'restaurant', 'Nishi-Shinjuku, Sat 7pm', '2027-02-13', '2027-01-13', NULL, true, 'opens', '1 month', 'Juniso Dori Jidori Yakitori Ya Nishi-Shinjuku', NULL, 'not_open',
     'Not picked yet; e.g. Juniso Dori Jidori Yakitori Ya (book online). Saturday 7pm fills up.', 60),
    ('Romancecar', 'train', 'Shinjuku to Hakone, ~10am, front observation seats', '2027-02-14', '2027-01-14', '10:00', false, 'opens', '1 month', 'Shinjuku Station Odakyu', 'https://www.web-odakyu.com/e-romancecar/', 'not_open',
     'Front observation seats go fast.', 70),
    ('Shinkansen Odawara to Okayama', 'train', 'Hikari', '2027-02-17', '2027-01-17', '10:00', false, 'opens', '1 month', 'Odawara Station', 'https://smart-ex.jp/en/', 'not_open',
     'smartEX may already allow earlier (some products bookable up to a year ahead since Oct 1, 2026); check.', 80),
    ('Shinkansen Okayama to Hakata', 'train', NULL, '2027-02-19', '2027-01-19', '10:00', false, 'opens', '1 month', 'Okayama Station', 'https://smart-ex.jp/en/', 'not_open',
     'smartEX may allow earlier; check.', 90),
    ('Nagasaki trains', 'train', 'Midori 11 Hakata 8:39 to Arita; HTB 28 Arita 12:12; Kamome 25 Takeo-Onsen 12:56; ~8pm Kamome + Relay Kamome back', '2027-02-20', '2027-01-20', '10:00', false, 'opens', '1 month', 'Hakata Station', NULL, 'not_open',
     'JR Kyushu Train Reservation (online). Festival Saturday; Relay Kamome has unreserved cars as a fallback.', 100),
    ('Shinkansen Hakata to Fukuyama', 'train', 'Nozomi, Nathan solo', '2027-02-22', '2027-01-22', '10:00', false, 'opens', '1 month', 'Hakata Station', 'https://smart-ex.jp/en/', 'not_open',
     'smartEX may allow earlier; check.', 110),
    ('Shinkansen Mihara to Shin-Osaka', 'train', 'Nathan solo', '2027-02-25', '2027-01-25', '10:00', false, 'opens', '1 month', 'Mihara Station', 'https://smart-ex.jp/en/', 'not_open',
     'smartEX may allow earlier; check.', 120),
    ('Nozomi Kyoto to Tokyo', 'train', '~2pm, Nathan solo', '2027-02-27', '2027-01-27', '10:00', false, 'opens', '1 month', 'Kyoto Station', 'https://smart-ex.jp/en/', 'not_open',
     'smartEX may allow earlier; check.', 130),
    ('Benesse House Museum', 'ticket', 'Naoshima', '2027-02-18', '2027-01-28', NULL, true, 'opens', 'a few weeks', 'Benesse House Museum Naoshima', 'https://benesse-artsite.jp/en/', 'not_open',
     'Listed as reservation-needed; online is cheaper. Chichu is closed until Mar 19.', 140),
    ('Onomichi U2 dinner', 'restaurant', 'Tue 7pm, Nathan solo', '2027-02-23', NULL, NULL, false, 'opens', NULL, 'Onomichi U2', NULL, 'not_open',
     'Window unknown; check. National holiday, worth reserving.', 150),
    -- deadlines
    ('Re-check trains, closures, festival times', 'other', 'Sat 20 trains on the Nov 2026 timetable, last trains/ferries, closed days, festival times', NULL, '2027-01-15', NULL, true, 'deadline', NULL, NULL, NULL, 'not_open',
     'Mid-January final check.', 200),
    ('NAGI Kurashiki: free cancellation ends', 'hotel', 'Last day to cancel free', NULL, '2027-02-03', NULL, false, 'deadline', NULL, 'NAGI Kurashiki', NULL, 'not_open',
     NULL, 210),
    ('Kawazu go/no-go', 'other', 'Decide from the bloom forecast; default is the slow Hakone day', '2027-02-16', '2027-02-12', NULL, true, 'deadline', NULL, 'Kawazu cherry blossom', NULL, 'not_open',
     NULL, 220),
    ('onomichi club: free cancellation ends', 'hotel', 'Last day to cancel free', NULL, '2027-02-19', NULL, false, 'deadline', NULL, 'onomichi club Onomichi', NULL, 'not_open',
     NULL, 230)
  ) AS v(title, kind, what, for_date, opens_on, opens_time, approx, wtype, lead, maps, url, status, notes, ord)
  WHERE NOT EXISTS (SELECT 1 FROM koji_bookings b WHERE b.trip_id = t AND b.title = v.title);
END $koji$;
