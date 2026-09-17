import { createClient } from '@supabase/supabase-js';

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Browser-safe client — public reads only (RLS enforced)
export const supabase = createClient(url, anon);

// Server-only client — bypasses RLS for admin writes
export function supabaseAdmin() {
  return createClient(url, process.env.SUPABASE_SERVICE_KEY!, {
    auth: { persistSession: false },
  });
}

// ── TYPES ──────────────────────────────────────────────────────────────────

export type HeaderTheme =
  | 'forest' | 'navy' | 'plum' | 'earth' | 'sand'
  | 'ocean' | 'rust' | 'slate'
  | 'oxblood' | 'fog' | 'pewter' | 'pacific'
  | 'shrine' | 'marigold' | 'lagoon' | 'cobalt'
  | 'linen' | 'stone';

export type TagColor =
  | 'green' | 'navy' | 'amber' | 'pink' | 'sky'
  | 'emerald' | 'gray' | 'brass';

// Free-form. Whatever string you put here will render as the pill label.
// Tag visual styling comes from `tag_color` (which is still a strict enum).
export type Tag = string;

export interface Trip {
  id:           number;
  slug:         string;
  title:        string;
  subtitle:     string;
  eyebrow:      string;
  meta:         string;
  header_theme: HeaderTheme;
  companion:    string | null;
  date_start:   string | null;
  date_end:     string | null;
  location:     string | null;
  /** IANA zone, stored so the sun works offline and away from the place. */
  tz:           string | null;
  lat:          number | null;
  lng:          number | null;
  published:    boolean;
  sort_order:   number;
  created_at:   string;
  updated_at:   string;
}

export interface Logistics {
  id:         number;
  trip_id:    number;
  column_key: 'logistics' | 'book';
  category:   string;
  label:      string;
  value_md:   string;
  sort_order: number;
}

export interface Day {
  id:             number;
  trip_id:        number;
  label:          string;
  sort_order:     number;
  lat:            number | null;
  lng:            number | null;
  tz:             string | null;
  location_label: string | null;
  stops?:         Stop[];
}

export interface Stop {
  id:          number;
  day_id:      number;
  time_label:  string | null;
  tag:         Tag;
  tag_color:   TagColor;
  title:       string;
  body_md:     string;
  is_optional: boolean;
  sort_order:  number;
}

// ── KOMA ────────────────────────────────────────────────────────────────────
// The shooting plan. Hidden rather than locked: the mode is reached by a
// long-press on the aperture mark in the header, the same call daizu makes for
// /barista. Reads are public so it works without being logged in and survives
// in the service-worker cache offline.

export type ShotType =
  | 'compression' | 'detail' | 'rhythm' | 'moment'
  | 'macro' | 'wildlife' | 'night' | 'portrait';

export type ShotLight = 'golden' | 'blue' | 'morning' | 'midday' | 'night' | 'any';
export type ShotPriority = 'must' | 'want' | 'maybe';
export type ShotStatus = 'planned' | 'got' | 'missed' | 'skipped';

/**
 * A roll is one outing's worth of frames. It either hangs off a koji trip day,
 * or stands alone with its own date and coordinates — which is all the sun
 * chart needs. Balboa Park on a Sunday is as much a roll as a trip day is.
 */
export interface Roll {
  id:             number;
  slug:           string;
  title:          string;
  subtitle:       string | null;
  roll_date:      string | null;
  lat:            number | null;
  lng:            number | null;
  tz:             string | null;
  location_label: string | null;
  notes_md:       string | null;
  sort_order:     number;
}

export interface Shot {
  id:          number;
  /** Exactly one of trip_id / roll_id is set — enforced by a check constraint. */
  trip_id:     number | null;
  roll_id:     number | null;
  day_id:      number | null;
  stop_id:     number | null;
  title:       string;
  subtitle:    string | null;
  shot_type:   ShotType | null;
  lens:        string | null;
  focal_hint:  string | null;
  light:       ShotLight | null;
  at_time:     string | null;
  position_md: string | null;
  tech_md:     string | null;
  notes_md:    string | null;
  ref_url:     string | null;
  /** Attribution for ref_url — required by the CC licences these come under. */
  ref_credit:  string | null;
  /** Google Maps link for the standing position — rendered as a button. */
  scout_url:   string | null;
  /** Composition diagram spec, drawn by KomaSketch when there is no photo. */
  sketch:      string | null;
  priority:    ShotPriority;
  status:      ShotStatus;
  status_note: string | null;
  lat:         number | null;
  lng:         number | null;
  sort_order:  number;
}

/**
 * What to put in the bag, written by hand rather than derived from the frames.
 * The derived list only knows what was planned, so a day with one frame on it
 * gives confident, wrong advice — and it can never know about the dinner, the
 * museum you wander into, or the five miles of walking between them.
 */
export interface Carry {
  id:      number;
  day_id:  number | null;
  roll_id: number | null;
  /** In carry order, longest first. Drives the lens icons and the total weight. */
  lenses:  string[];
  body_md: string;
}

/**
 * Everything koma can open, in one list: standalone rolls *and* the trips that
 * have frames planned against them. A trip day is a roll that happens to hang
 * off an itinerary, so /koma is the single way in to all of it.
 */
export interface KomaEntry {
  kind:      'roll' | 'trip';
  slug:      string;
  title:     string;
  subtitle:  string | null;
  location:  string | null;
  date:      string | null;
  date_end:  string | null;
  days:      number;
  frames:    number;
  got:       number;
  href:      string;
}

export async function getKomaEntries(): Promise<KomaEntry[]> {
  const [rollsRes, tripsRes, shotsRes, daysRes] = await Promise.all([
    supabase.from('koma_rolls').select('*').order('sort_order'),
    supabase.from('koji_trips').select('id, slug, title, subtitle, location, date_start, date_end')
      .eq('published', true),
    supabase.from('koma_shots').select('roll_id, trip_id, status'),
    supabase.from('koji_days').select('trip_id'),
  ]);
  if (rollsRes.error) throw rollsRes.error;

  const shots = shotsRes.data ?? [];
  const count = (pred: (s: { roll_id: number | null; trip_id: number | null }) => boolean) => {
    const mine = shots.filter(pred as never);
    return { frames: mine.length, got: mine.filter((s: { status: string }) => s.status === 'got').length };
  };

  const rolls: KomaEntry[] = (rollsRes.data ?? []).map((r: Roll) => ({
    kind: 'roll', slug: r.slug, title: r.title, subtitle: r.subtitle,
    location: r.location_label, date: r.roll_date, date_end: null, days: 1,
    ...count(s => s.roll_id === r.id),
    href: `/koma/${r.slug}`,
  }));

  const dayCounts = (daysRes.data ?? []).reduce<Record<number, number>>((acc, d: { trip_id: number }) => {
    acc[d.trip_id] = (acc[d.trip_id] ?? 0) + 1;
    return acc;
  }, {});

  const trips: KomaEntry[] = (tripsRes.data ?? [])
    .map((t: { id: number; slug: string; title: string; subtitle: string | null; location: string | null; date_start: string | null; date_end: string | null }) => ({
      kind: 'trip' as const, slug: t.slug, title: t.title, subtitle: t.subtitle,
      location: t.location, date: t.date_start, date_end: t.date_end,
      days: dayCounts[t.id] ?? 0,
      ...count(s => s.trip_id === t.id),
      href: `/trips/${t.slug}#koma`,
    }))
    .filter(e => e.frames > 0);

  // Soonest first; anything undated sits at the end, since it is a someday.
  return [...trips, ...rolls].sort((a, b) => {
    if (a.date && b.date) return a.date.localeCompare(b.date);
    if (a.date) return -1;
    if (b.date) return 1;
    return a.title.localeCompare(b.title);
  });
}

export async function getRollBySlug(slug: string): Promise<{
  roll: Roll; shots: Shot[]; carry: Carry | null;
} | null> {
  const { data: roll, error } = await supabase
    .from('koma_rolls')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  if (!roll) return null;

  const { data: shots } = await supabase
    .from('koma_shots')
    .select('*')
    .eq('roll_id', roll.id)
    .order('sort_order');

  const { data: carry } = await supabase
    .from('koma_carry')
    .select('*')
    .eq('roll_id', roll.id)
    .maybeSingle();

  return {
    roll: roll as Roll,
    shots: (shots as Shot[]) ?? [],
    carry: (carry as Carry | null) ?? null,
  };
}

/** koma is hidden behind a long-press, not access-controlled — see CLAUDE.md. */
export async function getShotsForTrip(tripId: number): Promise<Shot[]> {
  const { data, error } = await supabase
    .from('koma_shots')
    .select('*')
    .eq('trip_id', tripId)
    .order('sort_order');
  if (error) throw error;
  return (data as Shot[]) ?? [];
}

// ── DATA FETCHING ───────────────────────────────────────────────────────────

export async function getTrips(): Promise<Trip[]> {
  const { data, error } = await supabase
    .from('koji_trips')
    .select('*')
    .eq('published', true)
    .order('sort_order');
  if (error) throw error;
  return data ?? [];
}

export async function getTripBySlug(slug: string): Promise<{
  trip: Trip;
  logistics: Logistics[];
  days: Day[];
  shots: Shot[];
  carry: Carry[];
} | null> {
  const { data: trip, error } = await supabase
    .from('koji_trips')
    .select('*')
    .eq('slug', slug)
    .eq('published', true)
    .maybeSingle();
  // A network/RLS error is not "no such trip". Throwing keeps the last good
  // prerendered copy in place instead of replacing it with a 404. That was
  // wishful until `generateStaticParams` landed below — without it the route
  // had no prerendered copy to keep.
  if (error) throw error;
  if (!trip) return null;

  const { data: logistics } = await supabase
    .from('koji_logistics')
    .select('*')
    .eq('trip_id', trip.id)
    .order('column_key')
    .order('sort_order');

  const { data: days } = await supabase
    .from('koji_days')
    .select('*, stops:koji_stops(*)')
    .eq('trip_id', trip.id)
    .order('sort_order')
    .order('sort_order', { referencedTable: 'koji_stops' });

  const { data: shots } = await supabase
    .from('koma_shots')
    .select('*')
    .eq('trip_id', trip.id)
    .order('sort_order');

  const dayIds = (days ?? []).map((d: { id: number }) => d.id);
  const { data: carry } = dayIds.length
    ? await supabase.from('koma_carry').select('*').in('day_id', dayIds)
    : { data: [] };

  return {
    trip,
    logistics: logistics ?? [],
    days: (days as Day[]) ?? [],
    shots: (shots as Shot[]) ?? [],
    carry: (carry as Carry[]) ?? [],
  };
}

// ── PRERENDERING ────────────────────────────────────────────────────────────
// A dynamic segment with no `generateStaticParams` cannot be prerendered, so
// `export const revalidate` had nothing to attach to and every trip page ran
// five sequential queries at request time with no cached fallback. These give
// Next the slugs to build.
//
// Both swallow errors: a Supabase blip during a build should degrade to
// on-demand rendering, which is what we had before, not fail the deploy.
// `dynamicParams` stays at its default, so a slug added after the build still
// renders on request.

export async function getTripSlugs(): Promise<string[]> {
  try {
    const { data } = await supabase.from('koji_trips').select('slug').eq('published', true);
    return (data ?? []).map((t: { slug: string }) => t.slug);
  } catch {
    return [];
  }
}

export async function getRollSlugs(): Promise<string[]> {
  try {
    const { data } = await supabase.from('koma_rolls').select('slug');
    return (data ?? []).map((r: { slug: string }) => r.slug);
  } catch {
    return [];
  }
}
