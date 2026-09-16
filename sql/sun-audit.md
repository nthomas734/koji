# Sun audit

Every koma frame carries a scheduled time; this checks each one against the
sun's real altitude at that place and date, and flags any tagged `golden` or
`blue` that is not.

Run it again whenever the itinerary moves — stop times drift, and a shot tagged
for golden hour at 4:30pm is worth nothing if golden hour is 17:24. It has
already caught the same mistake four times.

## How

Pull the frames with their resolved times and coordinates:

```sql
select s.id, s.title, s.light, s.priority, s.sort_order,
       coalesce(s.at_time, st.time_label) as when_label,
       d.sort_order as dord, d.label as day_label,
       coalesce(d.lat, t.lat)::text as lat, coalesce(d.lng, t.lng)::text as lng
from koma_shots s
join koji_days d on d.id = s.day_id
join koji_trips t on t.id = s.trip_id
left join koji_stops st on st.id = s.stop_id
where s.trip_id = :trip
order by d.sort_order, s.sort_order;
```

Then compute solar altitude per frame (same NOAA algorithm as `src/lib/sun.ts`)
and compare the band — `golden` is 0–6°, `blue` is −6–0° — against the tag.

## What it found, 2026-09-16, Mom's 70th

1 of 28 frames was in the light it had been tagged for.

| Frame | Scheduled | Altitude | Verdict |
|---|---|---|---|
| Cotswolds tree | 16:00 | 17.4° | moved to 17:30; golden is 17:27 |
| Horse Guards | 16:20 | 13.0° | untagged |
| Churchill Arms | 18:30 | −6.1° | moved to 18:10; one minute past blue |
| St Paul's off the water | 17:00 | 7.4° | ten minutes short of golden — noted, not moved |
| Portobello | 17:10 | 5.7° | correct |

The finding worth keeping: **Monday's golden hour (17:12–17:59) is Westminster
Evensong.** You cannot have both, so the park takes flat afternoon light.

Golden-hour windows that week, for reference:

| Date | Place | Golden | Sunset | Blue ends |
|---|---|---|---|---|
| Oct 16 | Cotswolds | 17:27 | 18:13 | 18:47 |
| Oct 17 | Cirencester | 17:24 | 18:11 | 18:45 |
| Oct 19 | London | 17:12 | 17:59 | 18:33 |
| Oct 20 | Greenwich | 17:10 | 17:57 | 18:31 |
| Oct 21 | Notting Hill | 17:08 | 17:55 | 18:30 |
| Oct 22 | Bloomsbury | 17:05 | 17:53 | 18:27 |
| Oct 23 | East End | 17:03 | 17:50 | 18:25 |
| Oct 24 | Soho | 17:01 | 17:49 | 18:23 |

The window is about 47 minutes and drifts ~3 minutes earlier per day. The
Cotswolds run ~15 minutes later than London, being further west.
