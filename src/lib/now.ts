'use client';

// What time it is on today's page, in the day's own zone (review A).
// `?now=2027-02-22T13:05` pins the clock, to look at a trip day before it comes.

import { useEffect, useState } from 'react';
import type { Stop } from './supabase';
import { parseClock } from './tripAlerts';

export function nowOverride(): { date: string; min: number } | null {
  if (typeof window === 'undefined') return null;
  const m = new URLSearchParams(window.location.search).get('now')?.match(/^(\d{4}-\d{2}-\d{2})T(\d{1,2}):(\d{2})$/);
  return m ? { date: m[1], min: Number(m[2]) * 60 + Number(m[3]) } : null;
}

export function zonedMinutesNow(tz: string): number {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23', hour: 'numeric', minute: 'numeric',
  }).formatToParts(new Date()).map(x => [x.type, x.value]));
  return Number(p.hour) * 60 + Number(p.minute);
}

/** Minutes after midnight in `tz`, ticking each minute and on return to the app. */
export function useZonedMinutes(tz: string | null, on: boolean): number | null {
  const [min, setMin] = useState<number | null>(null);
  useEffect(() => {
    if (!on || !tz) { setMin(null); return; }
    const pinned = nowOverride();
    const tick = () => setMin(pinned ? pinned.min : zonedMinutesNow(tz));
    tick();
    const id = setInterval(tick, 60_000);
    const vis = () => { if (document.visibilityState === 'visible') tick(); };
    document.addEventListener('visibilitychange', vis);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', vis); };
  }, [tz, on]);
  return min;
}

function offsetMin(tz: string, at: Date): number {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric',
  }).formatToParts(at).map(x => [x.type, x.value]));
  const wall = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute);
  return Math.round((wall - Math.floor(at.getTime() / 60_000) * 60_000) / 60_000);
}

/** YYYY-MM-DD on the wall in `tz` */
export function zonedDate(tz: string, at = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(at);
}

/**
 * Which trip day is today. Each day is judged in its own zone, so a flight day
 * on LA time and the landing day on Tokyo time can both be "today" for a few
 * hours; the one in the zone the phone is in wins (the phone flips to Tokyo on
 * landing), then the phone's own date, then the earlier day. -1 outside the trip.
 */
export function todayIndex(dates: string[], tzs: (string | null)[], at = new Date()): number {
  const pinned = nowOverride();
  if (pinned) return dates.indexOf(pinned.date);
  const phoneTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const hits = dates.map((d, i) => (d === zonedDate(tzs[i] || phoneTz, at) ? i : -1)).filter(i => i >= 0);
  if (!hits.length) return -1;
  const phoneOff = offsetMin(phoneTz, at);
  const here = hits.find(i => offsetMin(tzs[i] || phoneTz, at) === phoneOff);
  if (here != null) return here;
  const local = zonedDate(phoneTz, at);
  return hits.find(i => dates[i] === local) ?? hits[0];
}

export interface NowState {
  /** index in the list of the stop under way (last timed stop already started) */
  current: number;
  /** index of the next timed stop, -1 when the day's timed stops are done */
  next: number;
  nextStop: Stop | null;
  minutesToNext: number | null;
}

/** Un-added maybes are not the plan, so they never count as next or past. */
export function nowState(list: Stop[], nowMin: number): NowState {
  let current = -1, next = -1;
  list.forEach((s, i) => {
    if (s.is_optional && !s.added) return;
    const t = parseClock(s.time_label);
    if (t == null) return;
    if (t <= nowMin) current = i;
    else if (next < 0) next = i;
  });
  const nextStop = next >= 0 ? list[next] : null;
  const t = nextStop ? parseClock(nextStop.time_label) : null;
  return { current, next, nextStop, minutesToNext: t == null ? null : t - nowMin };
}

export function fmtCountdown(min: number): string {
  if (min < 1) return 'now';
  if (min < 60) return `in ${min} min`;
  const h = Math.floor(min / 60), m = min % 60;
  return m ? `in ${h} h ${String(m).padStart(2, '0')}` : `in ${h} h`;
}
