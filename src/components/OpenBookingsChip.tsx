'use client';

// "2 bookings open" on the home page's next-trip card. Signed in only: it
// waits for the owner flag before asking, so a visitor's phone never calls
// the admin API.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export function OpenBookingsChip() {
  const [open, setOpen] = useState(0);
  const router = useRouter();
  const go = () => router.push('/admin/bookings');
  useEffect(() => {
    try { if (localStorage.getItem('verdicts:owner') !== 'true') return; } catch { return; }
    fetch('/api/admin/bookings', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then(j => { if (j && typeof j.open === 'number') setOpen(j.open); })
      .catch(() => {});
  }, []);
  if (!open) return null;
  return (
    // It sits inside the trip card's link, so it can't be a link itself.
    <span role="link" tabIndex={0} className="home-chip home-chip-hot"
      onClick={e => { e.preventDefault(); e.stopPropagation(); go(); }}
      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); go(); } }}>
      {open} {open === 1 ? 'booking' : 'bookings'} open
    </span>
  );
}
