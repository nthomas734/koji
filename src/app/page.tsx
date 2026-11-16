import Link from 'next/link';
import { getTrips, getStays } from '@/lib/supabase';
import type { Stay, Trip } from '@/lib/supabase';
import { STAY_PALETTE, heroIsLight, readableOn } from '@/lib/stayColors';
import { OpenBookingsChip } from '@/components/OpenBookingsChip';
import { KojiMark } from '@/components/KojiMark';
import { OwnerLinks } from '@/components/OwnerNav';

export const revalidate = 60;

const THEME_COLORS: Record<string, { bg: string; fg: string }> = {
  forest:   { bg: '#1C3828', fg: '#C8EBD4' },
  navy:     { bg: '#1C2A3A', fg: '#C8D8EB' },
  plum:     { bg: '#2A1C38', fg: '#DCC8EB' },
  earth:    { bg: '#3A2A1C', fg: '#EBD8C8' },
  sand:     { bg: '#3A361C', fg: '#EBEAC8' },
  ocean:    { bg: '#1C3838', fg: '#C8EBEB' },
  rust:     { bg: '#381C1C', fg: '#EBC8C8' },
  slate:    { bg: '#1C1C1C', fg: '#D8D8D8' },
  oxblood:  { bg: '#3A1A14', fg: '#F0CDC0' },
  fog:      { bg: '#2B2D2E', fg: '#D6DCDE' },
  pewter:   { bg: '#8A8278', fg: '#2A2418' },
  pacific:  { bg: '#1A3038', fg: '#BCDEE8' },
  shrine:   { bg: '#BC2C2C', fg: '#FCE1CE' },
  marigold: { bg: '#E89B2A', fg: '#4A2C03' },
  lagoon:   { bg: '#2F8A8A', fg: '#DFF4F1' },
  cobalt:   { bg: '#4A6FA5', fg: '#E8EEF8' },
  linen:    { bg: '#F5EDDC', fg: '#3A2A0A' },
  stone:    { bg: '#E8E3D8', fg: '#2A2418' },
  lacquer:  { bg: '#9E1B1B', fg: '#F2CF7E' },
};

type Theme = { bg: string; fg: string };
const themeOf = (t: Trip): Theme => THEME_COLORS[t.header_theme] ?? THEME_COLORS.forest;
const MO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function dayDiff(a: string, b: string): number {
  return Math.round((Date.parse(b + 'T00:00Z') - Date.parse(a + 'T00:00Z')) / 86400000);
}

/** "Feb 11–27, 2027", "May 24 – Jun 1, 2026" */
function range(a: string | null, b: string | null): string {
  if (!a) return '';
  const [y1, m1, d1] = a.split('-').map(Number);
  if (!b || b === a) return `${MO[m1 - 1]} ${d1}, ${y1}`;
  const [y2, m2, d2] = b.split('-').map(Number);
  if (y1 !== y2) return `${MO[m1 - 1]} ${d1}, ${y1} – ${MO[m2 - 1]} ${d2}, ${y2}`;
  return m1 === m2 ? `${MO[m1 - 1]} ${d1}–${d2}, ${y1}` : `${MO[m1 - 1]} ${d1} – ${MO[m2 - 1]} ${d2}, ${y1}`;
}

function monthYear(iso: string | null): string {
  if (!iso) return 'Planning';
  const [y, m] = iso.split('-').map(Number);
  return `${MO[m - 1]} ${y}`;
}

/**
 * Abroad = the trip's own zone is outside the US. Every published trip stores
 * `tz` (it drives the sun and the destination dress), and it is the trip's
 * destination, not the flight day out of LA, so it is the cleanest signal koji
 * already has: Japan and China read Asia/*, Rome and London Europe/*, San Diego
 * and New York America/*. Mexico City and Toronto are America/* too, so the
 * test is a list of US zones rather than a prefix. A trip with no zone is
 * still being planned and stays a tile.
 */
const US_ZONE = /^(America\/(New_York|Chicago|Denver|Phoenix|Los_Angeles|Anchorage|Juneau|Sitka|Yakutat|Nome|Metlakatla|Adak|Boise|Detroit|Menominee|Puerto_Rico|Indiana\/.+|Kentucky\/.+|North_Dakota\/.+)|Pacific\/Honolulu|US\/.+)$/;
const isAbroad = (t: Trip) => !!t.tz && !US_ZONE.test(t.tz);

/**
 * A trip, big: its dates, its towns as a two-column list in their stay
 * colours, a bar of the stays along the bottom edge, nights and stays.
 * The next trip leads ("Next trip", the full countdown, or "day N of M" while
 * on it). A later trip abroad gets the same card one step down: the dates
 * alone in the eyebrow, a smaller title, and a quiet count that turns to
 * months once the trip is more than eight weeks away, so two cards never read
 * as two "next" trips.
 */
function TripCard({ trip, stays, today, later }: { trip: Trip; stays: Stay[]; today: string; later?: boolean }) {
  const theme = themeOf(trip);
  const light = heroIsLight(theme.bg);
  const start = trip.date_start, end = trip.date_end ?? trip.date_start;
  const under = start ? dayDiff(today, start) : null;
  const onTrip = start && end && under !== null && under <= 0 && today <= end;
  const months = under !== null ? Math.round(under / 30.44) : 0;
  const count = onTrip
    ? { n: dayDiff(start!, today) + 1, l: `of ${dayDiff(start!, end!) + 1} days` }
    : under === null || under <= 0 ? null
    : later && under > 56 ? { n: months, l: months === 1 ? 'month to go' : 'months to go' }
    : { n: under, l: under === 1 ? 'day to go' : 'days to go' };
  const nights = stays.reduce((n, st) => n + st.nights, 0) || (start && end ? dayDiff(start, end) : 0);
  const when = start ? range(start, trip.date_end) : '';
  // Light variant on a dark card, ink on the light themes, as the chips chose.
  const tone = (st: Stay) => (STAY_PALETTE[st.color] ?? STAY_PALETTE.blue)[light ? 'ink' : 'light'];
  // The name, not the bar, is lifted toward white (ink on a light card) until
  // it reads on this card, capped so it keeps its segment's hue.
  const nameTone = (st: Stay) => readableOn(tone(st), theme.bg, light);
  const summary = [
    nights > 0 ? `${nights} ${nights === 1 ? 'night' : 'nights'}` : '',
    stays.length > 1 ? `${stays.length} stays` : '',
  ].filter(Boolean).join(' · ');
  const eyebrow = onTrip ? `On the road · ${when}` : later ? when || 'Planning' : `Next trip${when ? ` · ${when}` : ''}`;
  return (
    <Link href={`/trips/${trip.slug}`} className={`home-feature pressable${light ? ' light' : ''}${later ? ' later' : ''}${stays.length > 0 ? ' barred' : ''}`} style={{ background: theme.bg, color: theme.fg }}>
      <div className="e">{eyebrow}</div>
      {count && <div className="home-count"><b>{count.n}</b><span>{count.l}</span></div>}
      <h2>{trip.title}</h2>
      {trip.subtitle && <div className="s">{trip.subtitle}</div>}
      {stays.length > 0 ? (
        // Travel order, down the left column and then down the right; an odd
        // count leaves the extra stay on the left.
        <div className="home-stays" style={{ gridTemplateRows: `repeat(${Math.ceil(stays.length / 2)}, auto)` }}>
          {stays.map(st => (
            <div key={st.id}><b style={{ color: nameTone(st) }}>{st.place}</b><small>{st.nights}</small></div>
          ))}
        </div>
      ) : trip.meta ? <div className="home-meta">{trip.meta}</div> : null}
      {summary && (
        <div className="home-foot">
          <span className="q">{summary}</span>
          <OpenBookingsChip tripId={trip.id} />
        </div>
      )}
      {/* One segment per stay, as wide as its nights, flush along the bottom edge. */}
      {stays.length > 0 && (
        <div className="home-bar" aria-hidden="true">
          {stays.map(st => <span key={st.id} style={{ flexGrow: st.nights, background: tone(st) }} />)}
        </div>
      )}
    </Link>
  );
}

function TripTile({ trip, wide, prefetch }: { trip: Trip; wide?: boolean; prefetch?: boolean }) {
  const theme = themeOf(trip);
  return (
    <Link href={`/trips/${trip.slug}`} prefetch={prefetch} className={`home-tile pressable${wide ? ' wide' : ''}`} style={{ background: theme.bg, color: theme.fg }}>
      <div className="e">{monthYear(trip.date_start)}</div>
      <div className="t">{trip.title}</div>
      {trip.subtitle && <div className="s">{trip.subtitle}</div>}
    </Link>
  );
}

// Past tiles pass prefetch={false}: prefetching every past trip cost ~150 KB
// on each cold home visit for pages rarely opened. The trade is that a past
// trip isn't in the offline cache until it has been opened once (CLAUDE.md).
function TileGrid({ trips, prefetch }: { trips: Trip[]; prefetch?: boolean }) {
  return (
    <div className="home-grid">
      {trips.map((t, i) => <TripTile key={t.id} trip={t} prefetch={prefetch} wide={trips.length % 2 === 1 && i === trips.length - 1} />)}
    </div>
  );
}

// A trip is past once its last day is behind us. Undated trips are still
// being planned, so they sit with the upcoming ones. The page is ISR (60s),
// so "today" is the server's UTC date; at day granularity that is close enough.
function splitTrips(trips: Trip[]): { upcoming: Trip[]; past: Trip[] } {
  const today = new Date().toISOString().slice(0, 10);
  const upcoming: Trip[] = [];
  const past: Trip[] = [];
  for (const t of trips) {
    const last = t.date_end ?? t.date_start;
    (last && last < today ? past : upcoming).push(t);
  }
  // soonest first for what's ahead; most recent first for what's done
  upcoming.sort((a, b) => (a.date_start ?? '9999').localeCompare(b.date_start ?? '9999') || a.sort_order - b.sort_order);
  past.sort((a, b) => (b.date_start ?? '').localeCompare(a.date_start ?? '') || a.sort_order - b.sort_order);
  return { upcoming, past };
}

export default async function HomePage() {
  const trips = await getTrips();
  const { upcoming, past } = splitTrips(trips);
  const next = upcoming.find(t => t.date_start) ?? upcoming[0] ?? null;
  const later = upcoming.filter(t => t !== next);
  // Big cards: the next trip, and every later trip abroad. Their stays load
  // side by side.
  const big = [next, ...later.filter(isAbroad)].filter((t): t is Trip => !!t);
  const staysFor = new Map(big.map((t, i) => [t.id, i]));
  const stayLists = await Promise.all(big.map(t => getStays(t.id)));
  const staysOf = (t: Trip) => stayLists[staysFor.get(t.id)!] ?? [];
  // Later trips in date order: each abroad one is a card, runs of the others
  // stay a tile grid between them.
  const runs: (Trip | Trip[])[] = [];
  for (const t of later) {
    if (isAbroad(t)) runs.push(t);
    else if (Array.isArray(runs[runs.length - 1])) (runs[runs.length - 1] as Trip[]).push(t);
    else runs.push([t]);
  }
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="home-page" style={{ maxWidth: 'var(--max-w)', margin: '0 auto', padding: '0 0 60px' }}>
      <header style={{ padding: '40px var(--px) 6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <KojiMark size={32} />
          <h1 style={{ fontFamily: 'var(--font-mono)', fontWeight: 400, fontSize: 9.5, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--brass)' }}>
            koji · 行程
          </h1>
          {/* Signed in only: Bookings, Rolls, Admin, on the mark's line. */}
          <OwnerLinks />
        </div>
      </header>

      <main style={{ padding: '16px var(--px) 0' }}>
        {trips.length === 0 ? (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-4)', textAlign: 'center', padding: '40px 0', letterSpacing: '0.1em' }}>
            no trips yet
          </div>
        ) : (
          <div className="home-cols">
            <div>
              {next && <TripCard trip={next} stays={staysOf(next)} today={today} />}
              {later.length > 0 && <>
                <div className="home-lbl">Also coming up</div>
                <div className="home-later">
                  {runs.map(r => Array.isArray(r)
                    ? <TileGrid key={`g${r[0].id}`} trips={r} />
                    : <TripCard key={r.id} trip={r} stays={staysOf(r)} today={today} later />)}
                </div>
              </>}
            </div>
            {past.length > 0 && (
              <div className="home-side">
                <div className="home-lbl">Past trips · {past.length}</div>
                <TileGrid trips={past} prefetch={false} />
              </div>
            )}
          </div>
        )}
      </main>

      <footer style={{
        padding: '28px var(--px)',
        textAlign: 'center',
        fontFamily: 'var(--font-mono)',
        fontSize: 9,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color: 'var(--ink-4)',
        borderTop: '1px solid var(--border)',
        marginTop: 28,
      }}>
        <Link href="/admin" style={{ color: 'var(--ink-4)' }}>admin</Link>
      </footer>
    </div>
  );
}
