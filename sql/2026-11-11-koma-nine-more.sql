-- 2026-11-11: nine more Japan shots along the existing route (ids 120-128), Nathan approved.
-- Coordinates from OpenStreetMap:
--   120 Shibuya: 渋谷駅西口歩道橋 (west-exit bus terminal footbridge) 35.657144,139.700964, facing 352°
--   121 Omotesando: Tod's building way 96377758 35.665925,139.710156 (Prada Aoyama node 2115451715 35.663774,139.71444)
--   122 Symphonic Sculpture way 534392177 35.242813,139.053067
--   123 Tokaido Shinkansen Fuji River bridge (ways 797675701/41752495) ~35.1365,138.616, facing 22° to Fuji
--   124 赤かぼちゃ 34.455976,133.973823 (直島銭湯 34.457986,133.975132)
--   125 九州国立博物館 / 虹のトンネル 33.520239,130.536336
--   126 天神中央公園 33.590413,130.402954, facing 340° to ACROS
--   127 法善寺 34.667849,135.502603 (戎橋 34.669067,135.501305)
--   128 河井寛次郎記念館 34.993569,135.774384
-- Full insert text as run is in the session; the rows are the record (koma_shots ids 120-128).
update koma_shots set at_time = '18:00' where id = 127;
update koma_shots set light = 'midday' where id = 120;
