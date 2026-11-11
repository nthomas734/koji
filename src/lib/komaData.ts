'use client';

// ─────────────────────────────────────────────────────────────────────────────
// komaData — a trip's shots and carry lists, for the owner's phone only.
//
// Until 2026-11-11 these rode inside the prerendered trip page, so every shared
// link and part link carried the whole shot plan. Now the page carries none of
// it, and this hook asks /api/koma/shots on mount, the same way useVerdicts
// asks /api/verdicts:
//
//   200  the koji_admin cookie is on this phone: use the answer and remember it
//        in localStorage, so koma still opens with no signal.
//   401  anyone else, or a lapsed cookie: forget whatever this phone held.
//   no network: keep what the cache said.
//
// The cache is written only after a 200, so a phone that has never signed in
// never holds a shot.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import type { Carry, Shot } from '@/lib/supabase';

const cacheKey = (tripId: number) => `koma:trip:${tripId}`;

interface Cached { shots: Shot[]; carry: Carry[] }

function readCache(tripId: number): Cached | null {
  try {
    const raw = localStorage.getItem(cacheKey(tripId));
    if (!raw) return null;
    const v = JSON.parse(raw) as Cached;
    return Array.isArray(v?.shots) ? { shots: v.shots, carry: Array.isArray(v.carry) ? v.carry : [] } : null;
  } catch {
    return null; // private mode, blocked storage, or a corrupt value
  }
}

export interface KomaData {
  /** True once this phone has shown it holds the admin cookie (or did, last time). */
  owner: boolean;
  shots: Shot[];
  carry: Carry[];
}

export function useKomaData(tripId: number): KomaData {
  const [data, setData] = useState<KomaData>({ owner: false, shots: [], carry: [] });

  useEffect(() => {
    const cached = readCache(tripId);
    if (cached) setData({ owner: true, ...cached });

    let cancelled = false;
    (async () => {
      let res: Response;
      try {
        res = await fetch(`/api/koma/shots?trip=${tripId}`, { cache: 'no-store' });
      } catch {
        return; // offline: keep whatever the cache said
      }
      if (cancelled) return;
      if (res.status === 401) {
        try { localStorage.removeItem(cacheKey(tripId)); } catch { /* see above */ }
        setData({ owner: false, shots: [], carry: [] });
        return;
      }
      if (!res.ok) return;
      const body = await res.json().catch(() => null) as Cached | null;
      if (cancelled || !body || !Array.isArray(body.shots)) return;
      const next = { shots: body.shots, carry: body.carry ?? [] };
      try { localStorage.setItem(cacheKey(tripId), JSON.stringify(next)); } catch { /* see above */ }
      setData({ owner: true, ...next });
    })();

    return () => { cancelled = true; };
  }, [tripId]);

  return data;
}
