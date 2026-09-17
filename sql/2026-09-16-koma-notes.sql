-- koma_notes — the reference shelf (/koma/notes).
--
-- Frames answer "what is the picture". Notes answer "how does this behave".
-- They belong to no trip and no roll on purpose: the shutter speed for a
-- moving subject is the same in Balboa Park and in Bourton-on-the-Water, and
-- hanging it off an outing would mean writing it out again for the next one.
--
-- Public read, like the rest of koma — hidden, not locked. See CLAUDE.md.

create table if not exists koma_notes (
  id          bigint generated always as identity primary key,
  slug        text not null unique,
  title       text not null,
  subtitle    text,
  body_md     text not null,
  sort_order  integer not null default 0,
  published   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table koma_notes enable row level security;

drop policy if exists "koma_notes public read" on koma_notes;
create policy "koma_notes public read" on koma_notes for select using (true);

create index if not exists koma_notes_sort_idx on koma_notes (sort_order);

-- Seeded 2026-09-16 with five: street, food, close-focus, movement, light.
-- body_md is block markdown (renderBlockMd), so headings, lists and GFM tables
-- all work — unlike koma_shots and koma_rolls, which are parseInline and need
-- <br><br> for a paragraph break.
