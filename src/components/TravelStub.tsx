'use client';

import { useState } from 'react';
import type { HopMode, Stop } from '@/lib/supabase';
import { renderMd } from '@/lib/markdown';
import { gloss } from '@/lib/glossary';
import { appleDirectionsUrl, type Dress } from '@/lib/maps';
import { useAppleMaps } from './MapsContext';
import { WhoChip } from './WhoChip';
import { isJourney } from './JourneyTicket';

// ── THE STUB ────────────────────────────────────────────────────────────────
// The journey ticket's torn-off end, for a short hop (a 15-minute Odakyu ride,
// a car to the station). The same pale wash and punched notches as the full
// ticket at about a third of its height: the time, the mode and the title, the
// duration at the right, and the hop line under the title. Big journey, whole
// ticket; small hop, stub.
//
// A stop opts in with hop_mode (columns: sql/2026-11-15-koji-stop-thread.sql,
// which first drew it as a dotted thread; Nathan meant this stub). The body
// stays one tap away: tapping the stub opens it under a dashed tear line, and
// tapping again closes it. A stub with no body has nothing to open and is not
// a button.
//
// Colour: the wash is the stop's line_color (the operator's own, Odakyu
// #0082C0), else the day's accent, mixed into the surface exactly as the
// ticket mixes its wash. Text takes the ticket's deep tone, checked at 4.5:1
// against the wash and darkened further if it falls short.

/** A stub when it opts in and isn't already a ticket or an unpicked maybe. */
export function isStub(stop: Stop): boolean {
  return !!stop.hop_mode && !(stop.is_optional && !stop.added) && !isJourney(stop);
}

const SURFACE = '#FDFAF5';
const INK = '#1C1A16';

type RGB = [number, number, number];

function rgb(hex: string): RGB | null {
  const m = hex.trim().match(/^#([0-9a-f]{6})$/i);
  return m ? [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16)) as RGB : null;
}

/** color-mix(in srgb, a p%, b) */
const mix = (a: RGB, b: RGB, p: number): RGB => a.map((v, i) => v * p + b[i] * (1 - p)) as RGB;

function luminance(c: RGB): number {
  const [r, g, b] = c.map(v => {
    const x = v / 255;
    return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: RGB, b: RGB): number {
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

/** The ticket's wash and deep tone; the deep tone darkens until it reads at 4.5:1 on the wash. */
function stubTones(color: string): { wash: string; deep: string } {
  const wash = `color-mix(in srgb, ${color} 17%, var(--surface))`;
  const c = rgb(color);
  if (!c) return { wash, deep: `color-mix(in srgb, ${color} 62%, var(--ink))` };
  const w = mix(c, rgb(SURFACE)!, 0.17);
  for (const p of [62, 50, 40, 30]) {
    if (contrast(mix(c, rgb(INK)!, p / 100), w) >= 4.5) return { wash, deep: `color-mix(in srgb, ${color} ${p}%, var(--ink))` };
  }
  return { wash, deep: 'var(--ink)' };
}

const HOP_PATHS: Record<HopMode, React.ReactNode> = {
  train: (
    <>
      <path d="M1.8 3h10.4c3.4 0 6.1 1.7 7 4.1.2.7-.2 1.4-1 1.4H1.8c-.5 0-.8-.4-.8-.8V3.8c0-.5.3-.8.8-.8z" fill="currentColor" />
      <g fill="var(--stub-wash, var(--bg))">
        <rect x="3" y="4.3" width="2.4" height="1.9" rx=".5" /><rect x="6.6" y="4.3" width="2.4" height="1.9" rx=".5" />
        <path d="M13 4.4c1.7.2 3.2.9 4.1 1.9H13z" />
      </g>
      <path d="M1 11.4h18" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </>
  ),
  metro: (
    <>
      <rect x="1.5" y="1.8" width="17" height="8" rx="2.2" fill="currentColor" />
      <g fill="var(--stub-wash, var(--bg))">
        <rect x="3.4" y="3.6" width="3" height="2.4" rx=".5" /><rect x="13.6" y="3.6" width="3" height="2.4" rx=".5" />
        <rect x="8.6" y="3.4" width="2.8" height="6.4" rx=".4" />
      </g>
      <path d="M1 12.2h18" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </>
  ),
  bus: (
    <>
      <path d="M2.6 1.5h14.4c.9 0 1.6.7 1.6 1.6v6.6c0 .5-.4.9-.9.9H1.9c-.5 0-.9-.4-.9-.9V3.1c0-.9.7-1.6 1.6-1.6z" fill="currentColor" />
      <g fill="var(--stub-wash, var(--bg))">
        <rect x="2.8" y="3.2" width="3.1" height="2.8" rx=".5" /><rect x="7" y="3.2" width="3.1" height="2.8" rx=".5" />
        <rect x="11.2" y="3.2" width="3.1" height="2.8" rx=".5" /><rect x="15.3" y="3.2" width="1.8" height="5" rx=".5" />
      </g>
      <circle cx="5" cy="11" r="2" fill="currentColor" stroke="var(--stub-wash, var(--bg))" strokeWidth="1" />
      <circle cx="14.6" cy="11" r="2" fill="currentColor" stroke="var(--stub-wash, var(--bg))" strokeWidth="1" />
    </>
  ),
  car: (
    <>
      <path d="M5.4 3.2h7.2c.7 0 1.3.3 1.7.9l1.9 2.6h1.6c.9 0 1.6.7 1.6 1.6v1.4c0 .4-.3.7-.7.7H1.7c-.4 0-.7-.3-.7-.7V8.5c0-.9.6-1.6 1.4-1.8l1.5-2.6c.4-.6 1-.9 1.5-.9z" fill="currentColor" />
      <path d="M5.9 4.6h2.9v2.1H4.6zM10.1 4.6h2.3c.3 0 .5.1.7.4l1.2 1.7h-4.2z" fill="var(--stub-wash, var(--bg))" />
      <circle cx="5.4" cy="10.9" r="2" fill="currentColor" stroke="var(--stub-wash, var(--bg))" strokeWidth="1" />
      <circle cx="14.6" cy="10.9" r="2" fill="currentColor" stroke="var(--stub-wash, var(--bg))" strokeWidth="1" />
    </>
  ),
  taxi: (
    <>
      <rect x="7.6" y="1" width="4.4" height="2" rx=".6" fill="currentColor" />
      <path d="M5.4 3.8h7.2c.7 0 1.3.3 1.7.9l1.6 2.2h1.9c.9 0 1.6.7 1.6 1.6v1.2c0 .4-.3.7-.7.7H1.7c-.4 0-.7-.3-.7-.7V8.7c0-.9.6-1.6 1.4-1.8l1.5-2.2c.4-.6 1-.9 1.5-.9z" fill="currentColor" />
      <path d="M5.9 5h2.9v2H4.6zM10.1 5h2.3c.3 0 .5.1.7.4l1.1 1.6h-4.1z" fill="var(--stub-wash, var(--bg))" />
      <circle cx="5.4" cy="11.1" r="2" fill="currentColor" stroke="var(--stub-wash, var(--bg))" strokeWidth="1" />
      <circle cx="14.6" cy="11.1" r="2" fill="currentColor" stroke="var(--stub-wash, var(--bg))" strokeWidth="1" />
    </>
  ),
  walk: (
    <>
      <circle cx="10.6" cy="1.9" r="1.6" fill="currentColor" />
      <g fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9.9 4.6 8.9 8.4" />
        <path d="M8.9 8.4 7 13" /><path d="M8.9 8.4l2.5 1.6.8 3" />
        <path d="M6.6 7.2l1.8-2.4 2.2-.2 1.6 2.4 2 .6" />
      </g>
    </>
  ),
  boat: (
    <>
      <path d="M1.2 7.6h17.6l-2.6 3.6H4.4z" fill="currentColor" />
      <path d="M4.6 4.3h9.6l2.1 2.6H3.4z" fill="currentColor" />
      <rect x="7.2" y="1.6" width="2.4" height="2.4" rx=".4" fill="currentColor" />
      <g fill="var(--stub-wash, var(--bg))">
        <rect x="6" y="5" width="1.7" height="1.2" rx=".3" /><rect x="8.9" y="5" width="1.7" height="1.2" rx=".3" />
        <rect x="11.8" y="5" width="1.7" height="1.2" rx=".3" />
      </g>
      <path d="M1 13.2c1.5-.9 3-.9 4.5 0s3 .9 4.5 0 3-.9 4.5 0 3 .9 4.5 0" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    </>
  ),
};

export function HopGlyph({ mode, size = 18 }: { mode: HopMode; size?: number }) {
  return (
    <svg viewBox="0 0 20 14" width={size} height={size * 14 / 20} aria-hidden="true" style={{ display: 'inline-block', verticalAlign: '-2px', flexShrink: 0 }}>
      {HOP_PATHS[mode] ?? HOP_PATHS.train}
    </svg>
  );
}

function safeDecode(q: string): string {
  try { return decodeURIComponent(q.replace(/\+/g, ' ')); } catch { return q; }
}

const notch: React.CSSProperties = {
  position: 'absolute', top: '50%', width: 12, height: 12, borderRadius: '50%',
  background: 'var(--bg)', transform: 'translateY(-50%)',
};

export function TravelStub({ stop, accent, dress = null, stamp, footer }: {
  stop: Stop;
  /** For the glossary underlines (Japan trips only). */
  dress?: Dress;
  /** The day's colour: tonight's town, or the trip's. Used when the stop has no line_color. */
  accent: string;
  stamp?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const mode = stop.hop_mode as HopMode;
  const color = stop.line_color?.trim() || accent;
  const { wash, deep } = stubTones(color);
  const bodyHtml = gloss(renderMd(stop.body_md), dress);
  const tappable = !!bodyHtml;
  const hop = stop.hop_line?.trim();

  // Directions, by the stop card's own rule: the body's first place link, never
  // for the travel legs themselves.
  const apple = useAppleMaps();
  const dirQuery = /^(travel|flight|train)/i.test(stop.tag) ? null
    : apple ? stop.body_md?.match(/maps\.apple\.com\/\?(?:[^)\s"]*&)?q=([^&)\s"]+)/)?.[1] ?? null
    : stop.body_md?.match(/google\.com\/maps\/search\/\?api=1&query=([^)\s"]+)/)?.[1] ?? null;
  const dirHref = !dirQuery ? null
    : apple ? appleDirectionsUrl(safeDecode(dirQuery))
    : `https://www.google.com/maps/dir/?api=1&destination=${dirQuery}&travelmode=transit`;

  const mono: React.CSSProperties = { fontFamily: 'var(--font-mono)', color: deep, whiteSpace: 'nowrap' };
  const head = (
    <div style={{
      display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr) auto', columnGap: 10, rowGap: 1,
      alignItems: 'baseline', textAlign: 'left',
    }}>
      <span className="num" style={{ ...mono, fontSize: 12.5, fontWeight: 600 }}>{stop.time_label ?? ''}</span>
      <span style={{ fontSize: 14.5, fontWeight: 600, lineHeight: 1.35, color: deep, minWidth: 0 }}>
        <span style={{ color: deep, marginRight: 6 }}><HopGlyph mode={mode} /></span>
        {stop.title}
        {stop.who && <span style={{ marginLeft: 8, display: 'inline-block', verticalAlign: '1px' }}><WhoChip who={stop.who} color={deep} /></span>}
      </span>
      <span className="num" style={{ ...mono, fontSize: 11.5, letterSpacing: '0.06em', display: 'inline-flex', alignItems: 'baseline', gap: 6 }}>
        {stop.duration_label ?? ''}
        {tappable && (
          <span aria-hidden="true" style={{
            display: 'inline-block', fontSize: 12, lineHeight: 1, opacity: 0.6,
            transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 160ms var(--ease-out)',
          }}>›</span>
        )}
      </span>
      {hop && (
        <span style={{ gridColumn: '2 / -1', fontSize: 12.5, lineHeight: 1.4, color: 'var(--ink-3)' }}>{hop}</span>
      )}
    </div>
  );

  return (
    <article id={`stop-${stop.id}`} style={{
      position: 'relative',
      marginTop: 8,
      background: wash,
      borderRadius: 12,
      scrollMarginTop: 'calc(env(safe-area-inset-top, 0px) + 64px)',
      ['--stub-wash' as string]: wash,
    }}>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* the punched notches, one on each side of the stub */}
        <span aria-hidden="true" style={{ ...notch, left: -6 }} />
        <span aria-hidden="true" style={{ ...notch, right: -6 }} />
        {tappable ? (
          <button type="button" onClick={() => setOpen(v => !v)} aria-expanded={open} style={{
            flex: 1, minWidth: 0, display: 'block', background: 'transparent', border: 0, margin: 0,
            padding: '9px 16px 9px 18px', font: 'inherit', color: 'inherit', cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}>
            {head}
          </button>
        ) : (
          <div style={{ flex: 1, minWidth: 0, padding: '9px 16px 9px 18px' }}>{head}</div>
        )}
        {stamp && <div style={{ paddingRight: 14 }}>{stamp}</div>}
      </div>

      {open && bodyHtml && (
        <>
          <div style={{ margin: '0 14px', borderTop: `1.5px dashed color-mix(in srgb, ${color} 35%, transparent)` }} />
          <div style={{ padding: '8px 16px 11px 18px' }}>
            <div className="body-content" style={{ fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.55 }}
              dangerouslySetInnerHTML={{ __html: bodyHtml }} />
            {dirHref && (
              <a href={dirHref} target="_blank" rel="noopener noreferrer" style={{
                display: 'inline-block', marginTop: 6, fontFamily: 'var(--font-mono)', fontSize: 12,
                letterSpacing: '0.06em', color: deep, textDecoration: 'none', borderBottom: '1px solid currentColor',
              }}>
                Directions ↗
              </a>
            )}
          </div>
        </>
      )}
      {footer && <div style={{ padding: '0 16px 0 18px' }}>{footer}</div>}
    </article>
  );
}
