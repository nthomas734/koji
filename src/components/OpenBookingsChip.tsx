'use client';

// "2 to book" at the right of a big trip card's foot line, counting that trip's
// own windows. Signed in only: it waits for the owner flag before asking, so a
// visitor's phone never calls the admin API. Every card on the page shares one
// request.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

let counts: Promise<Record<string, number> | null> | null = null;
function openByTrip() {
  counts ??= fetch('/api/admin/bookings', { cache: 'no-store' })
    .then(r => (r.ok ? r.json() : null))
    .then(j => (j && j.byTrip && typeof j.byTrip === 'object' ? j.byTrip as Record<string, number> : null))
    .catch(() => null)
    .finally(() => { setTimeout(() => { counts = null; }, 0); });
  return counts;
}

export function OpenBookingsChip({ tripId }: { tripId: number }) {
  const [open, setOpen] = useState(0);
  const router = useRouter();
  const go = () => router.push('/admin/bookings');
  useEffect(() => {
    try { if (localStorage.getItem('verdicts:owner') !== 'true') return; } catch { return; }
    let live = true;
    openByTrip().then(m => { if (live && m && typeof m[tripId] === 'number') setOpen(m[tripId]); });
    return () => { live = false; };
  }, [tripId]);
  if (!open) return null;
  return (
    // It sits inside the trip card's link, so it can't be a link itself.
    <span role="link" tabIndex={0} className="home-book"
      onClick={e => { e.preventDefault(); e.stopPropagation(); go(); }}
      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); go(); } }}>
      {open} to book
    </span>
  );
}
