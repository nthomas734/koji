-- 2026-11-15: China 2027 (china-2027). Applied live through the Supabase
-- connection and read back. Read, don't run.

-- Stop "Train to Wulong South" (day sort 130, stop sort 0): its body names
-- the train, so the label carries it. The other trains with no number
-- (Suzhou both ways, West Kowloon to Chongqing, Yangshuo to Guangzhou South,
-- Guangzhou South to West Kowloon) name none, or only an example, and stay null.
update koji_stops s set service_label = 'G2427'
from koji_days d join koji_trips t on t.id = d.trip_id
where s.day_id = d.id and t.slug = 'china-2027' and d.sort_order = 130 and s.sort_order = 0
  and s.service_label is null and s.body_md like 'G2427 at 8:08%';

-- USD beside the prices that had none, at 7.1 yuan and 7.8 HK$ to the dollar.
update koji_stops s set body_md = replace(s.body_md, 'About 10 yuan.', 'About 10 yuan (about $1.40).')
from koji_days d join koji_trips t on t.id = d.trip_id
where s.day_id = d.id and t.slug = 'china-2027' and s.title = 'Chen Clan Ancestral Hall';
update koji_stops s set body_md = replace(s.body_md, 'about 20 yuan.', 'about 20 yuan (about $3).')
from koji_days d join koji_trips t on t.id = d.trip_id
where s.day_id = d.id and t.slug = 'china-2027' and s.title = 'Foshan Ancestral Temple';
update koji_stops s set body_md = replace(s.body_md, 'HK$100-300.', 'HK$100-300 (about $13-38).')
from koji_days d join koji_trips t on t.id = d.trip_id
where s.day_id = d.id and t.slug = 'china-2027' and s.title like 'Yuet Tung China Works%';
