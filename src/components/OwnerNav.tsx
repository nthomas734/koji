'use client';

// The way back from the owner pages. One row at the top of /admin,
// /admin/bookings and (signed in only) the itineraries list: a link back to
// the trip you came from, then Trips · Bookings · Admin · Rolls.
//
// The last trip is written by TripView when it sees the owner flag; the flag
// itself is useVerdicts' `verdicts:owner`, so on the public home page this
// renders nothing for anyone who isn't signed in.

import { useEffect, useState } from 'react';

export const LAST_TRIP_KEY = 'koji:lastTrip';

type Here = 'trips' | 'bookings' | 'admin';

export function OwnerNav({ here, ownerOnly = false }: { here: Here; ownerOnly?: boolean }) {
  const [show, setShow] = useState(!ownerOnly);
  const [last, setLast] = useState<{ slug: string; title: string } | null>(null);

  useEffect(() => {
    try {
      if (ownerOnly && localStorage.getItem('verdicts:owner') === 'true') setShow(true);
      const raw = localStorage.getItem(LAST_TRIP_KEY);
      if (raw) setLast(JSON.parse(raw));
    } catch { /* private mode */ }
  }, [ownerOnly]);

  if (!show) return null;
  const links: { key: Here | 'rolls'; label: string; href: string }[] = [
    { key: 'trips', label: 'Trips', href: '/' },
    { key: 'bookings', label: 'Bookings', href: '/admin/bookings' },
    { key: 'admin', label: 'Admin', href: '/admin' },
    { key: 'rolls', label: 'Rolls', href: '/koma' },
  ];
  return (
    <nav className="owner-nav" aria-label="Owner">
      {last && here !== 'trips' && (
        <a className="owner-nav-back" href={`/trips/${last.slug}`}>← {last.title}</a>
      )}
      <span className="owner-nav-chips">
        {links.map(l => (
          <a key={l.key} href={l.href} className={`bk-chip${l.key === here ? ' on' : ''}`} aria-current={l.key === here ? 'page' : undefined}>{l.label}</a>
        ))}
      </span>
    </nav>
  );
}
