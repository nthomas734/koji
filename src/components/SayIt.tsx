'use client';

import { useEffect, useState } from 'react';
import { Placard, PlacardButton, PlacardRule } from './Placard';
import { createPortal } from 'react-dom';
import type { Stop } from '@/lib/supabase';
import type { Dress } from '@/lib/maps';
import { cjkFont } from '@/lib/dress';

// ── SAY IT / SHOW IT ────────────────────────────────────────────────────────
// Destination dress, step 3b. A stop can carry one phrase (say_local,
// say_reading, say_gloss). It shows as a small chip in the Directions row and
// opens full screen on the placard it shares with the driver card. "Hear it"
// plays it in the phone's own voice; "Show them" turns the card to the
// Japanese for the other person. Tap anywhere else to close.
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
        <span aria-hidden lang={dress} style={{
          fontFamily: cjkFont(dress), fontWeight: 700, fontSize: 10.5, letterSpacing: 0, marginRight: 5,
          textTransform: 'none', position: 'relative', top: -0.5,
        }}>{dress === 'ja' ? '話' : dress === 'zh-Hant' ? '說' : '说'}</span>
        {dress === 'ja' ? 'Say it' : 'Show it'}
      </button>
      {/* Portalled to <body>, like the owner sheet, so no transformed ancestor
          (a .row-in entrance) can capture its fixed positioning. */}
      {open && createPortal(<PhraseCard stop={stop} dress={dress} onClose={() => setOpen(false)} />, document.body)}
    </>
  );
}

/** Full screen on the shared placard (Placard.tsx), the driver card's twin. */
function PhraseCard({ stop, dress, onClose }: { stop: Stop; dress: Exclude<Dress, null>; onClose: () => void }) {
  const ja = dress === 'ja';
  const local = stop.say_local!.trim();
  const reading = stop.say_reading?.trim();
  const gloss = stop.say_gloss?.trim();
  // "Show them": the same card turned for the other person, Japanese first.
  const [shown, setShown] = useState(!ja || !reading);
  const [canSpeak, setCanSpeak] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const voiceLang = ja ? 'ja-JP' : dress === 'zh-Hant' ? 'zh-HK' : 'zh-CN';
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    setCanSpeak(true);
    return () => window.speechSynthesis.cancel();
  }, []);
  const speak = () => {
    const synth = window.speechSynthesis;
    if (speaking) { synth.cancel(); setSpeaking(false); return; }
    const u = new SpeechSynthesisUtterance(local);
    u.lang = voiceLang;
    u.rate = 0.8;
    const voice = synth.getVoices().find(v => v.lang.replace('_', '-').startsWith(voiceLang.slice(0, 2)));
    if (voice) u.voice = voice;
    u.onend = u.onerror = () => setSpeaking(false);
    synth.cancel();
    setSpeaking(true);
    synth.speak(u);
  };

  // Held up to someone, so as big as the screen allows, in even lines: at
  // most five characters a line, the lines balanced ("お会計お / ねがいし /
  // ます" rather than three, three, three and one left over).
  const chars = [...local].length;
  const perLine = Math.ceil(chars / Math.ceil(chars / 5));
  const localHuge = (
    <div lang={dress} style={{
      fontFamily: cjkFont(dress), fontWeight: 700, lineHeight: 1.2, letterSpacing: '0.04em',
      fontSize: `min(128px, calc((100vw - 76px) / ${(perLine * 1.06).toFixed(2)}))`,
      maxWidth: `${perLine * 1.06 + 0.1}em`, overflowWrap: 'anywhere',
    }}>{local}</div>
  );
  const localSmall = (
    <div lang={dress} style={{ fontFamily: cjkFont(dress), fontSize: 'clamp(22px, 6.5vw, 34px)', lineHeight: 1.45, letterSpacing: '0.04em', opacity: 0.85 }}>
      {local}
    </div>
  );
  const romajiBig = reading && (
    <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 'clamp(38px, 11.5vw, 72px)', lineHeight: 1.1, letterSpacing: '-0.01em' }}>
      {reading}
    </div>
  );
  const readingSmall = reading && (
    <div style={ja
      ? { fontFamily: 'var(--font-serif)', fontSize: 21, lineHeight: 1.3, opacity: 0.7 }
      : { fontFamily: PINYIN, fontStyle: 'italic', fontSize: 22, lineHeight: 1.35, opacity: 0.8 }}>
      {reading}
    </div>
  );
  const meaning = gloss && (
    <>
      <PlacardRule />
      <div style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.16em', textTransform: 'uppercase', opacity: 0.45, flexShrink: 0 }}>
          Means
        </span>
        <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 19, lineHeight: 1.4, opacity: 0.8 }}>
          “{gloss}”
        </span>
      </div>
    </>
  );

  const buttons = (canSpeak || (ja && reading)) ? (
    <div style={{ display: 'flex', gap: 10 }}>
      {canSpeak && (
        <PlacardButton onClick={speak} primary pressed={speaking}>
          {speaking ? <Bars /> : <Play />}
          {speaking ? 'Playing' : 'Hear it'}
        </PlacardButton>
      )}
      {ja && reading && (
        <PlacardButton onClick={() => setShown(v => !v)} pressed={shown}>
          {shown ? 'Back to romaji' : 'Show them'}
        </PlacardButton>
      )}
    </div>
  ) : undefined;

  return (
    <Placard
      label={`${ja ? 'Say it' : 'Show it'} · ${stop.title}`}
      seal={ja ? '話' : dress === 'zh-Hant' ? '說' : '说'} sealLang={dress} sealFont={cjkFont(dress)}
      onClose={onClose} footer={buttons}
    >
      {shown ? <>{localHuge}{readingSmall}</> : <>{romajiBig}{localSmall}</>}
      {meaning}
    </Placard>
  );
}

function Play() {
  return <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden><path d="M2.5 1.5v9l8-4.5z" fill="currentColor" /></svg>;
}

/** Three bars that rise and fall while the phone speaks. */
function Bars() {
  return (
    <span aria-hidden style={{ display: 'inline-flex', gap: 2, alignItems: 'flex-end', height: 12 }}>
      {[0, 0.15, 0.3].map(d => (
        <span key={d} style={{ width: 3, height: 12, borderRadius: 1, background: 'currentColor', transformOrigin: 'bottom', animation: `say-bar 0.7s ${d}s ease-in-out infinite alternate` }} />
      ))}
    </span>
  );
}
