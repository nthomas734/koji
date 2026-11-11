-- 2026-11-11: Nathan's rule: the two zooms (20-70, 70-200) by day, the two primes (35 GM, 85) by night.
-- Three or four in the backpack when there's no hotel stop to swap before dark, or when a prime is
-- clearly the sharper/faster tool (dark interiors, wide-open isolation, cats, bar counters).

update koma_shots set lens = '70-200 / 20-70', look_md = $q$- One branch of blossom against the sky — 70-200 at 200, wide open, so everything behind it melts.
- Someone photographing the plums on their phone: make them the subject — 70-200.
- The festival food stalls under the trees — 20-70.
- Red and white blossom on neighbouring trees, in one frame.$q$ where id = 113;
update koma_shots set lens = '20-70', look_md = $q$- Clothes racks spilling out into a lane, one person browsing — 20-70.
- Someone sitting in a café window, shot from across the lane.
- The long footpath-park built on the old railway line beside the station, with people on it — stand at one end so the path leads in.
- Hand-painted signs and layers of stickers on the backs of shops — 70-200 for the detail.$q$ where id = 99;
update koma_shots set lens = '70-200 / 20-70', look_md = $q$- The next bridge lined up behind this one — 70-200 from the middle of a bridge pulls them together.
- Bare cherry branches over the water against the evening sky.
- Shop windows lighting up along the path at blue hour — 20-70.
- Someone crossing a bridge, shot from the next bridge along.$q$ where id = 100;
update koma_shots set lens = '20-70 / 70-200', look_md = $q$- Looking down the sunset steps onto the shopping street as the sun drops.
- Shopkeepers and street cats on the shopping street — 70-200, from a step back.
- Rows of gravestones and bare trees in Yanaka Cemetery, one person walking — 20-70.
- Wooden houses and potted plants in the side lanes.$q$ where id = 101;
update koma_shots set look_md = replace(look_md, 'sold at the shop) — 35mm', 'sold at the shop) — 20-70') where id = 116;
update koma_shots set lens = '20-70 / 70-200' where id = 112;
update koma_shots set lens = '20-70 / 70-200', look_md = $q$- Black charred-wood walls and a fabric door curtain, a cyclist passing — 20-70.
- Shadows across the lanes in low sun.
- The sea at the end of a lane — 20-70.
- Small shrines and potted plants on doorsteps — 70-200, close.$q$ where id = 105;
update koma_shots set lens = '20-70 / 85mm' where id = 119;
update koma_shots set lens = '20-70 / 85mm', look_md = $q$- A brick wall running uphill, one person in the lane — 20-70.
- Bits of porcelain set into the clay — 85mm, close.
- Blue-and-white porcelain in the shop windows on the main street.
- An old kiln chimney above the roofs.$q$ where id = 117;
update koma_shots set lens = '70-200 / 20-70', look_md = $q$- Plum blossom against the shrine's roof — 70-200 at 200, wide open.
- Steam off the griddles making umegae-mochi (grilled rice cakes with red bean) on the approach street.
- Someone crossing the arched red bridges over the pond — 20-70.
- The Starbucks on the approach street, built from a lattice of wooden sticks (by Kengo Kuma) — 20-70 at 20, looking up.$q$ where id = 109;
update koma_shots set lens = '70-200 / 20-70', look_md = $q$- People on the island bridges as silhouettes against the low sun — 70-200.
- A jogger on the loop path, following them with the camera at 1/15s so they stay sharp and the background streaks.
- The swan pedal boats and the water after sunset.$q$ where id = 108;
update koma_shots set lens = '20-70 / 70-200', look_md = $q$- Morning light through the shrine gate, one person bowing — 70-200.
- Temple walls and pine trees at Shōfuku-ji, Japan's first Zen temple — 20-70.
- The red five-storey pagoda at Tōchō-ji temple.
- Shopkeepers opening up in the Kawabata covered shopping arcade.$q$ where id = 107;
update koma_shots set lens = '20-70 / 85mm' where id = 84;

-- (applied as an UPDATE ... FROM (VALUES) on the existing rows; a DELETE needs an approval prompt)
delete from koma_carry where day_id between 130 and 144;
insert into koma_carry (day_id, lenses, body_md) values
(130, '{20-70mm,70-200mm,35mm,85mm}', $q$**Day: the zooms.** 70-200 for the plum blossom and the stacked bridges at Naka-Meguro, 20-70 for Shimokitazawa. **At the 5:45 hotel stop, swap to the primes:** 35 for Omoide Yokocho and New York Bar, 85 for faces. Keep the 70-200 too if you want the crosswalk from above with single walkers. The suitcases leave for Hakone this morning, so every lens stays in the backpack.$q$),
(131, '{20-70mm,35mm}', $q$20-70 for the farmhouses, **plus the 35**: the interiors are dark, and f/1.4 beats f/4 by three stops. Moving day, so the 85 and 70-200 ride in the backpack.$q$),
(132, '{20-70mm,70-200mm,35mm}', $q$The zooms for Owakudani, the lake gate and Fuji. **Plus the 35** for the stone road under the cedars at 3:45: dim, and no hotel stop before it. The 85 stays at the hotel.$q$),
(133, '{}', $q$No shots planned. Kawazu for the cherry blossom? The zooms: 70-200 along the riverbank, 20-70 for the rows of trees.$q$),
(134, '{20-70mm,35mm,85mm}', $q$Moving day, everything travels. 20-70 for the afternoon wander; **the primes for the canal at blue hour** (35 for the bridges, 85 for the storehouse walls). No hotel stop between them, so all three on you after check-in. The 70-200 can stay in the room.$q$),
(135, '{20-70mm,70-200mm}', $q$**The zooms, all day:** 20-70 for the lanes and the sea, 70-200 to pick the pumpkin out from the shore and for doorstep details. Back after dark for dinner only, so no primes needed.$q$),
(136, '{20-70mm,85mm,35mm}', $q$Morning canal: 20-70, **plus the 85** for the lattice walls. Moving day, everything travels. **Tonight, after the 3:00 check-in: the primes** for the food stalls (85 wide open on the cooks, 35 for the row of lights).$q$),
(137, '{20-70mm,35mm,85mm}', $q$Day trip, back at 10pm, so no swap: 20-70 for Arita, **the primes for the lanterns** (35 wide open in the crowd, 85 for faces). The 85 also does the porcelain close-ups. The 70-200 stays at the hotel; the crowds are too thick for it.$q$),
(138, '{20-70mm,70-200mm}', $q$**The zooms:** 70-200 for plum blossom against the shrine roof and the silhouettes on Ōhori's bridges at golden hour, 20-70 for the rest. Dinner after dark, no night shots, so leave the primes.$q$),
(139, '{20-70mm,70-200mm,35mm,85mm}', $q$Moving day, everything travels. Morning old town and Senkō-ji at golden hour on the zooms; **the 35** for the lanes on the way down at blue hour and the waterfront at night.$q$),
(140, '{20-70mm,85mm,35mm}', $q$Morning: 20-70, **plus the 85** for the cats (wide open, low light, they move). **Then the 70-200 and 85 go in the suitcase to Kyoto**, leaving the 20-70 + 35. Redoing Senkō-ji because Monday was flat? Keep the 70-200 out until after golden hour and hand the suitcase in tonight (the desk is open until 9).$q$),
(141, '{20-70mm,35mm}', $q$20-70 all day (the 70-200 is in the suitcase); the lantern at blue hour on the 20-70 braced on the wall. **The 35** for the lanes as it gets dark, before the bus.$q$),
(142, '{20-70mm,35mm}', $q$20-70 for the dawn ferry and Takehara, **the 35** for Osaka tonight. One-night pouch; the rest is in Kyoto.$q$),
(143, '{20-70mm,35mm,85mm}', $q$No hotel stop between Fushimi and the night, so three: 20-70 for the breweries by day, **the primes** for the canal at dusk, the sake bar counter (85 wide open) and the river at night (35). Omi-Hachiman first? Add the 70-200 for the canal.$q$),
(144, '{20-70mm,70-200mm}', $q$Sunrise on the zooms: the stones and the river wide, herons and kites long. Everything else is packed for the flight.$q$);
