-- 2026-11-11: lens review for Japan against the real kit (20-70 f/4 G buying, 35 GM, 85 1.8,
-- 70-200 f/4 Macro G; the 40 stays home) and what is actually in the bag each day.

-- Shots that named a lens that isn't with you that day, or the wrong lens for the job
update koma_shots set lens = '20-70 / 35mm', look_md = $q$- A thatched roof against the trees, shot from below on the path — 20-70 at the wide end.
- Smoke from an indoor fire pit lit by the window light, if a fire is going — 35mm wide open; expose for the bright bits.
- Old tools, straw sandals and worn wood, close up — 35mm, close.
- The path between two houses with one person on it — 20-70.$q$ where id = 115;  -- Minka-en: dark interiors want wide and fast, not the 85
update koma_shots set lens = '35mm / 70-200', look_md = $q$- The stone road climbing into the trees, one person on it — 35mm; step back.
- Steam and wood smoke around the thatched tea house — 35mm.
- Wet moss and paving stones close up — 70-200; it focuses close enough for half-life-size.$q$ where id = 103;  -- the 85 stays at the hotel that day; the 70-200 is already in the bag
update koma_shots set lens = '20-70' where id = 112;  -- pumpkin: wide for the sea, 70 to isolate; the 35 is the only other lens that day
update koma_shots set lens = '20-70',
  tech_md = $q$The 70-200 is already in the suitcase to Kyoto, so the 20-70 between 50 and 70. About 1/1000s for a train passing; 1/250s for one pulling in.$q$ where id = 118;
update koma_shots set lens = '20-70',
  position_md = position_md || $q$ The 70-200 left in the suitcase on Tuesday, so it's the 20-70: wide for the whole hillside, 70mm and a crop for the temple.$q$ where id = 88;
update koma_shots set lens = '35mm / 70-200', look_md = $q$- Omoide Yokocho ("Memory Lane", the yakitori alley) from one end, the red lanterns stacking toward you — 35mm; wait for a cook in the grill smoke.
- The crowd crossing the big striped crosswalk outside the station, from above — ride the elevator across the street from the JR station; 70-200 at 135–200 picks single walkers out of the stripes.
- One person standing still while the station crowd streams past — 35mm, about 1/8s, camera braced on a railing.
- People under the neon signs in the blocks between the station and the tracks — 35mm.$q$ where id = 98;
update koma_shots set lens = '20-70 / 70-200', look_md = $q$- The covered market street as the shutters go up: bakeries, pickle shops, fish — 20-70.
- People hopping across the turtle stepping stones — 20-70.
- Herons and kites over the river — 70-200.
- The forest path to Shimogamo Shrine, just north of the rivers.$q$ where id = 97;
update koma_shots set lens = '35mm' where id = 94;
update koma_shots set lens = '20-70 / 70-200' where id = 93;
update koma_shots set look_md = $q$- Black charred-wood walls and a fabric door curtain, a cyclist passing — 35mm.
- Shadows across the lanes in low sun.
- The sea at the end of a lane — 20-70.
- Small shrines and potted plants on doorsteps — 35mm, close.$q$, lens = '35mm / 20-70' where id = 105;  -- the 85 isn't on the island

-- What's in the bag each day
insert into koma_carry (day_id, lenses, body_md) values
(130, '{35mm,85mm}', $q$**Day:** 35 + 85: plum blossom on the 85, Shimokitazawa and Naka-Meguro on both. **At the 4:45 hotel stop, swap the 85 for the 70-200** for the night: Omoide Yokocho and New York Bar on the 35, the crosswalk from above on the 70-200. The suitcases leave for Hakone this morning, so keep every lens in the camera bag.$q$),
(131, '{20-70mm,35mm}', $q$20-70 for the farmhouses, 35 for their dark interiors. Travel day with day bags only (the suitcases went ahead), so the 85 and 70-200 ride deep in the backpack.$q$),
(132, '{20-70mm,70-200mm,35mm}', $q$The big lens day: 70-200 for Owakudani, the lake gate and Fuji; 20-70 for the shrine and cedars; the 35 for the dim stone road at the end. The 85 stays at the hotel.$q$),
(133, '{}', $q$No shots planned. **Send the 70-200 to Fukuoka with the big bags**, wrapped in clothes in the middle of a bag: nothing needs it until the 21st, and it saves 800g over two travel days. Going to Kawazu for the cherry blossom? Keep it out and take it with you.$q$),
(134, '{35mm,85mm}', $q$35 + 85 for the canal at blue hour and the storehouse walls. The 20-70 travels in the backpack; the 70-200 is on its way to Fukuoka.$q$),
(135, '{20-70mm,35mm}', $q$20-70 + 35 on the island: the pumpkin and the sea on the 20-70, Honmura's lanes on the 35. The 85 stays at the hotel.$q$),
(136, '{35mm,85mm}', $q$35 + 85 for the empty canal at 7:45 and the food stalls tonight. The 20-70 travels in the backpack. The 70-200 is waiting at the Grand Hyatt.$q$),
(137, '{35mm,85mm}', $q$35 + 85 only: the lanterns are a 35 wide-open night, with the 85 for faces. Leave the 20-70 and 70-200 at the hotel; it's a long day trip on trains.$q$),
(138, '{35mm,85mm}', $q$35 + 85: plum blossom at Dazaifu, shopping, then Ōhori at golden hour on the 85. Light bag for a long day out.$q$),
(139, '{20-70mm,70-200mm,35mm,85mm}', $q$Moving day, so everything travels. At Senkō-ji: 70-200 for rooftops and ferries, 20-70 for the sweep. The 35 for the lanes on the way down.$q$),
(140, '{35mm,85mm,20-70mm}', $q$Morning: 35 + 85 for Cat Alley. **Then the 70-200 and 85 go in the suitcase to Kyoto**, and the afternoon is the 20-70 + 35. If Monday's light was flat and you're redoing Senkō-ji, keep the 70-200 out until after golden hour and hand the suitcase in tonight (the desk is open until 9).$q$),
(141, '{20-70mm,35mm}', $q$20-70 + 35. The 70-200 is in the suitcase, so the Fukuyama platform shot is the 20-70 at 50–70.$q$),
(142, '{20-70mm,35mm}', $q$20-70 + 35 and a one-night pouch: the 20-70 for the dawn ferry and Takehara, the 35 for Osaka tonight.$q$),
(143, '{35mm,85mm}', $q$35 + 85 for the sake district, the bars and the river at night. Going to Omi-Hachiman first? Add the 20-70 and 70-200 for the canal.$q$),
(144, '{20-70mm,70-200mm}', $q$20-70 + 70-200 at sunrise: the stones and the river wide, herons and kites long. Everything else is packed for the flight.$q$);
