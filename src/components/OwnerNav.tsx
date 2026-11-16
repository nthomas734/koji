'use client';

// The way back from the owner pages. One row at the top of /admin and
// /admin/bookings: a link back to the trip you came from, then
// Trips · Bookings · Admin · Rolls. The last trip is written by TripView when
// it sees the owner flag.
//
// The itineraries list is also a first impression, so it gets OwnerLinks
// instead: three small links on the koji mark's line, shown only once
// useVerdicts' `verdicts:owner` flag is set. They sit in a line box the mark
// already sets the height of, so appearing after hydration moves nothing.

import { useEffect, useState } from 'react';

export const LAST_TRIP_KEY = 'koji:lastTrip';

type Here = 'trips' | 'bookings' | 'admin';

export function OwnerLinks() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    try { if (localStorage.getItem('verdicts:owner') === 'true') setShow(true); } catch { /* private mode */ }
  }, []);
  if (!show) return null;
  return (
    <nav className="owner-links" aria-label="Owner">
      <a href="/admin/bookings">Bookings</a>
      <a href="/koma">Rolls</a>
      <a href="/admin">Admin</a>
    </nav>
  );
}

export function OwnerNav({ here }: { here: Here }) {
  const [last, setLast] = useState<{ slug: string; title: string } | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LAST_TRIP_KEY);
      if (raw) setLast(JSON.parse(raw));
    } catch { /* private mode */ }
  }, []);

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
      <span className="seg-track">
        {links.map(l => (
          <a key={l.key} href={l.href} className={`seg-btn pressable${l.key === here ? ' on' : ''}`} aria-current={l.key === here ? 'page' : undefined}>{l.label}</a>
        ))}
      </span>
    </nav>
  );
}
