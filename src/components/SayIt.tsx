'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Stop } from '@/lib/supabase';
import type { Dress } from '@/lib/maps';
import { cjkFont } from '@/lib/dress';

// ── SAY IT / SHOW IT ────────────────────────────────────────────────────────
// Destination dress, step 3b. A stop can carry one phrase (say_local,
// say_reading, say_gloss). It shows as a small chip in the Directions row and
// opens full screen, built like the driver card: tap anywhere to close.
// Japan is learnt by sound, so the card leads with the romaji ("Say it").
// In China the phone does the talking, so the characters lead ("Show it").
// Nothing renders unless say_local is set and the trip is dressed.

/** Pinyin is set in Georgia: Fraunces italic draws the macron of ā off its letter. */
const PINYIN = "Georgia, 'Times New Roman', serif";

export function hasPhrase(stop: Stop, dress: Dress): dress is Exclude<Dress, null> {
  return !!dress && !!stop.say_local?.trim();
}

export function SayChip({ stop, dress, color }: { stop: Stop; dress: Exclude<Dress, null>; color: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} style={{
        fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase',
        // Sized to the Directions link's own line, so the row grows by nothing.
        lineHeight: 1.15, color, background: 'transparent', border: '1px solid currentColor', borderRadius: 999,
        padding: '1px 8px', cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
      }}>
        {dress === 'ja' ? 'Say it' : 'Show it'}
      </button>
      {/* Portalled to <body>, like the owner sheet, so no transformed ancestor
          (a .row-in entrance) can capture its fixed positioning. */}
      {open && createPortal(<PhraseCard stop={stop} dress={dress} onClose={() => setOpen(false)} />, document.body)}
    </>
  );
}

/** Full screen, parchment on ink, like DriverCard in Tonight.tsx. */
function PhraseCard({ stop, dress, onClose }: { stop: Stop; dress: Exclude<Dress, null>; onClose: () => void }) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);
  const ja = dress === 'ja';
  const local = stop.say_local!.trim();
  const reading = stop.say_reading?.trim();
  const gloss = stop.say_gloss?.trim();
  const localBig = (
    <div lang={dress} style={{ fontFamily: cjkFont(dress), fontWeight: 700, fontSize: 'clamp(64px, 24vw, 140px)', lineHeight: 1.15, letterSpacing: '0.06em', overflowWrap: 'anywhere' }}>
      {local}
    </div>
  );
  return (
    <div role="dialog" aria-label={ja ? 'Say it' : 'Show it'} onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 1000, background: '#1E1B17', color: '#F3EEE4',
      display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 18,
      padding: 'calc(env(safe-area-inset-top, 0px) + 28px) 24px calc(env(safe-area-inset-bottom, 0px) + 28px)',
    }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase', opacity: 0.55 }}>
        {stop.title}
      </div>
      {ja ? (
        <>
          {reading && (
            <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 'clamp(38px, 12vw, 72px)', lineHeight: 1.12, letterSpacing: '-0.01em' }}>
              {reading}
            </div>
          )}
          {reading
            ? <div lang="ja" style={{ fontFamily: cjkFont(dress), fontSize: 'clamp(22px, 6.5vw, 34px)', lineHeight: 1.4, opacity: 0.85 }}>{local}</div>
            : localBig}
          {gloss && <div style={{ fontSize: 17, lineHeight: 1.4, opacity: 0.65 }}>{gloss}</div>}
        </>
      ) : (
        <>
          {localBig}
          {reading && <div style={{ fontFamily: PINYIN, fontStyle: 'italic', fontSize: 22, lineHeight: 1.35, opacity: 0.8 }}>{reading}</div>}
          {gloss && <div style={{ fontSize: 17, lineHeight: 1.4, opacity: 0.65, marginTop: reading ? -10 : 0 }}>{gloss}</div>}
        </>
      )}
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.55, marginTop: 6 }}>Tap anywhere to close</div>
    </div>
  );
}
