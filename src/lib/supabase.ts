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

export type HeaderTheme = 'forest' | 'navy' | 'plum' | 'earth' | 'sand' | 'ocean' | 'rust' | 'slate';

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
  published:    boolean;
  sort_order:   number;
  created_at:   string;
  updated_at:   string;
}

export interface Logistics {
  id:         number;
  trip_id:    number;
  column_key: 'logistics' | 'book';
  label:      string;
  value_md:   string;
  sort_order: number;
}

export interface Day {
  id:         number;
  trip_id:    number;
  label:      string;
  sort_order: number;
  stops?:     Stop[];
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
} | null> {
  const { data: trip, error } = await supabase
    .from('koji_trips')
    .select('*')
    .eq('slug', slug)
    .eq('published', true)
    .single();
  if (error || !trip) return null;

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

  return {
    trip,
    logistics: logistics ?? [],
    days: (days as Day[]) ?? [],
  };
}
