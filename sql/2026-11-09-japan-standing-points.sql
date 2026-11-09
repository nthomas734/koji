-- Japan 2027: standing points checked against OpenStreetMap (2026-11-09).
-- The first coordinates were rounded guesses: the Onomichi pins sat 280–660 m
-- east of their spots, and "Onomichi from across the water" was on the wrong
-- side of the channel. Each new point is an OSM node, way vertex or centroid;
-- the source ids are in the comments. Bearings only where both ends are real.
DO $koji$
DECLARE t bigint := (SELECT id FROM koji_trips WHERE slug = 'japan-2027');
BEGIN
  UPDATE koma_shots SET lat = 34.40634, lng = 133.19927 WHERE trip_id = t AND title = 'Waterfront at night';              -- footway way 307664399
  UPDATE koma_shots SET lat = 34.40952, lng = 133.19999 WHERE trip_id = t AND title = 'Stairways to the water';           -- steps ways 123167321/403817508
  UPDATE koma_shots SET lat = 34.41060, lng = 133.20014 WHERE trip_id = t AND title = 'Cat Alley';                        -- 猫の細道 way 599997417
  UPDATE koma_shots SET lat = 34.41078, lng = 133.19731 WHERE trip_id = t AND title = 'The channel from Senkō-ji';        -- observatory deck way 1415849729
  UPDATE koma_shots SET lat = 34.41012, lng = 133.19898 WHERE trip_id = t AND title = 'Temple lanes at dusk';             -- steps way 123167321, below Senkō-ji
  UPDATE koma_shots SET lat = 34.38312, lng = 133.38352 WHERE trip_id = t AND title = 'Islands through the Taichōrō window'; -- 対潮楼 way 723378513
  UPDATE koma_shots SET lat = 34.38273, lng = 133.38101 WHERE trip_id = t AND title = 'Harbor steps and back lanes';      -- coastline way 131161777
  UPDATE koma_shots SET lat = 34.38248, lng = 133.38214, bearing = 268
    WHERE trip_id = t AND title = 'Lantern at blue hour';                                                                 -- 常夜灯 node 4570272540, 125 m W
  UPDATE koma_shots SET lat = 34.40245, lng = 133.19648, bearing = 13,
    position_md = 'Take the Fukumoto ferry from Tsuchidō Pier to Okajima Pier on Mukaishima (5 minutes), and shoot north across the water at the hillside town and Senkō-ji, which sits almost straight ahead. The morning sun comes from the east and lights the hillside from the side.'
    WHERE trip_id = t AND title = 'Onomichi from across the water';                                                       -- 小歌島桟橋 node 8255559990; Senkō-ji 903 m NNE
  UPDATE koma_shots SET lat = 34.34659, lng = 132.91056 WHERE trip_id = t AND title = 'Merchant street';                  -- 本町通り way 35193690
  UPDATE koma_shots SET lat = 34.34652, lng = 132.91145 WHERE trip_id = t AND title = 'Tile roofs from Fumeikaku';        -- 普明閣 way 1340315990
  UPDATE koma_shots SET lat = 34.98937, lng = 135.76721, bearing = 2,
    position_md = 'From the north sidewalk of the Shichijō bridge, mid-span, looking up the river. Quieter than Gojō, which carries the main road.'
    WHERE trip_id = t AND title = 'Kamo River at night';                                                                  -- 七条大橋 way 361226623
  UPDATE koma_shots SET lat = 35.13983, lng = 136.09060 WHERE trip_id = t AND title = 'Canal from the bridges';           -- 白雲橋 way 120574059
  UPDATE koma_shots SET lat = 35.13859, lng = 136.08886 WHERE trip_id = t AND title = 'White storehouse walls';           -- 新町通り way 120576994
  UPDATE koma_shots SET lat = 34.92865, lng = 135.76131,
    position_md = 'The canal path behind the Gekkeikan buildings (the Ujigawa-haryū canal): wooden walls, willows and lamps coming on.'
    WHERE trip_id = t AND title = 'Brewery canal at dusk';                                                                -- footway 587793010
  UPDATE koma_shots SET lat = 34.93253, lng = 135.76053 WHERE trip_id = t AND title = 'Sake bar';                         -- 伏見酒蔵小路 node 8263153617
  UPDATE koma_shots SET lat = 35.02944, lng = 135.77146 WHERE trip_id = t AND title = 'Turtle stones at sunrise';         -- stepping stones way 297202403
  UPDATE koma_shots SET lat = 35.03028, lng = 135.76910 WHERE trip_id = t AND title = 'Demachi arcade waking up';         -- 出町桝形商店街 way 151694612
END
$koji$;
