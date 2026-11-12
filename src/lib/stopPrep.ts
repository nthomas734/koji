'use client';

// "Before you go" notes for the owner's phone (koji_stop_prep via /api/prep).
// Same shape as komaData: a 401 means not Nathan, so nothing is shown or kept;
// a 200 is cached so the strip still shows with no signal.

import { useCallback, useEffect, useState } from 'react';

export interface Prep { stop_id: number; prep_md: string; done_at: string | null }

const key = (tripId: number) => `koji:prep:${tripId}`;

export function useStopPrep(tripId: number) {
  const [byStop, setByStop] = useState<Map<number, Prep>>(new Map());

  const store = useCallback((rows: Prep[]) => {
    setByStop(new Map(rows.map(r => [r.stop_id, r])));
    try { localStorage.setItem(key(tripId), JSON.stringify(rows)); } catch { /* private mode */ }
  }, [tripId]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key(tripId));
      if (raw) setByStop(new Map((JSON.parse(raw) as Prep[]).map(r => [r.stop_id, r])));
    } catch { /* corrupt or blocked */ }
    let cancelled = false;
    fetch(`/api/prep?trip=${tripId}`, { cache: 'no-store' })
      .then(async res => {
        if (cancelled) return;
        if (res.status === 401) {
          setByStop(new Map());
          try { localStorage.removeItem(key(tripId)); } catch { /* */ }
          return;
        }
        if (res.ok) store(((await res.json()).prep ?? []) as Prep[]);
      })
      .catch(() => { /* offline: keep the cache */ });
    return () => { cancelled = true; };
  }, [tripId, store]);

  const toggle = useCallback(async (stopId: number) => {
    const cur = byStop.get(stopId);
    if (!cur) return;
    const done = !cur.done_at;
    const next = new Map(byStop);
    next.set(stopId, { ...cur, done_at: done ? new Date().toISOString() : null });
    setByStop(next);
    try {
      const res = await fetch('/api/prep', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stop_id: stopId, done }),
      });
      if (res.ok) store([...next.values()]);
      else setByStop(byStop); // put it back
    } catch {
      setByStop(byStop);
    }
  }, [byStop, store]);

  return { byStop, toggle };
}
