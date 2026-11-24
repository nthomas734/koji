'use client';

import { createContext, useContext } from 'react';
import type { ReservedFlag } from '@/lib/supabase';

// ── RESERVED CORNER ─────────────────────────────────────────────────────────
// A stop with a booking linked to it gets a torn corner at the card's top
// right, in the ticket's dashed line: "Reserved" once booked, "Book ahead"
// until then. The flags come from the server (getReservedFlags), keyed by stop
// id and nothing else; koji_bookings itself never reaches the page.

const ReservedContext = createContext<Record<number, ReservedFlag>>({});
export const ReservedProvider = ReservedContext.Provider;
export function useReserved(stopId: number): ReservedFlag | null {
  return useContext(ReservedContext)[stopId] ?? null;
}

/** Brass deepened to 4.7:1 on the card; --brass itself is 2.7:1, decoration only. */
const BRASS_INK = '#8C6B2E';

export const label = (flag: ReservedFlag) => (flag === 'booked' ? 'Reserved' : 'Book ahead');

/** Room the card's top row leaves for the corner (its width less the card's 14px padding, plus a gap), so the tag pill never runs under it. */
export const CORNER_ROOM = 88;

export function ReservedCorner({ flag }: { flag: ReservedFlag }) {
  const needed = flag === 'needed';
  const edge = `1.5px dashed ${needed ? 'var(--brass)' : 'var(--border-mid)'}`;
  return (
    <span style={{
      position: 'absolute', right: -1, top: -1, zIndex: 1,
      background: 'var(--surface)', borderLeft: edge, borderBottom: edge, borderBottomLeftRadius: 10,
      padding: '4px 10px 5px', fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '0.16em',
      textTransform: 'uppercase', lineHeight: 1.3, whiteSpace: 'nowrap', color: needed ? BRASS_INK : 'var(--ink-3)',
    }}>
      {label(flag)}
    </span>
  );
}

/** The same mark as a chip, for the check-in card, whose top is the night band. */
export function ReservedChip({ flag }: { flag: ReservedFlag }) {
  const needed = flag === 'needed';
  return (
    <span style={{
      fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.1em', textTransform: 'uppercase', lineHeight: 1.3,
      border: `1.5px dashed ${needed ? 'var(--brass)' : 'var(--border-mid)'}`, borderRadius: 6, padding: '0 6px',
      whiteSpace: 'nowrap', color: needed ? BRASS_INK : 'var(--ink-3)',
    }}>
      {label(flag)}
    </span>
  );
}
