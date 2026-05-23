'use client';

import { useState, useEffect } from 'react';
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

// ── WEATHER TYPES ────────────────────────────────────────────────────────────
interface DayWeather {
  date: string;
  tempMax: number;
  tempMin: number;
  wmoCode: number;
}

// ── WMO CODE → DISPLAY ───────────────────────────────────────────────────────
function wmoDisplay(code: number): { icon: string; label: string } {
  if (code === 0)  return { icon: '☀️',  label: 'Clear' };
  if (code <= 2)   return { icon: '⛅',  label: 'Partly cloudy' };
  if (code === 3)  return { icon: '☁️',  label: 'Overcast' };
  if (code <= 49)  return { icon: '🌫️', label: 'Fog' };
  if (code <= 57)  return { icon: '🌦️', label: 'Drizzle' };
  if (code <= 67)  return { icon: '🌧️', label: 'Rain' };
  if (code <= 77)  return { icon: '❄️',  label: 'Snow' };
  if (code <= 82)  return { icon: '🌦️', label: 'Showers' };
  if (code <= 99)  return { icon: '⛈️',  label: 'Thunderstorm' };
  return { icon: '🌡️', label: '' };
}

// ── GEOCODING via Open-Meteo ─────────────────────────────────────────────────
async function geocode(location: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
    url.searchParams.set('name', location);
    url.searchParams.set('count', '1');
    url.searchParams.set('language', 'en');
    url.searchParams.set('format', 'json');
    const res = await fetch(url.toString());
    if (!res.ok) return null;
    const json = await res.json();
    const r = json.results?.[0];
    if (!r) return null;
    return { lat: r.latitude, lng: r.longitude };
  } catch {
    return null;
  }
}

// ── WEATHER FETCH via Open-Meteo ─────────────────────────────────────────────
// Automatically uses archive API for past trips (> 16 days ago)
async function fetchWeather(
  lat: number,
  lng: number,
  dateStart: string,
  dateEnd: string,
): Promise<DayWeather[]> {
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 16);
    const isPast = new Date(dateStart) < cutoff;

    const base = isPast
      ? 'https://archive-api.open-meteo.com/v1/archive'
      : 'https://api.open-meteo.com/v1/forecast';

    const url = new URL(base);
    url.searchParams.set('latitude',         String(lat));
    url.searchParams.set('longitude',        String(lng));
    url.searchParams.set('daily',            'temperature_2m_max,temperature_2m_min,weathercode');
    url.searchParams.set('temperature_unit', 'fahrenheit');
    url.searchParams.set('timezone',         'auto');
    url.searchParams.set('start_date',       dateStart);
    url.searchParams.set('end_date',         dateEnd);

    const res = await fetch(url.toString());
    if (!res.ok) return [];
    const json = await res.json();
    const { time, temperature_2m_max, temperature_2m_min, weathercode } = json.daily ?? {};
    if (!time) return [];

    return (time as string[]).map((date: string, i: number) => ({
      date,
      tempMax: Math.round(temperature_2m_max[i]),
      tempMin: Math.round(temperature_2m_min[i]),
      wmoCode: weathercode[i],
    }));
  } catch {
    return [];
  }
}

// ── DATE HELPERS ─────────────────────────────────────────────────────────────
// Derive a YYYY-MM-DD for a given day by offsetting from trip start
function dateForDay(dateStart: string, index: number): string {
  const d = new Date(dateStart);
  d.setDate(d.getDate() + index);
  return d.toISOString().split('T')[0];
}

function tripEndDate(trip: Trip, days: Day[]): string {
  if (trip.date_end) return trip.date_end;
  const d = new Date(trip.date_start!);
  d.setDate(d.getDate() + Math.max(days.length - 1, 0));
  return d.toISOString().split('T')[0];
}

// ── WEATHER BADGE — inline in day header ─────────────────────────────────────
function WeatherBadge({ w }: { w: DayWeather }) {
  const { icon } = wmoDisplay(w.wmoCode);
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      marginLeft: 'auto',
      fontFamily: 'var(--font-mono)',
      fontSize: 9,
      letterSpacing: '0.04em',
      color: 'var(--ink-3)',
      whiteSpace: 'nowrap',
      paddingRight: 2,
    }}>
      <span style={{ fontSize: 12, lineHeight: 1 }}>{icon}</span>
      {w.tempMax}° / {w.tempMin}°
    </span>
  );
}

// ── QUICK STRIP — itinerary tab top summary ──────────────────────────────────
function QuickStrip({
  logistics,
  weather,
  loading,
}: {
  logistics: Logistics[];
  weather: DayWeather[];
  loading: boolean;
}) {
  const rows = logistics.filter(l => l.column_key === 'logistics');

  // Show the most relevant weather: today if within trip, else first day
  const todayStr = new Date().toISOString().split('T')[0];
  const spotDay = weather.find(w => w.date >= todayStr) ?? weather[0];

  return (
    <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>

      {/* Live weather row */}
      {(loading || spotDay) && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '7px 20px',
          borderBottom: rows.length > 0 ? '1px solid var(--bg-subtle)' : 'none',
        }}>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 8,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--ink-4)',
            width: 80,
            flexShrink: 0,
          }}>
            Weather
          </span>
          {loading && !spotDay ? (
            <span style={{ fontSize: 12, color: 'var(--ink-4)' }}>Loading…</span>
          ) : spotDay ? (
            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink-2)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 15, lineHeight: 1 }}>{wmoDisplay(spotDay.wmoCode).icon}</span>
              {wmoDisplay(spotDay.wmoCode).label} · {spotDay.tempMax}° / {spotDay.tempMin}°F
            </span>
          ) : null}
        </div>
      )}

      {/* Other logistics rows */}
      {rows.map((row, i) => (
        <div
          key={row.id}
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 10,
            padding: '7px 20px',
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

// ── FULL LOGISTICS SECTION ───────────────────────────────────────────────────
function LogisticsSection({ logistics }: { logistics: Logistics[] }) {
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
        <div key={key}>
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
            top: 0,
            zIndex: 30,
          }}>
            {SECTION_LABELS[key] ?? key}
          </div>
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
              <div
                style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-2)', lineHeight: 1.5, padding: '12px 20px 12px 14px' }}
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
    <div className="stop-row" style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
      <div className="stop-time">{stop.time_label || ''}</div>
      <div style={{ padding: '14px 16px 14px 12px', borderLeft: '1px solid var(--bg-subtle)' }}>
        <span className="stop-tag" style={{ background: tagColor.bg, color: tagColor.text }}>{stop.tag}</span>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.35, marginBottom: 4 }}>
          {stop.title}
        </div>
        {bodyHtml && (
          <div
            style={{ fontSize: 13, fontWeight: 300, color: 'var(--ink-3)', lineHeight: 1.6 }}
            className="body-content"
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />
        )}
      </div>
    </div>
  );
}

// ── DAY BLOCK ────────────────────────────────────────────────────────────────
function DayBlock({ day, weather }: { day: Day; weather: DayWeather | null }) {
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
        display: 'flex',
        alignItems: 'center',
      }}>
        <span style={{ flex: 1 }}>{day.label}</span>
        {weather && <WeatherBadge w={weather} />}
      </div>
      {(day.stops ?? []).map(stop => <StopRow key={stop.id} stop={stop} />)}
    </div>
  );
}

// ── PILL TAB BAR ─────────────────────────────────────────────────────────────
type Tab = 'itinerary' | 'logistics';

function PillTabBar({ active, onChange, theme }: {
  active: Tab;
  onChange: (t: Tab) => void;
  theme: { bg: string; fg: string };
}) {
  const tabs: { key: Tab; label: string }[] = [
    { key: 'itinerary', label: 'Itinerary' },
    { key: 'logistics', label: 'Logistics' },
  ];
  return (
    <div style={{ background: theme.bg, padding: '0 var(--px) 14px', display: 'flex', gap: 8 }}>
      {tabs.map(tab => {
        const isActive = tab.key === active;
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            style={{
              flex: 1,
              padding: '7px 0',
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: isActive ? theme.fg : `${theme.fg}55`,
              background: isActive ? `${theme.fg}18` : 'transparent',
              border: isActive ? `1px solid ${theme.fg}44` : '1px solid transparent',
              borderRadius: 20,
              transition: 'all 0.15s ease',
              cursor: 'pointer',
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

// ── MAIN ─────────────────────────────────────────────────────────────────────
interface TripViewProps {
  trip: Trip;
  logistics: Logistics[];
  days: Day[];
}

export function TripView({ trip, logistics, days }: TripViewProps) {
  const [activeTab, setActiveTab]       = useState<Tab>('itinerary');
  const [weatherMap, setWeatherMap]     = useState<Record<string, DayWeather>>({});
  const [weatherLoading, setLoading]    = useState(false);
  const theme = THEMES[trip.header_theme] ?? THEMES.forest;

  const hasLocation = !!trip.location && !!trip.date_start;

  useEffect(() => {
    if (!hasLocation) return;

    let cancelled = false;
    setLoading(true);

    (async () => {
      const coords = await geocode(trip.location!);
      if (cancelled || !coords) { setLoading(false); return; }

      const end = tripEndDate(trip, days);
      const results = await fetchWeather(coords.lat, coords.lng, trip.date_start!, end);
      if (cancelled) return;

      const map: Record<string, DayWeather> = {};
      for (const w of results) map[w.date] = w;
      setWeatherMap(map);
      setLoading(false);
    })();

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip.location, trip.date_start, trip.date_end, hasLocation, days.length]);

  const allWeather = Object.values(weatherMap).sort((a, b) => a.date.localeCompare(b.date));

  function weatherForDay(index: number): DayWeather | null {
    if (!trip.date_start) return null;
    const date = dateForDay(trip.date_start, index);
    return weatherMap[date] ?? null;
  }

  return (
    <div style={{ maxWidth: 'var(--max-w)', margin: '0 auto', padding: '0 0 60px' }}>

      {/* Site header */}
      <header style={{ padding: '24px var(--px) 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center' }}>
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
        <a
          href={`/admin/trips/${trip.id}`}
          style={{
            marginLeft: 'auto',
            color: 'var(--ink-4)',
            display: 'flex',
            alignItems: 'center',
            padding: 4,
          }}
          aria-label="Edit trip"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/>
          </svg>
        </a>
      </header>

      {/* Trip header + pill tabs — one contiguous dark block */}
      <div style={{ background: theme.bg, color: theme.fg }}>
        <div style={{ padding: '20px var(--px) 14px' }}>
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

        <PillTabBar active={activeTab} onChange={setActiveTab} theme={theme} />
      </div>

      {/* ITINERARY TAB */}
      {activeTab === 'itinerary' && (
        <>
          <QuickStrip logistics={logistics} weather={allWeather} loading={weatherLoading} />
          <main>
            {days.map((day, i) => (
              <DayBlock key={day.id} day={day} weather={hasLocation ? weatherForDay(i) : null} />
            ))}
          </main>
        </>
      )}

      {/* LOGISTICS TAB */}
      {activeTab === 'logistics' && <LogisticsSection logistics={logistics} />}

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
      }}>
        {trip.title}
      </footer>
    </div>
  );
}
