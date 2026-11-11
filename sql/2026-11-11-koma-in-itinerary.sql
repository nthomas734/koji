-- 2026-11-11: the big shots go into the koji itinerary (owner only), and koma's
-- light column becomes a fixed set. Times are worked out from the sun in code
-- (lib/shotLight.ts), never stored.
alter table koma_shots add column if not exists in_itinerary boolean not null default false;
update koma_shots set in_itinerary = true where id in (110,83,88,87,108,119,104,94,96,106,98);

-- Free-text light values written before the list was fixed.
update koma_shots set light = 'golden' where light in ('golden into blue','golden 5:23-5:57','golden till 5:50, blue till 6:15','blue 6:18, sunrise 6:44, golden till 7:18','sunrise 6:30, golden till 7:04') and id <> 104;
update koma_shots set light = 'blue'    where id in (104, 87);  -- Kurashiki at 6pm (sunset 5:48); Tomonoura lantern
update koma_shots set light = 'morning' where light in ('morning, and blue on the way down','morning, still water','early morning');
update koma_shots set light = 'midday'  where light = 'midday, cloud is fine';

alter table koma_shots drop constraint if exists koma_shots_light_check;
alter table koma_shots add constraint koma_shots_light_check
  check (light is null or light in ('golden','blue','morning','midday','afternoon','night','any'));

-- With light fixed, koma's light check runs again and flagged shot times that
-- sat just outside their window. Moved inside it.
update koma_shots k set at_time = v.t from (values (83,'17:25'),(94,'17:20'),(108,'17:40'),(87,'18:05'),(88,'06:45'),(96,'06:35'),(101,'16:50')) as v(id,t) where k.id=v.id;
