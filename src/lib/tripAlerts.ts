// Trip alerts — what to push, and when, worked out from the itinerary itself.
//
// Three kinds, all in the day's own time zone:
//   - a morning rundown: the day's timed stops in one line, at 7am, or an hour
//     before the first stop on an early day (a 6:20 ferry got its rundown at 7)
//   - "coming up", 30 minutes before each timed stop (stops sharing a time,
//     like a morning split, go out as one)
//   - "time to leave", 15 minutes before any "leave by 3:15" / "leave again
//     at 6:30" / "leave the Airbnb around 7:45am" written in a stop's text
// A stop can override its "coming up" alert (koji_stops, 2026-11-11):
//   alert_md    the body, written for a lock screen — what to do next, not the
//               stop's opening description ("Senko-ji Park." said nothing)
//   alert_lead  minutes before the stop (default 30; 0 = at the time, for a
//               landing; 180 = leave for the airport)
//   alert_off   no "coming up" alert (hotel check-ins, stops 30 min after the
//               last one). Hotel stops are off unless they carry alert_md.
// Optional stops alert only once added to the plan. A "fly out" day is skipped:
// its times are home-airport times rather than the trip's zone.
//
// The plan is pure: /api/notify (called every 5 minutes by pg_cron on the
// Kura project, the meiro / Plane Lab pattern) sends whatever falls due.
import type { Day, Stop, Trip } from './supabase';

export interface PlannedAlert {
  key: string;     // stable id for dedupe in koji_alerts_sent
  at: number;      // epoch ms
  title: string;
  body: string;
  url: string;
}

// "about 1:45pm" counts: three Japan stops, one of them a shinkansen, never alerted.
const CLOCK = /^(?:about\s+|around\s+|~\s*)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i;
// The gap between "leave" and "by" stays inside one clause, so "leave it and
// head up the hill" or "tours leave every 30 minutes" never match.
const LEAVE = /\bleave\b[^.;:!?]{0,40}?\b(?:by|at|around)\s+(?:about\s+)?(noon|\d{1,2}(?::\d{2})?\s*(?:am|pm)?)(?!\d|:\d)/gi;

const RUNDOWN_AT = 7 * 60;
const SOON_MIN = 30;
const LEAVE_MIN = 15;

/** "12:45pm" → minutes after midnight */
export function parseClock(label: string | null): number | null {
  const m = label?.trim().match(CLOCK);
  if (!m) return null;
  const h = Number(m[1]) % 12 + (m[3].toLowerCase() === 'pm' ? 12 : 0);
  return h * 60 + Number(m[2] || 0);
}

export function fmtClock(min: number): string {
  const h = Math.floor(min / 60), m = min % 60;
  return `${h % 12 || 12}${m ? `:${String(m).padStart(2, '0')}` : ''}${h < 12 ? 'am' : 'pm'}`;
}

// A bare "6:30" next to a 4:45pm stop means 6:30pm: take the am or pm reading
// that sits from four hours before the stop to three hours after it.
function leaveMinutes(raw: string, stopMin: number | null): number | null {
  const t = raw.trim().toLowerCase();
  if (t === 'noon') return 12 * 60;
  const withSuffix = parseClock(t);
  if (withSuffix != null) return withSuffix;
  const m = t.match(/^(\d{1,2})(?::(\d{2}))?$/);
  if (!m) return null;
  const base = (Number(m[1]) % 12) * 60 + Number(m[2] || 0);
  if (stopMin == null) return Number(m[1]) < 7 || Number(m[1]) === 12 ? base + 720 : base;
  return [base, base + 720].find(c => c >= stopMin - 240 && c <= stopMin + 180) ?? null;
}

// Wall-clock time on a date in a zone → epoch ms (two passes settle DST days)
export function zonedMs(date: string, minutes: number, tz: string): number {
  const [y, mo, d] = date.split('-').map(Number);
  const wall = Date.UTC(y, mo - 1, d, Math.floor(minutes / 60), minutes % 60);
  let ms = wall;
  for (let i = 0; i < 2; i++) {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric',
    }).formatToParts(new Date(ms)).map(x => [x.type, Number(x.value)]));
    const shown = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
    ms += wall - shown;
  }
  return ms;
}

function dateFor(start: string, i: number): string {
  const [y, m, d] = start.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + i)).toISOString().slice(0, 10);
}

export function plainText(md: string): string {
  return md
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function clip(s: string, n = 150): string {
  return s.length > n ? `${s.slice(0, n - 1).replace(/\s+\S*$/, '')}…` : s;
}

function sentenceAt(text: string, index: number): string {
  // A sentence ends at . ! or ? (optionally closing a bracket) before a space
  const ends = [...text.slice(0, index).matchAll(/[.!?]\)?\s+/g)];
  const start = ends.length ? ends[ends.length - 1].index! + ends[ends.length - 1][0].length : 0;
  const after = text.slice(index).match(/[.!?]\)?(\s|$)/);
  return text.slice(start, after ? index + after.index! + 1 : undefined).trim();
}

const firstSentence = (text: string) => sentenceAt(text, 0);

/** "9:30am" → "9:30", "11:00am" → "11": the rundown's times, where the day
 *  itself says which half of it they're in. */
function shortClock(label: string): string {
  const m = parseClock(label);
  if (m == null) return label;
  const h = Math.floor(m / 60) % 12 || 12, mm = m % 60;
  return mm ? `${h}:${String(mm).padStart(2, '0')}` : `${h}`;
}

/** basePath: where links point — `/trips/<slug>`, or a part's own page for
 *  someone who turned alerts on from a part link. */
/** endAtLastFlight: for a part (someone's share of the trip), its last day
 *  stops at that day's flight — Dez's alerts end at "Goodbye at Fukuoka
 *  Airport", not at Nathan's solo dinner in Onomichi. */
export function planTripAlerts(trip: Trip, days: Day[], basePath = `/trips/${trip.slug}`, endAtLastFlight = false): PlannedAlert[] {
  if (!trip.date_start) return [];
  const out: PlannedAlert[] = [];
  days.forEach((day, i) => {
    if (/\bfly(ing)? out\b/i.test(day.label)) return;
    const date = dateFor(trip.date_start!, i);
    const tz = day.tz || trip.tz || 'UTC';
    const url = `${basePath}#day-${i}`;
    let stops = (day.stops ?? []).filter(s => !s.is_optional || s.added);
    if (endAtLastFlight && i === days.length - 1) {
      const k = stops.findIndex(s => /^flight$/i.test(s.tag));
      if (k >= 0) stops = stops.slice(0, k + 1);
    }
    const timed = stops
      .map(s => ({ s, min: parseClock(s.time_label) }))
      .filter((x): x is { s: Stop; min: number } => x.min != null)
      .sort((a, b) => a.min - b.min);

    // Morning rundown: 7am, or an hour before an early first stop
    if (timed.length) {
      const name = day.label.split(' - ').slice(1).join(' - ') || day.label;
      out.push({
        key: `rundown-${date}`,
        at: zonedMs(date, Math.min(RUNDOWN_AT, timed[0].min - 60), tz),
        title: clip(`Today · ${name}`, 60),
        // Hotel stops ("Check in", "Back to the hotel") cost the line its room.
        body: clip(timed.filter(x => !/^hotel$/i.test(x.s.tag)).map(x => `${shortClock(x.s.time_label!)} ${x.s.title}`).join(' · '), 178),
        url,
      });
    }

    // Leave-by lines
    const leaveFor = new Map<number, number>(); // stop id → leave minute
    for (const s of stops) {
      const text = plainText(s.body_md || '');
      const stopMin = parseClock(s.time_label);
      for (const m of text.matchAll(LEAVE)) {
        const min = leaveMinutes(m[1], stopMin);
        if (min == null) continue;
        if (!leaveFor.has(s.id)) leaveFor.set(s.id, min);
        out.push({
          key: `leave-${s.id}-${min}`,
          at: zonedMs(date, min - LEAVE_MIN, tz),
          title: clip(`Leave by ${fmtClock(min)} · ${s.title}`, 60),
          body: clip(sentenceAt(text, m.index ?? 0), 150),
          url: `${basePath}#stop-${s.id}`,
        });
      }
    }

    // Coming up — skipped when a leave alert lands within 45 min before it,
    // when the stop opts out, and for hotels with nothing to say
    const groups = new Map<string, { min: number; lead: number; stops: Stop[] }>();
    for (const { s, min } of timed) {
      const lv = leaveFor.get(s.id);
      if (lv != null && lv <= min && lv >= min - 45) continue;
      if (s.alert_off || (/^hotel$/i.test(s.tag) && !s.alert_md)) continue;
      const lead = s.alert_lead ?? SOON_MIN;
      const k = `${min}-${lead}`;
      const g = groups.get(k) ?? { min, lead, stops: [] };
      g.stops.push(s);
      groups.set(k, g);
    }
    for (const { min, lead, stops: group } of groups.values()) {
      const one = group.length === 1;
      const names = clip(group.map(s => s.title).join(' / '), 52);
      const title = lead === 0 ? names
        : lead < 60 ? `In ${lead} min: ${names}`
        : `${names} at ${fmtClock(min)}`;
      const lead0 = group[0];
      const body = one
        ? clip(lead0.alert_md ? plainText(lead0.alert_md) : (firstSentence(plainText(lead0.body_md || '')) || lead0.title), 150)
        : clip(group.map(s => s.title).join(' · '), 150);
      out.push({
        key: `soon-${date}-${min}${lead === SOON_MIN ? '' : `-${lead}`}`,
        at: zonedMs(date, min - lead, tz),
        title,
        body: lead >= 60 || lead === 0 ? body : `${fmtClock(min)} · ${body}`,
        url: `${basePath}#stop-${lead0.id}`,
      });
    }
  });
  return out.sort((a, b) => a.at - b.at);
}
