-- "Before you go" notes, owner only (applied 2026-11-12 as migration koji_stop_prep)
create table if not exists koji_stop_prep (
  stop_id    bigint primary key references koji_stops(id) on delete cascade,
  prep_md    text not null,
  done_at    timestamptz,
  updated_at timestamptz not null default now()
);
alter table koji_stop_prep enable row level security;
-- No policies on purpose: read and written only through /api/prep (service key).
