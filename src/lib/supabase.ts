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
  /** Names that can vote on dinners. No logins: a phone picks one once. */
  voters?:      string[];
  /** Per-voter weight where it isn't 1, e.g. { Mom: 1.5 }. */
  vote_weights?: Record<string, number>;
  /** Dinners one person decides alone, by stop id, e.g. { "480": "Mom" }. */
  dinner_choosers?: Record<string, string>;
  /** Shareable slices of the trip; /trips/<slug>/<key> shows only those dates. */
  parts?: TripPart[];
}

export interface TripPart {
  /** URL segment, e.g. "family-week". Never "dinners" (that route exists). */
  key:       string;
  /** What the owner sheet calls it, e.g. "Family week". */
  label:     string;
  /** First and last day shown, YYYY-MM-DD, both inclusive. */
  from:      string;
  to:        string;
  /** Replaces the trip subtitle in the part view, e.g. "with Dez". */
  subtitle?: string;
  /** Whose part this is ("Dez"): stops marked for someone else are left out. */
  who?: string;
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
  /** One emoji on the day pill, for the days that matter. */
  icon?:          string | null;
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
  /** "3½ h · 2 changes", shown on a travel stop's pill. */
  duration_label?: string | null;
  /** When a journey arrives, as the ticket shows it: "4:30pm JST · Fri", "12:45pm PT".
   *  A zone after the time marks a trip that crosses zones. */
  arrive_label?: string | null;
  /** Plane Lab aircraft id ("787-10") on a Flight stop: shows a See the plane link. */
  aircraft?:   string | null;
  /** On an optional stop: how long it takes or where it fits. */
  fit_label?:  string | null;
  /** An optional stop moved into the plan from the "if there's time" list. */
  added?:      boolean;
  /** Dinner choices. A stop with options renders the vote cards. */
  options?:    DinnerOption[];
  /** Trip alerts (lib/tripAlerts): the lock-screen body, minutes of lead, or off. */
  alert_md?: string | null;
  alert_lead?: number | null;
  alert_off?: boolean | null;
  /** On a trip that splits: whose stop this is ("Dez", "Nathan"). Null = everyone. */
  who?: string | null;
}

// ── STAYS ───────────────────────────────────────────────────────────────────
// One row per place you sleep. Drives the stays strip in the hero, the town
// colour under each day pill, and the chapter heading before each town's first
// day. A stay covers the nights check_in .. check_in + nights - 1.
export type StayColor = 'blue' | 'green' | 'violet' | 'rose' | 'teal' | 'red' | 'amber' | 'olive';
export const STAY_COLORS: StayColor[] = ['blue', 'green', 'violet', 'rose', 'teal', 'red', 'amber', 'olive'];

export interface Stay {
  id:          number;
  trip_id:     number;
  place:       string;
  local_name:  string | null;
  check_in:    string;
  nights:      number;
  color:       StayColor;
  hotel:       string | null;
  hotel_query: string | null;
  booked:      boolean;
  desk_hours:  string | null;
  /** For the driver card (review C): the name and address as a taxi reads them. */
  hotel_ja?:   string | null;
  address_ja?: string | null;
  address_en?: string | null;
  phone?:      string | null;
  intro_md:    string | null;
  photo_url:   string | null;
  sort_order:  number;
}

// ── DINNER VOTES ────────────────────────────────────────────────────────────
// Options hang off a dinner stop. `source` keeps the family's picks ahead of
// Claude's suggestions; `status` is set by hand (SQL or chat), never from the
// public page: 'booked' closes the vote, 'held' marks a placeholder.
export interface DinnerOption {
  id:            number;
  stop_id:       number;
  sort_order:    number;
  name:          string;
  maps_query:    string;
  price:         string | null;
  kind:          string | null;
  draw:          string | null;
  order_md:      string | null;
  booking_url:   string | null;
  phone:         string | null;
  note:          string | null;
  walk_in:       boolean;
  source:        'family' | 'claude';
  status:        'option' | 'held' | 'booked';
  booked_detail: string | null;
  why_md:        string | null;
  food_md:       string | null;
  getting_there: string | null;
  menu_url:      string | null;
}

export interface DinnerVote {
  stop_id:   number;
  option_id: number;
  voter:     string;
  round:     number;
}

// ── VERDICTS ────────────────────────────────────────────────────────────────
// Nathan's private "was it worth it" call on a place. Never read with the anon
// client: the table has RLS on and no policies, and every access goes through
// /api/verdicts. See sql/2026-11-08-koji-verdicts.sql.

export type VerdictValue = 'back' | 'once' | 'skip';
export type VerdictSource = 'stop' | 'app' | 'share' | 'photo';

export interface Verdict {
  id:         number;
  client_key: string;
  trip_id:    number;
  day_id:     number | null;
  stop_id:    number | null;
  title:      string;
  maps_url:   string | null;
  source_url: string | null;
  verdict:    VerdictValue | null;
  note:       string | null;
  source:     VerdictSource;
  visited_on: string | null;
  created_at: string;
  updated_at: string;
}

/** The Google Maps search link every place in the kura apps uses. */
export function mapsSearchUrl(...parts: (string | null | undefined)[]): string {
  const q = parts.filter(Boolean).join(' ').trim().split(/\s+/).map(encodeURIComponent).join('+');
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

// ── KOMA ────────────────────────────────────────────────────────────────────
// The shooting plan. Hidden rather than locked: the mode is reached by a
// long-press on the aperture mark in the header, the same call daizu makes for
// /barista. Reads are public so it works without being logged in and survives
// in the service-worker cache offline.

export type ShotType =
  | 'compression' | 'detail' | 'rhythm' | 'moment'
  | 'macro' | 'wildlife' | 'night' | 'portrait';

/** A fixed set (DB check constraint since 2026-11-11). Times are never stored:
 *  lib/shotLight.ts works the window out from the sun for the place and date. */
export type ShotLight = 'golden' | 'blue' | 'morning' | 'midday' | 'afternoon' | 'night' | 'any';
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
  /** One of the trip's big shots: shown in the owner's itinerary on its stop
   *  (stop_id), or by its time when it has no stop. */
  in_itinerary: boolean;
  at_time:     string | null;
  position_md: string | null;
  tech_md:     string | null;
  notes_md:    string | null;
  ref_url:     string | null;
  /** Attribution for ref_url — required by the CC licences these come under. */
  ref_credit:  string | null;
  /** Hand-written Google Maps link. A fallback only: it names a venue, and
   *  several frames share one. Prefer lat/lng, which name the standing point. */
  scout_url:   string | null;
  /** Composition diagram spec, drawn by KomaSketch when there is no photo. */
  sketch:      string | null;
  /** The standing point — not the venue. Null unless derived from a real
   *  location; a guessed coordinate sends you to the wrong corner with
   *  confidence. Set together or not at all (checked in the database). */
  lat:         number | null;
  lng:         number | null;
  /** Direction of view, degrees from true north. Null unless derived from
   *  real coordinates — a guessed bearing prints a confident wrong sentence. */
  bearing:     number | null;
  /** Street View coverage at lat/lng, checked by hand. null = never checked,
   *  false = checked and absent. The deep link does not fail closed: with no
   *  coverage Google snaps to the nearest user photosphere, so the button has
   *  to be gated on a real check rather than on having a coordinate. */
  pano_ok:     boolean | null;
  /** The exact panorama that check confirmed. Pinning it means the link opens
   *  what was verified, not whatever Maps picks as nearest on the day. */
  pano_id:     string | null;
  priority:    ShotPriority;
  status:      ShotStatus;
  status_note: string | null;
  sort_order:  number;
  /** 'spot' is a place to stand. 'area' is a neighbourhood to wander with the
   *  camera out: lat/lng is its middle, radius_m its reach, look_md a few
   *  things to look for, and bearing stays null. */
  kind:        'spot' | 'area';
  radius_m:    number | null;
  look_md:     string | null;
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
  const admin = supabaseAdmin();
  const [rollsRes, tripsRes, shotsRes, daysRes] = await Promise.all([
    admin.from('koma_rolls').select('*').order('sort_order'),
    supabase.from('koji_trips').select('id, slug, title, subtitle, location, date_start, date_end')
      .eq('published', true),
    admin.from('koma_shots').select('roll_id, trip_id, status'),
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
  const admin = supabaseAdmin();
  const { data: roll, error } = await admin
    .from('koma_rolls')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  if (!roll) return null;

  const { data: shots } = await admin
    .from('koma_shots')
    .select('*')
    .eq('roll_id', roll.id)
    .order('sort_order');

  const { data: carry } = await admin
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

/**
 * A trip's shots and carry lists. Server only, and only ever behind the
 * koji_admin cookie (GET /api/koma/shots): since 2026-11-11 the koma tables
 * have no public read policy and nothing koma rides in the trip page, so a
 * shared link, a part link or the anon key shows none of it. See CLAUDE.md.
 */
export async function getKomaForTrip(tripId: number): Promise<{ shots: Shot[]; carry: Carry[] }> {
  const admin = supabaseAdmin();
  const { data: days } = await admin.from('koji_days').select('id').eq('trip_id', tripId);
  const dayIds = (days ?? []).map((d: { id: number }) => d.id);
  const [shotsRes, carryRes] = await Promise.all([
    admin.from('koma_shots').select('*').eq('trip_id', tripId).order('sort_order'),
    dayIds.length
      ? admin.from('koma_carry').select('*').in('day_id', dayIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (shotsRes.error) throw shotsRes.error;
  return { shots: (shotsRes.data as Shot[]) ?? [], carry: (carryRes.data as Carry[]) ?? [] };
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

/** One trip's stays, for the home page's next-trip card. Empty on any error. */
export async function getStays(tripId: number): Promise<Stay[]> {
  const { data } = await supabase
    .from('koji_stays')
    .select('*')
    .eq('trip_id', tripId)
    .order('check_in')
    .order('sort_order');
  return (data as Stay[]) ?? [];
}

export async function getTripBySlug(slug: string): Promise<{
  trip: Trip;
  logistics: Logistics[];
  days: Day[];
  stays: Stay[];
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

  // koma's shots and carry lists are NOT loaded here: this payload is the
  // public, prerendered page that shared and part links get. The owner's phone
  // fetches them from /api/koma/shots instead (lib/komaData.ts).

  // Dinner options ride along with their stops: public read, prerendered, so
  // the cards work offline. Votes are fetched live instead.
  const stopIds = (days ?? []).flatMap((d: { stops?: { id: number }[] }) => (d.stops ?? []).map(st => st.id));
  const { data: options } = stopIds.length
    ? await supabase.from('koji_dinner_options').select('*').in('stop_id', stopIds).order('sort_order')
    : { data: [] };
  const byStop = new Map<number, DinnerOption[]>();
  for (const o of (options as DinnerOption[]) ?? []) {
    const list = byStop.get(o.stop_id) ?? [];
    list.push(o);
    byStop.set(o.stop_id, list);
  }
  for (const d of (days ?? []) as Day[]) {
    for (const st of d.stops ?? []) {
      const opts = byStop.get(st.id);
      if (opts) st.options = opts;
    }
  }

  // A missing table or a blip here should cost the strip, not the page.
  const { data: stays } = await supabase
    .from('koji_stays')
    .select('*')
    .eq('trip_id', trip.id)
    .order('check_in')
    .order('sort_order');

  return {
    trip,
    logistics: logistics ?? [],
    days: (days as Day[]) ?? [],
    stays: (stays as Stay[]) ?? [],
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

/** Every published trip's parts, for prerendering /trips/<slug>/<part>. */
export async function getTripPartParams(): Promise<{ slug: string; part: string }[]> {
  try {
    const { data } = await supabase.from('koji_trips').select('slug, parts').eq('published', true);
    return (data ?? []).flatMap((t: { slug: string; parts: TripPart[] | null }) =>
      (t.parts ?? []).map(p => ({ slug: t.slug, part: p.key })));
  } catch {
    return [];
  }
}


// ── REFERENCE NOTES ─────────────────────────────────────────────────────────
// Frames answer "what is the picture"; notes answer "how does this behave".
// They belong to no trip and no roll on purpose — a shutter speed for a moving
// subject is the same in Balboa Park and in Bourton-on-the-Water, and pinning
// it to an outing would mean writing it out again for the next one.

export interface Note {
  id:         number;
  slug:       string;
  title:      string;
  subtitle:   string | null;
  /** The kerb layer: settings, pivots, tables. Every number lives here. */
  field_md:   string | null;
  /** The reading layer: the arguments. Shown only in read mode. */
  body_md:    string;
  sort_order: number;
  /** Position in the plane read, which is a course and not a lookup, so it
   *  differs from sort_order. Null omits the note from the continuous read. */
  read_order: number | null;
}

/** Published notes in shelf order. Swallows errors so the page degrades to
 *  empty rather than 500ing in the field, where it is least recoverable. */
export async function getNotes(): Promise<Note[]> {
  const { data, error } = await supabaseAdmin()
    .from('koma_notes')
    .select('id, slug, title, subtitle, field_md, body_md, sort_order, read_order')
    .eq('published', true)
    .order('sort_order');
  if (error) return [];
  return (data as Note[]) ?? [];
}
