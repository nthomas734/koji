'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import type { Stay, Stop } from '@/lib/supabase';
import { driverLang, type Dress } from '@/lib/maps';
import { cjkFont } from '@/lib/dress';
import { NIGHT, Moon, SunriseMark } from './JourneyTicket';
import { SayChip, hasPhrase } from './SayIt';
import { DriverCard } from './Tonight';
import { stayHotelUrl } from './Stays';
import { useAppleMaps } from './MapsContext';
import { ReservedChip, useReserved } from './Reserved';
import { WhoChip } from './WhoChip';

// ── THE CHECK-IN CARD (night band) ──────────────────────────────────────────
// The first hotel check-in of each stay. A band runs from dusk on the left,
// where you arrive, to night on the right, where you sleep: the sleeper
// ticket's sky turned around, in its colours and with its crescent, the same
// on every trip (it never takes the stay colour). The hotel's name leads.
// There is no room number: it is only known at the desk, too late to be useful.
//
// Text has to stay on its side of the band: the dawn ink on peach and rose
// (5.0:1 at worst), the parchment on plum and ink (10.4:1 at worst). The stops
// are in px from each end so they track the text, not the card's width.

export interface CheckIn {
  stay: Stay;
  /** The trip's night number of the stay's first night (as the stay heading counts). */
  firstNight: number;
  /** The zone of the stay's first night: picks the taxi card's language. */
  tz: string | null;
}

/** A Hotel stop on the stay's first day whose title says check in. */
export function isCheckInStop(stop: Stop): boolean {
  return /^hotel$/i.test(stop.tag.trim()) && /check[\s-]?in/i.test(stop.title) && !(stop.is_optional && !stop.added);
}

const BAND_BG = `linear-gradient(90deg, ${NIGHT.peach} 0px, ${NIGHT.peach} 96px, ${NIGHT.rose} 168px, ${NIGHT.plum} calc(100% - 150px), ${NIGHT.ink} calc(100% - 80px))`;
// On a narrow phone plum lands before rose and the browser clamps it there: the
// band becomes a hard edge at 168px, still clear of both texts.
// [px from the right, top or bottom, px, opacity]. Stars sit above or below the
// band's text line, so nothing wraps into them.
const STARS: [number, 'top' | 'bottom', number, number][] = [
  [146, 'top', 7, 0.6], [132, 'bottom', 6, 0.45], [116, 'top', 5, 0.75], [84, 'bottom', 5, 0.5], [52, 'top', 6, 0.4], [26, 'bottom', 7, 0.55],
];

function addDays(iso: string, n: number): string {
  const d = new Date(iso + 'T00:00');
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
/** "Sun 14" */
function dayShort(iso: string): string {
  const d = new Date(iso + 'T00:00');
  return `${d.toLocaleDateString('en-US', { weekday: 'short' })} ${d.getDate()}`;
}
/** The neighbourhood, from the first part of the English address: "2-7-2 Nishi-Shinjuku, …" gives "Nishi-Shinjuku". */
function areaOf(stay: Stay): string | null {
  const first = stay.address_en?.split(',')[0]?.replace(/^[\d\s\-–]+/, '').trim();
  return first && first.toLowerCase() !== stay.place.toLowerCase() ? first : null;
}
const CJK = /[぀-ヿ㐀-鿿]/;

const chip: React.CSSProperties = {
  fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.02em', lineHeight: 1.3, color: 'var(--ink-3)',
  border: '1px solid var(--border)', borderRadius: 6, padding: '1px 6px', background: 'transparent', whiteSpace: 'nowrap',
};

export function CheckInCard({ stop, checkIn, bodyHtml, dirHref, dress, stamp, footer, dawn }: {
  stop: Stop; checkIn: CheckIn; bodyHtml: string; dirHref: string | null; dress: Dress;
  stamp?: React.ReactNode; footer?: React.ReactNode; dawn?: boolean;
}) {
  const { stay, firstNight, tz } = checkIn;
  const [driver, setDriver] = useState(false);
  const last = firstNight + stay.nights - 1;
  const nights = stay.nights === 1 ? `Night ${firstNight}` : `Nights ${firstNight}–${last}`;
  const out = addDays(stay.check_in, stay.nights);
  const lang = driverLang(tz);
  // The body may no longer link the hotel (the name led twice), so Directions
  // falls back to the stay's own hotel link, as the stay heading builds it.
  const apple = useAppleMaps();
  const directions = dirHref ?? stayHotelUrl(stay, apple);
  // A booking linked to this stop: the reserved mark rides in the facts row,
  // since the band already owns the top of the card.
  const reserved = useReserved(stop.id);
  const local = stay.hotel_ja && CJK.test(stay.hotel_ja) ? stay.hotel_ja : null;
  const area = areaOf(stay);
  const ink = '#042C53';
  return (
    <article id={`stop-${stop.id}`} style={{
      position: 'relative', background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 14,
      marginTop: 8, overflow: 'hidden', scrollMarginTop: 'calc(env(safe-area-inset-top, 0px) + 64px)',
    }}>
      <div style={{ position: 'relative', height: 32, background: BAND_BG, display: 'flex', alignItems: 'center', gap: 9, padding: '0 14px 0 18px' }}>
        {STARS.map(([r, edge, px, o], i) => (
          <span key={i} aria-hidden="true" style={{ position: 'absolute', right: r, [edge]: px, width: 2, height: 2, borderRadius: '50%', background: NIGHT.parch, opacity: o }} />
        ))}
        {stop.time_label && (
          <span className="num" style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: NIGHT.dawnInk, whiteSpace: 'nowrap' }}>
            {dawn && <SunriseMark />}{stop.time_label}
          </span>
        )}
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: NIGHT.dawnInk, whiteSpace: 'nowrap' }}>
          Check in
        </span>
        <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: NIGHT.parch, whiteSpace: 'nowrap', position: 'relative' }}>
          {nights}
          <Moon style={{ display: 'block', color: NIGHT.parch }} />
        </span>
      </div>
      <div>
        <div style={{ padding: '10px 14px 0 18px', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <h3 style={{ flex: 1, minWidth: 0, fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 19, lineHeight: 1.2, color: 'var(--ink)', margin: 0 }}>
              {stay.hotel || stop.title}
            </h3>
            {stamp && <div style={{ paddingTop: 1 }}>{stamp}</div>}
          </div>
          {(local || area) && (
            <div style={{ fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.4, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {local && <span lang={dress ?? lang} style={{ fontFamily: cjkFont(dress ?? lang) }}>{local}</span>}
              {local && area && ' · '}
              {area}
            </div>
          )}
        </div>
        <div style={{ padding: '0 14px 12px 18px', minWidth: 0 }}>
          {bodyHtml && (
            <div className="body-content" style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.6, marginTop: 4 }}
              dangerouslySetInnerHTML={{ __html: bodyHtml }} />
          )}
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px 6px', marginTop: 6 }}>
            {directions && (
              <a href={directions} target="_blank" rel="noopener noreferrer"
                style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.06em', color: ink, textDecoration: 'none', borderBottom: '1px solid currentColor', marginRight: 2 }}>
                Directions ↗
              </a>
            )}
            {hasPhrase(stop, dress) && <SayChip stop={stop} dress={dress} color={ink} />}
            {reserved && <ReservedChip flag={reserved} />}
            <span className="num" style={chip}>out {dayShort(out)}</span>
            {stay.address_ja && (
              <button type="button" onClick={() => setDriver(true)} style={{ ...chip, cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>
                taxi card
              </button>
            )}
            <WhoChip who={stop.who} />
          </div>
          {footer}
        </div>
      </div>
      {/* Portalled, like the Say it card: no card ancestor may capture its fixed positioning. */}
      {driver && createPortal(<DriverCard stay={stay} lang={lang} onClose={() => setDriver(false)} />, document.body)}
    </article>
  );
}
