'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Where you sleep, and what you might add. Three pieces of the trip page that
// all hang off koji_stays, plus the "if there's time" list for optional stops:
//   - StaysStrip:   the band of towns in the hero; tap one to jump to its day
//   - StayHeading:  the chapter heading before a town's first day
//   - MaybeShelf:   optional stops at the foot of their day, full strength
// A trip with no stays renders none of the first two, exactly as before.
// ─────────────────────────────────────────────────────────────────────────────

import type { Stay, Stop } from '@/lib/supabase';
import { mapsSearchUrl } from '@/lib/supabase';
import { renderMd } from '@/lib/markdown';

import { STAY_PALETTE, heroIsLight } from '@/lib/stayColors';
export { STAY_PALETTE, heroIsLight };

export function stayTone(stay: Stay, onHero: { bg: string } | null): string {
  const p = STAY_PALETTE[stay.color] ?? STAY_PALETTE.blue;
  if (!onHero) return p.ink;
  return heroIsLight(onHero.bg) ? p.ink : p.light;
}

function addDays(iso: string, n: number): string {
  const d = new Date(iso + 'T00:00');
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** The stay you sleep in on this date, if any. The day you leave belongs to the next one. */
export function stayForDate(stays: Stay[], date: string): Stay | null {
  for (const s of stays) {
    if (date >= s.check_in && date < addDays(s.check_in, s.nights)) return s;
  }
  return null;
}

function shortDate(iso: string): string {
  return new Date(iso + 'T00:00').toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }).toLowerCase();
}

// ── STRIP ───────────────────────────────────────────────────────────────────
export function StaysStrip({ stays, theme, onPick }: {
  stays: Stay[];
  theme: { bg: string; fg: string };
  onPick: (stay: Stay) => void;
}) {
  const cols = Math.min(stays.length, 3);
  return (
    <nav aria-label="Where you sleep" style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: 4 }}>
      {stays.map(s => (
        <button
          key={s.id}
          type="button"
          className="pressable"
          onClick={() => onPick(s)}
          aria-label={`${s.place}, ${s.nights} night${s.nights === 1 ? '' : 's'}`}
          style={{
            minWidth: 0,
            display: 'grid',
            gap: 1,
            textAlign: 'left',
            padding: '7px 9px 7px',
            borderRadius: 10,
            background: `${theme.fg}14`,
            borderTop: `3px solid ${stayTone(s, theme)}`,
            color: theme.fg,
          }}
        >
          <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 14, lineHeight: 1.15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {s.place}
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.06em', opacity: 0.75 }}>
            {s.nights} night{s.nights === 1 ? '' : 's'}
          </span>
        </button>
      ))}
    </nav>
  );
}

// ── CHAPTER HEADING ─────────────────────────────────────────────────────────
export function StayHeading({ stay }: { stay: Stay }) {
  const ink = stayTone(stay, null);
  const out = addDays(stay.check_in, stay.nights);
  const hotelUrl = stay.hotel ? mapsSearchUrl(stay.hotel_query || [stay.hotel, stay.place].join(' ')) : null;
  return (
    <header id={`stay-${stay.id}`} style={{ margin: '34px 12px 0', scrollMarginTop: 'calc(env(safe-area-inset-top, 0px) + 8px)' }}>
      {stay.photo_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={stay.photo_url} alt="" loading="lazy" style={{ display: 'block', width: '100%', aspectRatio: '21 / 9', objectFit: 'cover', borderRadius: 14, marginBottom: 10 }} />
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'end', gap: '4px 12px', padding: '0 4px 9px', borderBottom: `2px solid ${ink}` }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 300, fontSize: 28, lineHeight: 1, color: 'var(--ink)', margin: 0 }}>
          {stay.place}
          {stay.local_name && <span style={{ fontSize: 15, fontWeight: 400, color: ink, marginLeft: 7 }}>{stay.local_name}</span>}
        </h2>
        <span className="num" style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.04em', color: 'var(--ink-3)', textAlign: 'right', lineHeight: 1.45 }}>
          {stay.nights} night{stay.nights === 1 ? '' : 's'}<br />{shortDate(stay.check_in)} – {shortDate(out)}
        </span>
        {stay.intro_md && (
          <div
            className="body-content"
            style={{ gridColumn: '1 / -1', fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 14.5, lineHeight: 1.5, color: 'var(--ink-2)', marginTop: 4 }}
            dangerouslySetInnerHTML={{ __html: renderMd(stay.intro_md) }}
          />
        )}
        {stay.hotel && (
          <div style={{ gridColumn: '1 / -1', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px 10px', marginTop: 4, fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.03em', color: 'var(--ink-3)' }}>
            <a href={hotelUrl!} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--ink-2)', borderBottom: '1px solid var(--border-mid)', textDecoration: 'none' }}>{stay.hotel}</a>
            <span style={{
              fontSize: 8.5, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase',
              padding: '2px 7px', borderRadius: 4, transform: 'rotate(-2deg)',
              ...(stay.booked
                ? { background: ink, color: 'var(--surface)' }
                : { border: `1.5px dashed ${ink}`, color: ink }),
            }}>
              {stay.booked ? 'booked' : 'not booked'}
            </span>
            {stay.desk_hours && <span>{stay.desk_hours}</span>}
          </div>
        )}
      </div>
    </header>
  );
}

// ── IF THERE'S TIME ─────────────────────────────────────────────────────────
export function MaybeShelf({ stops, owner, onAdd }: {
  stops: Stop[];
  owner: boolean;
  onAdd: (stop: Stop) => void;
}) {
  if (stops.length === 0) return null;
  return (
    <div style={{ marginTop: 14, paddingTop: 10, borderTop: '1px dashed var(--border-mid)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '0 4px' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, fontWeight: 500, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--brass)' }}>
          if there&apos;s time
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-4)' }}>
          {stops.length} {stops.length === 1 ? 'maybe' : 'maybes'}
        </span>
      </div>
      {stops.map(stop => {
        const body = renderMd(stop.body_md);
        return (
          <article
            key={stop.id}
            id={`stop-${stop.id}`}
            style={{
              display: 'grid',
              gridTemplateColumns: owner ? 'minmax(0, 1fr) auto' : 'minmax(0, 1fr)',
              gap: '3px 10px',
              alignItems: 'start',
              background: 'var(--surface)',
              border: '0.5px solid var(--border)',
              borderRadius: 12,
              padding: '10px 12px',
              marginTop: 6,
              scrollMarginTop: 'calc(env(safe-area-inset-top, 0px) + 64px)',
            }}
          >
            <div style={{ minWidth: 0 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.35, color: 'var(--ink)', margin: 0 }}>
                {stop.title}
                {stop.time_label && (
                  <span className="num" style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 500, color: 'var(--ink-4)', marginLeft: 8 }}>{stop.time_label}</span>
                )}
              </h3>
              {body && <div className="body-content" style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--ink-3)', marginTop: 2 }} dangerouslySetInnerHTML={{ __html: body }} />}
              {stop.fit_label && (
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '0.06em', color: 'var(--brass)', marginTop: 4 }}>{stop.fit_label}</div>
              )}
            </div>
            {owner && (
              <button
                type="button"
                onClick={() => onAdd(stop)}
                className="pressable"
                aria-label={`Add ${stop.title} to the plan`}
                style={{
                  minHeight: 32, padding: '0 11px', borderRadius: 999,
                  border: '1px solid var(--border-mid)', background: 'var(--bg)',
                  fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.06em', color: 'var(--ink-2)', whiteSpace: 'nowrap',
                }}
              >
                + add
              </button>
            )}
          </article>
        );
      })}
    </div>
  );
}

/** Under a stop that came off the shelf: the owner's way to put it back. */
export function RemoveFromPlan({ onRemove }: { onRemove: () => void }) {
  return (
    <button
      type="button"
      onClick={onRemove}
      style={{ marginTop: 6, padding: 0, fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '0.06em', color: 'var(--ink-4)', background: 'none', border: 'none', cursor: 'pointer' }}
    >
      added from maybes · put back
    </button>
  );
}
