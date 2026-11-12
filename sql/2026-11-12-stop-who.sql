-- One trip, two people (review E). A stop can belong to one traveller; a part
-- with "who" in koji_trips.parts shows only shared stops and that person's.
alter table koji_stops add column if not exists who text;
