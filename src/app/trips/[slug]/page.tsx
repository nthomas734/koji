import { notFound } from 'next/navigation';
import { getTripBySlug } from '@/lib/supabase';
import type { Day, Logistics, Stop } from '@/lib/supabase';
import { renderMd } from '@/lib/markdown';
import { KojiMark } from '@/components/KojiMark';

export const revalidate = 60;

// ── THEME ──────────────────────────────────────────────────────────────────
const THEMES: Record<string, { bg: string; fg: string; label: string }> = {
  forest: { bg: '#1C3828', fg: '#C8EBD4', label: '#C8EBD4' },
  navy:   { bg: '#1C2A3A', fg: '#C8D8EB', label: '#C8D8EB' },
  plum:   { bg: '#2A1C38', fg: '#DCC8EB', label: '#DCC8EB' },
  earth:  { bg: '#3A2A1C', fg: '#EBD8C8', label: '#EBD8C8' },
  sand:   { bg: '#3A361C', fg: '#EBEAC8', label: '#EBEAC8' },
  ocean:  { bg: '#1C3838', fg: '#C8EBEB', label: '#C8EBEB' },
  rust:   { bg: '#381C1C', fg: '#EBC8C8', label: '#EBC8C8' },
  slate:  { bg: '#1C1C1C', fg: '#D8D8D8', label: '#D8D8D8' },
};

// ── TAG COLORS ─────────────────────────────────────────────────────────────
const TAG_COLORS: Record<string, { bg: string; text: string }> = {
  green:   { bg: '#E4F0EB', text: '#2D6B4A' },
  navy:    { bg: '#E4ECF5', text: '#1A3A5C' },
  amber:   { bg: '#F5EDD8', text: '#8A5A00' },
  pink:    { bg: '#F5E4EF', text: '#7A1A4A' },
  sky:     { bg: '#E0EEF8', text: '#0A4A7A' },
  emerald: { bg: '#E0F0E8', text: '#1A5C3A' },
  gray:    { bg: '#EDEAE4', text: '#5A5852' },
  brass:   { bg: '#F5EDD8', text: '#7A5A1A' },
};

// ── COMPONENTS ─────────────────────────────────────────────────────────────

function StopRow({ stop }: { stop: Stop }) {
  const tagColor = TAG_COLORS[stop.tag_color] ?? TAG_COLORS.gray;
  const bodyHtml = renderMd(stop.body_md);

  return (
    <div className="stop-row" style={{
      borderBottom: '1px solid var(--border)',
      background: 'var(--surface)',
    }}>
      <div className="stop-time">
        {stop.time_label || ''}
      </div>
      <div style={{
        padding: '14px 16px 14px 12px',
        borderLeft: '1px solid var(--bg-subtle)',
      }}>
        <span className="stop-tag" style={{
          background: tagColor.bg,
          color: tagColor.text,
        }}>
          {stop.tag}
        </span>
        <div style={{
          fontSize: 14,
          fontWeight: 600,
          color: 'var(--ink)',
          lineHeight: 1.35,
          marginBottom: 4,
        }}>
          {stop.title}
        </div>
        {bodyHtml && (
          <div
            style={{
              fontSize: 13,
              fontWeight: 300,
              color: 'var(--ink-3)',
              lineHeight: 1.6,
            }}
            className="body-content" dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />
        )}
      </div>
    </div>
  );
}

function DayBlock({ day }: { day: Day }) {
  return (
    <div>
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 9,
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
        color: 'var(--ink-2)',
        padding: '20px var(--px) 10px',
        background: 'var(--bg-subtle)',
        borderTop: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
        position: 'sticky',
        top: 0,
        zIndex: 40,
      }}>
        {day.label}
      </div>
      {(day.stops ?? []).map(stop => (
        <StopRow key={stop.id} stop={stop} />
      ))}
    </div>
  );
}

function LogisticsGrid({ logistics }: { logistics: Logistics[] }) {
  const left  = logistics.filter(l => l.column_key === 'logistics');
  const right = logistics.filter(l => l.column_key === 'book');

  const renderCol = (rows: Logistics[], title: string) => (
    <div style={{
      background: 'var(--surface)',
      padding: '16px 20px',
    }}>
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 8,
        letterSpacing: '0.22em',
        textTransform: 'uppercase',
        color: 'var(--brass)',
        marginBottom: 12,
      }}>
        {title}
      </div>
      {rows.map(row => (
        <div key={row.id} style={{
          padding: '5px 0',
          borderBottom: '1px solid var(--bg-subtle)',
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
        }}>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            letterSpacing: '0.08em',
            color: 'var(--ink-4)',
            textTransform: 'uppercase',
          }}>
            {row.label}
          </div>
          <div
            style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--ink-2)', lineHeight: 1.4 }}
            className="body-content" dangerouslySetInnerHTML={{ __html: renderMd(row.value_md) }}
          />
        </div>
      ))}
    </div>
  );

  return (
    <div className="logistics-grid">
      {renderCol(left, 'Logistics')}
      {renderCol(right, 'Book Ahead')}
    </div>
  );
}

// ── PAGE ───────────────────────────────────────────────────────────────────

export default async function TripPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getTripBySlug(slug);
  if (!data) notFound();

  const { trip, logistics, days } = data;
  const theme = THEMES[trip.header_theme] ?? THEMES.forest;

  return (
    <div style={{ maxWidth: 'var(--max-w)', margin: '0 auto', padding: '0 0 60px' }}>
      {/* Site header */}
      <header style={{
        padding: '24px var(--px) 16px',
        borderBottom: '1px solid var(--border)',
      }}>
        <a href="/" style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: 'var(--brass)',
        }}>
          <KojiMark size={22} />
          <span>← koji</span>
        </a>
      </header>

      {/* Trip header */}
      <div style={{
        background: theme.bg,
        color: theme.fg,
        padding: '20px var(--px)',
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
        </div>
        <h1 style={{
          fontFamily: 'var(--font-serif)',
          fontWeight: 300,
          fontSize: 22,
          letterSpacing: '-0.01em',
          lineHeight: 1.2,
          marginBottom: 4,
        }}>
          {trip.title}
        </h1>
        <div style={{
          fontFamily: 'var(--font-serif)',
          fontWeight: 300,
          fontStyle: 'italic',
          fontSize: 16,
          opacity: 0.8,
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

      {/* Logistics */}
      {logistics.length > 0 && <LogisticsGrid logistics={logistics} />}

      {/* Days + Stops */}
      <main>
        {days.map(day => <DayBlock key={day.id} day={day} />)}
      </main>

      {/* Footer */}
      <footer style={{
        padding: '28px var(--px)',
        textAlign: 'center',
        fontFamily: 'var(--font-mono)',
        fontSize: 9,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color: 'var(--ink-4)',
        borderTop: '1px solid var(--border)',
        marginTop: 0,
      }}>
        {trip.title}
      </footer>
    </div>
  );
}
