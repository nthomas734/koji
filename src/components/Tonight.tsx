'use client';

import { useEffect, useState } from 'react';
import type { Stay } from '@/lib/supabase';
import { stayTone } from './Stays';
import { appleDirectionsUrl, driverLang } from '@/lib/maps';
import { useAppleMaps } from './MapsContext';

// Logistics opens on where you sleep tonight (review D), with the two things
// you need at a taxi rank: directions, and the address in Japanese to show.

const dirUrl = (q: string) =>
  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}&travelmode=transit`;

// What the driver card says, and the country code for the desk phone, by the
// script the card is in (China trips: Simplified on the mainland, Traditional
// in Hong Kong).
const DRIVER_ASK = { 'ja': 'ここまでお願いします', 'zh-Hans': '请带我去这里', 'zh-Hant': '請帶我去這裡' } as const;
const DIAL = { 'ja': '+81', 'zh-Hans': '+86', 'zh-Hant': '+852' } as const;

/** `tz` is the stay's (the time zone of its first night); it picks the card's language. */
export function TonightCard({ stay, label, tz }: { stay: Stay; label: string; tz?: string | null }) {
  const [driver, setDriver] = useState(false);
  const apple = useAppleMaps();
  const lang = driverLang(tz);
  const directions = apple
    ? appleDirectionsUrl(stay.hotel_ja || stay.hotel_query || stay.hotel || stay.address_en || stay.place)
    : dirUrl(stay.address_en || stay.hotel_query || stay.hotel || stay.place);
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
      {stay.address_ja && <div style={{ fontSize: 14, color: 'var(--ink-2)', marginTop: 2 }} lang={lang}>{stay.address_ja}</div>}
      <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 6, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {stay.phone && <a href={`tel:${DIAL[lang]}${stay.phone.replace(/^0/, '').replace(/[-\s]/g, '')}`} style={{ color: 'inherit', textDecoration: 'underline' }}>{stay.phone}</a>}
        {stay.desk_hours && <span>{stay.desk_hours}</span>}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <a href={directions} target="_blank" rel="noopener noreferrer" style={btn}>Directions</a>
        {stay.address_ja && <button type="button" onClick={() => setDriver(true)} style={btn}>Show to driver</button>}
      </div>
      {driver && <DriverCard stay={stay} lang={lang} onClose={() => setDriver(false)} />}
    </div>
  );
}

/** Full screen, parchment on ink, big enough to hold up to a taxi window. */
export function DriverCard({ stay, lang = 'ja', onClose }: { stay: Stay; lang?: keyof typeof DRIVER_ASK; onClose: () => void }) {
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
      <div style={{ fontSize: 16, opacity: 0.7 }} lang={lang}>{DRIVER_ASK[lang]}</div>
      <div lang={lang} style={{ fontSize: 'clamp(30px, 9vw, 52px)', fontWeight: 700, lineHeight: 1.25 }}>{stay.hotel_ja || stay.hotel}</div>
      <div lang={lang} style={{ fontSize: 'clamp(22px, 6.5vw, 36px)', lineHeight: 1.45 }}>{stay.address_ja}</div>
      {stay.phone && <div style={{ fontSize: 22, fontFamily: 'var(--font-mono)' }}>☎ {stay.phone}</div>}
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.55 }}>Tap anywhere to close</div>
    </div>
  );
}
