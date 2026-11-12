-- Review C/D: what a taxi needs, per stay. Shown on Logistics' Tonight card and
-- the full-screen "Show to driver" card. Trip 16 filled 2026-11-12 (phones only
-- where two listings agreed: Tokyo, Hakone, Fukuoka).
alter table koji_stays
  add column if not exists hotel_ja text,
  add column if not exists address_ja text,
  add column if not exists address_en text,
  add column if not exists phone text;
