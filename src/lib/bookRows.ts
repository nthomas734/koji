'use client';

import { useEffect, useState } from 'react';
import type { Logistics } from './supabase';

/** The owner's Book ahead rows, from /api/logistics/book. Empty for everyone else. */
export function useBookRows(tripId: number, owner: boolean): Logistics[] {
  const [rows, setRows] = useState<Logistics[]>([]);
  useEffect(() => {
    if (!owner) { setRows([]); return; }
    let cancelled = false;
    fetch(`/api/logistics/book?trip=${tripId}`, { cache: 'no-store' })
      .then(async res => { if (!cancelled && res.ok) setRows(((await res.json()).rows ?? []) as Logistics[]); })
      .catch(() => { /* offline: no to-dos */ });
    return () => { cancelled = true; };
  }, [tripId, owner]);
  return rows;
}
