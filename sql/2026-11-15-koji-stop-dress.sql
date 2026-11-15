-- koji: destination dress, step 3. Seven nullable text columns on koji_stops
-- for Japan and China trips. Additive and safe to re-run; writes no content.
-- Every column is optional, and a stop with all seven null renders exactly as
-- it did before. The app reads stops with select('*'), so it works whether or
-- not this has been applied yet.

-- Ticket details (JourneyTicket): only on stops that already render as a ticket.
alter table koji_stops add column if not exists from_local    text;
alter table koji_stops add column if not exists to_local      text;
alter table koji_stops add column if not exists service_label text;
alter table koji_stops add column if not exists seat_label    text;

-- Say it / Show it (a chip on the stop that opens a full-screen phrase card).
alter table koji_stops add column if not exists say_local     text;
alter table koji_stops add column if not exists say_reading   text;
alter table koji_stops add column if not exists say_gloss     text;

comment on column koji_stops.from_local    is 'Departure station as the board shows it, in the local script (岡山, 重庆北). Set above the departure time on the ticket.';
comment on column koji_stops.to_local      is 'Arrival station as the board shows it, in the local script (博多, 成都东). Set above the arrival time on the ticket.';
comment on column koji_stops.service_label is 'The train''s name or number ("のぞみ Nozomi 21", "G8602"). Joins the duration on the ticket''s dotted route, before it.';
comment on column koji_stops.seat_label    is 'Car and seat as one line ("7号車 12番 D・E席"). Shown in the lower half of the ticket.';
comment on column koji_stops.say_local     is 'A phrase in the local script (おすすめは何ですか, 微辣). Its presence turns on the Say it / Show it chip.';
comment on column koji_stops.say_reading   is 'How to say it: romaji for Japan ("Osusume wa nan desu ka?"), pinyin with tone marks for China ("wēi là"). Very large on a Japan card.';
comment on column koji_stops.say_gloss     is 'What it means in English ("What do you recommend?").';
