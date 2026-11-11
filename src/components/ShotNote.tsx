'use client';

// ─────────────────────────────────────────────────────────────────────────────
// ShotNote — one of the trip's big shots, as a footnote in the itinerary.
//
// Owner only (TripView draws it only when this phone holds the admin cookie).
// Two lines so it never crowds a phone: the shot's name with an arrow, then the
// light window · lens · "area". A copper rule down the left ties it to the stop
// without boxing it in. Marked "got" in koma, it goes grey with a ✓ so the rest
// of the day reads clean. A tap opens the shot's card (#koma-<id>).
//
// TimedShot is the same footnote in a row of its own, with its time in the
// stop's time column, for a big shot that has no stop to hang on.
// Design: the "koji Big Shots" board, option A (confirmed 2026-11-11).
// ─────────────────────────────────────────────────────────────────────────────

import type { Shot } from '@/lib/supabase';

const COPPER = '#B83C01';
const COPPER_MID = '#CF6A21';
const COPPER_WASH = '#FEF8F2';

function FrameMark({ color }: { color: string }) {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden style={{ color, flex: 'none', marginTop: 1, gridRow: '1 / 3', alignSelf: 'start' }}>
      <rect x="1.5" y="3" width="13" height="10" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M1.5 5.5h13M1.5 10.5h13" stroke="currentColor" strokeWidth="1" />
      <circle cx="8" cy="8" r="1.6" fill="currentColor" />
    </svg>
  );
}

export function ShotNote({ shot, light, onOpen, flush = false }: {
  shot: Shot;
  /** From shotWindow(): "golden 5:21–5:56", or null. */
  light: string | null;
  onOpen: () => void;
  /** No top margin, for the by-time row. */
  flush?: boolean;
}) {
  const got = shot.status === 'got';
  const area = shot.kind === 'area';
  const meta = [light, shot.lens].filter(Boolean) as string[];
  const ink = got ? 'var(--ink-3)' : COPPER;
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${shot.title}${got ? ', got it' : ''}. Open in koma.`}
      style={{
        display: 'grid', gridTemplateColumns: 'auto 1fr auto', columnGap: 8, rowGap: 2,
        alignItems: 'center', width: '100%', textAlign: 'left', cursor: 'pointer',
        marginTop: flush ? 0 : 10, padding: '8px 10px 8px 9px',
        border: 'none', borderLeft: `2px solid ${got ? 'var(--border-mid)' : COPPER}`,
        borderRadius: '0 8px 8px 0',
        background: got ? 'none' : `linear-gradient(90deg, ${COPPER_WASH} 0%, transparent 85%)`,
        color: ink, font: 'inherit',
      }}
    >
      <FrameMark color={ink} />
      <b style={{
        fontSize: 12.5, fontWeight: 700, lineHeight: 1.3, minWidth: 0,
        color: got ? 'var(--ink-3)' : 'var(--ink)',
        textDecoration: got ? 'line-through' : 'none', textDecorationColor: 'var(--border-mid)',
      }}>
        {shot.title}
      </b>
      <span aria-hidden style={{ gridColumn: 3, gridRow: '1 / 3', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
        {got ? '✓' : '→'}
      </span>
      {(meta.length > 0 || area) && (
        <span style={{
          gridColumn: 2, display: 'flex', flexWrap: 'wrap', gap: '0 8px',
          fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '0.03em', color: ink,
        }}>
          {meta.map((m, i) => (
            <span key={i}>
              {i > 0 && <span style={{ marginRight: 8, color: got ? 'var(--border-mid)' : COPPER_MID }}>·</span>}
              {m}
            </span>
          ))}
          {area && (
            <span style={{ fontSize: 8.5, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              {meta.length > 0 && <span style={{ marginRight: 8, color: got ? 'var(--border-mid)' : COPPER_MID }}>·</span>}
              area
            </span>
          )}
        </span>
      )}
    </button>
  );
}

/** A big shot with no stop, at its own time between the stops. */
export function TimedShot({ time, ...note }: { time: string } & React.ComponentProps<typeof ShotNote>) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '54px 1fr', gap: 6,
      padding: '0 14px 0 18px', marginTop: 8,
    }}>
      <div className="num" style={{
        fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500, letterSpacing: '0.03em',
        color: note.shot.status === 'got' ? 'var(--ink-3)' : COPPER, paddingTop: 9,
      }}>
        {time}
      </div>
      <div style={{ minWidth: 0 }}><ShotNote {...note} flush /></div>
    </div>
  );
}
