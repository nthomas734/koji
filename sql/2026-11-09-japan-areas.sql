-- Japan 2027: areas instead of a hardened shot list (2026-11-09).
-- Nathan travels for fun and photographs along the way, so most ideas
-- are now neighbourhoods to wander with a few things to look for.
-- Exact spots stay only where the spot is the photo.
-- Coordinates are area middles from OpenStreetMap (see the koma-areas commit).
-- Backup of koma_shots before this: koma_shots_backup_20261109.
do $koji$
declare trip bigint := (select id from koji_trips where slug = 'japan-2027');
begin
  if not exists (select 1 from koma_shots where trip_id=trip and title='Nishi-Shinjuku after dark') then
    insert into koma_shots (trip_id, day_id, kind, title, subtitle, lens, light, at_time, priority, position_md, look_md, lat, lng, radius_m, sort_order) values (trip, 129, 'area', 'Nishi-Shinjuku after dark', 'Smoke, neon and crowds a few minutes from the hotel. Easy to dip into any night.', '35mm / 85mm', 'night', '20:00', 'want', 'Start at the west exit and wander the alleys north toward the tracks. Two of these come from your own Google Maps pins.', '- Omoide Yokocho from the end of the alley, lanterns stacking toward you — 35mm, wait for a cook in the smoke.
- The crowd on the white lines from above — your pin: the elevator across the street from the JR station, 85mm.
- One still person in a moving crowd under the station lights — about 1/8s, braced on a rail.
- Street shots under the neon on the 1-chōme blocks — your pin; 35mm stands in for the 24.', 35.692221, 139.698387, 450, 10);
  end if;
  if not exists (select 1 from koma_shots where trip_id=trip and title='Shimokitazawa') then
    insert into koma_shots (trip_id, day_id, kind, title, subtitle, lens, light, at_time, priority, position_md, look_md, lat, lng, radius_m, sort_order) values (trip, 130, 'area', 'Shimokitazawa', 'Low-rise lanes of vintage shops and coffee. More people-watching than views.', '35mm', 'afternoon', '14:00', 'maybe', 'Start at the station and drift; the lanes are small enough that you cannot get lost for long.', '- Clothes racks spilling into the lane, one person browsing — 35mm around f/2.8.
- Someone framed in a café window, from across the lane.
- The walkway park on the old railway line, with people on it — from one end, so the path leads in.
- Hand-painted signs and layers of stickers on shop backs — 85mm for the detail.', 35.661678, 139.666335, 400, 11);
  end if;
  if not exists (select 1 from koma_shots where trip_id=trip and title='Naka-Meguro canal') then
    insert into koma_shots (trip_id, day_id, kind, title, subtitle, lens, light, at_time, priority, position_md, look_md, lat, lng, radius_m, sort_order) values (trip, 130, 'area', 'Naka-Meguro canal', 'The canal without the cherry crowds: bridges, reflections and small shopfronts.', '35mm / 85mm', 'golden into blue', '16:45', 'want', 'Walk the canal path from the station in either direction; each bridge is a new view of the next.', '- The next bridge stacked behind this one — 85mm from mid-span compresses them.
- Bare cherry branches over the water against the evening sky.
- Shop windows lighting up along the path at blue hour — 35mm.
- Someone crossing a bridge, shot from the next bridge down.', 35.645085, 139.699461, 600, 12);
  end if;
  if not exists (select 1 from koma_shots where trip_id=trip and title='Yanaka') then
    insert into koma_shots (trip_id, day_id, kind, title, subtitle, lens, light, at_time, priority, position_md, look_md, lat, lng, radius_m, sort_order) values (trip, 130, 'area', 'Yanaka', 'Old Tokyo: a shopping street, a cemetery and a staircase named for the sunset.', '35mm / 85mm', 'golden', '16:00', 'want', 'Start at the Yūyake Dandan steps at the top of Yanaka Ginza and work outward.', '- Down the Yūyake Dandan steps onto Yanaka Ginza at sunset — the name means "sunset steps".
- Shopkeepers and cats on Yanaka Ginza — 85mm, from a step back.
- Rows of gravestones and bare trees in the cemetery, one walker — 35mm.
- Wooden houses and potted plants in the side lanes.', 35.726561, 139.767874, 550, 13);
  end if;
  if not exists (select 1 from koma_shots where trip_id=trip and title='Lake Ashi and Hakone Shrine') then
    insert into koma_shots (trip_id, day_id, kind, title, subtitle, lens, light, at_time, priority, position_md, look_md, lat, lng, radius_m, sort_order) values (trip, 132, 'area', 'Lake Ashi and Hakone Shrine', 'A red torii standing in the lake, a cedar avenue, and Fuji if the sky is clear.', '20-70 / 70-200', 'afternoon', '13:30', 'want', 'The boat lands at Moto-Hakone; walk the shore north to the shrine and back down the cedar avenue.', '- The torii from the boat as you come into Moto-Hakone — 70-200, shrine stacked on the hill behind.
- People waiting their turn on the torii steps, from along the shore — 70-200 picks out one pair.
- The cedar avenue with one walker for scale — 20-70, vertical.
- Fuji over the lake from the shore — clearest in the morning; take it if it shows.', 35.199793, 139.028202, 700, 14);
  end if;
  if not exists (select 1 from koma_shots where trip_id=trip and title='Old Tōkaidō and Amazake-chaya') then
    insert into koma_shots (trip_id, day_id, kind, title, subtitle, lens, light, at_time, priority, position_md, look_md, lat, lng, radius_m, sort_order) values (trip, 133, 'area', 'Old Tōkaidō and Amazake-chaya', 'A mossy stone road through cedars to a thatched tea house.', '35mm', 'any', '11:00', 'maybe', 'From the Amazake-chaya bus stop, walk a few minutes of the stone road in either direction.', '- The stone road climbing into the trees, one person on it — 35mm, step back.
- Steam and smoke at the thatched tea house.
- Wet moss and stones close up — 85mm.', 35.202237, 139.048776, 500, 15);
  end if;
  if not exists (select 1 from koma_shots where trip_id=trip and title='Kurashiki Bikan quarter') then
    insert into koma_shots (trip_id, day_id, kind, title, subtitle, lens, light, at_time, priority, position_md, look_md, lat, lng, radius_m, sort_order) values (trip, 134, 'area', 'Kurashiki Bikan quarter', 'Willows, white storehouses and a canal that is lit after dark.', '35mm / 85mm', 'golden into blue', '17:30', 'want', 'Walk the canal end to end, then the back lanes once the day-trippers leave.', '- The canal and willows from a stone bridge — 35mm, reflections at blue hour.
- Black-and-white lattice walls side-lit late in the day — 85mm for the pattern.
- A canal boat from the bridge above, the boatman in the frame.
- The back lanes after dark, lit by shop lanterns.', 34.595825, 133.771763, 350, 16);
  end if;
  if not exists (select 1 from koma_shots where trip_id=trip and title='Honmura, Naoshima') then
    insert into koma_shots (trip_id, day_id, kind, title, subtitle, lens, light, at_time, priority, position_md, look_md, lat, lng, radius_m, sort_order) values (trip, 135, 'area', 'Honmura, Naoshima', 'A fishing village of charred-cedar houses with the art houses tucked in.', '35mm', 'afternoon', '15:00', 'want', 'Leave the e-bikes by the port and walk; the lanes are a few minutes across.', '- Black cedar walls and a door curtain, one cyclist going by — 35mm.
- Shadows across the lanes in low sun.
- The sea at the end of a lane.
- Small shrines and potted plants on doorsteps — 85mm.', 34.460207, 133.99747, 350, 17);
  end if;
  if not exists (select 1 from koma_shots where trip_id=trip and title='Nakasu yatai') then
    insert into koma_shots (trip_id, day_id, kind, title, subtitle, lens, light, at_time, priority, position_md, look_md, lat, lng, radius_m, sort_order) values (trip, 136, 'area', 'Nakasu yatai', 'Food stalls glowing beside the river: the night isolation shot for the 85.', '85mm / 35mm', 'night', '19:30', 'must', 'The stalls line the river on the Nakasu side; the bridges either end give the view along them.', '- One cook in the steam under the stall light — 85mm wide open, tight.
- Faces through the stall curtain, the street dark behind.
- The row of stall lights along the river from a bridge — 35mm.
- Neon in the river from the bridge rail — rest the camera on it, about 1s.', 33.590271, 130.408448, 300, 18);
  end if;
  if not exists (select 1 from koma_shots where trip_id=trip and title='Hakata old town') then
    insert into koma_shots (trip_id, day_id, kind, title, subtitle, lens, light, at_time, priority, position_md, look_md, lat, lng, radius_m, sort_order) values (trip, 139, 'area', 'Hakata old town', 'Quiet temples and Kushida Shrine before the city wakes.', '35mm / 85mm', 'morning', '09:00', 'maybe', 'Start at Kushida Shrine and walk north through the temple blocks.', '- Morning light through the shrine gate, one visitor bowing — 85mm.
- Temple walls and pines at Shōfuku-ji — 35mm.
- The red pagoda at Tōchō-ji.
- Shopkeepers opening up in the Kawabata arcade.', 33.595103, 130.412918, 450, 19);
  end if;
  if not exists (select 1 from koma_shots where trip_id=trip and title='Ōhori Park') then
    insert into koma_shots (trip_id, day_id, kind, title, subtitle, lens, light, at_time, priority, position_md, look_md, lat, lng, radius_m, sort_order) values (trip, 138, 'area', 'Ōhori Park', 'A big pond crossed by island bridges; golden hour on the water.', '85mm / 35mm', 'golden', '16:45', 'want', 'Walk the island path across the middle of the pond, then the shore on the sun side.', '- Silhouettes on the island bridges against the low sun — 85mm.
- A jogger panned on the loop path — 1/15s, follow them.
- Swan boats and the water after sunset.', 33.586121, 130.376361, 550, 20);
  end if;
  if not exists (select 1 from koma_shots where trip_id=trip and title='Dazaifu Tenmangū') then
    insert into koma_shots (trip_id, day_id, kind, title, subtitle, lens, light, at_time, priority, position_md, look_md, lat, lng, radius_m, sort_order) values (trip, 138, 'area', 'Dazaifu Tenmangū', 'The plum shrine in plum season, with the busy approach street.', '85mm / 35mm', 'morning', '10:00', 'want', 'Walk up the approach street from the station, through the shrine and out to the plum garden behind.', '- Plum blossom against the shrine roof — 85mm wide open.
- Steam off the umegae-mochi griddles on the approach street.
- Someone crossing the arched bridges over the pond — 35mm.
- The timber lattice of the Kengo Kuma café on the approach — 35mm, looking up.', 33.520399, 130.534437, 400, 21);
  end if;
  if not exists (select 1 from koma_shots where trip_id=trip and title='Nagasaki Lantern Festival') then
    insert into koma_shots (trip_id, day_id, kind, title, subtitle, lens, light, at_time, priority, position_md, look_md, lat, lng, radius_m, sort_order) values (trip, 137, 'area', 'Nagasaki Lantern Festival', 'Thousands of lanterns over Chinatown and the river: the crowd shot of the trip.', '35mm / 85mm', 'blue', '18:30', 'must', 'Start in Chinatown, then Minato Park for the big lantern figures, then the river.', '- The lantern canopy over a moving crowd — 35mm around 1/8s; the lanterns stay sharp.
- One face lit by a big lantern figure in Minato Park — 85mm.
- Lanterns over the river from a stone bridge, reflections at blue hour.
- The parade if you catch it — 85mm, follow one dancer.', 32.742553, 129.875158, 450, 22);
  end if;
  update koma_shots set kind='area', title='Temple Walk and Cat Alley', subtitle='Stairways, temples and cats stacked up the hill above the channel.', lens='35mm / 85mm', light='morning, and blue on the way down', at_time='18:05', priority='must', position_md='The lanes run up from the station side to Senkō-ji. Go up early, or come down through them at dusk.', look_md='- Down a stairway with the channel at the end of it — morning; before 10 on the holiday.
- Cats in Cat Alley at cat height — 85mm wide open.
- Lit lanterns and the town below, walking down from Senkō-ji at dusk — 35mm, braced on a wall.
- Laundry, plants and tiled roofs stacked down the hill — 85mm.', lat=34.410725, lng=133.200566, radius_m=400, bearing=null, pano_id=null, pano_ok=null, day_id=139, updated_at=now() where id=84;
  update koma_shots set kind='area', title='Onomichi waterfront and Hondōri', subtitle='The promenade, the ferry piers and the long covered arcade.', lens='35mm', light='night', at_time='20:30', priority='maybe', position_md='The promenade runs east from the station along the water; the arcade is one block in.', look_md='- Ferry piers lit, shipyard lights across the channel — 35mm, rested on a bollard.
- A small ferry crossing with one passenger — 85mm.
- Old signs and shutters in the Hondōri arcade.
- Cyclists rolling off the ferry.', lat=34.40648, lng=133.19769, radius_m=600, bearing=null, pano_id=null, pano_ok=null, day_id=139, updated_at=now() where id=80;
  update koma_shots set kind='area', title='Tomonoura harbor', subtitle='Stone harbor steps, an old lantern and lanes of warehouses behind them.', lens='35mm / 20-70', light='golden into blue', at_time='15:30', priority='want', position_md='Work around the harbor from the lantern, then into the lanes behind.', look_md='- The stone harbor steps with the water against them — low afternoon.
- Lanes of old warehouses behind the harbor, one person walking — 35mm.
- Fishing boats in the curve of the harbor.
- Door curtains and old signs on the merchant houses.', lat=34.382436, lng=133.380783, radius_m=350, bearing=null, pano_id=null, pano_ok=null, day_id=141, updated_at=now() where id=86;
  update koma_shots set kind='area', title='Takehara merchant town', subtitle='A street of old merchant houses and a temple balcony above it.', lens='20-70', light='midday, cloud is fine', at_time='11:00', priority='want', position_md='Walk Hon-machi’s main street end to end. Leave the 70-200 packed today.', look_md='- Old merchant houses along the main street, one person for scale.
- Lattice windows and plaster up close — 20-70 at 70.
- A sake brewery front with its cedar ball.
- The steps up to Saihō-ji.', lat=34.347188, lng=132.909819, radius_m=350, bearing=null, pano_id=null, pano_ok=null, day_id=142, updated_at=now() where id=89;
  update koma_shots set kind='area', title='Hachiman-bori canal', subtitle='A stone-walled canal lined with white storehouses.', lens='35mm / 70-200', light='morning', at_time='09:30', priority='want', position_md='Walk the canal path between the bridges, then up Shinmachi-dōri.', look_md='- White storehouse walls along the canal path — side light.
- Reflections in still water, early before the boats move.
- A boat on the canal through the reeds — 70-200.
- Shinmachi-dōri’s merchant houses.', lat=35.139967, lng=136.089871, radius_m=400, bearing=null, pano_id=null, pano_ok=null, day_id=143, updated_at=now() where id=93;
  update koma_shots set kind='area', title='Fushimi sake district', subtitle='Breweries, a willow canal and sake bars to end the day.', lens='35mm / 85mm', light='golden into blue', at_time='16:30', priority='want', position_md='Start at the Gekkeikan museum and walk the canal, then up to the bars.', look_md='- Cedar balls and barrels over brewery doors — 85mm.
- Your flight on the counter in a sake bar — 85mm wide open.
- Willows and storehouse walls along the canal.
- Shopfronts along Ryōma-dōri.', lat=34.92931, lng=135.761034, radius_m=450, bearing=null, pano_id=null, pano_ok=null, day_id=143, updated_at=now() where id=95;
  update koma_shots set kind='area', title='Demachi and the Kamo delta', subtitle='Where the two rivers meet, with an old arcade waking up beside it.', lens='35mm / 70-200', light='morning', at_time='08:15', priority='want', position_md='Start at the delta for sunrise, then cross to the arcade as it opens.', look_md='- The Masugata arcade as shutters go up: bakeries, pickles, fish.
- People hopping the turtle stones.
- Herons and kites over the river — 70-200.
- The Shimogamo shrine forest path just north.', lat=35.03036, lng=135.771263, radius_m=400, bearing=null, pano_id=null, pano_ok=null, day_id=144, updated_at=now() where id=97;
  if not exists (select 1 from koma_shots where trip_id=trip and title='The torii in the lake') then
    insert into koma_shots (trip_id, day_id, kind, title, subtitle, lens, light, at_time, priority, position_md, lat, lng, bearing, sort_order) values (trip, 132, 'spot', 'The torii in the lake', 'Hakone Shrine’s red gate standing in Lake Ashi.', '20-70', 'afternoon', '13:30', 'want', 'From the lakeshore in front of Hakone Shrine’s lake torii, looking out over the water. Expect a queue on the steps; shoot from the side to keep it out.', 35.202937, 139.025702, 164, 40);
  end if;
  if not exists (select 1 from koma_shots where trip_id=trip and title='The yellow pumpkin') then
    insert into koma_shots (trip_id, day_id, kind, title, subtitle, lens, light, at_time, priority, position_md, lat, lng, bearing, sort_order) values (trip, 135, 'spot', 'The yellow pumpkin', 'Kusama’s pumpkin on the Benesse pier.', '35mm', 'afternoon', '12:00', 'maybe', 'On the shore path facing the pier. Wait for a gap in the people taking turns.', 34.446621, 133.995726, 196, 40);
  end if;
  -- folded into the Temple Walk area as look-for lines
  delete from koma_shots where id in (81, 82);
end
$koji$;
