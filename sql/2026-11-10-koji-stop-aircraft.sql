-- koji: a Plane Lab aircraft on a Flight stop. Safe to re-run.
-- A Flight stop with an aircraft gets a "See the plane" link to
-- https://san-plane-lab.vercel.app/#<aircraft>, which opens that model.
alter table koji_stops add column if not exists aircraft text;
comment on column koji_stops.aircraft is 'Plane Lab aircraft id (e.g. 787-10) on a Flight stop; shows a See the plane link.';

-- Japan 2027: UA 39 and UA 38 are scheduled on the 787-10. Recheck near February.
update koji_stops set aircraft = '787-10' where id in (587, 665);
