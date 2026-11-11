-- 2026-11-11: Nathan reworked the Japan itinerary. Realign koma shots whose day or time
-- no longer matched the stop they belong to. Old values are in koji_history / koma backup.
update koma_shots set day_id=130, at_time='21:00' where id=98;  -- Nishi-Shinjuku: after the birthday dinner (Feb 12 dinner is in Nishi-Azabu)
update koma_shots set day_id=143, at_time='22:00' where id=91;  -- Kamo at Shichijo: Feb 25 is Osaka until 10:30pm; back from Fushimi on the 26th
update koma_shots set day_id=132, at_time='15:45' where id=103; -- Old Tokaido walk moved to Mon Feb 15, 3:45pm
update koma_shots set at_time='14:45' where id=102;             -- Lake Ashi: boat lands ~1:40, lunch at 2, shrine at 3
update koma_shots set at_time='15:00' where id=111;             -- lake torii with the shrine stop
update koma_shots set at_time='11:00' where id=99;              -- Shimokitazawa is the 11am stop
update koma_shots set at_time='14:00', light='afternoon' where id=100; -- Naka-Meguro is now 2pm, not golden hour
update koma_shots set day_id=140, at_time='08:30' where id=84;  -- Temple Walk / Cat Alley is the Tue Feb 23 morning
