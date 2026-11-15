-- koji: station names in Latin letters for the journey ticket. A record:
-- already applied to the live database, with all 20 tickets that carry
-- from_local / to_local filled in (and stop 922's from_name, which has no
-- from_local). Additive, nullable and safe to re-run.
--
-- The readable name leads above each time ("Gora", "Kurashiki"); the local
-- name (強羅, 倉敷) sits beside it, smaller. Names show on any trip; local
-- names still need a Japan or China trip.
alter table koji_stops add column if not exists from_name text;
alter table koji_stops add column if not exists to_name   text;

comment on column koji_stops.from_name is 'Departure station or port in Latin letters ("Gora", "Shanghai Hongqiao"). Leads above the departure time on the ticket.';
comment on column koji_stops.to_name   is 'Arrival station or port in Latin letters ("Kurashiki", "West Kowloon"). Leads above the arrival time on the ticket.';
