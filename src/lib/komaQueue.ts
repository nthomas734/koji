'use client';

// ─────────────────────────────────────────────────────────────────────────────
// komaQueue — status writes that survive no signal.
//
// Marking a frame "got" is the one thing koma has to do in the field, and the
// field is the Tube, a Cotswold lane, and a studio tour with no bars. The first
// version only updated state when `res.ok`, so a failed write left the row
// unchanged with no message: you tapped the button and nothing happened.
//
// Now the tap is the truth. It goes into a localStorage queue, the UI reads the
// queue over the top of whatever the page was served with, and the queue drains
// whenever the phone has a network again. The write can be slow; it cannot be
// lost, and it cannot be silent.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';

export interface PendingWrite {
  id:     number;
  status: string;
  /** Tie-break for removal: a newer tap on the same frame replaces an older. */
  at:     number;
}

const KEY = 'koma:pending';
const listeners = new Set<() => void>();

function read(): PendingWrite[] {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return []; // private mode, blocked storage, or a corrupt value
  }
}

function write(list: PendingWrite[]) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* see above */ }
  for (const fn of listeners) fn();
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

/** id → the status the person last tapped, for rows not yet confirmed. */
export function pendingMap(): Map<number, string> {
  return new Map(read().map(p => [p.id, p.status] as [number, string]));
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

      write(read().filter(p => !(p.id === item.id && p.at === item.at)));
    }
  } finally {
    flushing = false;
  }
}

/**
 * The queue as the UI sees it, plus the drain triggers. Returns the map so a
 * row can render the status that was tapped rather than the one that was
 * served — which is what makes this survive a reload, not just a bad request.
 */
export function usePendingStatus(): Map<number, string> {
  const [map, setMap] = useState<Map<number, string>>(() => new Map());

  useEffect(() => {
    const sync = () => setMap(pendingMap());
    sync();
    const un = subscribe(sync);

    const onOnline = () => { void flush().then(sync); };
    const onVis = () => { if (!document.hidden) onOnline(); };

    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVis);
    onOnline(); // anything left over from the last session goes now

    return () => {
      un();
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  return map;
}
