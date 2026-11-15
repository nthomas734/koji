'use client';

import { useState } from 'react';
import type { Stay } from '@/lib/supabase';
import { stayTone } from './Stays';
import { appleDirectionsUrl, dressFor, driverLang, type Dress } from '@/lib/maps';
import { cjkFont } from '@/lib/dress';
import { useAppleMaps } from './MapsContext';
import { Placard, PlacardRule } from './Placard';

// Logistics opens on where you sleep tonight (review D), with the two things
// you need at a taxi rank: directions, and the address in Japanese to show.

const dirUrl = (q: string) =>
  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}&travelmode=transit`;

// What the driver card says, and the country code for the desk phone, by the
// script the card is in (China trips: Simplified on the mainland, Traditional
// in Hong Kong).
const DRIVER_ASK = { 'ja': 'ここまでお願いします', 'zh-Hans': '请带我去这里', 'zh-Hant': '請帶我去這裡' } as const;
const DIAL = { 'ja': '+81', 'zh-Hans': '+86', 'zh-Hant': '+852' } as const;

/** `tz` is the stay's (the time zone of its first night); it picks the card's language.
 *  `prev`/`next` are the neighbouring stays, shown on the platform sign (Japan and China only). */
export function TonightCard({ stay, label, tz, prev, next }: { stay: Stay; label: string; tz?: string | null; prev?: Stay | null; next?: Stay | null }) {
  const [driver, setDriver] = useState(false);
  const apple = useAppleMaps();
  const lang = driverLang(tz);
  const directions = apple
    ? appleDirectionsUrl(stay.hotel_ja || stay.hotel_query || stay.hotel || stay.address_en || stay.place)
    : dirUrl(stay.address_en || stay.hotel_query || stay.hotel || stay.place);
  const tone = stayTone(stay, null);
  const dress = dressFor(tz);
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
      {dress && stay.local_name
        ? <PlatformSign stay={stay} label={label} dress={dress} tone={tone} prev={prev} next={next} />
        : (
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: tone }}>
        {label} · {stay.place}
      </div>
        )}
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

// China's railway blue, the colour of the band on every station board there.
const RAILWAY_BLUE = '#2B5C9A';

/**
 * The station name board (destination dress, step 2): where you sleep in big
 * letters, where you came from on the left of the band and where you go next
 * on the right. Japan is round-cornered with the band in the stay colour;
 * China is square with railway blue. Replaces the mono eyebrow, whose wording
 * stays as the small line above the name.
 */
function PlatformSign({ stay, label, dress, tone, prev, next }: {
  stay: Stay; label: string; dress: Exclude<Dress, null>; tone: string; prev?: Stay | null; next?: Stay | null;
}) {
  const ja = dress === 'ja';
  const font = cjkFont(dress);
  const side = (st: Stay | null | undefined, dir: 'l' | 'r') => {
    if (!st) return <span />;
    const local = st.local_name && <b lang={dress} style={{ fontFamily: font, fontWeight: 700, fontSize: 14, margin: '0 4px' }}>{st.local_name}</b>;
    const latin = <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{st.place}</span>;
    return (
      <span style={{ display: 'flex', alignItems: 'baseline', minWidth: 0, justifyContent: dir === 'l' ? 'flex-start' : 'flex-end' }}>
        {dir === 'l' ? <>◀{local}{latin}</> : <>{latin}{local}▶</>}
      </span>
    );
  };
  return (
    <div style={{
      background: '#FFFFFF', border: '1px solid var(--border-mid)', borderRadius: ja ? 10 : 3,
      textAlign: 'center', overflow: 'hidden', marginBottom: 10,
    }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: tone, paddingTop: 10 }}>
        {label}
      </div>
      <div lang={dress} style={{
        fontFamily: font, fontSize: 38, lineHeight: 1.1, paddingTop: 2, color: 'var(--ink)',
        fontWeight: ja ? 700 : 900, letterSpacing: ja ? '0.14em' : '0.2em', paddingLeft: ja ? '0.14em' : '0.2em',
      }}>{stay.local_name}</div>
      <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 14, letterSpacing: '0.04em', color: 'var(--ink-2)', padding: '2px 0 10px' }}>
        {stay.place}
      </div>
      <div style={{
        background: ja ? tone : RAILWAY_BLUE, color: '#FFFFFF', display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: 8, padding: '7px 12px', fontSize: 12.5, whiteSpace: 'nowrap', minHeight: 18,
      }}>
        {side(prev, 'l')}{side(next, 'r')}
      </div>
    </div>
  );
}

/** Full screen on the shared placard, big enough to hold up to a taxi window. */
export function DriverCard({ stay, lang = 'ja', onClose }: { stay: Stay; lang?: keyof typeof DRIVER_ASK; onClose: () => void }) {
  const font = cjkFont(lang);
  return (
    <Placard label={`Show to driver · ${stay.place}`} seal={lang === 'zh-Hans' ? '车' : '車'} sealLang={lang} sealFont={font} onClose={onClose}>
      <div style={{ fontSize: 17, opacity: 0.7, fontFamily: font }} lang={lang}>{DRIVER_ASK[lang]}</div>
      <div lang={lang} style={{ fontFamily: font, fontSize: 'clamp(30px, 9vw, 52px)', fontWeight: 700, lineHeight: 1.25 }}>{stay.hotel_ja || stay.hotel}</div>
      <PlacardRule />
      <div lang={lang} style={{ fontFamily: font, fontSize: 'clamp(22px, 6.5vw, 36px)', lineHeight: 1.45 }}>{stay.address_ja}</div>
      {stay.phone && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.16em', textTransform: 'uppercase', opacity: 0.45 }}>Tel</span>
          <span style={{ fontSize: 22, fontFamily: 'var(--font-mono)' }}>{stay.phone}</span>
        </div>
      )}
    </Placard>
  );
}
