'use client';

import { useState } from 'react';
import type { HopMode, Stop } from '@/lib/supabase';
import { renderMd } from '@/lib/markdown';
import { appleDirectionsUrl } from '@/lib/maps';
import { useAppleMaps } from './MapsContext';
import { WhoChip } from './WhoChip';
import { isJourney } from './JourneyTicket';

// ── THE THREAD ──────────────────────────────────────────────────────────────
// The journey ticket's little sibling, for a short hop (a 15-minute Odakyu
// ride, a car to the station). No card: a dotted line in the line's own colour
// runs down the gap between the stops above and below, level with their edge
// bars, with the mode in a small ring. Beside it, the time and duration in
// mono, then the title in bold and the hop line. About 52px tall.
//
// A stop opts in with hop_mode (sql/2026-11-15-koji-stop-thread.sql). The body
// stays one tap away: tapping the thread opens it underneath, tapping again
// closes it. A thread with no body has nothing to open and is not a button.
//
// Colour: the stop's line_color (the operator's colour, Odakyu #0082C0), else
// the day's accent. The line and ring always wear it; the small text wears it
// only when it reads on parchment at 4.5:1, otherwise the ticket's deep tone.

const BG = '#F5F0E8';

/** A thread when it opts in and isn't already a ticket or an unpicked maybe. */
export function isThread(stop: Stop): boolean {
  return !!stop.hop_mode && !(stop.is_optional && !stop.added) && !isJourney(stop);
}

function luminance(hex: string): number | null {
  const m = hex.trim().match(/^#([0-9a-f]{6})$/i);
  if (!m) return null;
  const [r, g, b] = [0, 2, 4].map(i => {
    const c = parseInt(m[1].slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Contrast against parchment; null for a colour we can't read (a CSS var). */
function contrastOnBg(hex: string): number | null {
  const l = luminance(hex);
  if (l == null) return null;
  const bg = luminance(BG)!;
  return (Math.max(l, bg) + 0.05) / (Math.min(l, bg) + 0.05);
}

const MODE_LABEL: Record<HopMode, string> = {
  train: 'Train', metro: 'Metro', bus: 'Bus', taxi: 'Taxi', car: 'Car', walk: 'Walk', boat: 'Boat',
};

// Side-on silhouettes like JourneyGlyph's, redrawn for a 16px ring: filled in
// currentColor, windows punched out in the ring's parchment.
const HOP_PATHS: Record<HopMode, React.ReactNode> = {
  train: (
    <>
      <path d="M1.8 3h10.4c3.4 0 6.1 1.7 7 4.1.2.7-.2 1.4-1 1.4H1.8c-.5 0-.8-.4-.8-.8V3.8c0-.5.3-.8.8-.8z" fill="currentColor" />
      <g fill="var(--bg)">
        <rect x="3" y="4.3" width="2.4" height="1.9" rx=".5" /><rect x="6.6" y="4.3" width="2.4" height="1.9" rx=".5" />
        <path d="M13 4.4c1.7.2 3.2.9 4.1 1.9H13z" />
      </g>
      <path d="M1 11.4h18" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </>
  ),
  metro: (
    <>
      <rect x="1.5" y="1.8" width="17" height="8" rx="2.2" fill="currentColor" />
      <g fill="var(--bg)">
        <rect x="3.4" y="3.6" width="3" height="2.4" rx=".5" /><rect x="13.6" y="3.6" width="3" height="2.4" rx=".5" />
        <rect x="8.6" y="3.4" width="2.8" height="6.4" rx=".4" />
      </g>
      <path d="M1 12.2h18" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </>
  ),
  bus: (
    <>
      <path d="M2.6 1.5h14.4c.9 0 1.6.7 1.6 1.6v6.6c0 .5-.4.9-.9.9H1.9c-.5 0-.9-.4-.9-.9V3.1c0-.9.7-1.6 1.6-1.6z" fill="currentColor" />
      <g fill="var(--bg)">
        <rect x="2.8" y="3.2" width="3.1" height="2.8" rx=".5" /><rect x="7" y="3.2" width="3.1" height="2.8" rx=".5" />
        <rect x="11.2" y="3.2" width="3.1" height="2.8" rx=".5" /><rect x="15.3" y="3.2" width="1.8" height="5" rx=".5" />
      </g>
      <circle cx="5" cy="11" r="2" fill="currentColor" stroke="var(--bg)" strokeWidth="1" />
      <circle cx="14.6" cy="11" r="2" fill="currentColor" stroke="var(--bg)" strokeWidth="1" />
    </>
  ),
  car: (
    <>
      <path d="M5.4 3.2h7.2c.7 0 1.3.3 1.7.9l1.9 2.6h1.6c.9 0 1.6.7 1.6 1.6v1.4c0 .4-.3.7-.7.7H1.7c-.4 0-.7-.3-.7-.7V8.5c0-.9.6-1.6 1.4-1.8l1.5-2.6c.4-.6 1-.9 1.5-.9z" fill="currentColor" />
      <path d="M5.9 4.6h2.9v2.1H4.6zM10.1 4.6h2.3c.3 0 .5.1.7.4l1.2 1.7h-4.2z" fill="var(--bg)" />
      <circle cx="5.4" cy="10.9" r="2" fill="currentColor" stroke="var(--bg)" strokeWidth="1" />
      <circle cx="14.6" cy="10.9" r="2" fill="currentColor" stroke="var(--bg)" strokeWidth="1" />
    </>
  ),
  taxi: (
    <>
      <rect x="7.6" y="1" width="4.4" height="2" rx=".6" fill="currentColor" />
      <path d="M5.4 3.8h7.2c.7 0 1.3.3 1.7.9l1.6 2.2h1.9c.9 0 1.6.7 1.6 1.6v1.2c0 .4-.3.7-.7.7H1.7c-.4 0-.7-.3-.7-.7V8.7c0-.9.6-1.6 1.4-1.8l1.5-2.2c.4-.6 1-.9 1.5-.9z" fill="currentColor" />
      <path d="M5.9 5h2.9v2H4.6zM10.1 5h2.3c.3 0 .5.1.7.4l1.1 1.6h-4.1z" fill="var(--bg)" />
      <circle cx="5.4" cy="11.1" r="2" fill="currentColor" stroke="var(--bg)" strokeWidth="1" />
      <circle cx="14.6" cy="11.1" r="2" fill="currentColor" stroke="var(--bg)" strokeWidth="1" />
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
      <g fill="var(--bg)">
        <rect x="6" y="5" width="1.7" height="1.2" rx=".3" /><rect x="8.9" y="5" width="1.7" height="1.2" rx=".3" />
        <rect x="11.8" y="5" width="1.7" height="1.2" rx=".3" />
      </g>
      <path d="M1 13.2c1.5-.9 3-.9 4.5 0s3 .9 4.5 0 3-.9 4.5 0 3 .9 4.5 0" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    </>
  ),
};

export function HopGlyph({ mode, size = 16 }: { mode: HopMode; size?: number }) {
  return (
    <svg viewBox="0 0 20 14" width={size} height={size * 14 / 20} aria-hidden="true" style={{ display: 'block' }}>
      {HOP_PATHS[mode] ?? HOP_PATHS.train}
    </svg>
  );
}

function safeDecode(q: string): string {
  try { return decodeURIComponent(q.replace(/\+/g, ' ')); } catch { return q; }
}

export function TravelThread({ stop, accent, stamp, footer }: {
  stop: Stop;
  /** The day's colour: tonight's town, or the trip's. Used when the stop has no line_color. */
  accent: string;
  stamp?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const mode = stop.hop_mode as HopMode;
  const color = stop.line_color?.trim() || accent;
  const contrast = contrastOnBg(color);
  const ink = contrast != null && contrast >= 4.5 ? color : `color-mix(in srgb, ${color} 62%, var(--ink))`;
  const bodyHtml = renderMd(stop.body_md);
  const tappable = !!bodyHtml;
  const meta = [stop.time_label, stop.duration_label].filter(Boolean).join(' · ') || MODE_LABEL[mode] || '';
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

  const head = (
    <>
      <div className="num" style={{
        display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
        fontFamily: 'var(--font-mono)', fontSize: 11.5, letterSpacing: '0.08em', color: ink, lineHeight: 1.5,
      }}>
        <span>{meta}</span>
        <WhoChip who={stop.who} color={ink} />
        {tappable && (
          <span aria-hidden="true" style={{
            display: 'inline-block', color: 'var(--ink-4)', fontSize: 10, lineHeight: 1,
            transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 160ms var(--ease-out)',
          }}>›</span>
        )}
      </div>
      <div style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.4 }}>
        <b style={{ fontWeight: 600, color: 'var(--ink)' }}>{stop.title}</b>{hop ? `, ${hop}` : ''}
      </div>
    </>
  );

  return (
    <article id={`stop-${stop.id}`} style={{
      position: 'relative',
      display: 'grid',
      gridTemplateColumns: stamp ? '26px minmax(0, 1fr) auto' : '26px minmax(0, 1fr)',
      columnGap: 8,
      // The dotted line sits at 13px inside the article, so pulling it 12px
      // left puts it on the cards' 3px edge bars.
      marginLeft: -12,
      marginTop: 8,
      scrollMarginTop: 'calc(env(safe-area-inset-top, 0px) + 64px)',
    }}>
      {/* The route, through the gap: reaches into the 8px margins above and below. */}
      <div aria-hidden="true" style={{
        position: 'absolute', left: 12, top: -8, bottom: -8, borderLeft: `2px dotted ${color}`,
      }} />
      <div style={{ gridColumn: 1, gridRow: 1, alignSelf: 'center', position: 'relative', height: 26 }}>
        <span style={{
          position: 'absolute', inset: 0, borderRadius: '50%', background: 'var(--bg)',
          border: `1.5px solid ${color}`, color, display: 'grid', placeItems: 'center',
        }}>
          <HopGlyph mode={mode} />
        </span>
      </div>

      {tappable ? (
        <button type="button" onClick={() => setOpen(v => !v)} aria-expanded={open} style={{
          gridColumn: 2, gridRow: 1, minHeight: 52, display: 'flex', flexDirection: 'column', justifyContent: 'center',
          textAlign: 'left', background: 'transparent', border: 0, padding: '4px 0', margin: 0,
          font: 'inherit', color: 'inherit', cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
        }}>
          {head}
        </button>
      ) : (
        <div style={{ gridColumn: 2, gridRow: 1, minHeight: 52, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '4px 0' }}>
          {head}
        </div>
      )}
      {stamp && <div style={{ gridColumn: 3, gridRow: 1, alignSelf: 'center' }}>{stamp}</div>}

      {open && bodyHtml && (
        <div style={{ gridColumn: '2 / -1', gridRow: 2, paddingBottom: 6 }}>
          <div className="body-content" style={{ fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.55 }}
            dangerouslySetInnerHTML={{ __html: bodyHtml }} />
          {dirHref && (
            <a href={dirHref} target="_blank" rel="noopener noreferrer" style={{
              display: 'inline-block', marginTop: 6, fontFamily: 'var(--font-mono)', fontSize: 12,
              letterSpacing: '0.06em', color: ink, textDecoration: 'none', borderBottom: '1px solid currentColor',
            }}>
              Directions ↗
            </a>
          )}
        </div>
      )}
      <div style={{ gridColumn: '2 / -1', gridRow: 3, minWidth: 0 }}>{footer}</div>
    </article>
  );
}
