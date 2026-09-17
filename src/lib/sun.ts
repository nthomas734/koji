// ── SOLAR POSITION ───────────────────────────────────────────────────────────
// NOAA's solar position algorithm, enough of it to draw a day's light.
// Everything here works in UTC; callers pass a utcOffsetSec (from Open-Meteo's
// `timezone=auto`) to convert to the location's own clock. Deriving the offset
// from longitude alone would be an hour wrong anywhere on summer time.

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

function julianDay(y: number, m: number, d: number, dayFrac: number): number {
  if (m <= 2) { y -= 1; m += 12; }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5 + dayFrac;
}

/**
 * Sun altitude in degrees above the horizon.
 * @param dateISO  YYYY-MM-DD, the local calendar date
 * @param localHours  hours into that local day (13.5 = 13:30 local)
 * @param utcOffsetSec  the location's offset from UTC, in seconds
 */
export function solarAltitude(
  dateISO: string, localHours: number, lat: number, lon: number, utcOffsetSec: number,
): number {
  const [y, m, d] = dateISO.split('-').map(Number);
  const utcHours = localHours - utcOffsetSec / 3600;
  const JD = julianDay(y, m, d, utcHours / 24);
  const T = (JD - 2451545.0) / 36525.0;

  const L0 = (280.46646 + T * (36000.76983 + T * 0.0003032)) % 360;
  const M  = 357.52911 + T * (35999.05029 - 0.0001537 * T);
  const Mr = M * RAD;
  const C =
    Math.sin(Mr) * (1.914602 - T * (0.004817 + 0.000014 * T)) +
    Math.sin(2 * Mr) * (0.019993 - 0.000101 * T) +
    Math.sin(3 * Mr) * 0.000289;

  const trueLong = L0 + C;
  const omega = 125.04 - 1934.136 * T;
  const lambda = (trueLong - 0.00569 - 0.00478 * Math.sin(omega * RAD)) * RAD;
  const eps0 = 23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60;
  const eps = (eps0 + 0.00256 * Math.cos(omega * RAD)) * RAD;

  const decl = Math.asin(Math.sin(eps) * Math.sin(lambda));

  const varY = Math.tan(eps / 2) ** 2;
  const e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T);
  const eqTime =
    4 * DEG * (
      varY * Math.sin(2 * L0 * RAD) -
      2 * e * Math.sin(Mr) +
      4 * e * varY * Math.sin(Mr) * Math.cos(2 * L0 * RAD) -
      0.5 * varY * varY * Math.sin(4 * L0 * RAD) -
      1.25 * e * e * Math.sin(2 * Mr)
    );

  // True solar time, in minutes past local midnight
  const tst = (localHours * 60 + eqTime + 4 * lon - utcOffsetSec / 60 + 1440) % 1440;
  const ha = (tst / 4 - 180) * RAD;

  const latR = lat * RAD;
  const cosZ =
    Math.sin(latR) * Math.sin(decl) + Math.cos(latR) * Math.cos(decl) * Math.cos(ha);
  return 90 - Math.acos(Math.max(-1, Math.min(1, cosZ))) * DEG;
}

export interface SunDay {
  /** [hour, altitude] samples across the whole local day */
  series:   Array<[number, number]>;
  sunrise:  number | null;
  sunset:   number | null;
  /** morning golden hour ends / evening golden hour begins (sun at 6°) */
  goldenAm: number | null;
  goldenPm: number | null;
  /** civil twilight ends (sun at -6°) — the end of usable blue hour */
  blueEnd:  number | null;
  blueStart: number | null;
  noon:     number;
  peak:     number;
}

/** Sample the day and find the crossings that matter to a photographer. */
export function sunDay(
  dateISO: string, lat: number, lon: number, utcOffsetSec: number, stepMin = 10,
): SunDay {
  const series: Array<[number, number]> = [];
  for (let min = 0; min <= 1440; min += stepMin) {
    const h = min / 60;
    series.push([h, solarAltitude(dateISO, h, lat, lon, utcOffsetSec)]);
  }

  // Linear interpolation between samples is plenty at 10-minute resolution;
  // the sun moves ~2.5°/10min at temperate latitudes.
  const cross = (target: number, rising: boolean): number | null => {
    for (let i = 1; i < series.length; i++) {
      const [h0, a0] = series[i - 1];
      const [h1, a1] = series[i];
      const hit = rising ? a0 < target && target <= a1 : a0 > target && target >= a1;
      if (hit) return h0 + ((target - a0) / (a1 - a0)) * (h1 - h0);
    }
    return null;
  };

  let noon = 12, peak = -90;
  for (const [h, a] of series) if (a > peak) { peak = a; noon = h; }

  return {
    series,
    sunrise:   cross(-0.833, true),
    sunset:    cross(-0.833, false),
    goldenAm:  cross(6, true),
    goldenPm:  cross(6, false),
    blueStart: cross(-6, true),
    blueEnd:   cross(-6, false),
    noon,
    peak,
  };
}

/** 15.25 → "3:15pm" */
export function fmtHour(h: number | null): string {
  if (h == null || !isFinite(h)) return '—';
  const total = Math.round(h * 60);
  let hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  const ap = hh >= 12 ? 'pm' : 'am';
  hh = hh % 12 || 12;
  return `${hh}:${String(mm).padStart(2, '0')}${ap}`;
}

/** 15.25 → "15:15" */
export function fmt24(h: number | null): string {
  if (h == null || !isFinite(h)) return '—';
  const total = Math.round(h * 60);
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/**
 * Parse the free-text time labels koji already uses on stops.
 * "3:15pm" → 15.25 · "11:45" → 11.75 · "Noon" → 12 · "" → null
 */
/**
 * A 24-hour clock value, `HH:MM`, which is how koma writes `at_time`.
 *
 * Deliberately strict, and deliberately *not* `parseTimeLabel`. That one guesses
 * at koji's free-text stop labels and pushes a bare hour under 7 into the
 * afternoon — right for "5:15" on a travel day, catastrophic for a dawn frame.
 * The Cuyamaca roll's 06:30 and 06:55 plotted at 18:30 and 18:55: the one roll
 * that exists *because* of the dawn had both its dawn frames hung at sunset.
 *
 * Anything that is not a clock returns null rather than a plausible number.
 */
export function parseClock(t: string | null | undefined): number | null {
  if (!t) return null;
  const m = t.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h + min / 60;
}

export function parseTimeLabel(label: string | null | undefined): number | null {
  if (!label) return null;
  const s = label.trim().toLowerCase();
  if (s.startsWith('noon')) return 12;
  if (s.startsWith('midnight')) return 0;
  const m = s.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  if (!m) return null;
  let h = Number(m[1]);
  const min = m[2] ? Number(m[2]) : 0;
  const ap = m[3];
  if (ap === 'pm' && h < 12) h += 12;
  if (ap === 'am' && h === 12) h = 0;
  // No am/pm: koji labels like "9:30" in a travel day almost always mean daytime.
  if (!ap && h < 7) h += 12;
  if (h > 23) return null;
  return h + min / 60;
}

/**
 * Which light a given local hour falls in. Used to flag a golden-hour shot
 * that has been scheduled against a stop which is nowhere near golden hour.
 */
export type LightBand = 'night' | 'blue' | 'golden' | 'day';

export function bandAt(sun: SunDay, h: number): LightBand {
  const alt = interpAlt(sun, h);
  if (alt < -6) return 'night';
  if (alt < 0) return 'blue';
  if (alt < 6) return 'golden';
  return 'day';
}

export function interpAlt(sun: SunDay, h: number): number {
  const s = sun.series;
  if (h <= s[0][0]) return s[0][1];
  if (h >= s[s.length - 1][0]) return s[s.length - 1][1];
  for (let i = 1; i < s.length; i++) {
    if (s[i][0] >= h) {
      const [h0, a0] = s[i - 1];
      const [h1, a1] = s[i];
      return a0 + ((h - h0) / (h1 - h0)) * (a1 - a0);
    }
  }
  return 0;
}

// ── UTC OFFSET ───────────────────────────────────────────────────────────────
// Three steps, in order of how much they can be trusted, and the order matters.
//
// 1. Open-Meteo is asked only for the IANA zone at a coordinate. It is *not*
//    asked about the trip's date: the forecast endpoint serves a rolling window
//    of roughly the next fortnight, and a `start_date` outside it returns 400.
//    That shipped — every day of a trip planned a month out came back UTC+0 and
//    the whole plan rendered an hour early. See `sql/sun-audit.md`.
// 2. Failing that, the phone's own zone — but only when it plausibly *is* the
//    place. A phone in London answering for London is exactly right, DST and
//    all; a phone in San Diego answering for London is eight hours of nonsense.
//    Solar time from longitude is the referee.
// 3. Failing that, solar time from longitude, which is an hour out anywhere on
//    summer time.
//
// Which one answered is returned, not swallowed, because 2 and 3 are guesses
// and the screen says so. The first version of this cached a failed lookup
// forever, so one dead spot poisoned the whole session — hence the TTL.

const NEG_TTL_MS = 60_000;

const zoneCache   = new Map<string, string>();                     // resolved, kept
const zonePending = new Map<string, Promise<string | null>>();     // in flight, shared
const zoneFailed  = new Map<string, number>();                     // when it last failed

export type OffsetSource = 'zone' | 'device' | 'longitude';

export interface Offset {
  seconds: number;
  source:  OffsetSource;
  /** The IANA zone, when one was resolved. */
  zone:    string | null;
}

/**
 * Seconds east of UTC in `zone` on `dateISO`. Formats noon UTC into the zone
 * and diffs — noon because DST transitions happen in the small hours, so the
 * answer is never taken from inside a fold. Returns null for a zone Intl does
 * not know, which it throws on.
 */
export function zoneOffsetSec(zone: string, dateISO: string): number | null {
  const at = new Date(`${dateISO}T12:00:00Z`);
  if (isNaN(at.getTime())) return null;
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: zone, hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).formatToParts(at);
    const p: Record<string, string> = {};
    for (const { type, value } of parts) p[type] = value;
    // Intl renders midnight as hour "24" in some engines.
    const hour = Number(p.hour) % 24;
    const local = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day),
                           hour, Number(p.minute), Number(p.second));
    return Math.round((local - at.getTime()) / 1000);
  } catch {
    return null;
  }
}

/** The IANA zone at a coordinate. One request per location, shared in flight. */
async function zoneFor(lat: number, lng: number): Promise<string | null> {
  const key = `${lat.toFixed(2)},${lng.toFixed(2)}`;

  const hit = zoneCache.get(key);
  if (hit) return hit;

  const failedAt = zoneFailed.get(key);
  if (failedAt != null && Date.now() - failedAt < NEG_TTL_MS) return null;

  // Eleven KomaDay instances mount at once. Without this they are eleven
  // requests and eleven chances to hit the timeout below.
  const inFlight = zonePending.get(key);
  if (inFlight) return inFlight;

  // No date range — this is a question about the place, not the day.
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
    `&timezone=auto&forecast_days=1`;

  const p = (async () => {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 8000);
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(t);
      if (!res.ok) throw new Error(String(res.status));
      const json = await res.json();
      const zone = typeof json?.timezone === 'string' ? json.timezone : '';
      if (!zone || zone === 'GMT') throw new Error('no zone');
      zoneCache.set(key, zone);
      zoneFailed.delete(key);
      return zone;
    } catch {
      zoneFailed.set(key, Date.now());
      return null;
    } finally {
      zonePending.delete(key);
    }
  })();

  zonePending.set(key, p);
  return p;
}

/**
 * No network. Trust the phone's zone only if it is roughly over this longitude
 * — within 90 minutes of solar time. Standing in London that gives the real
 * BST offset; sitting in San Diego planning London it does not, and we say so.
 */
function withoutNetwork(lng: number, dateISO: string): Offset {
  const solar = Math.round(lng / 15) * 3600;
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (zone) {
      const off = zoneOffsetSec(zone, dateISO);
      if (off != null && Math.abs(off - solar) <= 90 * 60) {
        return { seconds: off, source: 'device', zone };
      }
    }
  } catch { /* no Intl, or no resolved zone */ }
  return { seconds: solar, source: 'longitude', zone: null };
}

const offsetCache = new Map<string, Offset>();

export async function utcOffsetFor(
  lat: number, lng: number, dateISO: string, known?: string | null,
): Promise<Offset> {
  // A stored zone is the whole answer: no request, right offline, right on a
  // phone that is nowhere near the place, right across a DST boundary inside
  // the trip. The two fallbacks below exist for rows that have none.
  if (known) {
    const off = zoneOffsetSec(known, dateISO);
    if (off != null) return { seconds: off, source: 'zone', zone: known };
  }

  const key = `${lat.toFixed(2)},${lng.toFixed(2)},${dateISO}`;
  const hit = offsetCache.get(key);
  if (hit) return hit;

  const zone = await zoneFor(lat, lng);
  const exact = zone ? zoneOffsetSec(zone, dateISO) : null;

  const out: Offset = exact != null
    ? { seconds: exact, source: 'zone', zone }
    : withoutNetwork(lng, dateISO);

  // A guess is not cached — the next render, after the phone finds signal
  // again, should get the real answer.
  if (out.source === 'zone') offsetCache.set(key, out);
  return out;
}
