import Link from 'next/link';
import { getTrips, getStays } from '@/lib/supabase';
import type { Stay, Trip } from '@/lib/supabase';
import { STAY_PALETTE, heroIsLight } from '@/lib/stayColors';
import { OpenBookingsChip } from '@/components/OpenBookingsChip';
import { KojiMark } from '@/components/KojiMark';
import { OwnerNav } from '@/components/OwnerNav';

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

/** The next trip, big: countdown, its towns in their stay colours, chips. */
function NextTrip({ trip, stays, today }: { trip: Trip; stays: Stay[]; today: string }) {
  const theme = themeOf(trip);
  const light = heroIsLight(theme.bg);
  const start = trip.date_start, end = trip.date_end ?? trip.date_start;
  const under = start ? dayDiff(today, start) : null;
  const onTrip = start && end && under !== null && under <= 0 && today <= end;
  const count = onTrip
    ? { n: dayDiff(start!, today) + 1, l: `of ${dayDiff(start!, end!) + 1} days` }
    : under !== null && under > 0 ? { n: under, l: under === 1 ? 'day to go' : 'days to go' } : null;
  const nights = stays.reduce((n, st) => n + st.nights, 0) || (start && end ? dayDiff(start, end) : 0);
  return (
    <Link href={`/trips/${trip.slug}`} className={`home-feature pressable${light ? ' light' : ''}`} style={{ background: theme.bg, color: theme.fg }}>
      <div className="e">{onTrip ? 'On the road' : 'Next trip'}{start ? ` · ${range(start, trip.date_end)}` : ''}</div>
      {count && <div className="home-count"><b>{count.n}</b><span>{count.l}</span></div>}
      <h2>{trip.title}</h2>
      {trip.subtitle && <div className="s">{trip.subtitle}</div>}
      {stays.length > 0 ? (
        <div className="home-route">
          {stays.map((st, i) => (
            <span key={st.id} style={{ borderColor: (STAY_PALETTE[st.color] ?? STAY_PALETTE.blue)[light ? 'ink' : 'light'] }}>
              {st.place}<small>{st.nights}{i === 0 ? (st.nights === 1 ? ' night' : ' nights') : ''}</small>
            </span>
          ))}
        </div>
      ) : trip.meta ? <div className="home-meta">{trip.meta}</div> : null}
      <div className="home-foot">
        <OpenBookingsChip />
        {nights > 0 && <span className="home-chip">{nights} nights</span>}
        {stays.length > 1 && <span className="home-chip">{stays.length} stays</span>}
      </div>
    </Link>
  );
}

function TripTile({ trip, wide }: { trip: Trip; wide?: boolean }) {
  const theme = themeOf(trip);
  return (
    <Link href={`/trips/${trip.slug}`} className={`home-tile pressable${wide ? ' wide' : ''}`} style={{ background: theme.bg, color: theme.fg }}>
      <div className="e">{monthYear(trip.date_start)}</div>
      <div className="t">{trip.title}</div>
      {trip.subtitle && <div className="s">{trip.subtitle}</div>}
    </Link>
  );
}

function TileGrid({ trips }: { trips: Trip[] }) {
  return (
    <div className="home-grid">
      {trips.map((t, i) => <TripTile key={t.id} trip={t} wide={trips.length % 2 === 1 && i === trips.length - 1} />)}
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
  const stays = next ? await getStays(next.id) : [];
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="home-page" style={{ maxWidth: 'var(--max-w)', margin: '0 auto', padding: '0 0 60px' }}>
      {/* Signed in only: Trips, Bookings, Admin and Rolls */}
      <OwnerNav here="trips" ownerOnly />
      <header style={{ padding: '40px var(--px) 6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <KojiMark size={32} />
          <h1 style={{ fontFamily: 'var(--font-mono)', fontWeight: 400, fontSize: 9.5, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--brass)' }}>
            koji · 行程
          </h1>
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
              {next && <NextTrip trip={next} stays={stays} today={today} />}
              {later.length > 0 && <><div className="home-lbl">Also coming up</div><TileGrid trips={later} /></>}
            </div>
            {past.length > 0 && (
              <div className="home-side">
                <div className="home-lbl">Past trips · {past.length}</div>
                <TileGrid trips={past} />
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
