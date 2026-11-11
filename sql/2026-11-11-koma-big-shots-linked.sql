-- 2026-11-11: the trip's big shots linked to their koji stops (Nathan approved).
-- Kurashiki Bikan (104) and Nishi-Shinjuku (98) stay unlinked on purpose: placed by time.
update koma_shots k set stop_id = v.stop from (values (110,626),(83,696),(88,648),(87,647),(108,706),(119,815),(94,660),(96,662),(106,622)) as v(shot,stop) where k.id=v.shot;
update koma_shots set at_time='18:00' where id=104;
-- Fukuyama platform shot moved to the return to the station for the Tomotetsu bus.
update koma_shots set at_time='10:50', notes_md='Do it on the way back to the station for the Tomotetsu bus, after the castle: buy a platform ticket (入場券, about ¥150) at the gates and go up to the shinkansen level. Around 11 the sun is to the south-southeast, behind your left shoulder, so the keep is still lit from the front.' where id=118;
update koma_shots set position_md='The lanes run behind Uchiyama’s main street, the same street as the porcelain shops; a 10 to 15 minute loop off it.' where id=117;
