'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Day, Shot, Trip } from '@/lib/supabase';
import { lensLabel } from './LensMark';
import { sunDay, zoneOffsetSec, fmtHour, parseClock, type SunDay } from '@/lib/sun';

// ─────────────────────────────────────────────────────────────────────────────
// Near me: the frames as ideas, closest first.
//
// The day view is a plan, and a plan is the wrong shape for a trip that is for
// fun first. Field report from England: with a group there was never time to
// read a frame, find its spot in Maps, come back for the direction and work out
// north. What does get used is a glance at "what's good around here".
//
// So this list answers one question: what is worth a photo within walking
// distance of where I am standing. Light is a label on each row, not the sort
// order — you are not going to drag a group across town for golden hour, but
// you do want to know the stairway two streets over is better at 5:23.
//
// Location is asked for only while this view is open, and only after a tap the
// first time (iOS will not re-prompt once refused, so the ask has to be
// deliberate). Without it the view falls back to today's frames by time.
//
// Most ideas are areas, not spots: a neighbourhood to wander with the camera
// out and a few things to look for, which is how a trip that is for fun
// actually gets photographed. Standing inside one opens it at the top. The
// pinned spots stay for the places where the exact spot is the photo.
// ─────────────────────────────────────────────────────────────────────────────

export interface NearbyPick {
  shot: Shot;
  /** "golden 5:23", "dark now" — the same label the row shows. */
  lightNote: string | null;
  sun: SunDay | null;
  dateISO: string;
  offset: number | null;
  /** For an area, the spots inside it, closest to its middle first. */
  inside: NearbyPick[];
}

/** An area's look_md, one idea per "- " line, split at " — " into the thing
 *  to look for and how to get it. */
export function lookFor(md: string | null): { prompt: string; tip: string | null }[] {
  if (!md) return [];
  return md.split('\n')
    .map(l => l.trim())
    .filter(l => /^[-*]\s/.test(l))
    .map(l => {
      const [head, ...rest] = l.replace(/^[-*]\s+/, '').split(' — ');
      const tip = rest.join(' — ').trim();
      // "Cats at cat height" + "85mm wide open." read as one run-on sentence
      // side by side, so the prompt gets its full stop and the tip a capital.
      const prompt = head.trim();
      return {
        prompt: tip && !/[.!?]$/.test(prompt) ? `${prompt}.` : prompt,
        tip: tip ? tip[0].toUpperCase() + tip.slice(1) : null,
      };
    });
}

/** "about 600 m across" from a radius. */
export const areaSize = (r: number) => `about ${fmtDist(r * 2)} across`;

type Pos = { lat: number; lng: number };

const WALK_M  = 1600;   // about 20 minutes on foot
const RIDE_M  = 8000;   // a short train or taxi

function haversine(a: Pos, b: Pos): number {
  const R = 6371000, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function bearingTo(a: Pos, b: Pos): number {
  const rad = Math.PI / 180;
  const y = Math.sin((b.lng - a.lng) * rad) * Math.cos(b.lat * rad);
  const x = Math.cos(a.lat * rad) * Math.sin(b.lat * rad)
          - Math.sin(a.lat * rad) * Math.cos(b.lat * rad) * Math.cos((b.lng - a.lng) * rad);
  return (Math.atan2(y, x) / rad + 360) % 360;
}

const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
export const compass = (deg: number) => COMPASS[Math.round(deg / 45) % 8];

function fmtDist(m: number): string {
  if (m < 950) return `${Math.max(50, Math.round(m / 50) * 50)} m`;
  return `${(m / 1000).toFixed(m < 9950 ? 1 : 0)} km`;
}

/** Streets are not straight lines; 1.3× the crow-flies distance at 80 m/min. */
const walkMin = (m: number) => Math.max(1, Math.round((m * 1.3) / 80));

/** The local date and hour at a UTC offset, for "now". */
function thereNow(now: Date, offsetSec: number): { iso: string; hour: number } {
  const t = new Date(now.getTime() + offsetSec * 1000);
  const iso = `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}-${String(t.getUTCDate()).padStart(2, '0')}`;
  return { iso, hour: t.getUTCHours() + t.getUTCMinutes() / 60 };
}

/**
 * What the light means for this frame right now, in a few words. `soon` is
 * true when the light it wants is here or within the hour — the only case that
 * earns the filled copper chip.
 */
/**
 * `light` is typed as an enum but has been written as prose on later trips —
 * "golden 5:23-5:57", "sunset 5:58, blue till 6:23", "soft morning". Read the
 * kind of light out of it: blue wins unless golden is named first, because a
 * frame that mentions both is usually a dusk frame timed off sunset.
 */
function lightKind(raw: string | null): 'golden' | 'blue' | 'night' | 'morning' | null {
  if (!raw) return null;
  const t = raw.toLowerCase();
  const at = (w: string) => { const i = t.indexOf(w); return i < 0 ? Infinity : i; };
  const golden = Math.min(at('golden'), at('sunrise'));
  const blue = at('blue');
  if (blue < Infinity && !(golden < blue)) return 'blue';
  if (golden < Infinity || at('sunset') < Infinity) return 'golden';
  if (at('night') < Infinity || at('dark') < Infinity) return 'night';
  if (at('morning') < Infinity || at('dawn') < Infinity) return 'morning';
  return null;
}

function lightFor(shot: Shot, sun: SunDay | null, h: number): { text: string; soon: boolean } | null {
  const kind = lightKind(shot.light);
  if (!sun || !kind) return null;
  const { sunrise, sunset, goldenAm, goldenPm, blueStart, blueEnd } = sun;
  const within = (t: number | null) => t != null && t > h && t - h <= 1;
  const inside = (a: number | null, b: number | null) => a != null && b != null && h >= a && h < b;

  // Morning or evening comes from the frame's planned time: "Temple lanes at
  // dusk" read "blue 6:09am" at five in the morning without it. A frame with
  // no time takes whichever window comes next.
  const planned = parseClock(shot.at_time);
  const window = (am: [number | null, number | null], pm: [number | null, number | null]) => {
    const evening = planned != null ? planned >= 12 : !(am[1] != null && h < am[1]);
    return evening ? pm : am;
  };

  if (kind === 'golden' || kind === 'blue') {
    const [from, to] = kind === 'golden'
      ? window([sunrise, goldenAm], [goldenPm, sunset])
      : window([blueStart, sunrise], [sunset, blueEnd]);
    if (inside(from, to)) return { text: `${kind} now`, soon: true };
    if (from != null && h < from) return { text: `${kind} ${fmtHour(from)}`, soon: within(from) };
    return { text: `${kind} tomorrow`, soon: false };
  }
  if (kind === 'night') {
    if (blueEnd != null && (h >= blueEnd || (blueStart != null && h < blueStart))) return { text: 'dark now', soon: true };
    return { text: blueEnd != null ? `dark ${fmtHour(blueEnd)}` : 'after dark', soon: within(blueEnd) };
  }
  return h < 10.5 && (sunrise == null || h >= sunrise)
    ? { text: 'morning now', soon: true }
    : { text: 'mornings', soon: false };
}

/** North-up arrow toward the idea. An area's arrow is a dashed ring pushed
 *  toward it: a direction to wander off in, not a pin. */
function Arrow({ deg, color, area }: { deg: number; color: string; area?: boolean }) {
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden>
      <circle cx="15" cy="15" r="13" fill="none" stroke="var(--k-border)" strokeWidth="1" />
      <text x="15" y="6.4" textAnchor="middle" fontSize="5" fontFamily="var(--font-mono)" fill="var(--k-ink-3)">N</text>
      {area
        ? <g transform={`rotate(${deg} 15 15)`}>
            <circle cx="15" cy="12" r="6" fill="none" stroke={color} strokeWidth="2" strokeDasharray="3 2" />
            <path d="M15 21 L15 25" stroke={color} strokeWidth="1.5" />
          </g>
        : <path d="M15 5 L20 20 L15 17 L10 20 Z" fill={color} transform={`rotate(${deg} 15 15)`} />}
    </svg>
  );
}

export function KomaNearby({
  trip, days, shots, dateForDay, todayIdx, now, onOpen,
}: {
  trip: Trip;
  days: Day[];
  shots: Shot[];
  dateForDay: (i: number) => string | null;
  todayIdx: number;
  now: Date;
  onOpen: (pick: NearbyPick) => void;
}) {
  const [pos, setPos] = useState<Pos | null>(null);
  const [locState, setLocState] = useState<'idle' | 'asking' | 'on' | 'denied' | 'none'>('idle');
  const [showFar, setShowFar] = useState(false);

  // Start watching straight away only if location was already granted; the
  // first time it waits for a tap.
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) { setLocState('none'); return; }
    let ok = false;
    try { ok = localStorage.getItem('koma:loc') === '1'; } catch { /* private mode */ }
    if (ok) setLocState('asking');
  }, []);

  useEffect(() => {
    if (locState !== 'asking' && locState !== 'on') return;
    const id = navigator.geolocation.watchPosition(
      p => {
        setPos({ lat: p.coords.latitude, lng: p.coords.longitude });
        setLocState('on');
        try { localStorage.setItem('koma:loc', '1'); } catch { /* private mode */ }
      },
      err => {
        setLocState(err.code === err.PERMISSION_DENIED ? 'denied' : 'none');
        if (err.code === err.PERMISSION_DENIED) {
          try { localStorage.removeItem('koma:loc'); } catch { /* private mode */ }
        }
      },
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 20000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [locState === 'asking' || locState === 'on']); // eslint-disable-line react-hooks/exhaustive-deps

  // Per-frame light, from the frame's own coordinates and its day's zone.
  const rows = useMemo(() => {
    const dayIdx = new Map(days.map((d, i) => [d.id, i] as [number, number]));
    return shots
      .filter(s => s.status !== 'skipped' && s.lat != null && s.lng != null)
      .map(s => {
        const spot = { lat: Number(s.lat), lng: Number(s.lng) };
        const day = s.day_id != null ? days.find(d => d.id === s.day_id) : undefined;
        const tz = day?.tz ?? trip.tz;
        const roughOffset = tz ? zoneOffsetSec(tz, now.toISOString().slice(0, 10)) : null;
        const there = roughOffset != null ? thereNow(now, roughOffset) : null;
        const offset = there && tz ? zoneOffsetSec(tz, there.iso) : roughOffset;
        const sun = there && offset != null ? sunDay(there.iso, spot.lat, spot.lng, offset) : null;
        const light = there ? lightFor(s, sun, there.hour) : null;
        const di = s.day_id != null ? dayIdx.get(s.day_id) ?? null : null;
        const plannedOther = di != null && di !== todayIdx;
        const dayName = di != null ? days[di].label.split(/\s[-–—]\s/)[0].split(',')[0] : null;
        const area = s.kind === 'area' && s.radius_m != null;
        const centre = pos ? haversine(pos, spot) : null;
        return {
          shot: s, spot, sun, offset, dateISO: there?.iso ?? (di != null ? dateForDay(di) : null) ?? '',
          light, plannedOther, dayName, area,
          // An area is as far away as its edge, and you are in it inside the edge.
          dist: centre == null ? null : area ? Math.max(0, centre - (s.radius_m ?? 0)) : centre,
          here: area && centre != null && centre <= (s.radius_m ?? 0),
          dir:  pos ? bearingTo(pos, spot) : null,
        };
      });
  }, [shots, days, trip.tz, now, pos, todayIdx, dateForDay]);

  type Row = (typeof rows)[number];
  const rank = (a: Row, b: Row) => {
    const done = (r: Row) => (r.shot.status === 'got' ? 1 : 0);
    if (done(a) !== done(b)) return done(a) - done(b);
    return (a.dist ?? 0) - (b.dist ?? 0);
  };
  // The area you are standing in opens at the top, so it leaves the list.
  // Only the nearest middle opens: Onomichi's temple lanes and waterfront
  // overlap, and two dark cards stacked pushed the list off the screen.
  const hereAreas = rows.filter(r => r.here && r.shot.status !== 'got')
    .sort((a, b) => haversine(pos ?? a.spot, a.spot) - haversine(pos ?? b.spot, b.spot))
    .slice(0, 1);
  const listed = rows.filter(r => !hereAreas.includes(r));
  const walk = listed.filter(r => r.dist != null && r.dist <= WALK_M).sort(rank);
  const ride = listed.filter(r => r.dist != null && r.dist > WALK_M && r.dist <= RIDE_M).sort(rank);
  const far  = listed.filter(r => r.dist != null && r.dist > RIDE_M).sort(rank);
  const unpinned = shots.filter(s => s.status !== 'skipped' && (s.lat == null || s.lng == null)).length;

  const pickOf = (r: Row): NearbyPick => ({
    shot: r.shot, lightNote: r.light?.text ?? null, sun: r.sun, dateISO: r.dateISO, offset: r.offset,
    inside: r.area
      ? rows.filter(o => !o.area && haversine(o.spot, r.spot) <= (r.shot.radius_m ?? 0))
          .sort((a, b) => haversine(a.spot, r.spot) - haversine(b.spot, r.spot))
          .map(pickOf)
      : [],
  });
  const open = (r: Row) => onOpen(pickOf(r));

  const Item = ({ r }: { r: Row }) => {
    const s = r.shot;
    const color = s.priority === 'must' ? 'var(--k-copper)' : s.priority === 'want' ? 'var(--k-copper-mid)' : 'var(--k-ink-3)';
    const line = s.subtitle ?? firstSentence(s.position_md);
    return (
      <button type="button" onClick={() => open(r)}
        className={'koma-shot' + (s.priority === 'must' ? ' must' : '') + (s.status === 'got' ? ' done' : '')}
        style={{ alignItems: 'flex-start', opacity: r.plannedOther && s.status !== 'got' ? 0.86 : undefined }}>
        {r.dir != null && r.dist != null && (
          <span style={{ width: 52, flex: '0 0 auto', display: 'grid', justifyItems: 'center', gap: 1 }}>
            <Arrow deg={r.dir} color={color} area={r.area} />
            <span className="num" style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--k-ink)' }}>{fmtDist(r.dist)}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--k-ink-3)' }}>
              {compass(r.dir)}{r.dist <= WALK_M ? ` · ${walkMin(r.dist)}m` : ''}
            </span>
          </span>
        )}
        <span style={{ flex: 1, minWidth: 0 }}>
          <span className="koma-shot-t" style={{ display: 'block' }}>{s.title}</span>
          {line && (
            <span style={{ display: 'block', fontSize: 12, color: 'var(--k-ink-2)', lineHeight: 1.4, marginTop: 3 }}>{line}</span>
          )}
          <span style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
            {r.area && <span className="koma-chip">area</span>}
            {s.priority === 'must' && <span className="koma-chip must">must</span>}
            {r.light && (
              <span className="koma-chip" style={r.light.soon
                ? { background: 'var(--k-copper)', color: '#fff', borderColor: 'var(--k-copper)' }
                : { background: 'var(--k-copper-tint)', color: 'var(--k-copper)', borderColor: 'var(--k-copper-mid)' }}>
                {r.light.text}
              </span>
            )}
            {s.lens && <span className="koma-chip">{lensLabel(s.lens, s.focal_hint)}</span>}
            {r.plannedOther && r.dayName && <span className="koma-chip">planned {r.dayName}</span>}
            {s.status === 'got' && <span className="koma-chip">got it</span>}
          </span>
        </span>
      </button>
    );
  };

  const Group = ({ label, list }: { label: string; list: Row[] }) => list.length ? (
    <section style={{ display: 'grid', gap: 8 }}>
      <div className="koma-label">{label}</div>
      {list.map(r => <Item key={r.shot.id} r={r} />)}
    </section>
  ) : null;

  // ── without a location ────────────────────────────────────────────────────
  if (locState !== 'on' || !pos) {
    const today = todayIdx >= 0 ? days[todayIdx] : null;
    const todays = today ? rows.filter(r => r.shot.day_id === today.id) : [];
    return (
      <div style={{ padding: '14px 12px 28px', display: 'grid', gap: 14 }}>
        <div className="koma-card" style={{ margin: 0, display: 'grid', gap: 8 }}>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 17, color: 'var(--k-ink)' }}>
            Photo ideas near you
          </div>
          <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: 'var(--k-ink-2)' }}>
            {locState === 'denied'
              ? 'Location is off for this site. Turn it on in Settings › Safari › Location (or the browser’s site settings) to sort ideas by distance.'
              : locState === 'none'
                ? 'Your location isn’t available right now.'
                : 'Sorts every idea on the trip by how far it is from you. Location is only used while this list is open.'}
          </p>
          {(locState === 'idle' || locState === 'none') && (
            <button type="button" className="koma-btn pri" style={{ flex: 'none' }}
                    onClick={() => setLocState('asking')}>
              Use my location
            </button>
          )}
          {locState === 'asking' && <div className="koma-label">Finding you…</div>}
        </div>
        {todays.length > 0 && (
          <Group label="Today" list={[...todays].sort((a, b) => (a.shot.at_time ?? '99').localeCompare(b.shot.at_time ?? '99'))} />
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: '14px 12px 28px', display: 'grid', gap: 16 }}>
      {hereAreas.map(r => <Here key={r.shot.id} r={r} onOpen={() => open(r)} />)}
      {!walk.length && !ride.length && !hereAreas.length && (
        <p className="koma-label" style={{ lineHeight: 1.7, margin: 0 }}>
          Nothing within {RIDE_M / 1000} km.
        </p>
      )}
      <Group label={hereAreas.length ? 'Also near you' : 'Walkable · about 20 min'} list={walk} />
      <Group label={`A short ride · under ${RIDE_M / 1000} km`} list={ride} />
      {far.length > 0 && (showFar
        ? <Group label="Elsewhere on the trip" list={far} />
        : (
          <button type="button" className="koma-btn sec" style={{ flex: 'none' }} onClick={() => setShowFar(true)}>
            Elsewhere on the trip · {far.length}
          </button>
        ))}
      {unpinned > 0 && (
        <p className="koma-label" style={{ margin: 0, lineHeight: 1.6 }}>
          {unpinned} more {unpinned === 1 ? 'idea has' : 'ideas have'} no spot yet · see By day
        </p>
      )}
    </div>
  );
}

/** "You're in …": the area you are standing in, with the first few things to
 *  look for, so the glance is the whole read. Tap for the card. */
function Here({ r, onOpen }: {
  r: { shot: Shot; light: { text: string; soon: boolean } | null; spot: Pos };
  onOpen: () => void;
}) {
  const s = r.shot;
  const look = lookFor(s.look_md).slice(0, 3);
  return (
    <button type="button" onClick={onOpen} style={{
      display: 'grid', gap: 8, textAlign: 'left', font: 'inherit', cursor: 'pointer', width: '100%',
      background: 'var(--k-ink)', color: '#EDE6DA', border: 'none', borderRadius: 13, padding: '13px 14px 12px',
    }}>
      <span className="koma-label" style={{ color: 'var(--k-copper-lite)' }}>You’re in · {s.title}</span>
      {s.subtitle && (
        <span style={{ fontFamily: 'var(--font-serif)', fontSize: 18, lineHeight: 1.2, color: '#F5EEE2' }}>
          {s.subtitle}
        </span>
      )}
      {look.length > 0 && (
        <ul style={{ margin: 0, paddingLeft: 17, display: 'grid', gap: 4, fontSize: 13, lineHeight: 1.4, color: '#D9CFBE' }}>
          {look.map((l, i) => <li key={i}>{l.prompt}</li>)}
        </ul>
      )}
      <span style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center',
                     fontFamily: 'var(--font-mono)', fontSize: 10, color: '#B5AA97' }}>
        {r.light && (
          <span className="koma-chip" style={r.light.soon
            ? { background: 'var(--k-copper)', color: '#fff', borderColor: 'var(--k-copper)' }
            : { background: 'transparent', color: 'var(--k-copper-lite)', borderColor: 'var(--k-copper-lite)' }}>
            {r.light.text}
          </span>
        )}
        {s.lens && <span>{lensLabel(s.lens, s.focal_hint)}</span>}
        <span style={{ marginLeft: 'auto', color: 'var(--k-copper-lite)' }}>More ›</span>
      </span>
    </button>
  );
}

/** The first sentence of a markdown note, as the row's one-liner. */
export function firstSentence(md: string | null): string | null {
  if (!md) return null;
  const text = md.replace(/<br\s*\/?>/gi, ' ').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[*_`]/g, '').trim();
  const m = text.match(/^.*?[.!?](?=\s|$)/);
  return (m ? m[0] : text).trim();
}
