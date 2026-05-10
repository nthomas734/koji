import Link from 'next/link';
import { getTrips } from '@/lib/supabase';
import type { Trip } from '@/lib/supabase';
import { KojiMark } from '@/components/KojiMark';

export const revalidate = 60;

const THEME_COLORS: Record<string, { bg: string; fg: string }> = {
  forest: { bg: '#1C3828', fg: '#C8EBD4' },
  navy:   { bg: '#1C2A3A', fg: '#C8D8EB' },
  plum:   { bg: '#2A1C38', fg: '#DCC8EB' },
  earth:  { bg: '#3A2A1C', fg: '#EBD8C8' },
  sand:   { bg: '#3A361C', fg: '#EBEAC8' },
  ocean:  { bg: '#1C3838', fg: '#C8EBEB' },
  rust:   { bg: '#381C1C', fg: '#EBC8C8' },
  slate:  { bg: '#1C1C1C', fg: '#D8D8D8' },
};

function TripCard({ trip }: { trip: Trip }) {
  const theme = THEME_COLORS[trip.header_theme] ?? THEME_COLORS.forest;
  const dateStr = trip.date_start
    ? new Date(trip.date_start).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null;

  return (
    <Link href={`/trips/${trip.slug}`} style={{ display: 'block' }}>
      <div style={{
        background: theme.bg,
        color: theme.fg,
        borderRadius: 12,
        padding: '20px 20px 18px',
        marginBottom: 10,
        transition: 'opacity 0.15s',
      }}>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          opacity: 0.55,
          marginBottom: 8,
        }}>
          {trip.eyebrow}
          {trip.companion && ` · ${trip.companion}`}
          {dateStr && ` · ${dateStr}`}
        </div>
        <div style={{
          fontFamily: 'var(--font-serif)',
          fontWeight: 300,
          fontSize: 22,
          letterSpacing: '-0.01em',
          lineHeight: 1.2,
          marginBottom: 6,
        }}>
          {trip.title}
        </div>
        <div style={{
          fontFamily: 'var(--font-serif)',
          fontWeight: 300,
          fontStyle: 'italic',
          fontSize: 15,
          opacity: 0.75,
          marginBottom: 10,
        }}>
          {trip.subtitle}
        </div>
        <div style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 12,
          fontWeight: 300,
          lineHeight: 1.5,
          opacity: 0.65,
        }}>
          {trip.meta}
        </div>
      </div>
    </Link>
  );
}

export default async function HomePage() {
  const trips = await getTrips();

  return (
    <div style={{ maxWidth: 'var(--max-w)', margin: '0 auto', padding: '0 0 60px' }}>
      <header style={{
        padding: '40px var(--px) 24px',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 14,
        }}>
          <KojiMark size={36} />
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--brass)',
          }}>
            koji · 行程
          </div>
        </div>
        <h1 style={{
          fontFamily: 'var(--font-serif)',
          fontWeight: 300,
          fontSize: 30,
          letterSpacing: '-0.01em',
          color: 'var(--ink)',
          lineHeight: 1.1,
          marginBottom: 8,
        }}>
          Itineraries
        </h1>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          letterSpacing: '0.1em',
          color: 'var(--ink-4)',
        }}>
          {trips.length} {trips.length === 1 ? 'trip' : 'trips'}
        </div>
      </header>

      <main style={{ padding: '16px var(--px) 0' }}>
        {trips.length === 0 ? (
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--ink-4)',
            textAlign: 'center',
            padding: '40px 0',
            letterSpacing: '0.1em',
          }}>
            no trips yet
          </div>
        ) : (
          trips.map(trip => <TripCard key={trip.id} trip={trip} />)
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
        marginTop: 24,
      }}>
        <Link href="/admin" style={{ color: 'var(--ink-4)' }}>admin</Link>
      </footer>
    </div>
  );
}
