'use client';

// ─────────────────────────────────────────────────────────────────────────────
// verdicts — Nathan's private "was it worth it" stamps, client side.
//
// Who sees them. The trip page is public and prerendered, so verdicts are never
// in it. This hook asks /api/verdicts on mount: a 200 means the koji_admin
// cookie is on this phone, so it is Nathan, so stamps render; a 401 means
// anyone else, and nothing renders. The answer is remembered in localStorage
// only after a 200, so a phone that has never logged in never shows a thing,
// and a phone that has can still show its stamps with no signal.
//
// Writes follow komaQueue's rule: the tap is the truth. It goes into a
// localStorage queue, the UI reads the queue over the top of what the server
// last said, and the queue drains whenever there is a network. Every write is
// an upsert on client_key, so replaying one twice is harmless.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Verdict, VerdictValue } from '@/lib/supabase';

/** What the UI writes. The server fills in id and timestamps. */
export interface VerdictDraft {
  client_key: string;
  trip_id:    number;
  day_id:     number | null;
  stop_id:    number | null;
  title:      string;
  maps_url:   string | null;
  verdict:    VerdictValue | null;
  note:       string | null;
  source:     'stop' | 'app' | 'share' | 'photo';
  visited_on: string | null;
}

/** A row as the UI sees it — saved, or only queued so far. */
export type VerdictRow = VerdictDraft & { id?: number; source_url?: string | null };

type Op =
  | { kind: 'put'; key: string; row: VerdictDraft; at: number }
  | { kind: 'del'; key: string; at: number };

const QUEUE_KEY = 'verdicts:pending';
const OWNER_KEY = 'verdicts:owner';
const cacheKey  = (tripId: number) => `verdicts:trip:${tripId}`;

const listeners = new Set<() => void>();
const notify = () => { for (const fn of listeners) fn(); };

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback; // private mode, blocked storage, or a corrupt value
  }
}
function writeJson(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* see above */ }
}
function drop(key: string) {
  try { localStorage.removeItem(key); } catch { /* see above */ }
}

const readQueue = (): Op[] => {
  const q = readJson<Op[]>(QUEUE_KEY, []);
  return Array.isArray(q) ? q : [];
};
const writeQueue = (q: Op[]) => { writeJson(QUEUE_KEY, q); notify(); };

/** One entry per place: a newer tap replaces an older one that has not gone. */
function enqueue(op: Op) {
  writeQueue([...readQueue().filter(o => o.key !== op.key), op]);
}

let flushing = false;

async function flush(): Promise<void> {
  if (flushing) return;
  flushing = true;
  try {
    for (;;) {
      const item = readQueue()[0];
      if (!item) return;

      let res: Response;
      try {
        res = item.kind === 'put'
          ? await fetch('/api/verdicts', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(item.row),
            })
          : await fetch(`/api/verdicts?key=${encodeURIComponent(item.key)}`, { method: 'DELETE' });
      } catch {
        return; // no network; try again on the next signal
      }

      // 401: the cookie lapsed. Keep the queue — logging in again sends it.
      if (res.status === 401) return;
      // Any other 4xx is a bad write that will never succeed; don't let it pin
      // everything behind it.
      const dead = res.status >= 400 && res.status < 500;
      if (!res.ok && !dead) return;

      if (res.ok && item.kind === 'put') {
        const { verdict } = await res.json().catch(() => ({ verdict: null }));
        if (verdict) mergeIntoCache(verdict as Verdict);
      }
      if (res.ok && item.kind === 'del') removeFromCache(item.key);

      writeQueue(readQueue().filter(o => !(o.key === item.key && o.at === item.at)));
    }
  } finally {
    flushing = false;
  }
}

// The last server list per trip, so stamps survive a reload with no signal.
function mergeIntoCache(v: Verdict) {
  const list = readJson<Verdict[]>(cacheKey(v.trip_id), []).filter(x => x.client_key !== v.client_key);
  writeJson(cacheKey(v.trip_id), [...list, v]);
  notify();
}
function removeFromCache(key: string) {
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k?.startsWith('verdicts:trip:')) continue;
    const list = readJson<Verdict[]>(k, []);
    const next = list.filter(x => x.client_key !== key);
    if (next.length !== list.length) writeJson(k, next);
  }
  notify();
}

/** A fresh key for a place that is not a planned stop. */
export function newPlaceKey(): string {
  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  return `x:${id}`;
}

export interface VerdictsApi {
  /** True only when this phone has proved it holds the admin cookie. */
  owner:   boolean;
  byStop:  Map<number, VerdictRow>;
  /** Unplanned places, by day id. Places with no day are under -1. */
  extras:  Map<number, VerdictRow[]>;
  save:    (row: VerdictDraft) => void;
  remove:  (key: string) => void;
}

export function useVerdicts(tripId: number): VerdictsApi {
  const [owner, setOwner]   = useState(false);
  const [server, setServer] = useState<Verdict[]>([]);
  const [queue, setQueue]   = useState<Op[]>([]);

  useEffect(() => {
    // What this phone knew last time — enough to draw stamps offline.
    if (readJson<boolean>(OWNER_KEY, false)) {
      setOwner(true);
      setServer(readJson<Verdict[]>(cacheKey(tripId), []));
    }
    setQueue(readQueue());

    const sync = () => {
      setQueue(readQueue());
      setServer(cur => (readJson<boolean>(OWNER_KEY, false) ? readJson<Verdict[]>(cacheKey(tripId), cur) : cur));
    };
    listeners.add(sync);

    let cancelled = false;
    (async () => {
      let res: Response;
      try {
        res = await fetch(`/api/verdicts?trip=${tripId}`, { cache: 'no-store' });
      } catch {
        return; // offline: keep whatever the cache said
      }
      if (cancelled) return;
      if (res.status === 401) {
        // Not Nathan, or his cookie lapsed. Forget everything this phone held.
        drop(OWNER_KEY);
        drop(cacheKey(tripId));
        setOwner(false);
        setServer([]);
        return;
      }
      if (!res.ok) return;
      const { verdicts } = await res.json();
      writeJson(OWNER_KEY, true);
      writeJson(cacheKey(tripId), verdicts ?? []);
      setOwner(true);
      setServer(verdicts ?? []);
      void flush();
    })();

    const onOnline = () => { void flush(); };
    const onVis = () => { if (!document.hidden) void flush(); };
    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVis);

    return () => {
      cancelled = true;
      listeners.delete(sync);
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [tripId]);

  const save = useCallback((row: VerdictDraft) => {
    enqueue({ kind: 'put', key: row.client_key, row, at: Date.now() });
    void flush();
  }, []);

  const remove = useCallback((key: string) => {
    enqueue({ kind: 'del', key, at: Date.now() });
    void flush();
  }, []);

  const { byStop, extras } = useMemo(() => {
    // Server rows, then the queue over the top: the tap wins until it is sent.
    const rows = new Map<string, VerdictRow>();
    for (const v of server) if (v.trip_id === tripId) rows.set(v.client_key, v);
    for (const op of queue) {
      if (op.kind === 'del') rows.delete(op.key);
      else if (op.row.trip_id === tripId) rows.set(op.key, { ...rows.get(op.key), ...op.row });
    }

    const byStop = new Map<number, VerdictRow>();
    const extras = new Map<number, VerdictRow[]>();
    for (const r of rows.values()) {
      if (r.stop_id != null) { byStop.set(r.stop_id, r); continue; }
      const d = r.day_id ?? -1;
      extras.set(d, [...(extras.get(d) ?? []), r]);
    }
    return { byStop, extras };
  }, [server, queue, tripId]);

  return { owner, byStop, extras, save, remove };
}
