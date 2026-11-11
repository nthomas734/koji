// ─────────────────────────────────────────────────────────────────────────────
// Parts: a trip cut down to a run of dates, for sharing. Marshall gets the
// family week, Dez gets the days she's there, a friend asking about a first
// trip to Japan gets whichever stretch makes the best example.
//
// A part is a filter on dates, not a privacy boundary: the page links back to
// the whole trip. Days, stays and logistics are trimmed here, on the server,
// so the part page prerenders like any trip page and TripView needs nothing
// special beyond the "whole trip" link.
// ─────────────────────────────────────────────────────────────────────────────

import type { Day, Logistics, Stay, Trip, TripPart } from '@/lib/supabase';

function addDays(iso: string, n: number): string {
  const d = new Date(iso + 'T00:00');
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b + 'T00:00').getTime() - new Date(a + 'T00:00').getTime()) / 86400000);
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const MONTH_RE = '(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*';
const RANGE_RE = new RegExp(`\\b${MONTH_RE}\\s+(\\d{1,2})(?:\\s*[-–]\\s*(?:${MONTH_RE}\\s+)?(\\d{1,2}))?\\b`);

/**
 * The dates a logistics row is about, read from its text: "Mar 19-23 - hotel",
 * "**JL 55** - Thu, Mar 19 - ORD to NRT", "through Mar 7". Null when the row
 * names no date (IC card tips, luggage notes), which keeps it in every part.
 */
function rowDates(text: string, year: number): { start: string; end: string; range: boolean } | null {
  const m = RANGE_RE.exec(text);
  if (!m) return null;
  const iso = (mon: string, day: string) =>
    `${year}-${String(MONTHS.indexOf(mon.slice(0, 3).toLowerCase()) + 1).padStart(2, '0')}-${day.padStart(2, '0')}`;
  const start = iso(m[1], m[2]);
  const end = m[4] ? iso(m[3] ?? m[1], m[4]) : start;
  return { start, end, range: !!m[4] };
}

export function findPart(trip: Trip, key: string): TripPart | null {
  return (trip.parts ?? []).find(p => p.key === key) ?? null;
}

export function slicePart<T extends { trip: Trip; days: Day[]; stays: Stay[]; logistics: Logistics[] }>(
  data: T,
  part: TripPart,
): T {
  const { trip } = data;
  if (!trip.date_start) return data;
  const { from, to } = part;

  // Days are one per date, in order from date_start.
  const days = data.days.filter((_, i) => {
    const date = addDays(trip.date_start!, i);
    return date >= from && date <= to;
  });

  // A stay counts if any of its nights falls before the last day; clip it to
  // the part so the strip and headings say "3 nights", not the whole run.
  const stays = data.stays
    .filter(s => s.check_in < to && addDays(s.check_in, s.nights) > from)
    .map(s => {
      const start = s.check_in < from ? from : s.check_in;
      const out = addDays(s.check_in, s.nights);
      const end = out > to ? to : out;
      return { ...s, check_in: start, nights: daysBetween(start, end) };
    });

  // Logistics keep undated rows and rows that touch the part, with a day of
  // grace before it for the flights that get everyone there. The book-ahead
  // list is the owner's to-do list, so a shared part leaves it out.
  const year = Number(trip.date_start.slice(0, 4));
  const grace = addDays(from, -1);
  const logistics = data.logistics.filter(l => {
    if (l.column_key === 'book') return false;
    const r = rowDates(`${l.label} ${l.value_md}`, year);
    if (!r) return true;
    // A hotel run that starts on the last day is the next leg, not this one;
    // a flight on the last day is how this part ends.
    return r.end >= grace && (r.range ? r.start < to : r.start <= to);
  });

  const nights = daysBetween(from, to);
  const towns = stays.map(s => s.place).filter((p, i, a) => i === 0 || a[i - 1] !== p);

  return {
    ...data,
    trip: {
      ...trip,
      date_start: from,
      date_end: to,
      subtitle: part.subtitle ?? trip.subtitle,
      eyebrow: trip.eyebrow.replace(/\d+\s+nights?/, `${nights} night${nights === 1 ? '' : 's'}`),
      meta: towns.length ? towns.join(' → ') : trip.meta,
    },
    days,
    stays,
    logistics,
  };
}
