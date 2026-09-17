'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Carry, Day, Logistics, Shot, Stop, Trip } from '@/lib/supabase';
import { renderMd } from '@/lib/markdown';
import { KojiMark } from '@/components/KojiMark';
import { KomaView } from '@/components/KomaView';
import { KomaMark } from '@/components/KomaMark';

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
// Wraps fetch with an AbortController timeout (ms). Throws on timeout/abort.
function fetchWithTimeout(url: string, ms = 12000): Promise<Response> {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { signal: ctrl.signal }).finally(() => clearTimeout(id));
}

async function fetchWeather(
  lat: number,
  lng: number,
  dateStart: string,
  dateEnd: string,
): Promise<DayWeather[]> {
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 16);
    const forecastLimit = new Date();
    forecastLimit.setDate(forecastLimit.getDate() + 16);
    const tripDate = new Date(dateStart);
    const isPast = tripDate < cutoff;
    // If the range starts beyond the 16-day forecast window there's nothing to fetch
    if (tripDate > forecastLimit) return [];

    // The forecast API rejects end_dates beyond its ~16-day horizon — clamp so
    // a trip that has partially entered the window still gets its near days.
    let end = dateEnd;
    if (!isPast) {
      const limit = fmtLocalDate(forecastLimit);
      if (end > limit) end = limit;
    }

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
    url.searchParams.set('end_date',         end);

    const res = await fetchWithTimeout(url.toString());
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
// Fetches one year of archive data via the /api/weather proxy route.
// Proxying server-side avoids browser timeout issues and gets edge caching.
async function fetchArchiveYear(
  lat: number,
  lng: number,
  dateStart: string,
  dateEnd: string,
  delta: number,
): Promise<DayWeather[]> {
  const start = shiftYear(dateStart, delta);
  const end   = shiftYear(dateEnd,   delta);

  const url = new URL('/api/weather', window.location.origin);
  url.searchParams.set('lat',   String(lat));
  url.searchParams.set('lng',   String(lng));
  url.searchParams.set('start', start);
  url.searchParams.set('end',   end);

  const res = await fetchWithTimeout(url.toString(), 28000);
  if (!res.ok) throw new Error(`Weather proxy ${res.status}`);
  const json = await res.json();
  const {
    time, temperature_2m_max, temperature_2m_min, weathercode,
    windspeed_10m_max, precipitation_sum, uv_index_max,
  } = json.daily ?? {};
  if (!time || (time as string[]).length === 0) throw new Error('No data');

  // Shift dates back to the trip year so weatherMap keys match
  const yearShift = -delta;
  return (time as string[]).map((date: string, i: number) => ({
    date:       shiftYear(date, yearShift),
    tempMax:    Math.round(temperature_2m_max[i]),
    tempMin:    Math.round(temperature_2m_min[i]),
    wmoCode:    weathercode[i],
    windMax:    windspeed_10m_max?.[i]  != null ? Math.round(windspeed_10m_max[i])  : null,
    precipSum:  precipitation_sum?.[i]  != null ? Math.round(precipitation_sum[i] * 10) / 10 : null,
    precipProb: null,
    uvIndex:    uv_index_max?.[i]       != null ? Math.round(uv_index_max[i])       : null,
    humidity:   null,
  }));
}

// Seasonal averages: tries last year first, falls back to 2 years ago.
// Drops hourly humidity to keep requests fast.
async function fetchSeasonalWeather(
  lat: number,
  lng: number,
  dateStart: string,
  dateEnd: string,
): Promise<DayWeather[]> {
  // Try -1 year first, then -2 as fallback
  for (const delta of [-1, -2]) {
    try {
      const results = await fetchArchiveYear(lat, lng, dateStart, dateEnd, delta);
      if (results.length > 0) return results;
    } catch {
      // try next year
    }
  }
  return [];
}

function shiftYear(dateStr: string, delta: number): string {
  // Parse as local date to avoid UTC midnight timezone shift
  const [y, m, day] = dateStr.split('-').map(Number);
  return fmtLocalDate(new Date(y + delta, m - 1, day));
}

// "thu 15" for the day rail
function chipLabel(dateStart: string, index: number): string {
  const [y, m, day] = dateStart.split('-').map(Number);
  const d = new Date(y, m - 1, day + index);
  return `${d.toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase()} ${d.getDate()}`;
}

// Format a Date as local YYYY-MM-DD (toISOString would shift across UTC midnight)
function fmtLocalDate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
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
  // Parse as local date to avoid UTC midnight timezone shift (same fix as shiftYear)
  const [y, m, day] = dateStart.split('-').map(Number);
  return fmtLocalDate(new Date(y, m - 1, day + index));
}

// ── QUICK STRIP — itinerary tab top summary ──────────────────────────────────
// ── QUICK STRIP HELPERS ──────────────────────────────────────────────────────
// IATA carrier code → airline name for display. Data keeps the codes
// (parseLogisticsValue and condenseRow match on them); unknown codes fall
// back to the raw code + number.
const AIRLINE_NAMES: Record<string, string> = {
  UA: 'United',
  DL: 'Delta',
  VS: 'Virgin Atlantic',
  AA: 'American',
  BA: 'British Airways',
  AF: 'Air France',
  KL: 'KLM',
  LH: 'Lufthansa',
  AC: 'Air Canada',
  EI: 'Aer Lingus',
  IB: 'Iberia',
  JL: 'Japan Airlines',
  NH: 'ANA',
};

function airlineDisplay(code: string, num: string): string {
  const name = AIRLINE_NAMES[code.toUpperCase()];
  return name ? `${name} ${num}` : `${code}${num}`;
}

// "Nathan & Dez - Out (Economy Light)" → "Nathan & Dez"
function flightParty(row: Logistics): string {
  return row.label.split(/\s+[-–—]\s+/)[0].replace(/\s*\(.*\)\s*$/, '').trim();
}

function condenseRow(row: Logistics): string {
  const v = row.value_md;
  if (row.category === 'flight') {
    const flightMatch = v.match(/\b([A-Z]{2})\s*(\d{1,4})\b/);
    const flight = flightMatch ? airlineDisplay(flightMatch[1], flightMatch[2]) : '';
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

// Build a Google Maps link from a hotel label
function hotelLink(label: string): string {
  const q = encodeURIComponent(label.trim().replace(/\(.*?\)/g, '').trim()).replace(/%20/g, '+');
  return `[${label}](https://www.google.com/maps/search/?api=1&query=${q})`;
}

interface StripRow {
  label: string;
  lines: string[];
  isMarkdown?: boolean;
}

function QuickStrip({ logistics, theme }: { logistics: Logistics[]; theme: { bg: string; fg: string } }) {
  const flights = logistics.filter(l => l.category === 'flight');
  const trains  = logistics.filter(l => l.category === 'train');
  const hotels  = logistics.filter(l => l.category === 'hotel');

  const stripRows: StripRow[] = [];

  // "Out"/"outbound" as a word; a bare includes('out') also matched Southampton
  const isOutbound = (f: Logistics) => /\b(out|outbound)\b/i.test(f.label);
  const outbound  = flights.some(isOutbound)
    ? flights.filter(isOutbound)
    : flights.filter(f => f.sort_order === Math.min(...flights.map(x => x.sort_order)));
  const returning = flights.filter(f => !outbound.includes(f));

  // One line per flight, prefixed with who's on it (from the row label)
  const flightLine = (r: Logistics) => {
    const party = flightParty(r);
    const rest = condenseRow(r);
    return party && party !== rest ? `${party} \u00b7 ${rest}` : rest;
  };

  if (outbound.length > 0) {
    stripRows.push({ label: 'Fly out', lines: outbound.map(flightLine) });
  }
  if (returning.length > 0) {
    stripRows.push({ label: 'Fly home', lines: returning.map(flightLine) });
  }

  if (trains.length > 0) {
    stripRows.push({ label: 'Trains', lines: trains.map(r => condenseRow(r)) });
  }

  if (hotels.length > 0) {
    stripRows.push({
      label: 'Hotels',
      // Unbooked rows ("Not booked yet" anywhere in the value) render as plain
      // text with a TBD marker — auto-linking a placeholder label like
      // "London base" produces a junk maps search. The link appears once the
      // row's value no longer says not booked.
      lines: hotels.map(r => {
        if (/not booked/i.test(r.value_md)) return `${r.label} · TBD`;
        // Prefer the first real link in the row over a search on the label
        const m = r.value_md.match(/\[([^\]]+)\]\((https?:[^)\s]+)\)/);
        return m ? `[${m[1]}](${m[2]})` : hotelLink(r.label);
      }),
      isMarkdown: true,
    });
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
              alignItems: 'flex-start',
              gap: 10,
              padding: '10px 16px',
              borderBottom: i < stripRows.length - 1 ? '0.5px solid var(--bg-subtle)' : 'none',
            }}
          >
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9.5,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: theme.bg,
              flexShrink: 0,
              width: 66,
              paddingTop: 2,
            }}>
              {row.label}
            </span>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-2)', lineHeight: 1.6, minWidth: 0 }}>
              {row.lines.map((line, li) =>
                row.isMarkdown ? (
                  <div
                    key={li}
                    className="body-content"
                    dangerouslySetInnerHTML={{ __html: renderMd(line) }}
                  />
                ) : (
                  <div key={li}>{line}</div>
                )
              )}
            </div>
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
    // Shimmer skeleton in the shape of the loaded pill
    return (
      <div
        className="shimmer-anim"
        aria-label="Loading weather"
        style={{
          height: 38,
          maxWidth: 230,
          borderRadius: 999,
          backgroundImage: `linear-gradient(90deg, ${fg}14 25%, ${fg}2e 50%, ${fg}14 75%)`,
        }}
      />
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
      <span style={{ fontSize: 13, fontWeight: 500, color: fg }}>
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
    const routePart = parts.find(p => /\bto\b|→/.test(p)) ?? '';
    const route = routePart.replace(/\s+to\s+/i, ' → ').replace(/\s+/g, ' ');
    const rawFlightNum = parts.find(p => /^[A-Z]{2}\d+/.test(p.trim())) ?? '';
    const numMatch = rawFlightNum.match(/^([A-Z]{2})\s*(\d{1,4})/);
    const flightNum = numMatch ? airlineDisplay(numMatch[1], numMatch[2]) : rawFlightNum;
    const datePart = parts.find(p => /(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i.test(p) && !/depart|arriv/i.test(p)) ?? '';
    const departs = parts.find(p => /depart/i.test(p))?.replace(/departs?\s*/i, '') ?? '';
    const arrives = parts.find(p => /arriv/i.test(p))?.replace(/arriv[a-z]*\s*/i, '') ?? '';
    const timeStr = [departs && `Departs ${departs}`, arrives && `Arrives ${arrives}`].filter(Boolean).join(' · ');
    // Anything the sub-parsers did not claim (seats, confirmation) still shows
    const leftover = parts.filter(p => p !== routePart && p !== rawFlightNum && p !== datePart && !/depart|arriv/i.test(p));
    return {
      headline: route,
      secondary: [flightNum, datePart].filter(Boolean).join(' · '),
      detail: [timeStr, ...leftover].filter(Boolean).join(' · '),
    };
  }

  if (category === 'train') {
    // "Wed, May 27 - Suggested 10:00 AM Frecciarossa - Roma Termini to Firenze SMN - Arrives approx 11:35 AM"
    const routePart = parts.find(p => /\bto\b|→/.test(p)) ?? '';
    const route = routePart.replace(/\s+to\s+/i, ' → ');
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
    // "Tue, May 26 - 3:00 PM - confirm tickets in hand"; a single-segment row
    // is a list of places and belongs in the body, not the bold headline
    if (parts.length <= 1) return { headline: '', secondary: '', detail: value };
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
    // Rows authored in the admin's "book" column always group under Book Ahead,
    // regardless of their category value
    const cat = row.column_key === 'book' ? 'book' : (row.category || 'other');
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
            background: `${theme.bg}22`,
            border: `0.5px solid ${theme.bg}4d`,
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

          {/* Cards — flex column on phones, 2-up grid on desktop (planning mode) */}
          <div className="logistics-cards">
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
                    fontSize: 9.5,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: theme.bg,
                    marginBottom: 4,
                  }}>
                    {row.label}
                  </div>
                  {(headline || secondary) && <div style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: 8,
                    flexWrap: 'wrap',
                    marginBottom: secondary || detail ? 2 : 0,
                  }}>
                    {headline && <span
                      style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink)' }}
                      className="body-content"
                      dangerouslySetInnerHTML={{ __html: renderMd(headline) }}
                    />}
                    {secondary && (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>
                        {secondary}
                      </span>
                    )}
                  </div>}
                  {detail && (
                    <div
                      style={{ fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.55 }}
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
  const tagText = stop.is_optional && !/optional/i.test(stop.tag) ? `${stop.tag} · optional` : stop.tag;
  return (
    <article id={`stop-${stop.id}`} style={{
      position: 'relative',
      display: 'grid',
      gridTemplateColumns: '54px 1fr',
      gap: 6,
      background: 'var(--surface)',
      border: '0.5px solid var(--border)',
      borderRadius: 14,
      padding: '12px 14px 12px 18px',
      marginTop: 8,
      overflow: 'hidden',
      scrollMarginTop: 'calc(env(safe-area-inset-top, 0px) + 64px)',
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
      <div className="num" style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: '0.03em',
        color: tagColor.text,
        paddingTop: 4,
      }}>
        {stop.time_label || ''}
      </div>
      <div style={{ minWidth: 0 }}>
        <span style={{
          display: 'inline-block',
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          fontWeight: 500,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          padding: '3px 9px',
          borderRadius: 999,
          marginBottom: 6,
          background: tagColor.bg,
          color: tagColor.text,
        }}>
          {tagText}
        </span>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.35, marginBottom: 4, fontStyle: stop.is_optional ? 'italic' : 'normal' }}>
          {stop.title}
        </h3>
        {bodyHtml && (
          <div
            style={{ fontSize: 14, fontWeight: 400, color: 'var(--ink-2)', lineHeight: 1.6 }}
            className="body-content"
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />
        )}
      </div>
    </article>
  );
}

const DAY_HEADER_MARGIN = 20;

// ── DAY BLOCK ────────────────────────────────────────────────────────────────
// The header is glass and sticks under the status bar while its stops scroll, so
// the date stays readable over the cards beneath it. The wrapping <section> is
// the sticky container, so each header releases when the next day arrives.
function DayBlock({
  day,
  weather,
  dayIndex,
  dayTotal,
  themeColor,
  isToday,
  pinned,
  railOpen,
  onToggleRail,
  rail,
  showToday,
  onToday,
}: {
  day: Day;
  weather: DayWeather | null;
  dayIndex: number;
  dayTotal: number;
  themeColor: { bg: string; fg: string };
  isToday: boolean;
  pinned: boolean;
  railOpen: boolean;
  onToggleRail: () => void;
  rail: React.ReactNode;
  showToday: boolean;
  onToday: () => void;
}) {
  const { headline, subtitle } = parseDayLabel(day.label);
  const accent = isToday ? 'var(--brass)' : themeColor.bg;
  const folded = pinned;

  const weatherPill = weather && (
    <span className="num" style={{
      flexShrink: 0,
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
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
  );

  return (
    <section id={`day-${dayIndex}`} data-day-idx={dayIndex} className="row-in" style={{ animationDelay: `${Math.min(dayIndex, 8) * 40}ms`, scrollMarginTop: 'calc(env(safe-area-inset-top, 0px) + 8px)' }}>
      {/* Sticky glass header. While its day scrolls it pins under the status
          bar and folds to one line; tapping the folded line drops the day rail
          out beneath it. DAY_HEADER_MARGIN is what the scroll tracker uses to
          tell "pinned" from "in flow". */}
      <div
        data-day-header
        className="glass"
        onClick={folded ? onToggleRail : undefined}
        role={folded ? 'button' : undefined}
        aria-expanded={folded ? railOpen : undefined}
        style={{
          position: 'sticky',
          top: 'calc(env(safe-area-inset-top, 0px) + 8px)',
          zIndex: 5,
          margin: `${DAY_HEADER_MARGIN}px 12px 0`,
          padding: folded ? '8px 12px 8px 18px' : '12px 14px 11px 20px',
          borderRadius: folded ? 12 : 14,
          lineHeight: 1.5,
          cursor: folded ? 'pointer' : 'default',
          transition: 'padding 0.16s ease, border-radius 0.16s ease',
        }}
      >
        <div style={{
          position: 'absolute',
          left: 0,
          top: folded ? 8 : 10,
          bottom: folded ? 8 : 10,
          width: 4,
          background: accent,
          borderRadius: 4,
        }} />
        {folded ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 24 }}>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 16, color: 'var(--ink)', lineHeight: 1.1, whiteSpace: 'nowrap', margin: 0 }}>
              {headline}
            </h2>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: accent, whiteSpace: 'nowrap' }}>
              {isToday ? 'today' : `day ${dayIndex + 1}`}
            </span>
            {subtitle && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '0.04em', color: 'var(--ink-3)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {subtitle}
              </span>
            )}
            {!subtitle && <span style={{ flex: 1 }} />}
            {showToday && (
              <button
                type="button"
                onClick={e => { e.stopPropagation(); onToday(); }}
                aria-label="Jump to today"
                style={{
                  flexShrink: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  minHeight: 26,
                  padding: '0 9px',
                  borderRadius: 999,
                  border: '1px solid var(--brass)',
                  color: 'var(--brass)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                }}
              >
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--brass)' }} />
                today
              </button>
            )}
            {weatherPill}
            <span aria-hidden style={{
              width: 7, height: 7, flexShrink: 0,
              borderRight: '1.5px solid var(--ink-4)', borderBottom: '1.5px solid var(--ink-4)',
              transform: railOpen ? 'rotate(-135deg) translate(-2px, -2px)' : 'rotate(45deg) translate(-2px, -2px)',
              transition: 'transform 0.16s ease',
            }} />
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9.5,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: accent,
                marginBottom: 3,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                <span>Day {dayIndex + 1} of {dayTotal}</span>
                {isToday && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--brass)', boxShadow: '0 0 0 3px rgba(184,148,78,0.22)' }} />
                    today
                  </span>
                )}
              </div>
              <h2 style={{
                fontFamily: 'var(--font-serif)',
                fontWeight: 400,
                fontSize: 18,
                letterSpacing: '-0.005em',
                color: 'var(--ink)',
                lineHeight: 1.15,
                marginBottom: subtitle ? 3 : 0,
              }}>
                {headline}
              </h2>
              {subtitle && (
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10.5,
                  letterSpacing: '0.06em',
                  color: 'var(--ink-2)',
                  lineHeight: 1.4,
                }}>
                  {subtitle}
                </div>
              )}
            </div>
            {weatherPill && <span style={{ marginTop: 2, display: 'inline-flex' }}>{weatherPill}</span>}
          </div>
        )}
        {folded && railOpen && (
          <div onClick={e => e.stopPropagation()} style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(30,26,21,0.08)' }}>
            {rail}
          </div>
        )}
      </div>
      <div style={{ padding: '0 12px' }}>
        {(day.stops ?? []).map(stop => <StopRow key={stop.id} stop={stop} />)}
      </div>
    </section>
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
    <div className="weather-list" style={{ padding: '12px 12px 40px' }}>
      {isSeasonal && (
        <div className="weather-span" style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 8.5,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--ink-4)',
          textAlign: 'center',
          padding: '0 0 4px',
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
      <div className="weather-span" style={{
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

// ── DAY RAIL ─────────────────────────────────────────────────────────────────
// One row of day chips. Lives in the dark hero and drops out of a pinned day header;
// the variant only changes the colours.
function DayRail({ days, dateStart, active, todayIdx, onPick, variant, theme }: {
  days: Day[];
  dateStart: string;
  active: number;
  todayIdx: number;
  onPick: (i: number) => void;
  variant: 'dark' | 'glass';
  theme: { bg: string; fg: string };
}) {
  const railRef = useRef<HTMLDivElement>(null);

  // Keep the active chip in view without scrolling the page
  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const chip = rail.children[active] as HTMLElement | undefined;
    if (!chip) return;
    const left = chip.offsetLeft - (rail.clientWidth - chip.offsetWidth) / 2;
    rail.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
  }, [active]);

  const dark = variant === 'dark';
  return (
    <div ref={railRef} className="day-rail" role="tablist" aria-label="Days">
      {days.map((day, i) => {
        const on = i === active;
        const today = i === todayIdx;
        const fg = dark ? theme.fg : 'var(--ink)';
        const style: React.CSSProperties = {
          flexShrink: 0,
          minHeight: 34,
          padding: '0 11px',
          borderRadius: 999,
          fontFamily: 'var(--font-mono)',
          fontSize: 10.5,
          letterSpacing: '0.06em',
          whiteSpace: 'nowrap',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          border: `1px solid ${on ? fg : today ? 'var(--brass)' : dark ? `${theme.fg}33` : 'var(--border-mid)'}`,
          background: on ? fg : dark ? `${theme.fg}14` : 'rgba(255,255,255,0.35)',
          color: on ? (dark ? theme.bg : 'var(--bg)') : today ? 'var(--brass)' : dark ? `${theme.fg}cc` : 'var(--ink-3)',
        };
        return (
          <button
            key={day.id}
            role="tab"
            aria-selected={on}
            aria-label={`Day ${i + 1}${today ? ', today' : ''}`}
            onClick={() => onPick(i)}
            style={style}
          >
            {today && <span style={{ width: 5, height: 5, borderRadius: '50%', background: on ? 'var(--brass)' : 'var(--brass)' }} />}
            {chipLabel(dateStart, i)}
          </button>
        );
      })}
    </div>
  );
}

// ── HERO TABS ────────────────────────────────────────────────────────────────
// Three pills inside the dark hero card. Logistics and Weather are reference
// pages, so they live at the top of the page rather than floating over it.
function HeroTabs({ active, onChange, theme }: {
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
    <div role="tablist" style={{ display: 'flex', gap: 4, padding: 3, borderRadius: 999, background: `${theme.fg}14` }}>
      {tabs.map(tab => {
        const isActive = tab.key === active;
        return (
          <button
            key={tab.key}
            role="tab"
            aria-selected={isActive}
            className="pressable"
            onClick={() => onChange(tab.key)}
            style={{
              flex: 1,
              minHeight: 40,
              fontFamily: 'var(--font-mono)',
              fontSize: 9.5,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: isActive ? theme.bg : `${theme.fg}b8`,
              background: isActive ? theme.fg : 'transparent',
              borderRadius: 999,
              transition: 'background 0.15s ease, color 0.15s ease',
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
  shots: Shot[];
  carry: Carry[];
}

const TAB_HASHES: Record<string, Tab> = { logistics: 'logistics', weather: 'weather', itinerary: 'itinerary' };

export function TripView({ trip, logistics, days, shots: initialShots, carry }: TripViewProps) {
  const router = useRouter();
  const [activeTab, setActiveTabState] = useState<Tab>('itinerary');

  // ── koma ──────────────────────────────────────────────────────────────────
  // Hidden, not locked — the same call daizu makes for /barista. The mode is
  // reached by long-pressing the aperture mark in the header; the shots come
  // down with the trip, so it works logged out and offline from the SW cache.
  const [shots, setShots]     = useState<Shot[]>(initialShots);
  const [komaOn, setKomaOn]   = useState(false);
  const [sunMode, setSunMode] = useState(false);

  useEffect(() => { setShots(initialShots); }, [initialShots]);

  useEffect(() => {
    try {
      if (localStorage.getItem('koma:sun') === '1') setSunMode(true);
    } catch { /* private mode */ }
    // /trips/<slug>#koma opens straight into the shooting plan, which is how
    // the admin list links through to it.
    if (window.location.hash === '#koma') setKomaOn(true);
  }, []);

  const toggleSun = useCallback(() => {
    setSunMode(v => {
      const next = !v;
      try { localStorage.setItem('koma:sun', next ? '1' : '0'); } catch { /* private mode */ }
      return next;
    });
  }, []);

  const applyShot = useCallback((next: Shot) => {
    setShots(cur => cur.map(s => (s.id === next.id ? next : s)));
  }, []);
  const [weatherMap, setWeatherMap]     = useState<Record<string, DayWeather>>({});
  const [weatherLoading, setLoading]    = useState(false);
  const [isSeasonal, setIsSeasonal]     = useState(false);
  const theme = THEMES[trip.header_theme] ?? THEMES.forest;

  // Day awareness. todayIdx is -1 outside the trip; computed on the client so
  // the server render (UTC) never disagrees with the phone.
  const [todayIdx, setTodayIdx]   = useState(-1);
  const [activeDay, setActiveDay] = useState(0);
  const [pinnedDay, setPinnedDay] = useState(-1);
  const [railOpen, setRailOpen]   = useState(false);
  const pendingDay = useRef<number | null>(null);

  const hasCoords = (trip.lat != null && trip.lng != null && !!trip.date_start)
    || days.some(d => d.lat != null && d.lng != null);

  // ── today ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!trip.date_start) return;
    const compute = () => {
      const today = fmtLocalDate(new Date());
      let idx = -1;
      for (let i = 0; i < days.length; i++) if (dateForDay(trip.date_start!, i) === today) idx = i;
      setTodayIdx(idx);
      return idx;
    };
    const idx = compute();
    // Open on the current day unless the URL points somewhere specific
    const hash = window.location.hash.replace('#', '');
    if (!TAB_HASHES[hash] && !hash.startsWith('day-') && !hash.startsWith('stop-') && idx > 0) {
      pendingDay.current = idx;
    } else if (TAB_HASHES[hash]) {
      setActiveTabState(TAB_HASHES[hash]);
    }
    // Recompute when the phone wakes up on a new day
    const onVisible = () => { if (document.visibilityState === 'visible') compute(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [trip.date_start, days.length]);

  // ── scroll to a day ──────────────────────────────────────────────────────
  const scrollToDay = useCallback((i: number, behavior: ScrollBehavior = 'smooth') => {
    const el = document.getElementById(`day-${i}`);
    if (!el) return;
    // scroll-margin-top on the section keeps the full header clear of the status bar
    el.scrollIntoView({ block: 'start', behavior });
    setActiveDay(i);
    setRailOpen(false);
  }, []);

  // A day jump requested before the itinerary was on screen
  useEffect(() => {
    if (activeTab !== 'itinerary' || pendingDay.current == null) return;
    const i = pendingDay.current;
    pendingDay.current = null;
    // Two frames so fonts and the sticky bar have laid out
    requestAnimationFrame(() => requestAnimationFrame(() => scrollToDay(i, 'instant' as ScrollBehavior)));
  }, [activeTab, scrollToDay]);

  // ── track the day in view and whether its header has pinned ─────────────
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      if (activeTab !== 'itinerary') return;
      const blocks = document.querySelectorAll<HTMLElement>('[data-day-idx]');
      let current = 0;
      let currentEl: HTMLElement | null = null;
      blocks.forEach(b => {
        if (b.getBoundingClientRect().top <= 80) { current = Number(b.dataset.dayIdx); currentEl = b; }
      });
      setActiveDay(current);
      // A header is pinned once it sits lower in its section than its own top margin
      let pinned = -1;
      if (currentEl) {
        const el = currentEl as HTMLElement;
        const header = el.querySelector<HTMLElement>('[data-day-header]');
        if (header) {
          const offset = header.getBoundingClientRect().top - el.getBoundingClientRect().top;
          if (offset > DAY_HEADER_MARGIN + 2) pinned = current;
        }
      }
      setPinnedDay(prev => {
        if (prev !== pinned) setRailOpen(false);
        return pinned;
      });
    };
    // rAF is paused in background tabs, so run synchronously there; otherwise
    // coalesce to one pass per frame
    const onScroll = () => {
      if (document.visibilityState === 'hidden') {
        // a frame requested before the tab went hidden would otherwise block every later pass
        if (raf) { cancelAnimationFrame(raf); raf = 0; }
        update();
        return;
      }
      if (!raf) raf = requestAnimationFrame(update);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [activeTab]);

  // ── tabs ─────────────────────────────────────────────────────────────────
  const setActiveTab = useCallback((t: Tab) => {
    setActiveTabState(t);
    try { history.replaceState(null, '', t === 'itinerary' ? window.location.pathname : `#${t}`); } catch {}
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, []);

  const goToday = useCallback(() => {
    if (todayIdx < 0) return;
    if (activeTab !== 'itinerary') {
      pendingDay.current = todayIdx;
      setActiveTab('itinerary');
    } else {
      scrollToDay(todayIdx);
    }
  }, [todayIdx, activeTab, setActiveTab, scrollToDay]);

  const pickDay = useCallback((i: number) => {
    if (activeTab !== 'itinerary') {
      pendingDay.current = i;
      setActiveTab('itinerary');
    } else {
      scrollToDay(i);
    }
  }, [activeTab, setActiveTab, scrollToDay]);

  // ── stale-tab refresh: a tab left open overnight re-fetches on wake ───────
  useEffect(() => {
    let hiddenAt = 0;
    const onVis = () => {
      if (document.visibilityState === 'hidden') { hiddenAt = Date.now(); return; }
      if (hiddenAt && Date.now() - hiddenAt > 10 * 60 * 1000) router.refresh();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [router]);

  // ── weather ──────────────────────────────────────────────────────────────
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

    // Trips beyond the 16-day forecast window fall back to seasonal averages:
    // the same date range from a prior year, fetched via the /api/weather proxy
    // (historical-forecast-api — reachable from Vercel, unlike archive-api).
    const forecastLimit = new Date();
    forecastLimit.setDate(forecastLimit.getDate() + 16);
    const useSeasonal = new Date(trip.date_start + 'T00:00') > forecastLimit;

    let cancelled = false;
    setLoading(true);
    setIsSeasonal(false);

    (async () => {
      const locationGroups = getLocationGroups();
      if (locationGroups.length === 0) {
        if (!cancelled) setLoading(false);
        return;
      }

      const allResults: DayWeather[] = [];

      for (const group of locationGroups) {
        const results = useSeasonal
          ? await fetchSeasonalWeather(group.lat, group.lng, group.dateStart, group.dateEnd)
          : await fetchWeather(group.lat, group.lng, group.dateStart, group.dateEnd);
        allResults.push(...results);
      }

      if (cancelled) return;
      if (useSeasonal && allResults.length > 0) setIsSeasonal(true);
      const map: Record<string, DayWeather> = {};
      for (const w of allResults) map[w.date] = w;
      setWeatherMap(map);
    })().catch(() => {}).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip.lat, trip.lng, trip.date_start, trip.date_end, hasCoords, days.length]);

  const tripWeather = Object.values(weatherMap).sort((a, b) => a.date.localeCompare(b.date));

  function weatherForDay(index: number): DayWeather | null {
    if (!trip.date_start) return null;
    const date = dateForDay(trip.date_start, index);
    return weatherMap[date] ?? null;
  }

  const showRail = !!trip.date_start && days.length > 1;
  const tripActive = todayIdx >= 0;

  return (
    <div style={{
      maxWidth: 'var(--max-w)',
      margin: '0 auto',
      padding: '0 0 calc(env(safe-area-inset-bottom, 0px) + 40px)',
    }}>

      {/* Site header */}
      <header style={{ padding: 'calc(env(safe-area-inset-top, 0px) + 12px) var(--px) 8px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center' }}>
        <a href={komaOn ? '/koma' : '/'} className="tap" style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          minHeight: 44,
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: komaOn ? '#B83C01' : 'var(--brass)',
        }}>
          {!komaOn && <KojiMark size={22} />}
          <span>← {komaOn ? 'rolls' : 'koji'}</span>
        </a>
        {shots.length > 0 && (
          <span style={{ marginLeft: 'auto', display: 'flex', gap: 2, alignItems: 'center' }}>
            {komaOn && (
              <button
                type="button" onClick={toggleSun}
                aria-label="Sun mode" aria-pressed={sunMode}
                style={{
                  width: 30, height: 30, borderRadius: 8, cursor: 'pointer', lineHeight: 1,
                  border: `1px solid ${sunMode ? '#B83C01' : 'var(--border-mid)'}`,
                  background: sunMode ? '#B83C01' : 'transparent',
                  color: sunMode ? '#FBE7D4' : 'var(--ink-3)', fontSize: 14,
                }}
              >☀</button>
            )}
            <KomaMark on={komaOn} onToggle={() => setKomaOn(v => !v)} />
          </span>
        )}
        <a
          href={`/admin/trips/${trip.id}`}
          className="tap"
          style={{
            marginLeft: shots !== null ? 10 : 'auto',
            color: 'var(--ink-4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 44,
            minHeight: 44,
          }}
          aria-label="Edit trip"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/>
          </svg>
        </a>
      </header>

      {/* Trip hero: rounded dark card with the title, dates, weather and day rail */}
      <div style={{ margin: '12px 12px 0', background: theme.bg, color: theme.fg, borderRadius: 18, padding: '20px 18px 16px' }}>
        <h1 style={{
          fontFamily: 'var(--font-serif)',
          fontWeight: 300,
          fontSize: 26,
          letterSpacing: '-0.01em',
          lineHeight: 1.15,
          color: theme.fg,
          marginBottom: 4,
        }}>
          {trip.title}
        </h1>
        <div style={{
          fontFamily: 'var(--font-serif)',
          fontWeight: 300,
          fontStyle: 'italic',
          fontSize: 15,
          opacity: 0.75,
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

        {hasCoords && (
          <WeatherHeroCard
            loading={weatherLoading}
            weather={tripWeather}
            isSeasonal={isSeasonal}
            fg={theme.fg}
          />
        )}

        <div style={{ marginTop: 14 }}>
          <HeroTabs active={activeTab} onChange={setActiveTab} theme={theme} />
        </div>
        {showRail && activeTab === 'itinerary' && (
          <div style={{ marginTop: 10 }}>
            <DayRail days={days} dateStart={trip.date_start!} active={activeDay} todayIdx={todayIdx} onPick={pickDay} variant="dark" theme={theme} />
          </div>
        )}
      </div>

      {/* ITINERARY TAB */}
      {activeTab === 'itinerary' && komaOn && (
        <KomaView
          trip={trip}
          days={days}
          shots={shots}
          carry={carry}
          dateForDay={(i) => (trip.date_start ? dateForDay(trip.date_start, i) : null)}
          todayIdx={todayIdx}
          sunMode={sunMode}
          onShotChange={applyShot}
        />
      )}

      {activeTab === 'itinerary' && !komaOn && (
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
                isToday={i === todayIdx}
                pinned={i === pinnedDay}
                railOpen={railOpen}
                onToggleRail={() => setRailOpen(v => !v)}
                showToday={tripActive && i !== todayIdx}
                onToday={goToday}
                rail={showRail ? (
                  <DayRail days={days} dateStart={trip.date_start!} active={activeDay} todayIdx={todayIdx} onPick={pickDay} variant="glass" theme={theme} />
                ) : null}
              />
            ))}
          </main>
        </>
      )}

      {/* LOGISTICS TAB */}
      {activeTab === 'logistics' && <LogisticsSection logistics={logistics} theme={theme} />}

      {/* WEATHER TAB */}
      {activeTab === 'weather' && (() => {
        const hasData = Object.keys(weatherMap).length > 0;
        if (!hasData) {
          return (
            <div style={{
              padding: '60px 24px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
            }}>
              <span style={{ fontSize: 32 }}>{weatherLoading ? '🌤️' : '🗓️'}</span>
              <div style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 18,
                color: 'var(--ink)',
                fontWeight: 400,
              }}>
                {weatherLoading ? 'Loading weather…' : 'Weather unavailable'}
              </div>
              {!weatherLoading && (
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: 'var(--ink-4)',
                  maxWidth: 240,
                  lineHeight: 1.6,
                }}>
                  Live forecasts within 16 days of departure · seasonal averages otherwise
                </div>
              )}
            </div>
          );
        }
        return (
          <WeatherTab
            days={days}
            weatherMap={weatherMap}
            trip={trip}
            isSeasonal={isSeasonal}
            theme={theme}
          />
        );
      })()}

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
