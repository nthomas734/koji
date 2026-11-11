// ─────────────────────────────────────────────────────────────────────────────
// shotLight — a shot's light window as words, worked out from the sun.
//
// `light` stores only what the shot wants (a fixed set: golden, blue, morning,
// midday, afternoon, night, any). The times come from sunDay() for the shot's
// own coordinates on its day's date, so moving a shot to another day or town
// moves its window with it. The Japan pins once carried typed times ("golden
// 5:23-5:57") that would have gone stale the first time a day moved.
//
// Morning or evening comes from the shot's planned time, as in KomaNearby:
// golden at 06:20 is the sunrise window, golden at 17:15 the sunset one.
// ─────────────────────────────────────────────────────────────────────────────

import type { Shot } from '@/lib/supabase';
import { parseClock, sunDay, zoneOffsetSec } from '@/lib/sun';

/** 17.35 → "5:21". No am/pm: the word before it (golden, blue, dark) and the
 *  stop it sits under already say which end of the day it is. */
function fmtHour(h: number): string {
  const total = Math.round(h * 60);
  const hh = Math.floor(total / 60) % 24;
  return `${hh % 12 || 12}:${String(total % 60).padStart(2, '0')}`;
}

/** "golden 5:21–5:56", "blue 6:17 · sun up 6:42", "dark from 6:22", "morning";
 *  null when there is nothing worth saying ("any", or no date or place). */
export function shotWindow(shot: Shot, dateISO: string | null, tz: string | null): string | null {
  const kind = shot.light;
  if (!kind || kind === 'any') return null;
  if (kind === 'morning' || kind === 'midday' || kind === 'afternoon') return kind;

  if (!dateISO || !tz || shot.lat == null || shot.lng == null) return kind;
  const offset = zoneOffsetSec(tz, dateISO);
  if (offset == null) return kind;
  const sun = sunDay(dateISO, Number(shot.lat), Number(shot.lng), offset);
  const at = parseClock(shot.at_time);
  const evening = at == null || at >= 12;
  const span = (a: number | null, b: number | null) =>
    a != null && b != null ? `${fmtHour(a)}–${fmtHour(b)}` : null;

  if (kind === 'golden') {
    const w = evening ? span(sun.goldenPm, sun.sunset) : span(sun.sunrise, sun.goldenAm);
    return w ? `golden ${w}` : 'golden';
  }
  if (kind === 'blue') {
    if (evening) {
      const w = span(sun.sunset, sun.blueEnd);
      return w ? `blue ${w}` : 'blue';
    }
    return sun.blueStart != null && sun.sunrise != null
      ? `blue ${fmtHour(sun.blueStart)} · sun up ${fmtHour(sun.sunrise)}`
      : 'blue';
  }
  // night
  return sun.blueEnd != null ? `dark from ${fmtHour(sun.blueEnd)}` : 'night';
}
