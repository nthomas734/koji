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
// duration and untimed errands stay ordinary stop cards.
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
 */
export function isJourney(stop: Stop): boolean {
  const dep = parseClock(stop.time_label);
  if (!dep || /^land\b/i.test(stop.title)) return false;
  if (!stop.duration_label && !parseClock(stop.arrive_label ?? null)) return false;
  if (isFlight(stop)) return true;
  const mins = tripMinutes(stop, dep);
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

export function JourneyGlyph({ mode, size = 44 }: { mode: 'train' | 'plane' | 'ferry'; size?: number }) {
  return (
    <svg viewBox="0 0 44 18" width={size} height={size * 18 / 44} aria-hidden="true" style={{ display: 'block' }}>
      {PATHS[mode]}
    </svg>
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
function TicketTime({ c, approx, under, align, lift }: { c: Clock; approx?: boolean; under?: string; align: 'left' | 'right'; lift?: React.CSSProperties }) {
  return (
    <div className="num" style={{ textAlign: align, fontFamily: 'var(--font-serif)', fontWeight: 300, fontSize: 30, lineHeight: 1, whiteSpace: 'nowrap', ...lift }}>
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
export function trainKind(service: string): string {
  if (!service) return '';
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
  const dep = parseClock(stop.time_label)!;
  const given = parseArrival(stop.arrive_label);
  const mins = parseMinutes(stop.duration_label);
  const arr = given?.at ?? (mins != null ? addMinutes(dep, mins) : null);
  // A named zone on the arrival means the trip crosses zones: name both ends.
  const depZone = given?.note && tz ? zoneAbbr(tz, new Date()) : undefined;
  const mode = modeOf(stop);
  const ferry = mode === 'ferry';
  const changes = Number(stop.duration_label?.match(/(\d+)\s*change/)?.[1] ?? 0);
  const bodyHtml = gloss(renderMd(stop.body_md), dress);
  const tint = `color-mix(in srgb, ${accent} 17%, var(--surface))`;
  const deep = `color-mix(in srgb, ${accent} 62%, var(--ink))`;
  const routeLabel = stop.duration_label || '';
  const service = stop.service_label?.trim() || '';
  const kind = trainKind(service);
  const parts = mode === 'train' ? liveryParts(service) : [];
  const livery = hasLivery(parts);
  const nozomi = parts.some(p => p.livery?.line === 'dash');
  const seat = stop.seat_label?.trim() || '';
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
      const box = el?.matches('.num') ? el : el?.querySelector('.num');
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
      <span style={{ whiteSpace: 'nowrap', background: tint, padding: '0 5px' }}>{breakAt[0]}</span>
      <span style={{ whiteSpace: 'nowrap', fontSize: 11, fontWeight: 400, opacity: 0.75 }}>{breakAt[1]}</span>
    </>
  );
  // When the route label runs to two lines or more (a train name, or a split
  // duration), the route box grows and the times hang from the top, their
  // middle level with the dotted line.
  const lift: React.CSSProperties | undefined = flow ? { alignSelf: 'start', paddingTop: 6 } : undefined;
  // Each end gets half the ticket. The name may wrap but never truncates; the
  // characters are nowrap, so when the pair won't fit they drop under the name.
  const station = (name: string, local: string, align: 'left' | 'right') => {
    if (!name && !local) return <span />;
    if (!name) return (
      <div lang={dress ?? undefined} style={{
        textAlign: align, fontFamily: cjkFont(dress ?? 'ja'), fontWeight: 700, fontSize: 19, lineHeight: 1.15,
        letterSpacing: '0.04em', color: deep, whiteSpace: 'nowrap',
      }}>{local}</div>
    );
    return (
      <div style={{ textAlign: align, minWidth: 0, overflowWrap: 'anywhere', lineHeight: 1.25, color: deep }}>
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
      <div style={{ padding: '13px 16px 10px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: accent }}>
            {stop.tag}
            <WhoChip who={stop.who} color={accent} />
            {/* Which train, said in passing beside the tag: a note, not a destination. */}
            {service && <TrainNote parts={liveryParts(service)} kind={kind} color={deep} />}
          </div>
          {stamp}
        </div>

        {hasStations && (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', columnGap: 16, alignItems: 'end', marginTop: 8 }}>
            {station(fromName, fromLocal, 'left')}
            {station(toName, toLocal, 'right')}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', alignItems: 'center', gap: 10, marginTop: hasStations ? 3 : 8 }}>
          <TicketTime c={dep} under={depZone} align="left" lift={lift} />

          <div ref={routeRef} style={flow ? { position: 'relative', minWidth: 60, minHeight: 42, paddingTop: 26 } : { position: 'relative', height: 42, minWidth: 60 }}>
            {ferry
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
            <span style={{ position: 'absolute', left: '50%', top: 1, transform: 'translateX(-50%)', color: accent, background: tint, padding: '0 4px' }}>
              <JourneyGlyph mode={mode} />
              {ferry && <Wake />}
              {nozomi && <SpeedStreaks />}
            </span>
            {flow ? (
              // A duration too wide to sit between the times breaks onto
              // two lines, in flow under the route line.
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, letterSpacing: '0.02em',
                fontVariantNumeric: 'tabular-nums', color: deep, lineHeight: 1.2,
              }}>
                {routeLabel && (split ? splitParts : <span ref={labelRef} style={{ whiteSpace: 'nowrap', background: tint, padding: '0 5px' }}>{durationParts}</span>)}
              </div>
            ) : routeLabel && (
              // The time is the thing you glance for: big and plain, with the
              // changes beside it in a quieter voice ("1 h 50 · 1 change").
              <span ref={labelRef} style={{
                position: 'absolute', left: '50%', top: 26, transform: 'translateX(-50%)', whiteSpace: 'nowrap',
                fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, letterSpacing: '0.02em',
                fontVariantNumeric: 'tabular-nums', color: deep, background: tint, padding: '0 5px', lineHeight: 1.2,
              }}>
                {durationParts}
              </span>
            )}
          </div>

          <div style={{ opacity: 0.8, ...lift }}>
            {arr && <TicketTime c={arr} approx={!given || given.approx} under={given?.note || undefined} align="right" />}
          </div>
        </div>

        <h3 style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.35, marginTop: 12, color: deep }}>{stop.title}</h3>
      </div>

      {(bodyHtml || stop.aircraft || seat || phrase || footer) && (
        <>
          {/* the tear line, with a notch cut from each side */}
          <div style={{ position: 'relative', margin: '0 14px', borderTop: ferry ? undefined : `1.5px dashed color-mix(in srgb, ${accent} 35%, transparent)` }}>
            {/* by sea, the tear is a wave too */}
            {ferry && <span style={{ position: 'absolute', left: 6, right: 6, top: -3, height: 6, background: `color-mix(in srgb, ${accent} 40%, transparent)`, ...WAVE }} />}
            <span style={{ position: 'absolute', top: -9, left: -23, width: 16, height: 16, borderRadius: '50%', background: 'var(--bg)' }} />
            <span style={{ position: 'absolute', top: -9, right: -23, width: 16, height: 16, borderRadius: '50%', background: 'var(--bg)' }} />
          </div>
          <div style={{ padding: '10px 16px 13px' }}>
            {bodyHtml && (
              <div className="body-content" style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--ink-2)' }}
                dangerouslySetInnerHTML={{ __html: bodyHtml }} />
            )}
            {(seat || phrase) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: bodyHtml ? 10 : 0 }}>
                {seat && (
                  <span lang={dress ?? undefined} style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.04em', color: deep, minWidth: 0 }}>
                    {seat}
                  </span>
                )}
                {phrase && dress && <span style={{ marginLeft: 'auto' }}><SayChip stop={stop} dress={dress} color={deep} /></span>}
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
