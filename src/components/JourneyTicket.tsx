'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import type { Stop } from '@/lib/supabase';
import { renderMd } from '@/lib/markdown';
import { gloss } from '@/lib/glossary';
import { zoneAbbr } from '@/lib/bookings';
import { WhoChip } from './WhoChip';
import type { Dress } from '@/lib/maps';
import { cjkFont } from '@/lib/dress';
import { SayChip, hasPhrase } from './SayIt';
import { LiveryLine, SpeedStreaks, TrainNote, hasLivery, liveryParts } from './TrainLivery';

// ── JOURNEY TICKET ──────────────────────────────────────────────────────────
// A travel stop you have to be on time for: one with a clock time and either a
// duration or an arrival. It reads as a ticket in a pale wash of the day's
// colour: the departure on the left, a little train, plane or ferry on the
// dotted route, and the arrival on the right, taken from arrive_label or
// worked out from the duration. The title already says where it goes, so the
// ticket doesn't repeat it. Zones (PT, JST) show only when the arrival names
// one, i.e. a flight that crosses them. "Land at ..." stops, hops without a
// duration and untimed errands stay ordinary stop cards, except a past trip's
// train whose time was never kept: both station names and a long enough
// duration make it a ticket with its label ("morning") where the departure
// sits and no arrival (isUntimedJourney).
//
// Destination dress (step 3a): from_name / to_name ("Gora") lead above each
// time on any trip, with from_local / to_local (強羅) beside them as the
// smaller partner on Japan and China trips, service_label
// ("のぞみ Nozomi 21", "G8602") joins the label on the route, and seat_label
// is one line in the lower half. Each shows only when set, so a ticket with
// none of them renders exactly as before. The wash stays the day's colour.

const PLANE_LAB = 'https://san-plane-lab.vercel.app/#';

type Clock = { h: number; m: number; mer: 'am' | 'pm' };

function parseClock(label: string | null): Clock | null {
  const m = label?.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
  if (!m) return null;
  const h = Number(m[1]);
  if (h < 1 || h > 12) return null;
  return { h, m: m[2] ? Number(m[2]) : 0, mer: m[3].toLowerCase() as 'am' | 'pm' };
}

/** "2 h 15", "1 h 50 · 1 change", "5 h", "1½ h", "35 min". Null if there's an extra leg ("+ bus"). */
function parseMinutes(d: string | null | undefined): number | null {
  if (!d || d.includes('+')) return null;
  const hm = d.match(/(\d+)(½)?\s*h(?:\s*(\d+))?/);
  if (hm) return Number(hm[1]) * 60 + (hm[2] ? 30 : 0) + (hm[3] ? Number(hm[3]) : 0);
  const mins = d.match(/(\d+)\s*min/);
  return mins ? Number(mins[1]) : null;
}

function addMinutes(c: Clock, mins: number): Clock {
  const start = ((c.h % 12) + (c.mer === 'pm' ? 12 : 0)) * 60 + c.m;
  const t = (start + mins) % (24 * 60);
  const h24 = Math.floor(t / 60);
  return { h: h24 % 12 || 12, m: t % 60, mer: h24 >= 12 ? 'pm' : 'am' };
}

const fmt = (c: Clock) => `${c.h}:${String(c.m).padStart(2, '0')}`;

export function isFlight(stop: Stop): boolean {
  return /^flight/i.test(stop.tag);
}

/** Shorter hops (a 5-minute ferry, a 15-minute local) stay ordinary cards. */
const TICKET_MIN_MINUTES = 45;

/** Minutes from departure to arrival, from the duration or the arrival time. */
function tripMinutes(stop: Stop, dep: Clock): number | null {
  const mins = parseMinutes(stop.duration_label);
  if (mins != null) return mins;
  const arr = parseClock(stop.arrive_label ?? null);
  if (!arr) return null;
  const toMin = (c: Clock) => ((c.h % 12) + (c.mer === 'pm' ? 12 : 0)) * 60 + c.m;
  return (toMin(arr) - toMin(dep) + 24 * 60) % (24 * 60);
}

/**
 * A ticket needs a clock time to hang on, and a duration or an arrival.
 * Flights always get one; other trips only when they run 45 minutes or more
 * (or when the length can't be worked out, e.g. "35 min + bus").
 * A past trip's trains often have no clock ("morning"): see isUntimedJourney.
 */
export function isJourney(stop: Stop): boolean {
  if (/^land\b/i.test(stop.title)) return false;
  const dep = parseClock(stop.time_label);
  if (!dep) return isUntimedJourney(stop);
  if (!stop.duration_label && !parseClock(stop.arrive_label ?? null)) return false;
  if (isFlight(stop)) return true;
  const mins = tripMinutes(stop, dep);
  return mins == null || mins >= TICKET_MIN_MINUTES;
}

/**
 * The second way in, for a record whose departure time was never kept: no
 * clock in time_label ("morning", or none), but both station names and a
 * duration of 45 minutes or more (or one that can't be worked out). Not a
 * flight. It renders as a ticket with the time_label as a small note where
 * the departure sits and no arrival; nothing that needs a clock (the night
 * ticket, the Now card, alerts, folding) ever counts it.
 */
function isUntimedJourney(stop: Stop): boolean {
  if (parseClock(stop.time_label) || isFlight(stop)) return false;
  if (!stop.from_name?.trim() || !stop.to_name?.trim() || !stop.duration_label) return false;
  const mins = parseMinutes(stop.duration_label);
  return mins == null || mins >= TICKET_MIN_MINUTES;
}

/**
 * "4:30pm JST · Fri" → the time, and "JST · Fri" for the line under it.
 * "7:25am · Wed" → "Wed": the separator after the time is dropped, or the
 * note opened on a stray dot. "~7:00pm" → the time, approximate, and no note:
 * the tilde used to stop the time matching, so the whole label was repeated.
 */
function parseArrival(label: string | null | undefined): { at: Clock; note: string; approx: boolean } | null {
  const at = parseClock(label ?? null);
  if (!at || !label) return null;
  const approx = /^\s*~/.test(label);
  const note = label
    .replace(/^\s*~?\s*\d{1,2}(?::\d{2})?\s*(am|pm)\s*/i, '')
    .replace(/^[·•,\-–—\s]+/, '')
    .trim();
  return { at, note, approx };
}

/**
 * An overnight journey: a ticket (not a flight) whose arrival is the next
 * morning, like the sleeper into West Kowloon. The day after it opens with a
 * small sunrise. Flights are left out: they cross zones, so their clocks
 * can't be compared, and they have their own landing stop.
 */
export function arrivesNextMorning(stop: Stop): boolean {
  if (!isJourney(stop) || isFlight(stop)) return false;
  const dep = parseClock(stop.time_label);
  if (!dep) return false;
  const mins = tripMinutes(stop, dep);
  if (mins == null) return false;
  const toMin = (c: Clock) => ((c.h % 12) + (c.mer === 'pm' ? 12 : 0)) * 60 + c.m;
  const end = toMin(dep) + mins;
  return end >= 24 * 60 && end < 36 * 60;
}

/**
 * Half a sun on its horizon with three short rays: the sunrise mark on koma's
 * sun chart (SunTrack), drawn small for the first stop after a night train.
 */
export function SunriseMark({ color = 'var(--brass)' }: { color?: string }) {
  return (
    <svg viewBox="0 0 18 12" width="17" height="11" aria-label="sunrise" role="img"
      style={{ display: 'inline-block', verticalAlign: '-1px', marginRight: 6, color }}>
      <path d="M4.2 10a4.8 4.8 0 0 1 9.6 0z" fill="currentColor" />
      <path d="M0.5 10.6h17M9 1v2M3.2 3.6l1.3 1.4M14.8 3.6l-1.3 1.4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none" />
    </svg>
  );
}

function modeOf(stop: Stop): 'plane' | 'ferry' | 'train' {
  if (isFlight(stop)) return 'plane';
  if (/\b(ferry|boat)\b/i.test(stop.title)) return 'ferry';
  return 'train';
}

/** Plane Lab ids → the name on the ticket. */
export function aircraftName(id: string): string {
  const s = id.trim();
  if (/^7\d7/.test(s)) return `Boeing ${s.toUpperCase()}`;
  if (/^a\d/i.test(s)) return `Airbus ${s.toUpperCase()}`;
  if (/^e\d/i.test(s)) return `Embraer ${s.toUpperCase()}`;
  return s.toUpperCase();
}

const PATHS: Record<'train' | 'plane' | 'ferry', React.ReactNode> = {
  train: (
    <>
      <path d="M3 5.2h23.5c6.2 0 11.6 2.9 14.3 7.4.5.9-.1 1.9-1.1 1.9H3.4c-.8 0-1.4-.6-1.4-1.4V6.4c0-.7.5-1.2 1-1.2z" fill="currentColor" />
      <path d="M27.5 6.4c3.7.3 7 1.9 9.3 4.4h-7.1c-1.2 0-2.2-1-2.2-2.2z" fill="var(--surface)" opacity=".9" />
      <g fill="var(--surface)">
        <rect x="6" y="7.4" width="3.6" height="2.6" rx=".9" /><rect x="11.4" y="7.4" width="3.6" height="2.6" rx=".9" />
        <rect x="16.8" y="7.4" width="3.6" height="2.6" rx=".9" /><rect x="22.2" y="7.4" width="3.2" height="2.6" rx=".9" />
      </g>
      <path d="M2.2 12h34.6" stroke="var(--surface)" strokeWidth=".9" opacity=".8" />
      <circle cx="34.6" cy="12.6" r=".9" fill="#FFE7A8" />
    </>
  ),
  plane: (
    <>
      <path d="M5.2 6.2 3 1.4h3.2l5.6 4.8z" fill="currentColor" />
      <path d="M4 9c0-1.6 1.3-2.8 2.9-2.8h25.6c4.4 0 8.4 1.3 9.4 2.6.6.8-.4 2.1-3.4 2.4l-31.4.4C5.4 11.6 4 10.6 4 9z" fill="currentColor" />
      <path d="M17 10.8l7.4 6h3.4l-3.8-6z" fill="currentColor" />
      <path d="M3.4 8.6l-2-1.2h2.8l2.6 1.4z" fill="currentColor" opacity=".7" />
      <g fill="var(--surface)">
        {[12, 15, 18, 21, 24, 27].map(x => <circle key={x} cx={x} cy="8.3" r=".75" />)}
        <path d="M35.6 7.4c1.8.2 3.4.7 4.4 1.3h-4.4z" />
      </g>
    </>
  ),
  ferry: (
    <>
      <path d="M3 10.6h38l-4.6 5.2H8.2z" fill="currentColor" />
      <path d="M9.4 6h20.4l4.2 4.6H7.2z" fill="currentColor" opacity=".85" />
      <rect x="15" y="2.2" width="4" height="3.8" rx=".6" fill="currentColor" />
      <g fill="var(--surface)">
        <rect x="11.6" y="7.4" width="2.6" height="1.8" rx=".5" /><rect x="16" y="7.4" width="2.6" height="1.8" rx=".5" />
        <rect x="20.4" y="7.4" width="2.6" height="1.8" rx=".5" /><rect x="24.8" y="7.4" width="2.6" height="1.8" rx=".5" />
      </g>
    </>
  ),
};

export function JourneyGlyph({ mode, size = 44, lit = false }: { mode: 'train' | 'plane' | 'ferry'; size?: number; lit?: boolean }) {
  return (
    <svg viewBox="0 0 44 18" width={size} height={size * 18 / 44} aria-hidden="true" style={{ display: 'block' }}>
      {lit && mode === 'train' ? LIT_TRAIN : PATHS[mode]}
    </svg>
  );
}

// ── THE NIGHT TICKET ────────────────────────────────────────────────────────
// An overnight train (arrivesNextMorning: today only the G895 sleeper) reads
// as going to sleep in one city and waking in another. The upper half runs
// from night (the placard's ink) through plum and rose to a peach dawn behind
// the arrival; the lower half carries a faint dusk on its left that fades into
// the usual wash. Stars over the night only, a crescent at the start of the
// route, a sun coming up at its end, the train's windows lit. The colours are
// fixed, not the day's stay colour, so the sleeper looks the same whichever
// town the night belongs to. Every other ticket renders exactly as before.
//
// The stops are tuned so no text lands in the back half of the plum-to-rose
// band (58-61% here), where neither the parchment nor the dawn ink reaches
// 4.5:1. At 375px the note, departure and duration end before it and the
// arrival starts after it; the title is held to the dark half and wraps, and
// the note says "sleeper" rather than "high-speed train" (the number's tip
// still says G). Re-check every text box at 375px after changing them.
const NIGHT = {
  ink: '#1E1B17', plum: '#4A2F33', rose: '#C98A78', peach: '#F2D3B8',
  parch: '#F3EEE4', tag: '#E8B9B2', dawnInk: '#4A1C18', sun: '#B5322A', windows: '#F2C879',
};
/** The upper half's sky, with the plum-to-rose band placed at [plum, rose] %. */
const nightTop = (plum: number, rose: number) =>
  `linear-gradient(90deg, ${NIGHT.ink} 0%, ${NIGHT.ink} ${Math.max(0, plum - 7)}%, ${NIGHT.plum} ${plum}%, ${NIGHT.rose} ${rose}%, ${NIGHT.peach} ${Math.min(100, rose + 7)}%, ${NIGHT.peach} 100%)`;
/** The duration sits mid-route, where the band is on a narrow phone: it
 *  carries its own bit of night, invisible over the dark part. */
const NIGHT_HALO = '0 0 3px #1E1B17, 0 0 6px #1E1B17, 0 0 10px #1E1B17';
/** Where the band sits before the text is measured (right at 375px). */
const NIGHT_BAND: [number, number] = [55, 61];

/**
 * Places the band between the light text and the dark: parchment stays
 * readable up to halfway from plum to rose, the dawn ink from rose on. Text
 * marked data-nl (light) must end, and data-nd (dark) start, on its side.
 */
function measureBand(box: HTMLElement): [number, number] {
  const b = box.getBoundingClientRect();
  if (!b.width) return NIGHT_BAND;
  const extent = (sel: string, side: 'right' | 'left') => {
    let v = side === 'right' ? 0 : 100;
    box.querySelectorAll(sel).forEach(el => {
      const range = document.createRange();
      range.selectNodeContents(el);
      for (const r of range.getClientRects()) {
        if (!r.width) continue;
        const pct = ((side === 'right' ? r.right : r.left) - b.left) / b.width * 100;
        v = side === 'right' ? Math.max(v, pct) : Math.min(v, pct);
      }
    });
    return v;
  };
  const lightEnd = extent('[data-nl]', 'right') + 1;
  const darkStart = extent('[data-nd]', 'left') - 1;
  // The dawn text starts on rose; the night holds solid past the light text
  // and turns about 8 points before it. Too tight (a narrow phone): the band
  // shrinks toward a hard edge between the two.
  const rose = darkStart;
  const plum = Math.max(0, Math.min(Math.max(lightEnd + 7, rose - 8), rose - 0.5));
  return [Math.round(plum * 10) / 10, Math.round(rose * 10) / 10];
}
// Stars, over the night only (left of 48%) and only where no text can land
// whatever wraps or a verdict stamp pushes down: a strip above the tag row,
// the bottom padding under the title, and two inside the route under the
// line (ROUTE_STARS). [left %, px from the top or bottom edge, opacity].
const STARS: [number, 'top' | 'bottom', number, number][] = [
  [6, 'top', 5, 0.55], [19, 'top', 8, 0.4], [33, 'top', 4, 0.7], [44, 'top', 7, 0.5],
  [12, 'bottom', 4, 0.4], [31, 'bottom', 5, 0.55], [42, 'bottom', 26, 0.45],
];
const ROUTE_STARS: [number, number, number][] = [[14, 33, 0.5], [6, 40, 0.35]];

const LIT_TRAIN = (
  <>
    <path d="M3 5.2h23.5c6.2 0 11.6 2.9 14.3 7.4.5.9-.1 1.9-1.1 1.9H3.4c-.8 0-1.4-.6-1.4-1.4V6.4c0-.7.5-1.2 1-1.2z" fill="currentColor" />
    <path d="M27.5 6.4c3.7.3 7 1.9 9.3 4.4h-7.1c-1.2 0-2.2-1-2.2-2.2z" fill={NIGHT.ink} opacity=".75" />
    <g fill={NIGHT.windows}>
      <rect x="6" y="7.4" width="3.6" height="2.6" rx=".9" /><rect x="11.4" y="7.4" width="3.6" height="2.6" rx=".9" />
      <rect x="16.8" y="7.4" width="3.6" height="2.6" rx=".9" /><rect x="22.2" y="7.4" width="3.2" height="2.6" rx=".9" />
    </g>
    <path d="M2.2 12h34.6" stroke={NIGHT.ink} strokeWidth=".9" opacity=".35" />
    <circle cx="34.6" cy="12.6" r=".9" fill="#FFE7A8" />
  </>
);

function Moon() {
  return (
    <svg viewBox="0 0 14 14" width="12" height="12" aria-hidden="true" style={{ position: 'absolute', left: -1, top: 6, color: NIGHT.parch }}>
      <path d="M10.8 9.9A5.6 5.6 0 0 1 5.2 2.2a5.6 5.6 0 1 0 7.3 7.1 5.5 5.5 0 0 1-1.7.6z" fill="currentColor" />
    </svg>
  );
}

function DawnSun() {
  return (
    <svg viewBox="0 0 18 12" width="17" height="11" aria-hidden="true" style={{ position: 'absolute', right: -1, top: 9, color: NIGHT.sun }}>
      <path d="M4.2 10a4.8 4.8 0 0 1 9.6 0z" fill="currentColor" />
      <path d="M0.5 10.6h17M9 1v2M3.2 3.6l1.3 1.4M14.8 3.6l-1.3 1.4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none" />
    </svg>
  );
}

/**
 * The berth, read out of seat_label: "Car 9 · Berth 23 lower" (or "berth 23",
 * "23 lower") gives "23" and "lower"; 12306's "9车 23号下铺" gives the same.
 * The rest of the label ("Car 9") stays on the seat line. No berth: null.
 */
export function parseBerth(seat: string): { berth: string; pos: string; rest: string } | null {
  const en = seat.match(/\bberth\s*(\d{1,3})\s*(upper|middle|lower)?\b/i);
  if (en) return { berth: en[1], pos: (en[2] ?? '').toLowerCase(), rest: seat.replace(en[0], '').replace(/^[\s·,]+|[\s·,]+$/g, '') };
  const zh = seat.match(/(\d{1,3})号\s*(上|中|下)?铺/);
  if (zh) return { berth: zh[1], pos: zh[2] ? { 上: 'upper', 中: 'middle', 下: 'lower' }[zh[2]]! : '', rest: seat.replace(zh[0], '').trim() };
  return null;
}

/** The berth's tear-off at the right of the seat line: a dash until it's booked. */
function BerthStub({ berth, pos, color }: { berth: string | null; pos: string; color: string }) {
  const k: React.CSSProperties = { fontSize: 9.5, letterSpacing: '0.16em', opacity: 0.7, textTransform: 'uppercase' };
  return (
    <span aria-label={berth ? `Berth ${berth}${pos ? `, ${pos}` : ''}` : 'Berth not booked yet'} style={{
      flex: 'none', marginLeft: 'auto', borderLeft: `1.5px dashed ${color}`, padding: '2px 0 2px 12px',
      textAlign: 'center', fontFamily: 'var(--font-mono)', lineHeight: 1.15, color,
    }}>
      <span style={{ ...k, display: 'block' }}>Berth</span>
      <span className="num" style={{ display: 'block', fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 22 }}>{berth ?? '—'}</span>
      <span style={{ ...k, display: 'block' }}>{pos || 'sleeper'}</span>
    </span>
  );
}

const small: React.CSSProperties = {
  display: 'block',
  fontFamily: 'var(--font-mono)',
  fontSize: 11.5,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  marginTop: 5,
  opacity: 0.7,
  fontWeight: 400,
};

/** "11:30" with a smaller "am" set right after it, and an optional line under. */
function TicketTime({ c, approx, under, align, lift, color, mark }: { c: Clock; approx?: boolean; under?: string; align: 'left' | 'right'; lift?: React.CSSProperties; color?: string;
  /** The night ticket: which side of the dawn this text must stay on. */
  mark?: 'light' | 'dark' }) {
  return (
    <div className="num" data-nl={mark === 'light' ? '' : undefined} data-nd={mark === 'dark' ? '' : undefined} style={{ textAlign: align, fontFamily: 'var(--font-serif)', fontWeight: 300, fontSize: 30, lineHeight: 1, whiteSpace: 'nowrap', color, ...lift }}>
      {approx ? '~' : ''}{fmt(c)}<span style={{ fontSize: 15, marginLeft: 1 }}>{c.mer}</span>
      {under && <small style={small}>{under}</small>}
    </div>
  );
}

// What kind of train a named service is, said under its name on the ticket
// ("のぞみ Nozomi" / "fastest bullet train"), since the names alone don't say.
const KINDS: [RegExp, string, boolean][] = [
  [/nozomi|のぞみ/i, 'fastest', true],
  [/hikari|ひかり/i, 'semi-fast', true],
  [/kodama|こだま/i, 'all-stops', true],
  [/mizuho|みずほ/i, 'fastest', true],
  [/sakura|さくら/i, 'semi-fast', true],
  [/relay kamome|リレーかもめ/i, 'limited express', false],
  [/kamome|かもめ/i, 'Nishi-Kyushu', true],
  [/midori|みどり|huis ten bosch|ハウステンボス|romancecar|ロマンスカー/i, 'limited express', false],
];
// China's labels are numbers; the letter in front is the type: G 高速动车组
// (the fastest class), D 动车组 (a slower one, 200-250 km/h; 200 or less once
// China renumbers in late December 2026), C 城际 (intercity). The words hold
// under both numberings.
const CN_KINDS: Record<string, string> = { G: 'high-speed train', D: 'express train', C: 'intercity train' };

export function trainKind(service: string): string {
  if (!service) return '';
  const cn = service.split(/\s*\+\s*/).map(part => part.match(/^([GDC])\d{1,4}\b/)?.[1]);
  if (cn.every(Boolean)) {
    const kinds = cn.map(l => CN_KINDS[l!]);
    // Two of a kind are said once ("high-speed trains"); different kinds in order.
    return kinds.every(k => k === kinds[0]) ? (kinds.length === 1 ? kinds[0] : `${kinds[0]}s`) : kinds.join(', then ');
  }
  const parts = service.split(/\s*\+\s*/).map(part => KINDS.find(([re]) => re.test(part))).filter(Boolean) as [RegExp, string, boolean][];
  if (!parts.length) return '';
  if (parts.every(p => p[2])) {
    const words = parts.map(p => p[1]);
    // Two named trains say which kind each is through their dots and route
    // line; the note just says they're both bullet trains.
    return words.length === 1 ? `${words[0]} bullet train` : 'bullet trains';
  }
  return parts.map(p => p[2] ? `${p[1]} bullet train` : p[1]).join(', then ');
}

// The ferry's water: a wave drawn as a mask, so it takes the ticket's colour.
const WAVE_SVG = `url("data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="14" height="6" viewBox="0 0 14 6"><path d="M0 3.2 C2.3 0.6 4.7 0.6 7 3.2 S11.7 5.8 14 3.2" fill="none" stroke="#000" stroke-width="1.5"/></svg>')}")`;
const WAVE: React.CSSProperties = {
  WebkitMaskImage: WAVE_SVG, maskImage: WAVE_SVG,
  WebkitMaskRepeat: 'repeat-x', maskRepeat: 'repeat-x',
  WebkitMaskSize: '14px 6px', maskSize: '14px 6px',
  WebkitMaskPosition: 'center', maskPosition: 'center',
};

/** Two short strokes trailing off the stern, so the boat reads as under way. */
function Wake() {
  return (
    <svg viewBox="0 0 14 8" width="14" height="8" aria-hidden="true" style={{ position: 'absolute', right: '100%', bottom: 1, marginRight: -3, opacity: 0.55 }}>
      <path d="M13 2.2 C9.5 2.2 7 1 3.5 1.2" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M13 5.8 C9 5.8 5.5 7.2 1 6.8" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function JourneyTicket({ stop, accent, tz, dress = null, stamp, footer }: {
  stop: Stop;
  /** Japan / China: the font and lang for the local station names, and the phrase chip. */
  dress?: Dress;
  /** The day's zone, for the departure's "PT" when a flight crosses zones. */
  tz?: string | null;
  /** The day's colour: tonight's town, or the trip's. */
  accent: string;
  stamp?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  // Null on an untimed ticket (isUntimedJourney): no departure, no arrival.
  const dep = parseClock(stop.time_label);
  const depNote = dep ? '' : stop.time_label?.trim() || '';
  const given = dep ? parseArrival(stop.arrive_label) : null;
  const mins = parseMinutes(stop.duration_label);
  const arr = given?.at ?? (dep && mins != null ? addMinutes(dep, mins) : null);
  // A named zone on the arrival means the trip crosses zones: name both ends.
  const depZone = given?.note && tz ? zoneAbbr(tz, new Date()) : undefined;
  const mode = modeOf(stop);
  const ferry = mode === 'ferry';
  const changes = Number(stop.duration_label?.match(/(\d+)\s*change/)?.[1] ?? 0);
  // The train note glosses the number; the body leaves train numbers plain.
  const bodyHtml = gloss(renderMd(stop.body_md), dress, { trainNumbers: !stop.service_label?.trim() });
  const tint = `color-mix(in srgb, ${accent} 17%, var(--surface))`;
  const deep = `color-mix(in srgb, ${accent} 62%, var(--ink))`;
  const routeLabel = stop.duration_label || '';
  const service = stop.service_label?.trim() || '';
  const kind = trainKind(service);
  const parts = mode === 'train' ? liveryParts(service) : [];
  const livery = hasLivery(parts);
  const bullet = parts.some(p => p.livery?.bullet);
  const seat = stop.seat_label?.trim() || '';
  // An overnight train gets the night ticket (see NIGHT above).
  const night = mode === 'train' && arrivesNextMorning(stop);
  const berth = night ? parseBerth(seat) : null;
  const seatText = berth ? berth.rest : seat;
  const fg = night ? NIGHT.parch : deep;
  // Where it goes, readably: from_name / to_name ("Gora", "West Kowloon") lead
  // on any trip. The local names (強羅) need a dress for the font and lang, and
  // ride beside the name as its smaller partner; alone, they show as before.
  const fromName = stop.from_name?.trim() || '';
  const toName = stop.to_name?.trim() || '';
  const fromLocal = dress ? stop.from_local?.trim() || '' : '';
  const toLocal = dress ? stop.to_local?.trim() || '' : '';
  const hasStations = !!(fromName || toName || fromLocal || toLocal);
  const phrase = hasPhrase(stop, dress);
  const labelParts = routeLabel.split(/\s*·\s*/);
  const durationParts = (
    <>
      {labelParts[0]}
      {labelParts.slice(1).map((part, i) => (
        <span key={i} style={{ fontSize: 11, fontWeight: 400, opacity: 0.75 }}> · {part}</span>
      ))}
    </>
  );
  // A duration label that would run under a time ("50 min · 1 change" beside
  // "10:30pm") breaks at its first "·" (or before a "+"): the time on one line,
  // the rest under it. Measured after mount, against where the times' digits actually end, so
  // a label that fits renders exactly as before, server HTML included.
  const routeRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const [split, setSplit] = useState(false);
  // The night ticket's dawn band, re-placed once the text is laid out.
  const skyRef = useRef<HTMLDivElement>(null);
  const [band, setBand] = useState<[number, number]>(NIGHT_BAND);
  useLayoutEffect(() => {
    const sky = skyRef.current;
    if (!sky) return;
    const place = () => setBand(prev => {
      const next = measureBand(sky);
      return prev[0] === next[0] && prev[1] === next[1] ? prev : next;
    });
    place();
    const ro = new ResizeObserver(place);
    ro.observe(sky);
    return () => ro.disconnect();
  }, [night]);
  // Where to break: at the first "·", else before a "+" ("car 1½ h + train").
  const breakAt: [string, string] | null = labelParts.length > 1
    ? [labelParts[0], labelParts.slice(1).join(' · ')]
    : /\s\+\s/.test(routeLabel) ? [routeLabel.split(/\s\+\s/)[0], '+ ' + routeLabel.split(/\s\+\s/).slice(1).join(' + ')] : null;
  useLayoutEffect(() => {
    const route = routeRef.current, label = labelRef.current, grid = route?.parentElement;
    if (!route || !label || !grid || !breakAt) return;
    const natural = label.getBoundingClientRect().width;
    // The digits' own extent: the time's box can be wider (a note under it).
    const digits = (el: Element | undefined) => {
      const box = el?.matches('.num') ? el : el?.querySelector('.num, [data-dep-note]');
      if (!box) return null;
      const range = document.createRange();
      range.selectNodeContents(box);
      const small = box.querySelector('small');
      if (small) range.setEndBefore(small);
      return range.getBoundingClientRect();
    };
    const check = () => {
      const r = route.getBoundingClientRect();
      const mid = r.left + r.width / 2;
      const dep = digits(grid.children[0] ?? undefined);
      const arr = digits(grid.children[2] ?? undefined);
      setSplit((!!dep && mid - natural / 2 < dep.right - 1) || (!!arr && arr.width > 0 && mid + natural / 2 > arr.left + 1));
    };
    check();
    const ro = new ResizeObserver(check);
    ro.observe(route);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeLabel]);
  const flow = split;
  const splitParts = breakAt && (
    <>
      <span style={{ whiteSpace: 'nowrap', background: night ? 'transparent' : tint, padding: '0 5px' }}>{breakAt[0]}</span>
      <span style={{ whiteSpace: 'nowrap', fontSize: 11, fontWeight: 400, opacity: 0.75 }}>{breakAt[1]}</span>
    </>
  );
  // When the route label runs to two lines or more (a train name, or a split
  // duration), the route box grows and the times hang from the top, their
  // middle level with the dotted line.
  const lift: React.CSSProperties | undefined = flow ? { alignSelf: 'start', paddingTop: 6 } : undefined;
  // Each end gets half the ticket. The name may wrap but never truncates; the
  // characters are nowrap, so when the pair won't fit they drop under the name.
  const station = (name: string, local: string, align: 'left' | 'right', ink: string = deep, mark?: 'light' | 'dark') => {
    const marks = { 'data-nl': mark === 'light' ? '' : undefined, 'data-nd': mark === 'dark' ? '' : undefined };
    if (!name && !local) return <span />;
    if (!name) return (
      <div {...marks} lang={dress ?? undefined} style={{
        textAlign: align, fontFamily: cjkFont(dress ?? 'ja'), fontWeight: 700, fontSize: 19, lineHeight: 1.15,
        letterSpacing: '0.04em', color: ink, whiteSpace: 'nowrap',
      }}>{local}</div>
    );
    return (
      <div {...marks} style={{ textAlign: align, minWidth: 0, overflowWrap: 'anywhere', lineHeight: 1.25, color: ink }}>
        <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 16 }}>{name}</span>
        {local && (
          <>
            {' '}
            <span lang={dress ?? undefined} style={{
              fontFamily: cjkFont(dress ?? 'ja'), fontSize: 13, letterSpacing: '0.04em', opacity: 0.7, whiteSpace: 'nowrap',
            }}>{local}</span>
          </>
        )}
      </div>
    );
  };

  // The night ticket says the day at both ends: "Tonight" under the
  // departure (after the zone only when the arrival names one, e.g. "HKT"),
  // and the arrival's own note ("Wed"), or "Next day" when it gives none.
  const noteZone = !!given?.note && /\b(?:[A-Z]{2,5}|GMT[+-]?\d*)\b/.test(given.note);
  const depUnder = night ? (noteZone && depZone ? `${depZone} · Tonight` : 'Tonight') : depZone;
  const arrUnder = night && !/\b(?:mon|tue|wed|thu|fri|sat|sun)/i.test(given?.note ?? '')
    ? [given?.note, 'Next day'].filter(Boolean).join(' · ')
    : given?.note || undefined;

  return (
    <article id={`stop-${stop.id}`} style={{
      position: 'relative',
      marginTop: 10,
      background: tint,
      borderRadius: 16,
      color: deep,
      scrollMarginTop: 'calc(env(safe-area-inset-top, 0px) + 64px)',
      ['--j-accent' as string]: accent,
    }}>
      <div ref={night ? skyRef : undefined} style={night ? { padding: '13px 16px 10px', position: 'relative', background: nightTop(...band), borderRadius: '16px 16px 0 0' } : { padding: '13px 16px 10px' }}>
        {night && STARS.map(([l, edge, px, o], i) => (
          <span key={i} aria-hidden="true" style={{ position: 'absolute', left: `${l}%`, [edge]: px, width: 2, height: 2, borderRadius: '50%', background: NIGHT.parch, opacity: o }} />
        ))}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          {/* Baseline, not centre: the tag (mono caps) and the train note (sans)
              are different fonts, and centring them set their text at two heights. */}
          <div data-nl={night ? '' : undefined} style={{ flex: 1, display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', columnGap: 8, rowGap: 2, fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: night ? NIGHT.tag : accent }}>
            {stop.tag}
            <WhoChip who={stop.who} color={night ? NIGHT.tag : accent} />
            {/* Which train, said in passing beside the tag: a note, not a destination. */}
            {service && <TrainNote parts={liveryParts(service)} kind={night ? 'sleeper' : kind} color={fg} accent={accent} dress={dress} />}
          </div>
          {stamp}
        </div>

        {hasStations && (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', columnGap: 16, alignItems: 'end', marginTop: 8 }}>
            {station(fromName, fromLocal, 'left', night ? NIGHT.parch : undefined, night ? 'light' : undefined)}
            {station(toName, toLocal, 'right', night ? NIGHT.dawnInk : undefined, night ? 'dark' : undefined)}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', alignItems: 'center', gap: 10, marginTop: hasStations ? 3 : 8 }}>
          {dep
            ? <TicketTime c={dep} under={depUnder} align="left" lift={lift} color={night ? NIGHT.parch : undefined} mark={night ? 'light' : undefined} />
            // No clock kept ("morning"): the label as a note, level with the line.
            : <div style={flow ? { alignSelf: 'start', paddingTop: 15 } : undefined}>
                {depNote && <small data-dep-note="" style={{ ...small, marginTop: 0, whiteSpace: 'nowrap' }}>{depNote}</small>}
              </div>}

          <div ref={routeRef} style={flow ? { position: 'relative', minWidth: 60, minHeight: 42, paddingTop: 26 } : { position: 'relative', height: 42, minWidth: 60 }}>
            {night
              // Overnight: dim parchment brightening into the dawn.
              ? <div style={{ position: 'absolute', left: 10, right: 14, top: 20, height: 2, borderRadius: 2, background: `linear-gradient(90deg, rgba(243, 238, 228, 0.5), rgba(243, 238, 228, 0.22) 45%, ${NIGHT.sun})` }} />
              : ferry
              // By sea the route is water, not a dotted rail: a soft wave line.
              ? <div style={{ position: 'absolute', left: 0, right: 0, top: 18, height: 6, background: accent, opacity: 0.6, ...WAVE }} />
              : livery
                ? <LiveryLine parts={parts} accent={accent} top={22} />
                : <div style={{ position: 'absolute', left: 0, right: 0, top: 21, borderTop: `1.5px dotted ${accent}`, opacity: 0.7 }} />}
            {Array.from({ length: changes }, (_, i) => (
              <span key={i} style={{
                position: 'absolute', top: 21, left: `${((i + 1) * 100) / (changes + 1)}%`,
                width: 6, height: 6, borderRadius: '50%', background: tint, border: `1.5px solid ${accent}`,
                transform: 'translate(-50%, -50%)',
              }} />
            ))}
            {night && <><Moon /><DawnSun />{ROUTE_STARS.map(([l, t, o], i) => (
              <span key={i} aria-hidden="true" style={{ position: 'absolute', left: `${l}%`, top: t, width: 2, height: 2, borderRadius: '50%', background: NIGHT.parch, opacity: o }} />
            ))}</>}
            <span style={{ position: 'absolute', left: '50%', top: 1, transform: 'translateX(-50%)', color: night ? NIGHT.parch : accent, background: night ? 'transparent' : tint, padding: '0 4px' }}>
              <JourneyGlyph mode={mode} lit={night} />
              {ferry && <Wake />}
              {bullet && <SpeedStreaks />}
            </span>
            {flow ? (
              // A duration too wide to sit between the times breaks onto
              // two lines, in flow under the route line.
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, letterSpacing: '0.02em',
                fontVariantNumeric: 'tabular-nums', color: fg, lineHeight: 1.2, textShadow: night ? NIGHT_HALO : undefined,
              }}>
                {routeLabel && (split ? splitParts : <span ref={labelRef} style={{ whiteSpace: 'nowrap', background: night ? 'transparent' : tint, padding: '0 5px' }}>{durationParts}</span>)}
              </div>
            ) : routeLabel && (
              // The time is the thing you glance for: big and plain, with the
              // changes beside it in a quieter voice ("1 h 50 · 1 change").
              <span ref={labelRef} style={{
                position: 'absolute', left: '50%', top: 26, transform: 'translateX(-50%)', whiteSpace: 'nowrap',
                fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, letterSpacing: '0.02em',
                fontVariantNumeric: 'tabular-nums', color: fg, background: night ? 'transparent' : tint, padding: '0 5px', lineHeight: 1.2, textShadow: night ? NIGHT_HALO : undefined,
              }}>
                {durationParts}
              </span>
            )}
          </div>

          <div style={night ? { ...lift } : { opacity: 0.8, ...lift }}>
            {arr && <TicketTime c={arr} approx={!given || given.approx} under={arrUnder} align="right" color={night ? NIGHT.dawnInk : undefined} mark={night ? 'dark' : undefined} />}
            {/* Untimed: an unseen twin of the note keeps the route centred. */}
            {depNote && <small aria-hidden="true" style={{ ...small, marginTop: 0, whiteSpace: 'nowrap', visibility: 'hidden' }}>{depNote}</small>}
          </div>
        </div>

        <h3 data-nl={night ? '' : undefined} style={night ? { fontSize: 15, fontWeight: 600, lineHeight: 1.35, marginTop: 12, color: NIGHT.parch, maxWidth: '46%', position: 'relative' } : { fontSize: 15, fontWeight: 600, lineHeight: 1.35, marginTop: 12, color: deep }}>{stop.title}</h3>
      </div>

      {(bodyHtml || stop.aircraft || seat || phrase || footer || night) && (
        <>
          {/* the tear line, with a notch cut from each side */}
          <div style={{ position: 'relative', margin: '0 14px', borderTop: ferry ? undefined : night ? `1.5px dashed color-mix(in srgb, ${NIGHT.plum} 40%, transparent)` : `1.5px dashed color-mix(in srgb, ${accent} 35%, transparent)` }}>
            {/* by sea, the tear is a wave too */}
            {ferry && <span style={{ position: 'absolute', left: 6, right: 6, top: -3, height: 6, background: `color-mix(in srgb, ${accent} 40%, transparent)`, ...WAVE }} />}
            <span style={{ position: 'absolute', top: -9, left: -23, width: 16, height: 16, borderRadius: '50%', background: 'var(--bg)' }} />
            <span style={{ position: 'absolute', top: -9, right: -23, width: 16, height: 16, borderRadius: '50%', background: 'var(--bg)' }} />
          </div>
          <div style={night
            // A faint dusk on the left, fading into the wash, under the dark top.
            ? { padding: '10px 16px 13px', borderRadius: '0 0 16px 16px', background: `linear-gradient(90deg, color-mix(in srgb, ${NIGHT.plum} 30%, ${tint}) 0%, ${tint} 66%)` }
            : { padding: '10px 16px 13px' }}>
            {bodyHtml && (
              <div className="body-content" style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--ink-2)' }}
                dangerouslySetInnerHTML={{ __html: bodyHtml }} />
            )}
            {(seat || phrase || night) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: bodyHtml ? 10 : 0 }}>
                {seatText && (
                  <span lang={dress ?? undefined} style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.04em', color: deep, minWidth: 0 }}>
                    {seatText}
                  </span>
                )}
                {phrase && dress && <span style={{ marginLeft: 'auto' }}><SayChip stop={stop} dress={dress} color={deep} /></span>}
                {night && <BerthStub berth={berth?.berth ?? null} pos={berth?.pos ?? ''} color={deep} />}
              </div>
            )}
            {stop.aircraft && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: bodyHtml || seat || phrase ? 10 : 0 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.04em' }}>{aircraftName(stop.aircraft)}</span>
                <a href={`${PLANE_LAB}${encodeURIComponent(stop.aircraft)}`} target="_blank" rel="noopener noreferrer" style={{
                  marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 5,
                  fontFamily: 'var(--font-mono)', fontSize: 11.5, letterSpacing: '0.1em', textTransform: 'uppercase',
                  textDecoration: 'none', color: deep, background: 'var(--surface)',
                  border: `1px solid color-mix(in srgb, ${accent} 45%, transparent)`, borderRadius: 999, padding: '5px 11px',
                }}>
                  See the plane ↗
                </a>
              </div>
            )}
            {footer}
          </div>
        </>
      )}
    </article>
  );
}
