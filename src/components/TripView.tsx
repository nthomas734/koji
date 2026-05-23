'use client';

import { useState, useEffect } from 'react';
import type { Day, Logistics, Stop, Trip } from '@/lib/supabase';
import { renderMd } from '@/lib/markdown';
import { KojiMark } from '@/components/KojiMark';

// ── THEME ───────────────────────────────────────────────────────────────────
const THEMES: Record<string, { bg: string; fg: string }> = {
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
};

// ── TAG COLORS ──────────────────────────────────────────────────────────────
// bg = pill fill (saturated mid-tone). text = pill label and tinted time label. bar = accent bar.
const TAG_COLORS: Record<string, { bg: string; text: string; bar: string }> = {
  green:   { bg: '#97C459', text: '#173404', bar: '#639922' },
  navy:    { bg: '#85B7EB', text: '#042C53', bar: '#378ADD' },
  amber:   { bg: '#FAC775', text: '#633806', bar: '#EF9F27' },
  pink:    { bg: '#ED93B1', text: '#4B1528', bar: '#D4537E' },
  sky:     { bg: '#85B7EB', text: '#042C53', bar: '#378ADD' },
  emerald: { bg: '#5DCAA5', text: '#04342C', bar: '#1D9E75' },
  gray:    { bg: '#B4B2A9', text: '#2C2C2A', bar: '#888780' },
  brass:   { bg: '#F0997B', text: '#4A1B0C', bar: '#D85A30' },
};

// ── DAY LABEL PARSING ───────────────────────────────────────────────────────
// Splits "Friday, May 29 - Florence - Sales Club Day 2 - Closing Dinner"
// into { headline: "Friday, May 29", subtitle: "Florence - Sales Club Day 2 - Closing Dinner" }
// Falls back gracefully if there's no separator.
function parseDayLabel(label: string): { headline: string; subtitle: string } {
  const parts = label.split(/\s+[-–—]\s+/);
  if (parts.length <= 1) return { headline: label, subtitle: '' };
  return {
    headline: parts[0],
    subtitle: parts.slice(1).join(' · '),
  };
}

// ── WEATHER TYPES ────────────────────────────────────────────────────────────
interface DayWeather {
  date: string;
  tempMax: number;
  tempMin: number;
  wmoCode: number;
  windMax:     number | null;
  precipSum:   number | null;
  precipProb:  number | null;
  uvIndex:     number | null;
  humidity:    number | null;
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
    url.searchParams.set('daily',            [
      'temperature_2m_max',
      'temperature_2m_min',
      'weathercode',
      'windspeed_10m_max',
      'precipitation_sum',
      'precipitation_probability_max',
      'uv_index_max',
    ].join(','));
    url.searchParams.set('hourly',           'relative_humidity_2m');
    url.searchParams.set('temperature_unit', 'fahrenheit');
    url.searchParams.set('wind_speed_unit',  'mph');
    url.searchParams.set('timezone',         'auto');
    url.searchParams.set('start_date',       dateStart);
    url.searchParams.set('end_date',         dateEnd);

    const res = await fetch(url.toString());
    if (!res.ok) return [];
    const json = await res.json();
    const {
      time, temperature_2m_max, temperature_2m_min, weathercode,
      windspeed_10m_max, precipitation_sum, precipitation_probability_max, uv_index_max,
    } = json.daily ?? {};
    if (!time) return [];

    // Derive daily mean humidity from hourly data (24 readings per day)
    const hourlyHumidity: number[] = json.hourly?.relative_humidity_2m ?? [];
    const dailyHumidity = (time as string[]).map((_: string, i: number) => {
      const slice = hourlyHumidity.slice(i * 24, i * 24 + 24).filter((v: number) => v != null);
      if (slice.length === 0) return null;
      return Math.round(slice.reduce((a: number, b: number) => a + b, 0) / slice.length);
    });

    return (time as string[]).map((date: string, i: number) => ({
      date,
      tempMax:    Math.round(temperature_2m_max[i]),
      tempMin:    Math.round(temperature_2m_min[i]),
      wmoCode:    weathercode[i],
      windMax:    windspeed_10m_max?.[i]    != null ? Math.round(windspeed_10m_max[i])    : null,
      precipSum:  precipitation_sum?.[i]    != null ? Math.round(precipitation_sum[i] * 10) / 10 : null,
      precipProb: precipitation_probability_max?.[i] != null ? Math.round(precipitation_probability_max[i]) : null,
      uvIndex:    uv_index_max?.[i]         != null ? Math.round(uv_index_max[i])         : null,
      humidity:   dailyHumidity[i],
    }));
  } catch {
    return [];
  }
}

// Seasonal averages: fetches the same date range from the previous year
// via Open-Meteo's archive API. Returns a synthetic DayWeather array
// representing typical conditions for the trip dates.
async function fetchSeasonalWeather(
  lat: number,
  lng: number,
  dateStart: string,
  dateEnd: string,
): Promise<DayWeather[]> {
  try {
    // Shift both dates back by one year to get historical data
    const lastYearStart = shiftYear(dateStart, -1);
    const lastYearEnd   = shiftYear(dateEnd,   -1);

    const url = new URL('https://archive-api.open-meteo.com/v1/archive');
    url.searchParams.set('latitude',         String(lat));
    url.searchParams.set('longitude',        String(lng));
    url.searchParams.set('daily',            [
      'temperature_2m_max',
      'temperature_2m_min',
      'weathercode',
      'windspeed_10m_max',
      'precipitation_sum',
      'uv_index_max',
    ].join(','));
    url.searchParams.set('hourly',           'relative_humidity_2m');
    url.searchParams.set('temperature_unit', 'fahrenheit');
    url.searchParams.set('wind_speed_unit',  'mph');
    url.searchParams.set('timezone',         'auto');
    url.searchParams.set('start_date',       lastYearStart);
    url.searchParams.set('end_date',         lastYearEnd);

    const res = await fetch(url.toString());
    if (!res.ok) return [];
    const json = await res.json();
    const {
      time, temperature_2m_max, temperature_2m_min, weathercode,
      windspeed_10m_max, precipitation_sum, uv_index_max,
    } = json.daily ?? {};
    if (!time) return [];

    const hourlyHumidity: number[] = json.hourly?.relative_humidity_2m ?? [];
    const dailyHumidity = (time as string[]).map((_: string, i: number) => {
      const slice = hourlyHumidity.slice(i * 24, i * 24 + 24).filter((v: number) => v != null);
      if (slice.length === 0) return null;
      return Math.round(slice.reduce((a: number, b: number) => a + b, 0) / slice.length);
    });

    return (time as string[]).map((date: string, i: number) => ({
      date:       shiftYear(date, 1),
      tempMax:    Math.round(temperature_2m_max[i]),
      tempMin:    Math.round(temperature_2m_min[i]),
      wmoCode:    weathercode[i],
      windMax:    windspeed_10m_max?.[i]  != null ? Math.round(windspeed_10m_max[i])  : null,
      precipSum:  precipitation_sum?.[i]  != null ? Math.round(precipitation_sum[i] * 10) / 10 : null,
      precipProb: null,
      uvIndex:    uv_index_max?.[i]       != null ? Math.round(uv_index_max[i])       : null,
      humidity:   dailyHumidity[i],
    }));
  } catch {
    return [];
  }
}

function shiftYear(dateStr: string, delta: number): string {
  const d = new Date(dateStr);
  d.setFullYear(d.getFullYear() + delta);
  return d.toISOString().split('T')[0];
}

// ── WEATHER AGGREGATION ──────────────────────────────────────────────────────
interface WeatherSummary {
  avgMax: number;
  avgMin: number;
  dominantCode: number;
  conditionLabel: string;
}

function summarizeWeather(weather: DayWeather[]): WeatherSummary | null {
  if (weather.length === 0) return null;
  const avgMax = Math.round(weather.reduce((s, w) => s + w.tempMax, 0) / weather.length);
  const avgMin = Math.round(weather.reduce((s, w) => s + w.tempMin, 0) / weather.length);

  // Find the most common WMO code (group similar codes together)
  const buckets: Record<string, number[]> = {};
  for (const w of weather) {
    const bucket = wmoBucket(w.wmoCode);
    if (!buckets[bucket]) buckets[bucket] = [];
    buckets[bucket].push(w.wmoCode);
  }
  let dominantBucket = '';
  let dominantCount = 0;
  for (const [bucket, codes] of Object.entries(buckets)) {
    if (codes.length > dominantCount) {
      dominantBucket = bucket;
      dominantCount = codes.length;
    }
  }
  const dominantCode = buckets[dominantBucket][0];
  const dominantShare = dominantCount / weather.length;

  // If conditions are evenly split across buckets, call it mixed
  const conditionLabel = dominantShare >= 0.6
    ? `Mostly ${wmoDisplay(dominantCode).label.toLowerCase()}`
    : 'Mixed conditions';

  return { avgMax, avgMin, dominantCode, conditionLabel };
}

function wmoBucket(code: number): string {
  if (code === 0)  return 'clear';
  if (code <= 2)   return 'partly';
  if (code === 3)  return 'cloudy';
  if (code <= 49)  return 'fog';
  if (code <= 67)  return 'rain';
  if (code <= 77)  return 'snow';
  if (code <= 82)  return 'showers';
  return 'storm';
}

// Format a trip's date range as "May 23–25" or "Mar 1 – Apr 5"
function formatTripDateRange(start: string | null, end: string | null): string {
  if (!start) return '';
  const s = new Date(start + 'T00:00');
  const e = end ? new Date(end + 'T00:00') : null;
  const monthsSame = e && s.getMonth() === e.getMonth();
  const fmtMonth = (d: Date) => d.toLocaleDateString('en-US', { month: 'short' });
  if (!e) return `${fmtMonth(s)} ${s.getDate()}`;
  if (monthsSame) return `${fmtMonth(s)} ${s.getDate()}–${e.getDate()}`;
  return `${fmtMonth(s)} ${s.getDate()} – ${fmtMonth(e)} ${e.getDate()}`;
}

// ── DATE HELPERS ─────────────────────────────────────────────────────────────
// Derive a YYYY-MM-DD for a given day by offsetting from trip start
function dateForDay(dateStart: string, index: number): string {
  const d = new Date(dateStart);
  d.setDate(d.getDate() + index);
  return d.toISOString().split('T')[0];
}

function tripEndDate(trip: Trip, days: Day[]): string {
  // Returns end_date + 1 day to ensure the final trip day is included
  // (Open-Meteo's daily endpoint sometimes excludes the boundary date)
  const base = trip.date_end
    ? new Date(trip.date_end + 'T00:00')
    : (() => {
        const d = new Date(trip.date_start! + 'T00:00');
        d.setDate(d.getDate() + Math.max(days.length - 1, 0));
        return d;
      })();
  base.setDate(base.getDate() + 1);
  return base.toISOString().split('T')[0];
}

// ── WEATHER BADGE — inline in day header ─────────────────────────────────────
function WeatherBadge({ w }: { w: DayWeather }) {
  const { icon } = wmoDisplay(w.wmoCode);
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      fontFamily: 'var(--font-mono)',
      fontSize: 9,
      color: 'var(--ink-3)',
      background: 'var(--surface)',
      border: '0.5px solid var(--border)',
      borderRadius: 999,
      padding: '3px 9px',
      whiteSpace: 'nowrap',
    }}>
      <span style={{ fontSize: 11, lineHeight: 1 }}>{icon}</span>
      {w.tempMax}° / {w.tempMin}°
    </span>
  );
}

// ── QUICK STRIP — itinerary tab top summary ──────────────────────────────────
// ── QUICK STRIP HELPERS ──────────────────────────────────────────────────────
function condenseRow(row: Logistics): string {
  const v = row.value_md;
  if (row.category === 'flight') {
    const flightMatch = v.match(/\b([A-Z]{2})\s*(\d{1,4})\b/);
    const flight = flightMatch ? `${flightMatch[1]}${flightMatch[2]}` : '';
    const routeMatch = v.match(/([A-Z]{3})\s*(?:to|\u2192|-+>)\s*([A-Z]{3})/i);
    const route = routeMatch ? `${routeMatch[1].toUpperCase()} \u2192 ${routeMatch[2].toUpperCase()}` : '';
    const dateMatch = v.match(/(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)[,.]?\s*((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2})/i)
      || v.match(/((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2})/i);
    const date = dateMatch ? dateMatch[1] : '';
    return [flight, route, date].filter(Boolean).join(' \u00b7 ');
  }
  if (row.category === 'train') {
    const routeMatch = v.match(/([A-Za-z\s]+(?:Termini|SMN|Santa Maria Novella|Central|Station)?)\s*(?:\u2192|-+>|to)\s*([A-Za-z\s]+(?:Termini|SMN|Santa Maria Novella|Central|Station)?)/i);
    const route = routeMatch ? `${routeMatch[1].trim()} \u2192 ${routeMatch[2].trim()}` : row.label;
    const dateMatch = v.match(/(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)[,.]?\s*((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2})/i)
      || v.match(/((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2})/i);
    const date = dateMatch ? dateMatch[1] : '';
    return [route, date].filter(Boolean).join(' \u00b7 ');
  }
  if (row.category === 'hotel') return row.label;
  return row.label;
}

function QuickStrip({ logistics, theme }: { logistics: Logistics[]; theme: { bg: string; fg: string } }) {
  const flights = logistics.filter(l => l.category === 'flight');
  const trains  = logistics.filter(l => l.category === 'train');
  const hotels  = logistics.filter(l => l.category === 'hotel');

  const stripRows: { label: string; value: string; isMarkdown?: boolean }[] = [];

  const outbound  = flights.filter(f => f.label.toLowerCase().includes('out') || f.sort_order === Math.min(...flights.map(x => x.sort_order)));
  const returning = flights.filter(f => !outbound.includes(f));

  if (outbound.length > 0) {
    stripRows.push({ label: 'Fly out', value: outbound.map(r => condenseRow(r)).join(' \u00b7 ') });
  }
  if (returning.length > 0) {
    const codes = returning.map(r => {
      const m = r.value_md.match(/\b([A-Z]{2})\s*(\d{1,4})\b/);
      return m ? `${m[1]}${m[2]}` : '';
    }).filter(Boolean).join(' \u2192 ');
    const dateMatch = returning[0]?.value_md.match(/((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2})/i);
    const date = dateMatch ? dateMatch[1] : '';
    stripRows.push({ label: 'Fly home', value: [codes, date].filter(Boolean).join(' \u00b7 ') });
  }

  if (trains.length > 0) {
    stripRows.push({ label: 'Trains', value: trains.map(r => condenseRow(r)).join('  \u00b7  ') });
  }
  if (hotels.length > 0) {
    const hotelLinks = hotels.map(r => {
      const mdLink = r.value_md.match(/(\[[^\]]+\]\([^)]+\))/);
      return mdLink ? mdLink[1] : r.label;
    }).join(' \u00b7 ');
    stripRows.push({ label: 'Hotels', value: hotelLinks, isMarkdown: true });
  }

  if (stripRows.length === 0) return null;

  return (
    <div style={{ padding: '12px 12px 0' }}>
      <div style={{
        background: 'var(--surface)',
        border: '0.5px solid var(--border)',
        borderRadius: 14,
        overflow: 'hidden',
      }}>
        {stripRows.map((row, i) => (
          <div
            key={row.label}
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 10,
              padding: '10px 16px',
              borderBottom: i < stripRows.length - 1 ? '0.5px solid var(--bg-subtle)' : 'none',
            }}
          >
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 8.5,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: theme.bg,
              flexShrink: 0,
              width: 64,
            }}>
              {row.label}
            </span>
            {row.isMarkdown ? (
              <span
                style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink-2)', lineHeight: 1.5 }}
                className="body-content"
                dangerouslySetInnerHTML={{ __html: renderMd(row.value) }}
              />
            ) : (
              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink-2)', lineHeight: 1.5 }}>
                {row.value}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}


// ── WEATHER HERO CARD ────────────────────────────────────────────────────────
function WeatherHeroCard({
  loading,
  weather,
  isSeasonal,
  fg,
}: {
  loading: boolean;
  weather: DayWeather[];
  isSeasonal: boolean;
  fg: string;
}) {
  if (loading && weather.length === 0) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '10px 18px',
        background: `${fg}1f`,
        border: `0.5px solid ${fg}2c`,
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        borderRadius: 999,
      }}>
        <span style={{ fontSize: 11, color: `${fg}80`, fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Loading weather…
        </span>
      </div>
    );
  }

  const summary = summarizeWeather(weather);
  if (!summary) return null;

  const { icon } = wmoDisplay(summary.dominantCode);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '10px 18px',
      background: `${fg}1f`,
      border: `0.5px solid ${fg}2c`,
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      borderRadius: 999,
    }}>
      <span style={{ fontSize: 17, lineHeight: 1 }}>{icon}</span>
      <span style={{ fontSize: 13, fontWeight: 500, color: '#FFFFFF' }}>
        avg {summary.avgMax}° / {summary.avgMin}°F
      </span>
      <span style={{
        marginLeft: 'auto',
        fontSize: 10,
        color: `${fg}99`,
        textAlign: 'right',
        lineHeight: 1.3,
      }}>
        {summary.conditionLabel}
        {isSeasonal && (
          <>
            <br />
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 8,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: `${fg}77`,
            }}>
              Seasonal avg
            </span>
          </>
        )}
      </span>
    </div>
  );
}

// ── FULL LOGISTICS SECTION ───────────────────────────────────────────────────
const CATEGORY_LABELS: Record<string, string> = {
  flight: 'Flights',
  train:  'Trains',
  hotel:  'Hotels',
  book:   'Book Ahead',
  other:  'Other',
};

// Inline SVG icons per category (24x24 viewBox, stroke-only)
function CategoryIcon({ cat, color }: { cat: string; color: string }) {
  const s = { width: 15, height: 15, display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 } as React.CSSProperties;
  const p = { fill: 'none', stroke: color, strokeWidth: 1.75, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (cat === 'flight') return (
    <svg viewBox="0 0 24 24" style={s}><path {...p} d="M21 16v-2l-8-5V3.5A1.5 1.5 0 0 0 11.5 2h0A1.5 1.5 0 0 0 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>
  );
  if (cat === 'train') return (
    <svg viewBox="0 0 24 24" style={s}><rect {...p} x="4" y="3" width="16" height="13" rx="2"/><path {...p} d="M4 11h16M12 3v8M8 19l-2 2M16 19l2 2M9 19h6"/></svg>
  );
  if (cat === 'hotel') return (
    <svg viewBox="0 0 24 24" style={s}><path {...p} d="M3 21V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14M3 21h18M9 21v-6h6v6M9 7h1m4 0h1M9 11h1m4 0h1"/></svg>
  );
  if (cat === 'book') return (
    <svg viewBox="0 0 24 24" style={s}><rect {...p} x="3" y="4" width="18" height="18" rx="2"/><path {...p} d="M16 2v4M8 2v4M3 10h18M9 16l2 2 4-4"/></svg>
  );
  return (
    <svg viewBox="0 0 24 24" style={s}><path {...p} d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM14 2v6h6M9 13h6M9 17h6"/></svg>
  );
}

const CATEGORY_ORDER = ['flight', 'train', 'hotel', 'book', 'other'];

// Parse a value_md string into { headline, secondary, detail } based on category
function parseLogisticsValue(value: string, category: string): { headline: string; secondary: string; detail: string } {
  const parts = value.split(' - ').map(p => p.trim()).filter(Boolean);

  if (category === 'flight') {
    // "UA970 - Sun, May 24 - ORD to FCO - Departs 3:45 PM - Arrives 7:55 AM - Seats 42J / 42K"
    // Extract route (contains "to" or "→"), flight number, date, times
    const routePart = parts.find(p => /to|→/.test(p)) ?? '';
    const route = routePart.replace(/to/i, '→').replace(/\s+/g, ' ');
    const flightNum = parts.find(p => /^[A-Z]{2}\d+/.test(p.trim())) ?? '';
    const datePart = parts.find(p => /(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i.test(p) && !/depart|arriv/i.test(p)) ?? '';
    const departs = parts.find(p => /depart/i.test(p))?.replace(/departs?\s*/i, '') ?? '';
    const arrives = parts.find(p => /arriv/i.test(p))?.replace(/arriv[a-z]*\s*/i, '') ?? '';
    const timeStr = [departs && `Departs ${departs}`, arrives && `Arrives ${arrives}`].filter(Boolean).join(' · ');
    return {
      headline: route,
      secondary: [flightNum, datePart].filter(Boolean).join(' · '),
      detail: timeStr,
    };
  }

  if (category === 'train') {
    // "Wed, May 27 - Suggested 10:00 AM Frecciarossa - Roma Termini to Firenze SMN - Arrives approx 11:35 AM"
    const routePart = parts.find(p => /to|→/.test(p)) ?? '';
    const route = routePart.replace(/to/i, '→');
    const datePart = parts.find(p => /(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)/i.test(p)) ?? '';
    const trainType = parts.find(p => /frecciarossa|italo|intercity|tgv|eurostar/i.test(p))
      ?.replace(/suggested\s*/i, '').replace(/\d{1,2}:\d{2}\s*(AM|PM)/i, '').trim() ?? '';
    const timePart = parts.find(p => /suggested|depart|arriv|\d{1,2}:\d{2}/i.test(p) && p !== routePart && p !== datePart);
    const timeStr = timePart?.replace(/suggested\s*/i, '').trim() ?? '';
    return {
      headline: route || parts[0] || '',
      secondary: [datePart, timeStr].filter(Boolean).join(' · '),
      detail: trainType,
    };
  }

  if (category === 'hotel') {
    // "May 25-27 - 2 nights - Check-in 2:00 PM - Check-out 10:00 AM - Conf #21773523"
    const datePart = parts.find(p => /may|jun|jul|aug|sep|oct|nov|dec|jan|feb|mar|apr/i.test(p) && /\d/.test(p)) ?? '';
    const nights = parts.find(p => /night/i.test(p)) ?? '';
    const checkin = parts.find(p => /check.?in/i.test(p)) ?? '';
    const conf = parts.find(p => /conf|#/i.test(p)) ?? '';
    const extra = parts.find(p => p !== datePart && p !== nights && p !== checkin && p !== conf && !/check.?out/i.test(p) && p.length > 2) ?? '';
    return {
      headline: [datePart, nights].filter(Boolean).join(' · '),
      secondary: checkin,
      detail: [extra, conf].filter(Boolean).join(' · '),
    };
  }

  if (category === 'book') {
    // "Tue, May 26 - 3:00 PM - confirm tickets in hand"
    const datePart = parts[0] ?? '';
    const timePart = parts[1] ?? '';
    const note = parts.slice(2).join(' · ');
    return {
      headline: [datePart, timePart].filter(Boolean).join(' · '),
      secondary: '',
      detail: note,
    };
  }

  // fallback: first part = headline, rest = detail
  return {
    headline: parts[0] ?? value,
    secondary: '',
    detail: parts.slice(1).join(' · '),
  };
}

function LogisticsSection({ logistics, theme }: { logistics: Logistics[]; theme: { bg: string; fg: string } }) {
  const byCategory: Record<string, Logistics[]> = {};
  for (const row of logistics) {
    const cat = row.category || 'other';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(row);
  }

  const categories = CATEGORY_ORDER.filter(c => byCategory[c]?.length > 0);

  if (categories.length === 0) {
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
    <div style={{ padding: '12px 12px 40px' }}>
      {categories.map(cat => (
        <div key={cat} style={{ marginBottom: 16 }}>

          {/* Section banner — matches day banner style */}
          <div style={{
            position: 'relative',
            background: `color-mix(in srgb, ${theme.bg} 18%, var(--bg-subtle))`,
            border: `0.5px solid color-mix(in srgb, ${theme.bg} 30%, var(--border))`,
            borderRadius: 14,
            padding: '11px 14px 11px 20px',
            marginBottom: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute',
              left: 0, top: 8, bottom: 8,
              width: 4,
              background: theme.bg,
              borderRadius: 4,
            }} />
            <CategoryIcon cat={cat} color={theme.bg} />
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: theme.bg,
              fontWeight: 500,
            }}>
              {CATEGORY_LABELS[cat] ?? cat}
            </span>
          </div>

          {/* Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {byCategory[cat].map(row => {
              const { headline, secondary, detail } = parseLogisticsValue(row.value_md, cat);
              return (
                <div
                  key={row.id}
                  style={{
                    position: 'relative',
                    background: 'var(--surface)',
                    border: '0.5px solid var(--border)',
                    borderRadius: 14,
                    padding: '12px 14px 12px 18px',
                    overflow: 'hidden',
                  }}
                >
                  <div style={{
                    position: 'absolute',
                    left: 0, top: 8, bottom: 8,
                    width: 3,
                    background: theme.bg,
                    borderRadius: 4,
                    opacity: 0.4,
                  }} />
                  <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 8.5,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: theme.bg,
                    marginBottom: 4,
                  }}>
                    {row.label}
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: 8,
                    marginBottom: secondary || detail ? 2 : 0,
                  }}>
                    <span
                      style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink)' }}
                      className="body-content"
                      dangerouslySetInnerHTML={{ __html: renderMd(headline) }}
                    />
                    {secondary && (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>
                        {secondary}
                      </span>
                    )}
                  </div>
                  {detail && (
                    <div
                      style={{ fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.5 }}
                      className="body-content"
                      dangerouslySetInnerHTML={{ __html: renderMd(detail) }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── STOP ROW ────────────────────────────────────────────────────────────────
// 3px accent bar on left matches the tag pill's color family.
// Time label tinted in the pill's dark text color to tie everything together.
function StopRow({ stop }: { stop: Stop }) {
  const tagColor = TAG_COLORS[stop.tag_color] ?? TAG_COLORS.gray;
  const bodyHtml = renderMd(stop.body_md);
  return (
    <div style={{
      position: 'relative',
      display: 'grid',
      gridTemplateColumns: '52px 1fr',
      gap: 6,
      background: 'var(--surface)',
      border: '0.5px solid var(--border)',
      borderRadius: 14,
      padding: '12px 14px 12px 18px',
      marginTop: 8,
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute',
        left: 0,
        top: 8,
        bottom: 8,
        width: 3,
        background: tagColor.bar,
        borderRadius: 4,
        opacity: stop.is_optional ? 0.4 : 1,
      }} />
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        fontWeight: 500,
        letterSpacing: '0.04em',
        color: tagColor.text,
        paddingTop: 4,
      }}>
        {stop.time_label || ''}
      </div>
      <div>
        <span style={{
          display: 'inline-block',
          fontFamily: 'var(--font-mono)',
          fontSize: 8.5,
          fontWeight: 500,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          padding: '3px 9px',
          borderRadius: 999,
          marginBottom: 6,
          background: tagColor.bg,
          color: tagColor.text,
        }}>
          {stop.tag}
        </span>
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
// Redesigned banner:
//   - 4px theme-color accent bar on left (rounded, inset)
//   - "DAY N OF M" eyebrow in theme color
//   - Serif day-of-week as primary headline
//   - Mono-caps subtitle for the rest of the label
//   - Weather badge tucked to the right
function DayBlock({
  day,
  weather,
  dayIndex,
  dayTotal,
  themeColor,
}: {
  day: Day;
  weather: DayWeather | null;
  dayIndex: number;
  dayTotal: number;
  themeColor: { bg: string; fg: string };
}) {
  const { headline, subtitle } = parseDayLabel(day.label);

  return (
    <div>
      <div style={{
        position: 'relative',
        margin: '20px 12px 0',
        padding: '14px 16px 12px 22px',
        background: 'var(--bg-subtle)',
        border: '0.5px solid var(--border)',
        borderRadius: 14,
        lineHeight: 1.5,
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute',
          left: 0,
          top: 10,
          bottom: 10,
          width: 4,
          background: themeColor.bg,
          borderRadius: 4,
        }} />
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: themeColor.bg,
              marginBottom: 4,
            }}>
              Day {dayIndex + 1} of {dayTotal}
            </div>
            <div style={{
              fontFamily: 'var(--font-serif)',
              fontWeight: 400,
              fontSize: 18,
              letterSpacing: '-0.005em',
              color: 'var(--ink)',
              lineHeight: 1.15,
              marginBottom: subtitle ? 4 : 0,
            }}>
              {headline}
            </div>
            {subtitle && (
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                letterSpacing: '0.08em',
                color: 'var(--ink-2)',
                lineHeight: 1.4,
              }}>
                {subtitle}
              </div>
            )}
          </div>
          {weather && (
            <span style={{
              flexShrink: 0,
              marginTop: 2,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              color: 'var(--ink-3)',
              background: 'var(--surface)',
              border: '0.5px solid var(--border)',
              borderRadius: 999,
              padding: '3px 9px',
              whiteSpace: 'nowrap',
            }}>
              <span style={{ fontSize: 11, lineHeight: 1 }}>{wmoDisplay(weather.wmoCode).icon}</span>
              {weather.tempMax}° / {weather.tempMin}°
            </span>
          )}
        </div>
      </div>
      <div style={{ padding: '0 12px' }}>
        {(day.stops ?? []).map(stop => <StopRow key={stop.id} stop={stop} />)}
      </div>
    </div>
  );
}


// ── WEATHER TAB ──────────────────────────────────────────────────────────────
function WeatherTab({
  days,
  weatherMap,
  trip,
  isSeasonal,
  theme,
}: {
  days: Day[];
  weatherMap: Record<string, DayWeather>;
  trip: Trip;
  isSeasonal: boolean;
  theme: { bg: string; fg: string };
}) {
  if (!trip.date_start) return null;

  // Derive a color for each city based on unique lat/lng groups
  // First city = theme color, subsequent cities = tag-style accent
  const cityColors: Record<string, string> = {};
  const cityOrder: string[] = [];
  const CITY_ACCENTS = ['#1D9E75', '#378ADD', '#D85A30', '#D4537E', '#BA7517'];

  for (const day of days) {
    const lat = day.lat ?? trip.lat;
    const lng = day.lng ?? trip.lng;
    if (lat == null || lng == null) continue;
    const key = `${lat},${lng}`;
    if (!cityColors[key]) {
      cityColors[key] = cityOrder.length === 0
        ? theme.bg
        : CITY_ACCENTS[(cityOrder.length - 1) % CITY_ACCENTS.length];
      cityOrder.push(key);
    }
  }

  // Use location_label field on the day; fall back to trip.location for trip-level coords
  const cityLabel: Record<string, string> = {};
  for (const day of days) {
    const lat = day.lat ?? trip.lat;
    const lng = day.lng ?? trip.lng;
    if (lat == null || lng == null) continue;
    const key = `${lat},${lng}`;
    if (!cityLabel[key]) {
      if (day.location_label) {
        cityLabel[key] = day.location_label;
      } else if (day.lat == null && trip.location) {
        // Day uses trip-level coords — use trip location
        cityLabel[key] = trip.location.split(',')[0].trim();
      }
    }
  }

  return (
    <div style={{ padding: '12px 12px 40px' }}>
      {isSeasonal && (
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 8.5,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--ink-4)',
          textAlign: 'center',
          padding: '0 0 12px',
        }}>
          Seasonal averages from prior year
        </div>
      )}
      {days.map((day, i) => {
        if (!trip.date_start) return null;
        const date = dateForDay(trip.date_start, i);
        const w = weatherMap[date];
        if (!w) return (
          <div key={day.id} style={{
            background: 'var(--surface)',
            border: '0.5px solid var(--border)',
            borderRadius: 14,
            padding: '14px 16px',
            marginBottom: 8,
            opacity: 0.4,
          }}>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 16, color: 'var(--ink)' }}>
              {parseDayLabel(day.label).headline}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--ink-4)', marginTop: 4 }}>
              No weather data
            </div>
          </div>
        );

        const lat = day.lat ?? trip.lat;
        const lng = day.lng ?? trip.lng;
        const cityKey = lat != null && lng != null ? `${lat},${lng}` : '';
        const accentColor = cityColors[cityKey] ?? theme.bg;
        const city = cityLabel[cityKey] ?? '';
        const { icon, label } = wmoDisplay(w.wmoCode);
        const { headline } = parseDayLabel(day.label);

        return (
          <div
            key={day.id}
            style={{
              position: 'relative',
              background: 'var(--surface)',
              border: '0.5px solid var(--border)',
              borderRadius: 14,
              padding: '14px 16px 14px 20px',
              marginBottom: 8,
              overflow: 'hidden',
            }}
          >
            <div style={{
              position: 'absolute',
              left: 0, top: 10, bottom: 10,
              width: 3,
              background: accentColor,
              borderRadius: 4,
            }} />

            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
              <div>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 17, color: 'var(--ink)', lineHeight: 1.2 }}>
                  {headline}
                </div>
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: accentColor,
                  marginTop: 3,
                }}>
                  {city} · Day {i + 1}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 28, fontWeight: 300, color: 'var(--ink)', lineHeight: 1 }}>
                  {w.tempMax}°
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--ink-4)', marginTop: 2 }}>
                  {w.tempMin}° low
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 20, lineHeight: 1 }}>{icon}</span>
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-2)' }}>{label}</span>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {w.humidity != null && (
                <span style={{
                  background: 'var(--bg-subtle)',
                  borderRadius: 999,
                  padding: '3px 10px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9,
                  color: 'var(--ink-3)',
                  letterSpacing: '0.08em',
                }}>
                  Humidity {w.humidity}%
                </span>
              )}
              {w.windMax != null && (
                <span style={{
                  background: 'var(--bg-subtle)',
                  borderRadius: 999,
                  padding: '3px 10px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9,
                  color: 'var(--ink-3)',
                  letterSpacing: '0.08em',
                }}>
                  Wind {w.windMax} mph
                </span>
              )}
              {w.uvIndex != null && (
                <span style={{
                  background: 'var(--bg-subtle)',
                  borderRadius: 999,
                  padding: '3px 10px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9,
                  color: 'var(--ink-3)',
                  letterSpacing: '0.08em',
                }}>
                  UV {w.uvIndex}
                </span>
              )}
              {w.precipProb != null && w.precipProb > 0 && (
                <span style={{
                  background: 'var(--bg-subtle)',
                  borderRadius: 999,
                  padding: '3px 10px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9,
                  color: 'var(--ink-3)',
                  letterSpacing: '0.08em',
                }}>
                  Rain {w.precipProb}%
                </span>
              )}
              {w.precipSum != null && w.precipSum > 0 && (
                <span style={{
                  background: 'var(--bg-subtle)',
                  borderRadius: 999,
                  padding: '3px 10px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9,
                  color: 'var(--ink-3)',
                  letterSpacing: '0.08em',
                }}>
                  {w.precipSum} in precip
                </span>
              )}
            </div>
          </div>
        );
      })}
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 8,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: 'var(--ink-4)',
        textAlign: 'center',
        paddingTop: 8,
      }}>
        Open-Meteo
      </div>
    </div>
  );
}

// ── PILL TAB BAR ─────────────────────────────────────────────────────────────
type Tab = 'itinerary' | 'logistics' | 'weather';

function PillTabBar({ active, onChange, theme }: {
  active: Tab;
  onChange: (t: Tab) => void;
  theme: { bg: string; fg: string };
}) {
  const tabs: { key: Tab; label: string }[] = [
    { key: 'itinerary', label: 'Itinerary' },
    { key: 'logistics', label: 'Logistics' },
    { key: 'weather',   label: 'Weather' },
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
              padding: '8px 0',
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: isActive ? theme.fg : `${theme.fg}66`,
              background: isActive ? `${theme.fg}1f` : 'transparent',
              border: isActive ? `0.5px solid ${theme.fg}40` : '0.5px solid transparent',
              backdropFilter: isActive ? 'blur(8px)' : 'none',
              WebkitBackdropFilter: isActive ? 'blur(8px)' : 'none',
              borderRadius: 999,
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
  const [isSeasonal, setIsSeasonal]     = useState(false);
  const theme = THEMES[trip.header_theme] ?? THEMES.forest;

  const hasCoords = (trip.lat != null && trip.lng != null && !!trip.date_start)
    || days.some(d => d.lat != null && d.lng != null);

  // Build a map of "lat,lng" -> [dayIndex, ...] so we can fetch each unique location once
  function getLocationGroups(): { key: string; lat: number; lng: number; dateStart: string; dateEnd: string }[] {
    if (!trip.date_start) return [];
    const groups: Record<string, { lat: number; lng: number; dates: string[] }> = {};
    for (let i = 0; i < days.length; i++) {
      const day = days[i];
      const lat = day.lat ?? trip.lat;
      const lng = day.lng ?? trip.lng;
      if (lat == null || lng == null) continue;
      const date = dateForDay(trip.date_start, i);
      const key = `${lat},${lng}`;
      if (!groups[key]) groups[key] = { lat, lng, dates: [] };
      groups[key].dates.push(date);
    }
    return Object.entries(groups).map(([key, g]) => ({
      key,
      lat: g.lat,
      lng: g.lng,
      dateStart: g.dates[0],
      dateEnd: g.dates[g.dates.length - 1],
    }));
  }

  useEffect(() => {
    if (!hasCoords || !trip.date_start) return;

    let cancelled = false;
    setLoading(true);
    setIsSeasonal(false);

    (async () => {
      const locationGroups = getLocationGroups();
      if (locationGroups.length === 0) { setLoading(false); return; }

      const allResults: DayWeather[] = [];
      let anySeasonal = false;

      for (const group of locationGroups) {
        let results = await fetchWeather(group.lat, group.lng, group.dateStart, group.dateEnd);
        if (results.length === 0) {
          results = await fetchSeasonalWeather(group.lat, group.lng, group.dateStart, group.dateEnd);
          if (results.length > 0) anySeasonal = true;
        }
        allResults.push(...results);
      }

      if (cancelled) return;
      if (anySeasonal) setIsSeasonal(true);
      const map: Record<string, DayWeather> = {};
      for (const w of allResults) map[w.date] = w;
      setWeatherMap(map);
      setLoading(false);
    })();

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip.lat, trip.lng, trip.date_start, trip.date_end, hasCoords, days.length]);

  // For the hero card — use trip-level coords to show overall trip weather summary
  const tripWeather = Object.values(weatherMap)
    .filter(w => {
      if (!trip.date_start || trip.lat == null) return true;
      // Only include days whose location matches trip coords (first city approximation)
      return true; // show all — hero card averages across whole trip
    })
    .sort((a, b) => a.date.localeCompare(b.date));

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
        <div style={{ padding: '22px var(--px) 14px' }}>
          <h1 style={{
            fontFamily: 'var(--font-serif)',
            fontWeight: 300,
            fontSize: 26,
            letterSpacing: '-0.01em',
            lineHeight: 1.15,
            color: '#FFFFFF',
            marginBottom: 4,
          }}>
            {trip.title}
          </h1>
          <div style={{
            fontFamily: 'var(--font-serif)',
            fontWeight: 300,
            fontStyle: 'italic',
            fontSize: 15,
            opacity: 0.7,
            marginBottom: trip.date_start || hasCoords ? 14 : 4,
          }}>
            {trip.subtitle}
            {trip.subtitle && trip.date_start && <span style={{ opacity: 0.65 }}> · </span>}
            {trip.date_start && (
              <span style={{ fontStyle: 'normal', fontFamily: 'var(--font-sans)', fontSize: 12, letterSpacing: '0.02em' }}>
                {formatTripDateRange(trip.date_start, trip.date_end)}
              </span>
            )}
          </div>

          {/* Live or seasonal weather summary */}
          {hasCoords && (
            <WeatherHeroCard
              loading={weatherLoading}
              weather={tripWeather}
              isSeasonal={isSeasonal}
              fg={theme.fg}
            />
          )}
        </div>

        <PillTabBar active={activeTab} onChange={setActiveTab} theme={theme} />
      </div>

      {/* ITINERARY TAB */}
      {activeTab === 'itinerary' && (
        <>
          <QuickStrip logistics={logistics} theme={theme} />
          <main>
            {days.map((day, i) => (
              <DayBlock
                key={day.id}
                day={day}
                weather={hasCoords ? weatherForDay(i) : null}
                dayIndex={i}
                dayTotal={days.length}
                themeColor={theme}
              />
            ))}
          </main>
        </>
      )}

      {/* LOGISTICS TAB */}
      {activeTab === 'logistics' && <LogisticsSection logistics={logistics} theme={theme} />}

      {/* WEATHER TAB */}
      {activeTab === 'weather' && (
        <WeatherTab
          days={days}
          weatherMap={weatherMap}
          trip={trip}
          isSeasonal={isSeasonal}
          theme={theme}
        />
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
      }}>
        {trip.title}
      </footer>
    </div>
  );
}
