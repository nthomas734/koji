'use client';

import type { Stop } from '@/lib/supabase';
import { renderMd } from '@/lib/markdown';
import { zoneAbbr } from '@/lib/bookings';

// ── JOURNEY TICKET ──────────────────────────────────────────────────────────
// A travel stop you have to be on time for: one with a clock time and either a
// duration or an arrival. It reads as a ticket in a pale wash of the day's
// colour: the departure on the left, a little train, plane or ferry on the
// dotted route, and the arrival on the right, taken from arrive_label or
// worked out from the duration. The title already says where it goes, so the
// ticket doesn't repeat it. Zones (PT, JST) show only when the arrival names
// one, i.e. a flight that crosses them. "Land at ..." stops, hops without a
// duration and untimed errands stay ordinary stop cards.

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

/** "4:30pm JST · Fri" → the time, and "JST · Fri" for the line under it. */
function parseArrival(label: string | null | undefined): { at: Clock; note: string } | null {
  const at = parseClock(label ?? null);
  if (!at || !label) return null;
  const note = label.replace(/^\s*\d{1,2}(?::\d{2})?\s*(am|pm)\s*/i, '').trim();
  return { at, note };
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
  fontSize: 8.5,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  marginTop: 5,
  opacity: 0.7,
  fontWeight: 400,
};

/** "11:30" with a smaller "am" set right after it, and an optional line under. */
function TicketTime({ c, approx, under, align }: { c: Clock; approx?: boolean; under?: string; align: 'left' | 'right' }) {
  return (
    <div className="num" style={{ textAlign: align, fontFamily: 'var(--font-serif)', fontWeight: 300, fontSize: 30, lineHeight: 1, whiteSpace: 'nowrap' }}>
      {approx ? '~' : ''}{fmt(c)}<span style={{ fontSize: 15, marginLeft: 1 }}>{c.mer}</span>
      {under && <small style={small}>{under}</small>}
    </div>
  );
}

export function JourneyTicket({ stop, accent, tz, stamp, footer }: {
  stop: Stop;
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
  const changes = Number(stop.duration_label?.match(/(\d+)\s*change/)?.[1] ?? 0);
  const bodyHtml = renderMd(stop.body_md);
  const tint = `color-mix(in srgb, ${accent} 17%, var(--surface))`;
  const deep = `color-mix(in srgb, ${accent} 62%, var(--ink))`;
  const routeLabel = stop.duration_label || '';

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
          <div style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 500, letterSpacing: '0.16em', textTransform: 'uppercase', color: accent }}>
            {stop.tag}
          </div>
          {stamp}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', alignItems: 'center', gap: 10, marginTop: 8 }}>
          <TicketTime c={dep} under={depZone} align="left" />

          <div style={{ position: 'relative', height: 42, minWidth: 60 }}>
            <div style={{ position: 'absolute', left: 0, right: 0, top: 21, borderTop: `1.5px dotted ${accent}`, opacity: 0.7 }} />
            {Array.from({ length: changes }, (_, i) => (
              <span key={i} style={{
                position: 'absolute', top: 21, left: `${((i + 1) * 100) / (changes + 1)}%`,
                width: 6, height: 6, borderRadius: '50%', background: tint, border: `1.5px solid ${accent}`,
                transform: 'translate(-50%, -50%)',
              }} />
            ))}
            <span style={{ position: 'absolute', left: '50%', top: 1, transform: 'translateX(-50%)', color: accent, background: tint, padding: '0 4px' }}>
              <JourneyGlyph mode={mode} />
            </span>
            {routeLabel && (
              // The time is the thing you glance for: big and plain, with the
              // changes beside it in a quieter voice ("1 h 50 · 1 change").
              <span style={{
                position: 'absolute', left: '50%', top: 26, transform: 'translateX(-50%)', whiteSpace: 'nowrap',
                fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, letterSpacing: '0.02em',
                fontVariantNumeric: 'tabular-nums', color: deep, background: tint, padding: '0 5px', lineHeight: 1.2,
              }}>
                {routeLabel.split(/\s*·\s*/)[0]}
                {routeLabel.split(/\s*·\s*/).slice(1).map((part, i) => (
                  <span key={i} style={{ fontSize: 11, fontWeight: 400, opacity: 0.75 }}> · {part}</span>
                ))}
              </span>
            )}
          </div>

          <div style={{ opacity: 0.8 }}>
            {arr && <TicketTime c={arr} approx={!given} under={given?.note || undefined} align="right" />}
          </div>
        </div>

        <h3 style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.35, marginTop: 12, color: deep }}>{stop.title}</h3>
      </div>

      {(bodyHtml || stop.aircraft || footer) && (
        <>
          {/* the tear line, with a notch cut from each side */}
          <div style={{ position: 'relative', margin: '0 14px', borderTop: `1.5px dashed color-mix(in srgb, ${accent} 35%, transparent)` }}>
            <span style={{ position: 'absolute', top: -9, left: -23, width: 16, height: 16, borderRadius: '50%', background: 'var(--bg)' }} />
            <span style={{ position: 'absolute', top: -9, right: -23, width: 16, height: 16, borderRadius: '50%', background: 'var(--bg)' }} />
          </div>
          <div style={{ padding: '10px 16px 13px' }}>
            {bodyHtml && (
              <div className="body-content" style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--ink-2)' }}
                dangerouslySetInnerHTML={{ __html: bodyHtml }} />
            )}
            {stop.aircraft && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: bodyHtml ? 10 : 0 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.04em' }}>{aircraftName(stop.aircraft)}</span>
                <a href={`${PLANE_LAB}${encodeURIComponent(stop.aircraft)}`} target="_blank" rel="noopener noreferrer" style={{
                  marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 5,
                  fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '0.1em', textTransform: 'uppercase',
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
