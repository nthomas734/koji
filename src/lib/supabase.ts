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
  /** Composition diagram spec, drawn by KomaSketch when there is no photo. */
  sketch:      string | null;
  priority:    ShotPriority;
  status:      ShotStatus;
  status_note: string | null;
  lat:         number | null;
  lng:         number | null;
  sort_order:  number;
}

/** Rolls that stand on their own, newest first, undated last. */
export async function getRolls(): Promise<Array<Roll & { frames: number; got: number }>> {
  const { data: rolls, error } = await supabase
    .from('koma_rolls')
    .select('*')
    .order('sort_order');
  if (error) throw error;

  const { data: shots } = await supabase
    .from('koma_shots')
    .select('roll_id, status')
    .not('roll_id', 'is', null);

  return (rolls ?? []).map(r => {
    const mine = (shots ?? []).filter((s: { roll_id: number }) => s.roll_id === r.id);
    return {
      ...r,
      frames: mine.length,
      got: mine.filter((s: { status: string }) => s.status === 'got').length,
    };
  });
}

export async function getRollBySlug(slug: string): Promise<{ roll: Roll; shots: Shot[] } | null> {
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

  return { roll: roll as Roll, shots: (shots as Shot[]) ?? [] };
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
} | null> {
  const { data: trip, error } = await supabase
    .from('koji_trips')
    .select('*')
    .eq('slug', slug)
    .eq('published', true)
    .maybeSingle();
  // A network/RLS error is not "no such trip". Throwing keeps the last good
  // ISR copy in place instead of replacing it with a 404 for the next minute.
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

  return {
    trip,
    logistics: logistics ?? [],
    days: (days as Day[]) ?? [],
    shots: (shots as Shot[]) ?? [],
  };
}
