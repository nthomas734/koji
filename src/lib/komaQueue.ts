'use client';

// ─────────────────────────────────────────────────────────────────────────────
// komaQueue — status writes that survive no signal, and the page that forgets.
//
// Marking a frame "got" is the one thing koma has to do in the field, and the
// field is the Tube, a Cotswold lane, and a studio tour with no bars. The first
// version only updated state when `res.ok`, so a failed write left the row
// unchanged with no message: you tapped the button and nothing happened.
//
// Now the tap is the truth. It goes into a localStorage queue, the UI reads the
// queue over the top of whatever the page was served with, and the queue drains
// whenever the phone has a network again.
//
// A *sent* write needs the same protection for a different reason. The trip
// page is prerendered with `revalidate = 60`, so for up to a minute after the
// write the server still serves the old payload — and `setShots(initialShots)`
// applies it, un-striking a row the person marked minutes ago. The API now
// revalidates on write, but regeneration is not instant and a phone waking from
// a pocket can still land on the stale copy. So a successful send moves to a
// *confirmed* list and keeps overlaying for fifteen minutes. After that the
// database is authoritative and the overlay is no longer needed.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';

export interface PendingWrite {
  id:     number;
  status: string;
  /** Tie-break for removal: a newer tap on the same frame replaces an older. */
  at:     number;
}

const KEY       = 'koma:pending';
const DONE_KEY  = 'koma:confirmed';
/** Long enough to cover a 60s revalidate plus a slow regeneration and a nap. */
const DONE_TTL  = 15 * 60 * 1000;

const listeners = new Set<() => void>();

function readList(key: string): PendingWrite[] {
  try {
    const raw = localStorage.getItem(key);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return []; // private mode, blocked storage, or a corrupt value
  }
}

function writeList(key: string, list: PendingWrite[]) {
  try { localStorage.setItem(key, JSON.stringify(list)); } catch { /* see above */ }
  for (const fn of listeners) fn();
}

const read  = () => readList(KEY);
const write = (l: PendingWrite[]) => writeList(KEY, l);

/** Confirmed writes, minus anything old enough that the server has caught up. */
function readConfirmed(): PendingWrite[] {
  const cutoff = Date.now() - DONE_TTL;
  const all = readList(DONE_KEY);
  const live = all.filter(p => p.at > cutoff);
  if (live.length !== all.length) {
    try { localStorage.setItem(DONE_KEY, JSON.stringify(live)); } catch {}
  }
  return live;
}

function markConfirmed(item: PendingWrite) {
  const list = readConfirmed().filter(p => p.id !== item.id);
  list.push({ ...item, at: Date.now() });
  writeList(DONE_KEY, list);
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

/**
 * id → the status the person last tapped, for any row the served payload may
 * not agree with yet. Confirmed writes first, unsent ones over the top.
 */
export function pendingMap(): Map<number, string> {
  const map = new Map<number, string>();
  for (const p of readConfirmed()) map.set(p.id, p.status);
  for (const p of read())          map.set(p.id, p.status);
  return map;
}

/** Records the tap. One entry per frame — the latest tap wins. */
export function queueStatus(id: number, status: string) {
  const list = read().filter(p => p.id !== id);
  list.push({ id, status, at: Date.now() });
  write(list);
}

let flushing = false;

/**
 * Drains the queue oldest first, stopping at the first entry that cannot be
 * sent. Stopping rather than skipping keeps the order of two taps on one frame.
 */
export async function flush(): Promise<void> {
  if (flushing) return;
  flushing = true;
  try {
    for (;;) {
      const list = read();
      const item = list[0];
      if (!item) return;

      let res: Response;
      try {
        res = await fetch(`/api/koma/shots?id=${item.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: item.status }),
        });
      } catch {
        return; // no network. Keep everything; try again on the next signal.
      }

      // A 4xx that is not auth means the row is gone or the value is bad.
      // Retrying that forever would pin every later write behind it.
      const drop = !res.ok && res.status >= 400 && res.status < 500 && res.status !== 401;
      if (!res.ok && !drop) return; // 5xx or 401 — a real retry is worth it

      // Only a write the server accepted earns the overlay. A dropped one was
      // rejected, so the served value is the correct one.
      if (res.ok) markConfirmed(item);
      write(read().filter(p => !(p.id === item.id && p.at === item.at)));
    }
  } finally {
    flushing = false;
  }
}

/**
 * Mounts the drain triggers and nothing else.
 *
 * This belongs **above** koma, on the trip and roll pages, because it used to
 * live inside `KomaView` — so leaving the mode to read the itinerary unmounted
 * the listeners, and a frame marked underground stayed unsent until somebody
 * happened to reopen koma. The whole point is that it does not need reopening.
 */
export function useQueueDrain(): void {
  useEffect(() => {
    const onOnline = () => { void flush(); };
    const onVis = () => { if (!document.hidden) onOnline(); };

    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVis);
    onOnline(); // anything left over from the last session goes now

    return () => {
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);
}

/**
 * The queue as the UI sees it. Returns the map so a row can render the status
 * that was tapped rather than the one that was served — which is what makes
 * this survive a reload, a dead signal, and a stale prerender.
 */
export function usePendingStatus(): Map<number, string> {
  const [map, setMap] = useState<Map<number, string>>(() => new Map());

  useQueueDrain();

  useEffect(() => {
    const sync = () => setMap(pendingMap());
    sync();
    const un = subscribe(sync);
    const onVis = () => { if (!document.hidden) sync(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { un(); document.removeEventListener('visibilitychange', onVis); };
  }, []);

  return map;
}
