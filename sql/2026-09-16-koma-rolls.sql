-- Applied live 2026-09-16. Record only.
-- A roll is one outing's worth of frames. It either hangs off a koji trip day,
-- or stands alone with its own date and coordinates — which is all the sun
-- chart needs. Balboa Park on a Sunday is as much a roll as a trip day is.

create table if not exists koma_rolls (
  id             bigint generated always as identity primary key,
  slug           text not null unique,
  title          text not null,
  subtitle       text,
  roll_date      date,
  lat            numeric,
  lng            numeric,
  location_label text,
  notes_md       text,
  sort_order     integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table koma_shots alter column trip_id drop not null;
alter table koma_shots add column if not exists roll_id bigint references koma_rolls(id) on delete cascade;

-- A frame belongs to a trip or to a standalone roll, never both and never neither.
alter table koma_shots drop constraint if exists koma_shots_one_parent;
alter table koma_shots add constraint koma_shots_one_parent
  check ((trip_id is not null) <> (roll_id is not null));

create index if not exists koma_shots_roll_idx on koma_shots (roll_id, sort_order);

alter table koma_rolls enable row level security;
drop policy if exists koma_public_read_rolls on koma_rolls;
create policy koma_public_read_rolls on koma_rolls for select to public using (true);

drop trigger if exists koma_rolls_touch_trg on koma_rolls;
create trigger koma_rolls_touch_trg before update on koma_rolls
  for each row execute function koma_shots_touch();

-- Seeded: nyc-oct-2026 (6 frames), balboa-park (5), cuyamaca-dawn (4).
