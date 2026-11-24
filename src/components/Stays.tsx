'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Where you sleep, and what you might add. Three pieces of the trip page that
// all hang off koji_stays, plus the "if there's time" list for optional stops:
//   - StaysStrip:   the band of towns in the hero; tap one to jump to its day
//   - StayHeading:  the chapter heading before a town's first day
//   - MaybeCard:    an optional stop, tinted and dashed, in place in its day
// A trip with no stays renders none of the first two, exactly as before.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import type { Stay, Stop } from '@/lib/supabase';
import { appleSearchUrl, mapsSearchUrl } from '@/lib/maps';
import type { Dress } from '@/lib/maps';
import { CINNABAR, cjkFont } from '@/lib/dress';
import { useAppleMaps } from './MapsContext';
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
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.06em', opacity: 0.75 }}>
            {s.nights} night{s.nights === 1 ? '' : 's'}
          </span>
        </button>
      ))}
    </nav>
  );
}

// ── CHAPTER HEADING ─────────────────────────────────────────────────────────
function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Whole days from a to b, both YYYY-MM-DD. */
function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b + 'T00:00').getTime() - new Date(a + 'T00:00').getTime()) / 86400000);
}

/**
 * What the tilted stamp on a stay heading says. Booking is a given by the time
 * anyone reads the itinerary, so the stamp tells you where you are instead:
 * which of the trip's nights this is before you go, "tonight" / "night 2 of 3"
 * / "checkout day" while you're there, "stayed" once it's behind you. An
 * unbooked stay keeps its dashed "not booked" until the stay has passed.
 */
function stampFor(stay: Stay, out: string, firstNight: number, today: string): { text: string; ghost: boolean } {
  if (today > out) return { text: 'stayed', ghost: true };
  if (!stay.booked) return { text: 'not booked', ghost: true };
  if (today === out) return { text: 'checkout day', ghost: false };
  if (today === stay.check_in) return { text: 'tonight', ghost: false };
  if (today > stay.check_in) return { text: `night ${daysBetween(stay.check_in, today) + 1} of ${stay.nights}`, ghost: false };
  const last = firstNight + stay.nights - 1;
  return { text: stay.nights === 1 ? `night ${firstNight}` : `nights ${firstNight}–${last}`, ghost: false };
}

// ── STAY MARK ───────────────────────────────────────────────────────────────
// On a Japan or China trip the local name is drawn as a mark at the end of the
// heading: a round station stamp (Japan, in the stay colour) or a square name
// seal (China, always cinnabar). Lighter until check-in, inked from that day.
// The round stamp is lifted 5px so it clears the intro line under the heading.
// Negative vertical margins keep it inside the heading's existing line box.
function StayMark({ stay, dress, inked, ink }: { stay: Stay; dress: Exclude<Dress, null>; inked: boolean; ink: string }) {
  const name = stay.local_name!;
  const chars = Array.from(name);
  const font = cjkFont(dress);
  const common: React.CSSProperties = {
    display: 'inline-block', verticalAlign: 'middle', flexShrink: 0,
    opacity: inked ? 1 : 0.6,
  };
  if (dress === 'ja') {
    const arcId = `stay-arc-${stay.id}`;
    const latin = stay.place.toUpperCase();
    const [y, m, d] = stay.check_in.split('-').map(Number);
    return (
      <svg viewBox="0 0 120 120" width={44} height={44} role="img" aria-label={`${stay.place} station stamp, ${name}`} lang="ja"
        style={{ ...common, margin: '-12px 0 -10px 8px', transform: 'translateY(-5px) rotate(-9deg)' }}>
        <path id={arcId} d="M 19 62 A 41 41 0 0 1 101 62" fill="none" />
        <circle cx="60" cy="60" r="56" fill="none" stroke={ink} strokeWidth="4" />
        <circle cx="60" cy="60" r="49" fill="none" stroke={ink} strokeWidth="1.5" />
        <text fontFamily="var(--font-mono)" fontSize={latin.length > 8 ? 9 : 11} fontWeight="600" letterSpacing={latin.length > 8 ? 1.5 : 3} fill={ink}>
          <textPath href={`#${arcId}`} startOffset="50%" textAnchor="middle">{latin}</textPath>
        </text>
        <text x="60" y={chars.length > 2 ? 74 : 76} textAnchor="middle" fontFamily={font} fontWeight="700" fontSize={chars.length > 2 ? 24 : 32} fill={ink}>{name}</text>
        <text x="60" y="96" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="10" letterSpacing="1" fill={ink}>{`${y}.${m}.${d}`}</text>
      </svg>
    );
  }
  // Seal: characters top to bottom, in a thin inner frame. Four or more go in
  // two columns, read right column first, the way a seal is cut.
  const paper = 'var(--surface)';
  const cols = chars.length >= 4 ? [chars.slice(0, Math.ceil(chars.length / 2)), chars.slice(Math.ceil(chars.length / 2))] : [chars];
  const rows = cols[0].length;
  const cell = 28 / rows;
  const size = Math.min(13, cell * 0.92) * (cols.length > 1 ? 0.95 : 1);
  const xs = cols.length > 1 ? [26.5, 13.5] : [20];
  return (
    <svg viewBox="0 0 40 40" width={34} height={34} role="img" aria-label={`${stay.place} name seal, ${name}`} lang={dress}
      style={{ ...common, margin: '-8px 0 -6px 9px', transform: 'rotate(3deg)' }}>
      <rect x="1" y="1" width="38" height="38" rx="4" fill={CINNABAR} />
      <rect x="4" y="4" width="32" height="32" rx="2" fill="none" stroke={paper} strokeWidth="1" />
      {cols.map((col, c) => col.map((ch, r) => (
        <text key={`${c}-${r}`} x={xs[c]} y={6 + cell * (r + 1) - cell * 0.16} textAnchor="middle" fontFamily={font} fontWeight="900" fontSize={size} fill={paper}>{ch}</text>
      )))}
    </svg>
  );
}

export function StayHeading({ stay, firstNight = 1, dress = null }: { stay: Stay; firstNight?: number; dress?: Dress }) {
  const ink = stayTone(stay, null);
  const out = addDays(stay.check_in, stay.nights);
  const apple = useAppleMaps();
  // The page is prerendered, so "today" is only known in the browser. Read it
  // after mount, and again when the phone wakes up on a new day.
  const [today, setToday] = useState<string | null>(null);
  useEffect(() => {
    setToday(localToday());
    const onVisible = () => { if (document.visibilityState === 'visible') setToday(localToday()); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);
  const stamp = today ? stampFor(stay, out, firstNight, today) : null;
  // China trips search Apple Maps by the Chinese name, which it finds reliably.
  const hotelUrl = !stay.hotel ? null
    : apple ? appleSearchUrl(stay.hotel_ja || stay.hotel_query || [stay.hotel, stay.place].join(' '))
    : mapsSearchUrl(stay.hotel_query || [stay.hotel, stay.place].join(' '));
  return (
    <header id={`stay-${stay.id}`} style={{ margin: '34px 12px 0', scrollMarginTop: 'calc(env(safe-area-inset-top, 0px) + 8px)' }}>
      {stay.photo_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={stay.photo_url} alt="" loading="lazy" style={{ display: 'block', width: '100%', aspectRatio: '21 / 9', objectFit: 'cover', borderRadius: 14, marginBottom: 10 }} />
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'end', gap: '4px 12px', padding: '0 4px 9px', borderBottom: `2px solid ${ink}` }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 300, fontSize: 28, lineHeight: 1, color: 'var(--ink)', margin: 0 }}>
          {stay.place}
          {stay.local_name && (dress
            ? <StayMark stay={stay} dress={dress} inked={!!today && today >= stay.check_in} ink={ink} />
            : <span style={{ fontSize: 15, fontWeight: 400, color: ink, marginLeft: 7 }}>{stay.local_name}</span>)}
        </h2>
        <span className="num" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.04em', color: 'var(--ink-3)', textAlign: 'right', lineHeight: 1.45 }}>
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
          <div style={{ gridColumn: '1 / -1', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px 10px', marginTop: 4, fontFamily: 'var(--font-mono)', fontSize: 11.5, letterSpacing: '0.03em', color: 'var(--ink-3)' }}>
            <a href={hotelUrl!} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--ink-2)', borderBottom: '1px solid var(--border-mid)', textDecoration: 'none' }}>{stay.hotel}</a>
            {stamp && (
              <span style={{
                fontSize: 11.5, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', whiteSpace: 'nowrap',
                padding: '2px 7px', borderRadius: 4, transform: 'rotate(-2deg)',
                ...(stamp.ghost
                  ? { border: `1.5px dashed ${ink}`, color: ink }
                  : { background: ink, color: 'var(--surface)' }),
              }}>
                {stamp.text}
              </span>
            )}
            {stay.desk_hours && <span>{stay.desk_hours}</span>}
          </div>
        )}
      </div>
    </header>
  );
}

// ── IF THERE'S TIME ─────────────────────────────────────────────────────────
// Each maybe is its own card in a pale wash of the day's colour with a dashed
// edge (a cut-out, not a planned stop). The owner's add button is a full-width
// strip along the bottom, so the text always gets the whole card.
const ClockGlyph = () => (
  <svg width="10" height="10" viewBox="0 0 12 12" aria-hidden style={{ flexShrink: 0, alignSelf: 'center' }}>
    <circle cx="6" cy="6" r="4.9" fill="none" stroke="currentColor" strokeWidth="1.2" />
    <path d="M6 3.4V6l1.8 1.2" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);
const PlusGlyph = () => (
  <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden>
    <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

/** A body that is only "- " bullets → its items; anything else → null. */
function listItems(md: string | null): string[] | null {
  if (!md) return null;
  const lines = md.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 0 || !lines.every(l => /^[-*] /.test(l))) return null;
  return lines.map(l => l.slice(2));
}

function maybeColors(accent: string) {
  return {
    tint: `color-mix(in srgb, ${accent} 15%, var(--surface))`,
    deep: `color-mix(in srgb, ${accent} 62%, var(--ink))`,
    edge: (pct: number) => `color-mix(in srgb, ${accent} ${pct}%, transparent)`,
  };
}

/** Above the first maybe in a run: a quiet "if there's time" rule. */
export function MaybeRunHead({ accent, label = "if there's time" }: { accent: string; label?: string }) {
  const { deep, edge } = maybeColors(accent);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 4px', margin: '14px 0 -2px', color: deep }}>
      <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontWeight: 300, fontSize: 15, whiteSpace: 'nowrap' }}>
        {label}
      </span>
      <span aria-hidden style={{ flex: 1, borderTop: `1.5px dotted ${edge(50)}` }} />
    </div>
  );
}

/** One maybe, drawn in the day's colour where it would fit in the day. */
export function MaybeCard({ stop, owner, onAdd, accent }: {
  stop: Stop;
  owner: boolean;
  onAdd: (stop: Stop) => void;
  accent: string;
}) {
  const { tint, deep, edge } = maybeColors(accent);
    // "Ideas: lunch on Naoshima" with a "- " list body: a short list of
    // picks, not one stop. Show the list as a list and say so in the pill.
    const ideas = /^ideas:\s*/i.test(stop.title);
    const title = ideas ? stop.title.replace(/^ideas:\s*/i, '').replace(/^./, c => c.toUpperCase()) : stop.title;
    const items = listItems(stop.body_md);
    const body = items ? null : renderMd(stop.body_md);
    const pill = stop.fit_label ?? (ideas ? (items && items.length > 1 ? `${items.length} ideas` : 'an idea') : null);
    return (
      <article
        id={`stop-${stop.id}`}
        style={{
          background: tint,
          border: `1.5px dashed ${edge(45)}`,
          borderRadius: 16,
          marginTop: 10,
          overflow: 'hidden',
          scrollMarginTop: 'calc(env(safe-area-inset-top, 0px) + 64px)',
        }}
      >
        <div style={{ padding: '11px 14px 11px' }}>
          {pill && (
            <span style={{
              display: 'inline-flex', alignItems: 'baseline', gap: 5, maxWidth: '100%', lineHeight: 1.35,
              fontFamily: 'var(--font-mono)', fontSize: 11.5, letterSpacing: '0.06em', textTransform: 'uppercase',
              color: deep, background: 'var(--surface)', borderRadius: 10, padding: '3px 9px', marginBottom: 7,
            }}>
              {stop.fit_label && <ClockGlyph />}
              <span style={{ minWidth: 0 }}>{pill}</span>
            </span>
          )}
          <h3 style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.3, color: deep, margin: 0 }}>
            {title}
            {!owner && stop.time_label && (
              <span className="num" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500, color: 'var(--ink-4)', marginLeft: 8 }}>{stop.time_label}</span>
            )}
          </h3>
          {body && <div className="body-content" style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--ink-2)', marginTop: 3 }} dangerouslySetInnerHTML={{ __html: body }} />}
          {items && (
            <ul style={{ listStyle: 'none', margin: '5px 0 0', padding: 0, display: 'grid', gap: 6 }}>
              {items.map((it, k) => (
                <li key={k} style={{ display: 'grid', gridTemplateColumns: '12px minmax(0, 1fr)', gap: 6, alignItems: 'start' }}>
                  <span aria-hidden style={{ width: 6, height: 6, borderRadius: 999, background: edge(70), marginTop: 7 }} />
                  <div className="body-content" style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--ink-2)' }} dangerouslySetInnerHTML={{ __html: renderMd(it) }} />
                </li>
              ))}
            </ul>
          )}
        </div>
        {owner && (
          <button
            type="button"
            onClick={() => onAdd(stop)}
            className="pressable"
            aria-label={`Add ${stop.title} to the plan`}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, width: '100%', minHeight: 40,
              border: 'none', borderTop: `1.5px dashed ${edge(35)}`,
              background: `color-mix(in srgb, ${accent} 9%, var(--surface))`,
              fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase',
              color: deep, cursor: 'pointer',
            }}
          >
            <PlusGlyph />
            Add to the day{stop.time_label ? ` · ${stop.time_label}` : ''}
          </button>
        )}
      </article>
    );
}

/** Under a stop that came off the shelf: the owner's way to put it back. */
export function RemoveFromPlan({ onRemove }: { onRemove: () => void }) {
  return (
    <button
      type="button"
      onClick={onRemove}
      style={{ marginTop: 6, padding: 0, fontFamily: 'var(--font-mono)', fontSize: 11.5, letterSpacing: '0.06em', color: 'var(--ink-4)', background: 'none', border: 'none', cursor: 'pointer' }}
    >
      added from maybes · put back
    </button>
  );
}
