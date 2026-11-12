'use client';

import { useEffect, useState } from 'react';
import type { Stay } from '@/lib/supabase';
import { stayTone } from './Stays';

// Logistics opens on where you sleep tonight (review D), with the two things
// you need at a taxi rank: directions, and the address in Japanese to show.

const dirUrl = (q: string) =>
  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}&travelmode=transit`;

export function TonightCard({ stay, label }: { stay: Stay; label: string }) {
  const [driver, setDriver] = useState(false);
  const tone = stayTone(stay, null);
  const btn: React.CSSProperties = {
    flex: 1, textAlign: 'center', padding: '10px 8px', borderRadius: 10, fontSize: 14, fontWeight: 600,
    border: `1px solid color-mix(in srgb, ${tone} 45%, transparent)`, color: 'var(--ink)', background: 'var(--surface)',
    cursor: 'pointer', textDecoration: 'none', fontFamily: 'inherit',
  };
  return (
    <div style={{
      marginBottom: 16, padding: '14px 16px', borderRadius: 16,
      background: `color-mix(in srgb, ${tone} 14%, var(--surface))`,
      border: `1px solid color-mix(in srgb, ${tone} 40%, transparent)`,
    }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: tone }}>
        {label} · {stay.place}
      </div>
      <div style={{ fontSize: 19, fontWeight: 600, marginTop: 4, color: 'var(--ink)' }}>{stay.hotel}</div>
      {stay.address_en && <div style={{ fontSize: 14, color: 'var(--ink-2)', marginTop: 4, lineHeight: 1.45 }}>{stay.address_en}</div>}
      {stay.address_ja && <div style={{ fontSize: 14, color: 'var(--ink-2)', marginTop: 2 }} lang="ja">{stay.address_ja}</div>}
      <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 6, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {stay.phone && <a href={`tel:+81${stay.phone.replace(/^0/, '').replace(/-/g, '')}`} style={{ color: 'inherit', textDecoration: 'underline' }}>{stay.phone}</a>}
        {stay.desk_hours && <span>{stay.desk_hours}</span>}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <a href={dirUrl(stay.address_en || stay.hotel_query || stay.hotel || stay.place)} target="_blank" rel="noopener noreferrer" style={btn}>Directions</a>
        {stay.address_ja && <button type="button" onClick={() => setDriver(true)} style={btn}>Show to driver</button>}
      </div>
      {driver && <DriverCard stay={stay} onClose={() => setDriver(false)} />}
    </div>
  );
}

/** Full screen, parchment on ink, big enough to hold up to a taxi window. */
export function DriverCard({ stay, onClose }: { stay: Stay; onClose: () => void }) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);
  return (
    <div role="dialog" aria-label="Show to driver" onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 1000, background: '#1E1B17', color: '#F3EEE4',
      display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 24,
      padding: 'calc(env(safe-area-inset-top, 0px) + 28px) 24px calc(env(safe-area-inset-bottom, 0px) + 28px)',
    }}>
      <div style={{ fontSize: 16, opacity: 0.7 }} lang="ja">ここまでお願いします</div>
      <div lang="ja" style={{ fontSize: 'clamp(30px, 9vw, 52px)', fontWeight: 700, lineHeight: 1.25 }}>{stay.hotel_ja || stay.hotel}</div>
      <div lang="ja" style={{ fontSize: 'clamp(22px, 6.5vw, 36px)', lineHeight: 1.45 }}>{stay.address_ja}</div>
      {stay.phone && <div style={{ fontSize: 22, fontFamily: 'var(--font-mono)' }}>☎ {stay.phone}</div>}
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.55 }}>Tap anywhere to close</div>
    </div>
  );
}
