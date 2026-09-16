'use client';

import { useRef, useState } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// KomaMark — long-press the camera to enter koma.
// Same call daizu makes for /barista: hidden, not protected. 350ms.
//
// It has to be an icon, not a labelled pill. A long-press on text triggers
// iOS's Copy / Look Up / Translate callout and the gesture never reaches us,
// which is exactly what happened to the first version. Hence SVG only, plus
// the three webkit properties below — touch-callout and user-select are what
// actually stop Safari from claiming the press.
// ─────────────────────────────────────────────────────────────────────────────

export function KomaMark({
  on, onToggle, size = 21,
}: {
  on: boolean;
  onToggle: () => void;
  size?: number;
}) {
  const [pressing, setPressing] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startPress = () => {
    setPressing(true);
    timer.current = setTimeout(() => {
      onToggle();
      setPressing(false);
      try { navigator.vibrate?.(8); } catch { /* not supported */ }
    }, 350);
  };

  const cancelPress = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setPressing(false);
  };

  const copper = '#B83C01';
  const stroke = on ? copper : 'var(--ink-4)';

  return (
    <button
      type="button"
      onPointerDown={startPress}
      onPointerUp={cancelPress}
      onPointerLeave={cancelPress}
      onPointerCancel={cancelPress}
      onContextMenu={e => e.preventDefault()}
      aria-label={on ? 'Leave koma (long press)' : 'koma (long press)'}
      aria-pressed={on}
      style={{
        width: 44, height: 44, borderRadius: '50%',
        background: 'transparent', border: 'none', padding: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
        touchAction: 'none',
        opacity: on ? 1 : pressing ? 0.95 : 0.4,
        transform: pressing ? 'scale(0.88)' : 'scale(1)',
        transition: 'opacity 0.3s var(--ease-out), transform 0.35s var(--ease-out)',
      }}
    >
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden
           style={{ pointerEvents: 'none' }}>
        {/* viewfinder bump */}
        <path d="M8.8 6.2 L9.7 4.4 H14.3 L15.2 6.2" stroke={stroke} strokeWidth="1.5"
              strokeLinejoin="round" strokeLinecap="round" fill="none" />
        {/* body */}
        <rect x="2.4" y="6.2" width="19.2" height="13.4" rx="3.2"
              stroke={stroke} strokeWidth="1.5" fill="none" />
        {/* lens — the iris closes while you hold, then fills when koma is on */}
        <circle cx="12" cy="12.9" r="4.3" stroke={stroke} strokeWidth="1.5" fill="none" />
        <circle cx="12" cy="12.9" r={pressing ? 0.9 : 1.9}
                fill={on ? copper : stroke}
                style={{ transition: 'r 0.35s var(--ease-out)' }} />
        {/* flash */}
        <circle cx="18.4" cy="9.4" r="0.85" fill={stroke} />
      </svg>
    </button>
  );
}
