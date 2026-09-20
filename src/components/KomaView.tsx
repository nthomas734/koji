'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import type { Carry, Day, Roll, Shot, Stop, Trip } from '@/lib/supabase';
import { renderMd, renderBlockMd } from '@/lib/markdown';
import { SunTrack, type TrackFrame } from './SunTrack';
import { KomaSketch } from './KomaSketch';
import { LensMark, lensLabel, lensLength, lensWeight, fmtWeight } from './LensMark';
import {
  sunDay, utcOffsetFor, parseTimeLabel, parseClock, fmtHour, bandAt,
  type SunDay, type OffsetSource,
} from '@/lib/sun';
import { usePendingStatus, queueStatus, flush } from '@/lib/komaQueue';
import { solarPosition, sunRelation } from '@/lib/sun';

// ── FRAME MODEL ──────────────────────────────────────────────────────────────
// A "frame" is a shot placed in the day's running order. Numbering runs 1..n
// per day, following the itinerary: shots inherit their stop's position, and
// loose shots (day_id set, stop_id null) fall in at the end of the day.

interface Frame {
  shot:  Shot;
  n:     number;
  stop:  Stop | null;
  hour:  number | null;
}

function buildFrames(day: Day, shots: Shot[]): Frame[] {
  const stops = [...(day.stops ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const stopPos = new Map<number, number>(stops.map((s, i) => [s.id, i] as [number, number]));
  const mine = shots.filter(s => s.day_id === day.id);

  // Resolve the time before ordering: `at_time` is a 24-hour clock and goes
  // through the strict parser, never the label heuristic that pushes an early
  // hour into the afternoon.
  const placed = mine.map(shot => {
    const stop = shot.stop_id != null ? stops.find(s => s.id === shot.stop_id) ?? null : null;
    return { shot, stop, hour: parseClock(shot.at_time) ?? parseTimeLabel(stop?.time_label) };
  });

  const ordered = [...placed].sort((a, b) => {
    // An unresolved stop_id sorts last and is treated as loose; see byStop.
    const pa = a.stop ? stopPos.get(a.stop.id) ?? 9e6 : 9e6;
    const pb = b.stop ? stopPos.get(b.stop.id) ?? 9e6 : 9e6;
    if (pa !== pb) return pa - pb;
    // Within one stop the clock wins over hand-set sort_order, which drifts:
    // New York had frame 1 at 17:50 ahead of frame 2 at 17:25.
    if (a.hour != null && b.hour != null && a.hour !== b.hour) return a.hour - b.hour;
    return a.shot.sort_order - b.shot.sort_order;
  });

  return ordered.map((f, i) => ({ ...f, n: i + 1 }));
}

// ── SUN ──────────────────────────────────────────────────────────────────────

function useSun(lat: number | null, lng: number | null, dateISO: string | null, tz: string | null):
  { sun: SunDay | null; offset: number | null; source: OffsetSource | null } {
  const [offset, setOffset] = useState<number | null>(null);
  const [source, setSource] = useState<OffsetSource | null>(null);

  useEffect(() => {
    let alive = true;
    if (lat == null || lng == null || !dateISO) { setOffset(null); setSource(null); return; }
    utcOffsetFor(lat, lng, dateISO, tz).then(o => {
      if (!alive) return;
      setOffset(o.seconds);
      setSource(o.source);
    });
    return () => { alive = false; };
  }, [lat, lng, dateISO, tz]);

  const sun = useMemo(() => {
    if (lat == null || lng == null || !dateISO || offset == null) return null;
    return sunDay(dateISO, lat, lng, offset);
  }, [lat, lng, dateISO, offset]);

  return { sun, offset, source };
}

/** Hours into the day at the destination, from a UTC instant. */
function hoursAtLocation(now: Date, offsetSec: number): number {
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const there = new Date(utcMs + offsetSec * 1000);
  return there.getHours() + there.getMinutes() / 60 + there.getSeconds() / 3600;
}

/** Is the destination on the same calendar day as this trip day right now? */
function sameDayThere(now: Date, offsetSec: number, dateISO: string | null): boolean {
  if (!dateISO) return false;
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const there = new Date(utcMs + offsetSec * 1000);
  const iso = `${there.getFullYear()}-${String(there.getMonth() + 1).padStart(2, '0')}-${String(there.getDate()).padStart(2, '0')}`;
  return iso === dateISO;
}

// ── SMALL PIECES ─────────────────────────────────────────────────────────────

function Chips({ frame }: { frame: Frame }) {
  const s = frame.shot;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
      {s.priority === 'must' && <span className="koma-chip must">must</span>}
      {s.lens && (
        <span className="koma-chip lens" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <LensMark lens={s.lens} color="#EDE6DA" height={11} />
          {lensLabel(s.lens, s.focal_hint)}
        </span>
      )}
      {s.shot_type && <span className="koma-chip">{s.shot_type}</span>}
      {s.status === 'missed' && <span className="koma-chip">missed</span>}
    </div>
  );
}

function ShotRow({ frame, onOpen }: { frame: Frame; onOpen: () => void }) {
  const s = frame.shot;
  const cls =
    'koma-shot' +
    (s.priority === 'must' ? ' must' : '') +
    (s.status === 'got' ? ' done' : '') +
    (s.status === 'missed' || s.status === 'skipped' ? ' missed' : '');

  return (
    <button type="button" className={cls} onClick={onOpen}>
      {s.ref_url
        // Deliberately not lazy. The service worker can only cache what has
        // actually been fetched, so lazy loading meant a photograph was offline
        // only if you had happened to scroll past its row while online. Opening
        // koma once with signal now warms every reference in the plan; there
        // are nine of them and they are cropped squares.
        ? <img className="koma-ref" src={s.ref_url} alt="" />
        : s.sketch
          ? <span className="koma-ref" style={{ overflow: 'hidden', display: 'block' }}>
              <KomaSketch spec={s.sketch} rounded={0} />
            </span>
          : <span className="koma-refx">no<br />ref</span>}
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--k-ink-3)' }}>{frame.n}</span>
          <span className="koma-shot-t">{s.title}</span>
        </span>
        {s.subtitle && (
          <span style={{ display: 'block', fontSize: 11, color: 'var(--k-ink-3)', lineHeight: 1.35, marginTop: 3 }}>
            {s.subtitle}
          </span>
        )}
        <Chips frame={frame} />
      </span>
      <span aria-hidden style={{ color: 'var(--k-ink-3)', fontSize: 16, flex: '0 0 auto' }}>›</span>
    </button>
  );
}

// ── FRAME SHEET ──────────────────────────────────────────────────────────────

/** Everything the sheet needs to place the sun, or null when it cannot. */
/**
 * Cloud, as a flag rather than a forecast.
 *
 * Light is the whole mode and cloud is the one thing that overrides the sun: a
 * golden frame under full overcast is not a golden frame, and the texture
 * frames become the ones to chase instead. The trip page already fetches a
 * daily WMO code for the weather tab, so this costs no request.
 *
 * **Absent means absent.** Open-Meteo's forecast window is about sixteen days,
 * so a trip further out returns nothing — and nothing must render as nothing,
 * never as "clear". Silently turning a missing forecast into good news is the
 * same failure as the UTC offset falling back to +0, which shipped once
 * already. See sql/sun-audit.md.
 */
export type DayCloud = { code: number } | null;

/** WMO 3 is overcast; 45+ is fog, drizzle, rain, snow, storms. */
function cloudFlag(c: DayCloud): string | null {
  if (!c) return null;
  if (c.code === 3)  return 'Overcast forecast — golden may not arrive.';
  if (c.code >= 45)  return 'Wet or foggy forecast — plan for flat light.';
  if (c.code === 2)  return 'Partly cloudy forecast — golden is a maybe.';
  return null;
}

export type SheetGeo = { lat: number; lng: number; dateISO: string; offset: number } | null;

function FrameSheet({
  frame, total, sun, geo, onClose, onStatus, pending, dated, onStep,
}: {
  frame: Frame;
  total: number;
  sun: SunDay | null;
  /** Coordinates, date and offset — for the sun-direction line. */
  geo: SheetGeo;
  onClose: () => void;
  onStatus: (status: Shot['status']) => void;
  /** This frame has a status write that has not reached the server yet. */
  pending: boolean;
  /** False for an undated roll, whose curve is today's stand-in. */
  dated: boolean;
  /** Move through the roll without going back to the list. */
  onStep: (delta: number) => void;
}) {
  const s = frame.shot;
  const [zoom, setZoom] = useState(false);
  const scroller = useRef<HTMLDivElement | null>(null);

  // Stepping kept the previous scroll position, so "next" from the bottom bar
  // landed you mid-page with the reference photograph off-screen above.
  useEffect(() => { scroller.current?.scrollTo({ top: 0 }); }, [s.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { zoom ? setZoom(false) : onClose(); return; }
      if (zoom) return;
      if (e.key === 'ArrowLeft')  onStep(-1);
      if (e.key === 'ArrowRight') onStep(1);
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose, zoom, onStep]);

  const band = sun && frame.hour != null ? bandAt(sun, frame.hour) : null;
  const wantsGolden = s.light === 'golden' || s.light === 'blue';
  // An undated roll is drawn against *today's* sun, so a light conflict there
  // is reporting today's weather on a plan written for some other day. Balboa's
  // 18:20 golden frame flagged "falls in day light" purely because golden had
  // moved four minutes since the plan was written.
  const conflict = dated && wantsGolden && band && band !== s.light;

  // Where the sun is relative to the way you are looking. Only for frames with
  // an authored bearing — most have none, deliberately — and only while the
  // sun is actually up, since "behind you" means nothing at midnight.
  const facing = useMemo(() => {
    if (s.bearing == null || !geo || frame.hour == null) return null;
    const { altitude, azimuth } = solarPosition(
      geo.dateISO, frame.hour, geo.lat, geo.lng, geo.offset,
    );
    if (altitude <= -0.5) return null;
    return sunRelation(s.bearing, azimuth);
  }, [s.bearing, geo, frame.hour]);

  // PostgREST serialises `numeric` as a JSON string, so these arrive as
  // "51.714901" and not 51.714901 — .toFixed on that throws and takes the
  // whole sheet down. Confirmed against the live rows; do not drop the Number().
  const lat = s.lat == null ? null : Number(s.lat);
  const lng = s.lng == null ? null : Number(s.lng);
  const spot = lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)
    ? { lat, lng } : null;

  return (
    <div ref={scroller} role="dialog" aria-modal="true" aria-label={s.title} style={{
      position: 'fixed', inset: 0, zIndex: 60, background: 'var(--k-bg)',
      overflowY: 'auto', WebkitOverflowScrolling: 'touch',
      display: 'flex', flexDirection: 'column',
      paddingTop: 'env(safe-area-inset-top, 0px)',
    }}>
      <div style={{
        position: 'sticky', top: 0, zIndex: 2, display: 'flex', alignItems: 'center', gap: 10,
        padding: '13px 16px 10px', background: 'var(--k-bg)',
        borderBottom: 'var(--k-bw) solid var(--k-border)',
      }}>
        {/* 44px of target, pulled left by its own padding so the chevron still
            sits flush with the header text. It was 16x19. */}
        <button type="button" onClick={onClose} aria-label="Back" style={{
          background: 'none', border: 'none', font: 'inherit', fontSize: 19,
          color: 'var(--k-ink-2)', cursor: 'pointer', lineHeight: 1,
          width: 44, height: 44, marginLeft: -14, marginTop: -6, marginBottom: -6,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          flex: '0 0 auto',
        }}>‹</button>
        {/* One line. "Bourton → Lower Slaughter → Upper Slaughter loop" wrapped
            this to three lines and pushed the whole sheet down; the stop name is
            one tap behind anyway. The stepper moved to the pinned bar below, so
            the header is only ever "where am I". */}
        <span className="koma-label" style={{
          flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          Frame <b style={{ color: 'var(--k-copper)', fontWeight: 500 }}>{frame.n}</b> of {total}
          {/* the frame's own time, not the stop's — they differ by 30 min on
              the Slaughters loop, and the frame's is the one you shoot to */}
          {frame.hour != null ? ` · ${fmtHour(frame.hour)}` : ''}
          {frame.stop ? ` · ${frame.stop.title}` : ''}
        </span>
      </div>

      <div style={{
        maxWidth: 'var(--max-w)', width: '100%', margin: '0 auto', flex: '1 0 auto',
        padding: '14px 16px 20px',
      }}>
        {s.ref_url ? (
          <>
            <img
              src={s.ref_url} alt="Reference" onClick={() => setZoom(true)}
              style={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'cover', borderRadius: 13,
                       border: 'var(--k-bw) solid var(--k-border-2)', display: 'block', cursor: 'zoom-in' }}
            />
            <div className="koma-label" style={{ marginTop: 6, display: 'flex', justifyContent: 'space-between', letterSpacing: '0.06em' }}>
              <span>reference</span><span>tap to enlarge</span>
            </div>
            {s.ref_credit && (
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: 9, lineHeight: 1.5,
                color: 'var(--k-ink-3)', marginTop: 4,
              }}>
                {s.ref_credit}
              </div>
            )}
          </>
        ) : s.sketch ? (
          <>
            <div style={{ width: '100%', aspectRatio: '1 / 1', border: 'var(--k-bw) solid var(--k-border-2)',
                          borderRadius: 13, overflow: 'hidden' }}>
              <KomaSketch spec={s.sketch} rounded={0} />
            </div>
            <div className="koma-label" style={{ marginTop: 6, display: 'flex', justifyContent: 'space-between', letterSpacing: '0.06em' }}>
              <span>composition sketch</span><span>no photo yet</span>
            </div>
          </>
        ) : (
          <div className="koma-refx" style={{ width: '100%', height: 90, borderRadius: 13 }}>no reference image yet</div>
        )}

        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 500,
                     lineHeight: 1.2, margin: '13px 0 0', letterSpacing: '-0.015em', color: 'var(--k-ink)' }}>
          {s.title}
        </h2>
        {s.subtitle && (
          <p style={{ fontSize: 13, color: 'var(--k-ink-3)', lineHeight: 1.5, marginTop: 5 }}>{s.subtitle}</p>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 11 }}>
          {s.priority === 'must' && <span className="koma-chip must" style={{ fontSize: 10, padding: '4px 8px' }}>must</span>}
          {s.lens && (
            <span className="koma-chip lens" style={{ fontSize: 10, padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <LensMark lens={s.lens} color="#EDE6DA" height={12} />
              {lensLabel(s.lens, s.focal_hint)}
            </span>
          )}
          {s.shot_type && <span className="koma-chip" style={{ fontSize: 10, padding: '4px 8px' }}>{s.shot_type}</span>}
          {s.light && s.light !== 'any' && <span className="koma-chip" style={{ fontSize: 10, padding: '4px 8px' }}>{s.light}</span>}
        </div>

        {conflict && (
          <div style={{ marginTop: 12, padding: '9px 11px', borderRadius: 9, background: '#FBEFD9',
                        border: '1px solid #F0DBAE', color: '#633806',
                        fontFamily: 'var(--font-mono)', fontSize: 11, lineHeight: 1.5 }}>
            ⚑ Wants {s.light} light, but {frame.hour != null ? fmtHour(frame.hour) : 'this slot'} falls in {band} light.
          </div>
        )}

        {!dated && wantsGolden && (
          <div style={{ marginTop: 12, fontFamily: 'var(--font-mono)', fontSize: 9.5,
                        letterSpacing: '0.05em', color: 'var(--k-warn-ink)', lineHeight: 1.5 }}>
            ⚑ wants {s.light} light — set a date on this roll to check it
          </div>
        )}

        <Block label="Where to stand" md={s.position_md} />

        {facing && (
          <div style={{
            marginTop: 8, padding: '8px 11px', borderRadius: 10,
            background: 'var(--k-subtle)', border: 'var(--k-bw) solid var(--k-border)',
            fontSize: 12.5, lineHeight: 1.5, color: 'var(--k-ink-2)',
          }}>
            <span style={{ color: 'var(--k-copper)' }}>☀</span>{' '}
            {facing.text}
          </div>
        )}

        {/* The standing point, when the frame has one. A coordinate beats the
            prose only because it cannot be vague — so print it, rather than
            hiding it behind the button. */}
        {spot && (
          <div style={{
            marginTop: 10, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
            fontFamily: 'var(--font-mono)', fontSize: 10.5,
            letterSpacing: '0.03em', color: 'var(--k-ink-3)',
          }}>
            <span>{spot.lat.toFixed(4)}, {spot.lng.toFixed(4)}</span>
            {s.bearing != null && (
              <>
                <span style={{ opacity: 0.45 }}>·</span>
                <span style={{ color: 'var(--k-copper)' }}>look {s.bearing}°</span>
              </>
            )}
          </div>
        )}

        <div>
          {/* A pin on the point if we have one, otherwise the hand-written
              venue link — which names a building, and several frames share one. */}
          {spot ? (
            <SpotPill
              href={`https://www.google.com/maps/search/?api=1&query=${spot.lat},${spot.lng}`}
              filled
              label="Stand here"
              icon={
                <>
                  <path d="M8 1.6c-2.3 0-4.1 1.8-4.1 4.1 0 3 4.1 8.7 4.1 8.7s4.1-5.7 4.1-8.7c0-2.3-1.8-4.1-4.1-4.1z"
                        stroke="currentColor" strokeWidth="1.4" />
                  <circle cx="8" cy="5.7" r="1.5" fill="currentColor" />
                </>
              }
            />
          ) : s.scout_url ? (
            <SpotPill
              href={s.scout_url}
              label="Scout"
              icon={
                <>
                  <circle cx="6.6" cy="6.6" r="4.4" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M10 10L14 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </>
              }
            />
          ) : null}

          {/* Needs all three. A pano facing the wrong way looks authoritative,
              and an uncovered coordinate is worse still — Google answers it
              with the nearest user photosphere rather than nothing, which for
              the Tower Bridge span was The O2. pano_ok is a hand check. */}
          {spot && s.bearing != null && s.pano_ok === true && (
            <SpotPill
              href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${spot.lat},${spot.lng}&heading=${s.bearing}&pitch=0`}
              label={`Street view · ${s.bearing}°`}
              icon={
                <>
                  <circle cx="8" cy="8" r="6.2" stroke="currentColor" strokeWidth="1.4" />
                  <path d="M8 2.6l2.4 5.6L8 7.1 5.6 8.2z" fill="currentColor" />
                </>
              }
            />
          )}
        </div>

        <Block label="Technical" md={s.tech_md} mono />
        <Block label="Notes" md={s.notes_md} />

        {frame.stop?.body_md && (
          <div style={{ marginTop: 13, background: 'var(--k-subtle)', borderRadius: 10, padding: '10px 11px' }}>
            <div className="koma-label" style={{ marginBottom: 5 }}>From the itinerary</div>
            <div className="body-content" style={{ fontSize: 12, color: 'var(--k-ink-2)', lineHeight: 1.55 }}
                 dangerouslySetInnerHTML={{ __html: renderMd(frame.stop.body_md) }} />
          </div>
        )}

        {/* "Got it" lives in the pinned bar; Missed stays down here on purpose.
            It is the rarer mark and does not need to hold a permanent 58px of a
            phone screen. */}
        {s.status === 'planned' && (
          <div style={{ marginTop: 20, paddingTop: 14, borderTop: '1px solid var(--k-border)' }}>
            <button type="button" className="koma-btn sec" onClick={() => onStatus('missed')}>
              Missed it
            </button>
          </div>
        )}
        {pending && (
          <div style={{ marginTop: 12, fontFamily: 'var(--font-mono)', fontSize: 9.5,
                        letterSpacing: '0.05em', color: 'var(--k-warn-ink)', lineHeight: 1.5 }}>
            ⦿ saved on this phone — will sync when you have signal
          </div>
        )}
      </div>

      {/* ── the pinned bar ─────────────────────────────────────────────────
          The sheet is information first — sketch, title, lens, where to stand —
          so the mark was at the foot of the content and below the fold on every
          frame. Pinning it keeps the reading order and puts the one action you
          reach for at the bottom right, where the thumb already is. It carries
          the stepper too, which used to be drawn twice. */}
      <div style={{
        position: 'sticky', bottom: 0, zIndex: 3, flex: '0 0 auto',
        display: 'flex', alignItems: 'center', gap: 9,
        padding: '9px 16px calc(env(safe-area-inset-bottom, 0px) + 11px)',
        background: 'var(--k-bg)', borderTop: 'var(--k-bw) solid var(--k-border)',
      }}>
        <StepBtn dir={-1} disabled={frame.n <= 1} onStep={onStep} />
        <span className="koma-label" style={{ flexShrink: 0 }}>{frame.n} / {total}</span>
        <StepBtn dir={1} disabled={frame.n >= total} onStep={onStep} />
        {s.status === 'planned' ? (
          <button type="button" className="koma-btn pri" style={{ flex: 1, marginLeft: 2, padding: '15px 12px' }}
                  onClick={() => onStatus('got')}>
            Got it
          </button>
        ) : (
          <button type="button" className="koma-btn sec" style={{ flex: 1, marginLeft: 2, padding: '15px 12px' }}
                  onClick={() => onStatus('planned')}>
            Undo {s.status}
          </button>
        )}
      </div>

      {zoom && s.ref_url && (
        <div onClick={() => setZoom(false)} style={{
          position: 'fixed', inset: 0, zIndex: 70, background: 'rgba(12,10,8,0.94)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out', padding: 12,
        }}>
          <img src={s.ref_url} alt="Reference, enlarged" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 6 }} />
        </div>
      )}
    </div>
  );
}

function StepBtn({ dir, disabled, onStep }: { dir: -1 | 1; disabled: boolean; onStep: (d: number) => void }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onStep(dir)}
      disabled={disabled}
      aria-label={dir === -1 ? 'Previous frame' : 'Next frame'}
      style={{
        width: 44, height: 44, borderRadius: 11, lineHeight: 1, fontSize: 19,
        border: 'var(--k-bw) solid var(--k-border)',
        background: 'var(--k-surface)',
        color: disabled ? 'var(--k-border-2)' : 'var(--k-copper)',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.45 : 1,
      }}
    >{dir === -1 ? '‹' : '›'}</button>
  );
}

// The one control that sends you out of the app while you are standing in the
// street looking for the spot, so it keeps the 44px target even though the
// visible chrome is 27px tall.
function SpotPill({ href, label, icon, filled }: {
  href: string; label: string; icon: React.ReactNode; filled?: boolean;
}) {
  return (
    <a
      href={href} target="_blank" rel="noopener noreferrer"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        minHeight: 44, boxSizing: 'border-box',
        marginTop: 8, marginRight: 7, padding: '0 14px 0 12px', borderRadius: 999,
        border: `1px solid var(${filled ? '--k-copper' : '--k-border-2'})`,
        color: 'var(--k-copper)',
        background: filled ? 'var(--k-copper-tint)' : 'transparent',
        fontFamily: 'var(--font-mono)', fontSize: 10,
        letterSpacing: '0.06em', textTransform: 'uppercase',
      }}
    >
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden>{icon}</svg>
      {label}
    </a>
  );
}

function Block({ label, md, mono }: { label: string; md: string | null; mono?: boolean }) {
  if (!md) return null;
  return (
    <div style={{ marginTop: 13 }}>
      <div className="koma-label" style={{ marginBottom: 5 }}>{label}</div>
      <div
        className="body-content"
        style={mono
          ? { fontFamily: 'var(--font-mono)', fontSize: 11.5, lineHeight: 1.5, color: 'var(--k-ink-2)',
              paddingLeft: 9, borderLeft: '2px solid var(--k-copper-mid)' }
          : { fontSize: 12.5, lineHeight: 1.55, color: 'var(--k-ink-2)' }}
        dangerouslySetInnerHTML={{ __html: renderMd(md) }}
      />
    </div>
  );
}

// ── the footer's four marks ──────────────────────────────────────────────────
// Drawn to match SunTrack exactly. If the marks there change, change them here
// or the association silently breaks.

function RiseGlyph() {
  return (
    <svg width="9" height="6" viewBox="-4.5 -5 9 6" aria-hidden
         style={{ display: 'inline-block', verticalAlign: '-0.5px', marginRight: 1 }}>
      <path d="M-3.4 0 A3.4 3.4 0 0 1 3.4 0 Z" fill="#E8A33C" stroke="#8A5200" strokeWidth="0.7" />
    </svg>
  );
}

function SetGlyph() {
  return (
    <svg width="9" height="6" viewBox="-4.5 -1 9 6" aria-hidden
         style={{ display: 'inline-block', verticalAlign: '-0.5px', marginRight: 1 }}>
      <path d="M-3.4 0 A3.4 3.4 0 0 0 3.4 0 Z" fill="#B4AE9F" stroke="#4A453C" strokeWidth="0.7" />
    </svg>
  );
}

function DotGlyph({ fill }: { fill: string }) {
  return (
    <svg width="7" height="6" viewBox="-3.5 -3 7 6" aria-hidden
         style={{ display: 'inline-block', verticalAlign: '-0.5px', marginRight: 1 }}>
      <circle r="2.4" cy="0" fill={fill} />
    </svg>
  );
}

/** Plain-language light at a given hour, for the live clock row. */
function bandNow(sun: SunDay, h: number): string {
  const b = bandAt(sun, h);
  if (b === 'golden') return 'golden now';
  if (b === 'blue')   return 'blue hour';
  if (b === 'night')  return 'dark';
  const to = sun.goldenPm != null ? Math.round((sun.goldenPm - h) * 60) : null;
  if (to != null && to > 0) return `golden in ${to > 90 ? `${Math.round(to / 60)}h` : `${to}m`}`;
  return 'daylight';
}

// ── DAY ──────────────────────────────────────────────────────────────────────

function KomaDay({
  day, index, eyebrow, heading, lat, lng, dateISO, tz, shots, carry, isToday, now, dated, cloud, onOpen,
}: {
  /** A koji day, or a synthetic one (no stops) standing in for a roll. */
  day: Day; index: number; eyebrow: string; heading: string;
  lat: number | null; lng: number | null; dateISO: string | null; tz: string | null;
  shots: Shot[]; carry: Carry | null; isToday: boolean; now: Date;
  /** Daily forecast code, or null when there is no forecast for this date. */
  cloud: DayCloud;
  /** False when dateISO is a stand-in rather than a planned date. */
  dated: boolean;
  onOpen: (f: Frame, frames: Frame[], sun: SunDay | null, dated: boolean, geo: SheetGeo) => void;
}) {
  const { sun, offset, source } = useSun(lat, lng, dateISO, tz);

  // Null unless every part is present — a bearing rendered against a guessed
  // offset would be exactly the confidently-wrong sentence this is here to stop.
  const geo: SheetGeo = useMemo(
    () => (lat != null && lng != null && dateISO && offset != null
      ? { lat, lng, dateISO, offset }
      : null),
    [lat, lng, dateISO, offset],
  );

  // Times on this screen are the destination's, so the clock must be too.
  const thereHour = offset != null ? hoursAtLocation(now, offset) : null;
  const liveThere = offset != null && sameDayThere(now, offset, dateISO);
  const nowHour = liveThere ? thereHour : null;
  const frames = useMemo(() => buildFrames(day, shots), [day, shots]);

  const stops = useMemo(
    () => [...(day.stops ?? [])].sort((a, b) => a.sort_order - b.sort_order),
    [day],
  );
  const byStop = useMemo(() => {
    const m = new Map<number | 'loose', Frame[]>();
    for (const f of frames) {
      // Keyed on the *resolved* stop. A stop_id pointing at another day's stop
      // used to land in a bucket nothing rendered: the frame vanished from the
      // list while still being counted and still drawing a chart chip.
      const k = f.stop?.id ?? 'loose';
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(f);
    }
    return m;
  }, [frames]);

  const done   = frames.filter(f => f.shot.status === 'got').length;
  const musts  = frames.filter(f => f.shot.priority === 'must');
  const mustsLeft = musts.filter(f => f.shot.status === 'planned').length;
  // A written carry wins. The derived list only knows the frames that got
  // planned, so a thin day reads as "40mm" on a day that wants all three.
  const derived = Array.from(new Set(frames.map(f => f.shot.lens).filter(Boolean))) as string[];
  const lenses = carry?.lenses.length ? carry.lenses : derived;
  const grams  = lenses.reduce((g, l) => g + lensWeight(l), 0);

  const trackFrames: TrackFrame[] = frames.map(f => ({
    n: f.n, hour: f.hour,
    done:   f.shot.status === 'got',
    must:   f.shot.priority === 'must',
    missed: f.shot.status === 'missed' || f.shot.status === 'skipped',
  }));

  // Next unshot frame, for the line under the chart.
  //
  // It used to take the first planned frame outright, so at 5pm it still named
  // the 4pm one and every day of the trip opened on "Next — frame 1". A "next"
  // only means anything on the day itself, looking forward: frames whose hour
  // has passed by more than half an hour are behind you, and an untimed frame
  // is available whenever you reach it.
  const next = useMemo(() => {
    if (!isToday || nowHour == null) return null;
    return frames.find(f =>
      f.shot.status === 'planned' && (f.hour == null || f.hour >= nowHour - 0.5),
    ) ?? null;
  }, [frames, isToday, nowHour]);
  const minsAway = next?.hour != null && nowHour != null ? Math.round((next.hour - nowHour) * 60) : null;

  const nowStopId = useMemo(() => {
    if (!isToday || nowHour == null) return null;
    let cur: number | null = null;
    for (const s of stops) {
      const h = parseTimeLabel(s.time_label);
      if (h != null && h <= nowHour) cur = s.id;
    }
    return cur;
  }, [isToday, nowHour, stops]);

  // A day with no frames used to vanish. It can now still carry a written gear
  // call — the fly-out day, the open day, departures — and those are days the
  // advice matters on precisely because nothing is planned.
  if (!frames.length && !carry) return null;

  return (
    <section id={`day-${index}`} data-day-idx={index} className="row-in"
             style={{ animationDelay: `${Math.min(index, 8) * 40}ms`, marginBottom: 26 }}>
      <div style={{ padding: '16px 16px 11px' }}>
        <div className="koma-label" style={{ color: isToday ? 'var(--k-copper)' : 'var(--k-ink-3)' }}>
          {eyebrow}{isToday ? ' · today' : ''}
        </div>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: 22,
                     letterSpacing: '-0.015em', marginTop: 3, color: 'var(--k-ink)' }}>
          {heading}
        </h2>
      </div>

      {/* the day's light, with its frames hung beneath */}
      {frames.length > 0 && (
      <div className="koma-card">
        <div className="koma-label" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span>The roll</span>
          <span>
            <b style={{ color: 'var(--k-copper)', fontWeight: 500 }}>{done}</b> of {frames.length}
            {mustsLeft > 0 ? ` · ${mustsLeft} must left` : ''}
          </span>
        </div>
        {sun
          ? <SunTrack sun={sun} frames={trackFrames} now={nowHour}
                      onPick={n => { const f = frames.find(x => x.n === n); if (f) onOpen(f, frames, sun, dated, geo); }} />
          : <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                 className="koma-label">
              {lat == null ? 'no coordinates for this day'
                : !dateISO ? 'no date for this day'
                : 'reading the sun…'}
            </div>}
        {sun && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)',
                        fontSize: 9, color: 'var(--k-ink-3)', paddingTop: 4,
                        borderTop: '1px solid var(--k-border)' }}>
            {/* Each label carries the mark it points at on the curve, so the
                four are associated by shape rather than by a time printed on
                the plot — which is where the information overload would be. */}
            <span><RiseGlyph /> rise {fmtHour(sun.sunrise)}</span>
            <span><DotGlyph fill="var(--k-copper)" /> golden {fmtHour(sun.goldenPm)}</span>
            <span><SetGlyph /> set {fmtHour(sun.sunset)}</span>
            <span><DotGlyph fill="#5C6C8E" /> blue {fmtHour(sun.blueEnd)}</span>
          </div>
        )}
        {/* The offset is a guess without a network, and a guess that looks like
            a fact is the bug this whole file keeps re-learning. */}
        {sun && source && source !== 'zone' && (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, lineHeight: 1.5,
                        color: 'var(--k-warn-ink)', paddingTop: 4 }}>
            ⚑ {source === 'device'
              ? "estimated from this phone's time zone"
              : 'estimated from longitude — may be an hour off'}
          </div>
        )}
        {sun && thereHour != null && (
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
            fontFamily: 'var(--font-mono)', fontSize: 10.5, paddingTop: 6,
            color: 'var(--k-ink-2)',
          }}>
            <span>
              now <b style={{ color: 'var(--k-copper)', fontWeight: 500 }}>{fmtHour(thereHour)}</b>
              {day.location_label ? ` ${day.location_label.toLowerCase()}` : ' there'}
            </span>
            {/* Always the light, never "and it is 21:25 where you are". On the
                trip the local clock is the only one that matters, and before it
                the home time is the one you are already looking at. */}
            <span style={{ color: 'var(--k-ink-3)' }}>{bandNow(sun, thereHour)}</span>
          </div>
        )}
        {cloudFlag(cloud) && (
          <div style={{ marginTop: 9, paddingTop: 8, borderTop: '1px solid var(--k-border)',
                        fontSize: 12.5, color: 'var(--k-warn-ink)', lineHeight: 1.45 }}>
            ⛅ {cloudFlag(cloud)}
          </div>
        )}
        {next && (
          <div style={{ marginTop: 9, paddingTop: 8, borderTop: '1px solid var(--k-border)',
                        fontSize: 12.5, color: 'var(--k-ink-2)', lineHeight: 1.45 }}>
            Next{next.shot.priority === 'must' ? ' must-get' : ''}
            {minsAway != null && minsAway > 0 ? <> in <b style={{ color: 'var(--k-copper)' }}>{minsAway} min</b></> : ''}
            {' — frame '}{next.n}{next.stop ? `, ${next.stop.title}` : ''}
            {next.shot.lens ? `. ${next.shot.lens}.` : '.'}
          </div>
        )}
      </div>
      )}

      {frames.length === 0 && (
        <div style={{ margin: '0 12px 12px' }} className="koma-label">
          No frames planned — the day is loose.
        </div>
      )}

      {/* gear call */}
      {lenses.length > 0 && (
        <div style={{ margin: '0 12px 12px', background: 'var(--k-ink)', color: '#EDE6DA',
                      borderRadius: 12, padding: '11px 13px' }}>
          <div className="koma-label" style={{ color: 'var(--k-copper-lite)', marginBottom: 7 }}>
            Carry today
            {grams > 0 && (
              // Not uppercased: "967G OF GLASS" reads as a part number.
              <span style={{ color: '#9C9384', textTransform: 'none', letterSpacing: 0 }}>
                {'  ·  '}{fmtWeight(grams)} of glass
              </span>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {[...lenses].sort((a, b) => lensLength(b) - lensLength(a)).map(l => (
              // Weights sit left of the lens name — the card's right edge is
              // under the floating glass bar, which clips anything put there.
              <div key={l} style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                <span style={{ alignSelf: 'center' }}>
                  <LensMark lens={l} color="var(--k-copper-lite)" height={15} />
                </span>
                <span style={{ fontFamily: 'var(--font-serif)', fontSize: 15, fontWeight: 500 }}>{l}</span>
                {lensWeight(l) > 0 && lenses.length > 1 && (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, color: '#877E70' }}>
                    {lensWeight(l)}g
                  </span>
                )}
              </div>
            ))}
          </div>
          {carry?.body_md && (
            <div className="body-content koma-carry-md"
                 style={{ marginTop: 10, paddingTop: 9,
                          borderTop: '1px solid rgba(237,230,218,0.16)' }}
                 dangerouslySetInnerHTML={{ __html: renderBlockMd(carry.body_md) }} />
          )}
          {!carry && frames.length > 0 && (
            <div className="koma-carry-derived"
                 style={{ marginTop: 9, paddingTop: 8,
                          borderTop: '1px solid rgba(237,230,218,0.16)',
                          fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '0.05em',
                          lineHeight: 1.5 }}>
              derived from the {frames.length} planned frame{frames.length === 1 ? '' : 's'}, not decided
            </div>
          )}
        </div>
      )}

      {/* the itinerary, every stop, shots folded under theirs */}
      {stops.map(stop => {
        const fs = byStop.get(stop.id) ?? [];
        const isNow = stop.id === nowStopId;
        return (
          <div key={stop.id} id={`stop-${stop.id}`}
               className={isNow ? 'koma-now' : undefined}
               style={{ padding: isNow ? '12px 16px 12px 13px' : '12px 16px',
                        borderTop: '1px solid var(--k-border)',
                        opacity: fs.length ? 1 : 0.55 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 9 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--k-ink-3)', width: 52, flex: '0 0 auto' }}>
                {stop.time_label || ''}
              </span>
              <span style={{ fontFamily: 'var(--font-serif)', fontSize: fs.length ? 15.5 : 14,
                             fontWeight: fs.length ? 500 : 400, flex: 1,
                             color: fs.length ? 'var(--k-ink)' : 'var(--k-ink-3)' }}>
                {stop.title}
              </span>
            </div>
            {fs.length > 0 && (
              <div style={{ margin: '10px 0 0 61px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {fs.map(f => <ShotRow key={f.shot.id} frame={f} onOpen={() => onOpen(f, frames, sun, dated, geo)} />)}
              </div>
            )}
          </div>
        );
      })}

      {/* shots not pinned to a stop */}
      {(byStop.get('loose')?.length ?? 0) > 0 && (
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--k-border)' }}>
          <div className="koma-label" style={{ marginBottom: 9 }}>Anywhere this day</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {byStop.get('loose')!.map(f => (
              <ShotRow key={f.shot.id} frame={f} onOpen={() => onOpen(f, frames, sun, dated, geo)} />
            ))}
          </div>
        </div>
      )}

      {/* roll finished */}
      {done > 0 && done + frames.filter(f => f.shot.status === 'missed' || f.shot.status === 'skipped').length === frames.length && (
        <RollFinished frames={frames} />
      )}
    </section>
  );
}

function RollFinished({ frames }: { frames: Frame[] }) {
  const got = frames.filter(f => f.shot.status === 'got');
  const missed = frames.filter(f => f.shot.status === 'missed' || f.shot.status === 'skipped');
  const byType = new Map<string, number>();
  for (const f of got) {
    const t = f.shot.shot_type ?? 'other';
    byType.set(t, (byType.get(t) ?? 0) + 1);
  }
  const max = Math.max(1, ...byType.values());

  return (
    <div style={{ padding: '18px 16px 4px' }}>
      <div style={{ background: 'var(--k-ink)', color: '#EDE6DA', borderRadius: 16, padding: '20px 16px', textAlign: 'center' }}>
        <div className="koma-label" style={{ color: 'var(--k-copper-lite)' }}>Roll finished</div>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 27, fontWeight: 500, margin: '8px 0 4px' }}>
          {got.length} of {frames.length}
        </div>
        <div style={{ fontSize: 12, color: '#BDB5A6' }}>
          {frames.filter(f => f.shot.priority === 'must' && f.shot.status === 'got').length ===
           frames.filter(f => f.shot.priority === 'must').length
            ? 'Every must-get in the bag.'
            : 'Some must-gets got away.'}
        </div>
        <div style={{ display: 'flex', gap: 3, marginTop: 16 }}>
          {frames.map((f, i) => (
            <i key={f.shot.id}
               className={f.shot.status === 'got' ? 'koma-fill' : undefined}
               style={{
                 flex: 1, height: 24, borderRadius: 3, fontStyle: 'normal',
                 display: 'flex', alignItems: 'center', justifyContent: 'center',
                 fontFamily: 'var(--font-mono)', fontSize: 8.5,
                 background: f.shot.status === 'got' ? 'var(--k-copper)' : '#35312A',
                 color: f.shot.status === 'got' ? '#FBE7D4' : '#7C766B',
                 animationDelay: `${0.05 + i * 0.07}s`,
               }}>{f.n}</i>
          ))}
        </div>
      </div>

      {byType.size > 0 && (
        <div style={{ marginTop: 18 }}>
          <div className="koma-label" style={{ marginBottom: 8 }}>What you actually shot</div>
          {Array.from(byType.entries()).sort((a, b) => b[1] - a[1]).map(([t, n]) => (
            <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--k-border)' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--k-ink-2)', width: 78 }}>{t}</span>
              <span style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--k-subtle)', overflow: 'hidden' }}>
                <b style={{ display: 'block', height: '100%', width: `${(n / max) * 100}%`, background: 'var(--k-copper)' }} />
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--k-ink-2)', width: 24, textAlign: 'right' }}>{n}</span>
            </div>
          ))}
        </div>
      )}

      {missed.length > 0 && (
        <div style={{ marginTop: 14, border: 'var(--k-bw) solid var(--k-border)', borderRadius: 11,
                      padding: '10px 11px', background: 'var(--k-surface)' }}>
          <div className="koma-label" style={{ marginBottom: 6 }}>Missed</div>
          {missed.map(f => (
            <p key={f.shot.id} style={{ fontSize: 12, color: 'var(--k-ink-2)', lineHeight: 1.5, marginTop: 4 }}>
              <b>{f.n} · {f.shot.title}</b>{f.shot.status_note ? ` — ${f.shot.status_note}` : ''}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

// ── VIEW ─────────────────────────────────────────────────────────────────────

export function KomaView({
  trip, days, shots, carry, dateForDay, todayIdx, sunMode, cloudByDate, onShotChange,
}: {
  trip: Trip;
  days: Day[];
  shots: Shot[];
  carry: Carry[];
  dateForDay: (i: number) => string | null;
  todayIdx: number;
  sunMode: boolean;
  /** date → WMO code, for the dates the forecast actually covers. */
  cloudByDate: Record<string, number>;
  onShotChange: (shot: Shot) => void;
}) {
  const [open, setOpen] = useState<
    { frame: Frame; frames: Frame[]; sun: SunDay | null; dated: boolean; geo: SheetGeo } | null
  >(null);
  const pending = usePendingStatus();
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    const onVis = () => { if (!document.hidden) setNow(new Date()); };
    document.addEventListener('visibilitychange', onVis);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVis); };
  }, []);

  // A queued tap outranks the status the page was served with, so a reload
  // before the queue drains still shows what you marked.
  const shotsView = useMemo(() => (
    pending.size === 0 ? shots : shots.map(sh => {
      const p = pending.get(sh.id);
      return p && p !== sh.status ? { ...sh, status: p as Shot['status'] } : sh;
    })
  ), [shots, pending]);

  // Keep the open sheet pointing at the live row after a status write
  useEffect(() => {
    if (!open) return;
    const fresh = shotsView.find(s => s.id === open.frame.shot.id);
    if (fresh && fresh !== open.frame.shot) {
      setOpen(o => (o ? { ...o, frame: { ...o.frame, shot: fresh } } : o));
    }
  }, [shotsView, open]);

  // The tap is the truth: state moves now, the write is queued, and the queue
  // drains whenever there is signal. Waiting on `res.ok` meant a failed write
  // left the button looking like it had not been pressed.
  const setStatus = useCallback((shot: Shot, status: Shot['status']) => {
    onShotChange({ ...shot, status });
    queueStatus(shot.id, status);
    void flush();
  }, [onShotChange]);

  const total = days.reduce((n, d) => n + shotsView.filter(s => s.day_id === d.id).length, 0);

  if (!total) {
    return (
      <main style={{ padding: '40px 24px', textAlign: 'center' }}>
        <p className="koma-label" style={{ lineHeight: 1.7 }}>
          No frames planned for this trip yet.
        </p>
      </main>
    );
  }

  return (
    <main className={sunMode ? 'koma sun' : 'koma'} style={{ background: 'var(--k-bg)', minHeight: '50vh' }}>
      {days.map((day, i) => (
        <KomaDay
          key={day.id}
          day={day} index={i}
          // "Thu, Oct 15 · Day 1 of 11" — the date only existed in the rail.
          eyebrow={[day.label.split(/\s[-–—]\s/)[0], `Day ${i + 1} of ${days.length}`]
            .filter(Boolean).join(' · ')}
          heading={day.label.split(/\s[-–—]\s/)[1] ?? day.label}
          lat={day.lat ?? trip.lat} lng={day.lng ?? trip.lng} tz={day.tz ?? trip.tz}
          dateISO={dateForDay(i)} shots={shotsView}
          dated={dateForDay(i) != null}
          carry={carry.find(c => c.day_id === day.id) ?? null}
          isToday={i === todayIdx} now={now}
          cloud={(() => { const d = dateForDay(i); const c = d ? cloudByDate[d] : undefined;
                          return c == null ? null : { code: c }; })()}
          onOpen={(frame, frames, sun, dated, geo) => setOpen({ frame, frames, sun, dated, geo })}
        />
      ))}

      {open && (
        <div className={sunMode ? 'koma sun' : 'koma'}>
          <FrameSheet
            frame={open.frame}
            total={open.frames.length}
            sun={open.sun}
            geo={open.geo}
            pending={pending.has(open.frame.shot.id)}
            dated={open.dated}
            onClose={() => setOpen(null)}
            onStatus={st => setStatus(open.frame.shot, st)}
            onStep={d => setOpen(o => {
              if (!o) return o;
              const i = o.frames.findIndex(f => f.shot.id === o.frame.shot.id);
              const next = o.frames[i + d];
              return next ? { ...o, frame: next } : o;
            })}
          />
        </div>
      )}
    </main>
  );
}

// ── STANDALONE ROLL ──────────────────────────────────────────────────────────
// Same day machinery, one synthetic day with no stops. A roll that is not
// attached to an itinerary has nowhere for its frames to hang, so they all
// render loose in itinerary order.

export function KomaRollView({
  roll, shots, carry, sunMode, onShotChange,
}: {
  roll: Roll;
  shots: Shot[];
  carry: Carry | null;
  sunMode: boolean;
  onShotChange: (shot: Shot) => void;
}) {
  const [open, setOpen] = useState<
    { frame: Frame; frames: Frame[]; sun: SunDay | null; dated: boolean; geo: SheetGeo } | null
  >(null);
  const pending = usePendingStatus();
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    const onVis = () => { if (!document.hidden) setNow(new Date()); };
    document.addEventListener('visibilitychange', onVis);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVis); };
  }, []);

  // A queued tap outranks the status the page was served with, so a reload
  // before the queue drains still shows what you marked.
  const shotsView = useMemo(() => (
    pending.size === 0 ? shots : shots.map(sh => {
      const p = pending.get(sh.id);
      return p && p !== sh.status ? { ...sh, status: p as Shot['status'] } : sh;
    })
  ), [shots, pending]);

  useEffect(() => {
    if (!open) return;
    const fresh = shotsView.find(s => s.id === open.frame.shot.id);
    if (fresh && fresh !== open.frame.shot) {
      setOpen(o => (o ? { ...o, frame: { ...o.frame, shot: fresh } } : o));
    }
  }, [shotsView, open]);

  // The tap is the truth: state moves now, the write is queued, and the queue
  // drains whenever there is signal. Waiting on `res.ok` meant a failed write
  // left the button looking like it had not been pressed.
  const setStatus = useCallback((shot: Shot, status: Shot['status']) => {
    onShotChange({ ...shot, status });
    queueStatus(shot.id, status);
    void flush();
  }, [onShotChange]);

  // A roll with no date still gets a curve — today's, where it is. The shape of
  // the light barely moves day to day, so it is honest enough to plan against.
  const dateISO = roll.roll_date ?? localToday();
  const isToday = !roll.roll_date || roll.roll_date === localToday();

  // Synthetic day: same shape KomaDay expects, no stops.
  const day: Day = {
    id: -roll.id, trip_id: -1, label: roll.title, sort_order: 0,
    lat: roll.lat, lng: roll.lng, tz: roll.tz,
    location_label: roll.location_label, stops: [],
  };
  const asDayShots = shotsView.map(s => ({ ...s, day_id: day.id, stop_id: null }));

  return (
    <main className={sunMode ? 'koma sun' : 'koma'} style={{ background: 'var(--k-bg)', minHeight: '60vh' }}>
      <KomaDay
        day={day} index={0}
        eyebrow={[roll.location_label, roll.roll_date ? fmtRollDate(roll.roll_date) : 'no date set']
          .filter(Boolean).join(' · ')}
        heading={roll.title}
        lat={roll.lat} lng={roll.lng} tz={roll.tz} dateISO={dateISO} cloud={null}
        shots={asDayShots} carry={carry} isToday={isToday} now={now}
        dated={!!roll.roll_date}
        onOpen={(frame, frames, sun, dated, geo) => setOpen({ frame, frames, sun, dated, geo })}
      />

      {roll.notes_md && (
        <div style={{ margin: '0 12px 26px', background: 'var(--k-subtle)', borderRadius: 12, padding: '11px 13px' }}>
          <div className="koma-label" style={{ marginBottom: 5 }}>The brief</div>
          <div className="body-content" style={{ fontSize: 12.5, color: 'var(--k-ink-2)', lineHeight: 1.55 }}
               dangerouslySetInnerHTML={{ __html: renderMd(roll.notes_md) }} />
        </div>
      )}

      {open && (
        <div className={sunMode ? 'koma sun' : 'koma'}>
          <FrameSheet
            frame={open.frame} total={open.frames.length} sun={open.sun}
            geo={open.geo}
            pending={pending.has(open.frame.shot.id)}
            dated={open.dated}
            onClose={() => setOpen(null)}
            onStatus={st => setStatus(open.frame.shot, st)}
            onStep={d => setOpen(o => {
              if (!o) return o;
              const i = o.frames.findIndex(f => f.shot.id === o.frame.shot.id);
              const next = o.frames[i + d];
              return next ? { ...o, frame: next } : o;
            })}
          />
        </div>
      )}
    </main>
  );
}

function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fmtRollDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}
