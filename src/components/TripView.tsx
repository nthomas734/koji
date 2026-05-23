'use client';

import { useState } from 'react';
import type { Day, Logistics, Stop, Trip } from '@/lib/supabase';
import { renderMd } from '@/lib/markdown';
import { KojiMark } from '@/components/KojiMark';

// ── THEME ───────────────────────────────────────────────────────────────────
const THEMES: Record<string, { bg: string; fg: string }> = {
  forest: { bg: '#1C3828', fg: '#C8EBD4' },
  navy:   { bg: '#1C2A3A', fg: '#C8D8EB' },
  plum:   { bg: '#2A1C38', fg: '#DCC8EB' },
  earth:  { bg: '#3A2A1C', fg: '#EBD8C8' },
  sand:   { bg: '#3A361C', fg: '#EBEAC8' },
  ocean:  { bg: '#1C3838', fg: '#C8EBEB' },
  rust:   { bg: '#381C1C', fg: '#EBC8C8' },
  slate:  { bg: '#1C1C1C', fg: '#D8D8D8' },
};

// ── TAG COLORS ──────────────────────────────────────────────────────────────
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

// ── ITINERARY-TAB QUICK STRIP ───────────────────────────────────────────────
// Shows only logistics rows with column_key === 'logistics' that look like
// hotel/flight essentials. We show ALL 'logistics' column rows but NOT 'book'.
function QuickStrip({ logistics }: { logistics: Logistics[] }) {
  const rows = logistics.filter(l => l.column_key === 'logistics');
  if (rows.length === 0) return null;

  return (
    <div style={{
      background: 'var(--surface)',
      borderBottom: '1px solid var(--border)',
    }}>
      {rows.map((row, i) => (
        <div
          key={row.id}
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 10,
            padding: '8px 20px',
            borderBottom: i < rows.length - 1 ? '1px solid var(--bg-subtle)' : 'none',
          }}
        >
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 8,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--ink-4)',
            flexShrink: 0,
            width: 80,
          }}>
            {row.label}
          </span>
          <span
            style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink-2)', lineHeight: 1.4 }}
            className="body-content"
            dangerouslySetInnerHTML={{ __html: renderMd(row.value_md) }}
          />
        </div>
      ))}
    </div>
  );
}

// ── FULL LOGISTICS GRID ─────────────────────────────────────────────────────
function LogisticsSection({ logistics }: { logistics: Logistics[] }) {
  // Group by column_key, preserving sort_order within each group
  const byKey: Record<string, Logistics[]> = {};
  for (const row of logistics) {
    if (!byKey[row.column_key]) byKey[row.column_key] = [];
    byKey[row.column_key].push(row);
  }

  const SECTION_LABELS: Record<string, string> = {
    logistics: 'Logistics',
    book: 'Book Ahead',
  };

  const keys = Object.keys(byKey);

  if (keys.length === 0) {
    return (
      <div style={{
        padding: '40px 20px',
        textAlign: 'center',
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color: 'var(--ink-4)',
      }}>
        No logistics added yet.
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: 40 }}>
      {keys.map(key => (
        <div key={key} style={{ marginBottom: 2 }}>
          {/* Section header */}
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 8,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--brass)',
            padding: '18px 20px 10px',
            background: 'var(--bg-subtle)',
            borderTop: '1px solid var(--border)',
            borderBottom: '1px solid var(--border)',
            position: 'sticky',
            top: 44, // below the tab bar
            zIndex: 30,
          }}>
            {SECTION_LABELS[key] ?? key}
          </div>

          {/* Rows */}
          {byKey[key].map(row => (
            <div
              key={row.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '100px 1fr',
                borderBottom: '1px solid var(--border)',
                background: 'var(--surface)',
              }}
            >
              {/* Label */}
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 8.5,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'var(--ink-4)',
                padding: '14px 12px 14px 20px',
                borderRight: '1px solid var(--bg-subtle)',
                lineHeight: 1.4,
              }}>
                {row.label}
              </div>

              {/* Value */}
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: 'var(--ink-2)',
                  lineHeight: 1.5,
                  padding: '12px 20px 12px 14px',
                }}
                className="body-content"
                dangerouslySetInnerHTML={{ __html: renderMd(row.value_md) }}
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ── STOP ROW ────────────────────────────────────────────────────────────────
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
            className="body-content"
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />
        )}
      </div>
    </div>
  );
}

// ── DAY BLOCK ────────────────────────────────────────────────────────────────
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
        top: 44, // below the tab bar
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

// ── TAB BAR ──────────────────────────────────────────────────────────────────
type Tab = 'itinerary' | 'logistics';

function TabBar({
  active,
  onChange,
  theme,
}: {
  active: Tab;
  onChange: (t: Tab) => void;
  theme: { bg: string; fg: string };
}) {
  const tabs: { key: Tab; label: string }[] = [
    { key: 'itinerary', label: 'Itinerary' },
    { key: 'logistics', label: 'Logistics' },
  ];

  return (
    <div style={{
      display: 'flex',
      background: theme.bg,
      borderBottom: '1px solid var(--border)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
    }}>
      {tabs.map(tab => {
        const isActive = tab.key === active;
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            style={{
              flex: 1,
              padding: '11px 0',
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: isActive ? theme.fg : `${theme.fg}66`,
              background: isActive ? `${theme.fg}14` : 'transparent',
              borderBottom: isActive ? `2px solid ${theme.fg}` : '2px solid transparent',
              transition: 'all 0.15s ease',
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

// ── MAIN COMPONENT ───────────────────────────────────────────────────────────
interface TripViewProps {
  trip: Trip;
  logistics: Logistics[];
  days: Day[];
}

export function TripView({ trip, logistics, days }: TripViewProps) {
  const [activeTab, setActiveTab] = useState<Tab>('itinerary');
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

      {/* Tab bar — sticky, themed to match the header */}
      <TabBar active={activeTab} onChange={setActiveTab} theme={theme} />

      {/* ── ITINERARY TAB ── */}
      {activeTab === 'itinerary' && (
        <>
          {/* Quick strip: logistics column only (hotel, getting around, etc.) */}
          {logistics.length > 0 && <QuickStrip logistics={logistics} />}

          {/* Day blocks */}
          <main>
            {days.map(day => <DayBlock key={day.id} day={day} />)}
          </main>
        </>
      )}

      {/* ── LOGISTICS TAB ── */}
      {activeTab === 'logistics' && (
        <LogisticsSection logistics={logistics} />
      )}

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
