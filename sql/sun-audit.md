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

## The offset bug, 2026-09-16

Worth recording, because the audit script and the app disagreed and the app was
wrong — which is the failure this doc exists to catch, seen from the other side.

`utcOffsetFor` asked Open-Meteo for the offset **on the trip's date**, passing
it as `start_date`. The forecast endpoint only serves a rolling window of about
a fortnight; on 16 September it ended 2026-10-02. Every day of the England trip
returned

```
400 {"error":true,"reason":"Parameter 'start_date' is out of allowed range
     from 2026-06-16 to 2026-10-02"}
```

fell into the longitude fallback, and came back UTC+0. The app rendered the
whole trip an hour early — Friday's sunset as 5:13pm rather than 18:13, and both
that day's frames on the wrong side of golden hour.

The tags in the database were right the whole time; only the display lied. And
it would have **fixed itself silently in early October**, as the forecast window
rolled forward past the trip — the bug had a week left to live and nobody would
have seen it go.

Open-Meteo is now asked only for the IANA zone at the coordinate, which it can
answer for any date. `zoneOffsetSec()` derives the offset for the trip's date
from that zone with `Intl`. This also handles 25 October, when BST ends — and
the last day of this trip is the 25th.

If the app and this audit ever disagree again, check the offset first.

---

# Orphan check

Run alongside the sun audit. A frame points at a stop by id, and the FK is
`on delete set null` — so if a session *deletes and recreates* a stop instead of
updating it, the frame silently loses its time and its place in the day. It
still renders, which is exactly what makes it worth checking for.

```sql
select 'orphan: lost its stop' as issue, s.id, s.title, d.label as day
from koma_shots s
left join koji_stops st on st.id = s.stop_id
join koji_days d on d.id = s.day_id
where s.trip_id is not null and s.stop_id is null
union all
select 'orphan: stop_id does not resolve', s.id, s.title, d.label
from koma_shots s
join koji_days d on d.id = s.day_id
left join koji_stops st on st.id = s.stop_id
where s.stop_id is not null and st.id is null
union all
select 'day mismatch: stop belongs to another day', s.id, s.title, d.label
from koma_shots s
join koji_stops st on st.id = s.stop_id
join koji_days d on d.id = s.day_id
where st.day_id <> s.day_id
union all
select 'no time: will not plot on the curve', s.id, s.title, coalesce(d.label, r.title)
from koma_shots s
left join koji_days d on d.id = s.day_id
left join koma_rolls r on r.id = s.roll_id
left join koji_stops st on st.id = s.stop_id
where coalesce(s.at_time, st.time_label) is null
order by 1, 2;
```

**2026-09-16:** no orphans, no day mismatches. It did catch three untimed
Cuyamaca frames, which is the same defect seen from the other side — a frame
with no time does not plot, so the chart looks half broken. Those are now timed
against that location's dawn.

# Dawn and dusk windows, for reference

Golden hour is far shorter at low latitude than it is in Britain — the sun drops
more steeply. Plan accordingly: London gives you three-quarters of an hour, San
Diego barely half.

| Place | Date | Golden | Length |
|---|---|---|---|
| London | 20 Oct | 17:10–17:57 | 47 min |
| Cotswolds | 17 Oct | 17:24–18:11 | 47 min |
| New York | 13 Oct | 17:42–18:19 | 37 min |
| Balboa Park | 19 Sep | 18:17–18:49 | 32 min |
| Cuyamaca (dawn) | 10 Oct | 06:47–07:20 | 33 min |
