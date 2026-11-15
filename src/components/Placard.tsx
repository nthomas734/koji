'use client';

import { useEffect } from 'react';
import { CINNABAR } from '@/lib/dress';

// ── PLACARD ─────────────────────────────────────────────────────────────────
// The full-screen card you hold up to someone: the driver card (Tonight.tsx)
// and the phrase card (SayIt.tsx) share it, so they read as one family.
// Parchment on ink, a double hairline frame inset from the screen edge, a
// mono eyebrow at the top left and a small cinnabar seal at the top right,
// like the chop stamped on a shop's receipt. Tap anywhere to close; buttons
// inside stop the tap themselves.

export const INK = '#1E1B17';
export const PARCHMENT = '#F3EEE4';

const ruleSoft = 'rgba(243, 238, 228, 0.22)';

export function Placard({ label, seal, sealLang, sealFont, onClose, children, footer }: {
  label: string;
  /** One character for the seal (話, 車). */
  seal: string;
  sealLang: string;
  sealFont: string;
  onClose: () => void;
  children: React.ReactNode;
  /** Replaces the "Tap anywhere to close" line, e.g. with buttons. */
  footer?: React.ReactNode;
}) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);
  return (
    <div role="dialog" aria-label={label} onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 1000, background: INK, color: PARCHMENT,
      padding: 'calc(env(safe-area-inset-top, 0px) + 14px) 14px calc(env(safe-area-inset-bottom, 0px) + 14px)',
      display: 'flex', animation: 'placard-in 0.22s cubic-bezier(.2,.8,.2,1)',
    }}>
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflowY: 'auto',
        borderRadius: 20, border: `1px solid ${ruleSoft}`,
        // A second, fainter rule just inside the first: the frame of a printed card.
        boxShadow: `inset 0 0 0 5px ${INK}, inset 0 0 0 6px rgba(243, 238, 228, 0.08)`,
        padding: '18px 22px 20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            flex: 1, minWidth: 0, fontFamily: 'var(--font-mono)', fontSize: 11.5, letterSpacing: '0.16em',
            textTransform: 'uppercase', opacity: 0.6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{label}</div>
          <span aria-hidden lang={sealLang} style={{
            width: 34, height: 34, flexShrink: 0, display: 'grid', placeItems: 'center',
            background: CINNABAR, color: PARCHMENT, borderRadius: 6, transform: 'rotate(-4deg)',
            fontFamily: sealFont, fontWeight: 700, fontSize: 20, lineHeight: 1,
            boxShadow: `inset 0 0 0 2px ${CINNABAR}, inset 0 0 0 3px rgba(243, 238, 228, 0.55)`,
          }}>{seal}</span>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 20, padding: '24px 0' }}>
          {children}
        </div>
        {footer}
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase',
          opacity: 0.45, textAlign: 'center', marginTop: footer ? 16 : 0,
        }}>Tap anywhere to close</div>
      </div>
    </div>
  );
}

/** A dotted rule between the parts of a placard. */
export function PlacardRule() {
  return <div aria-hidden style={{ borderTop: `1.5px dotted ${ruleSoft}`, margin: '2px 0' }} />;
}

/** A pill button on a placard; never closes the card. */
export function PlacardButton({ onClick, children, primary = false, pressed }: {
  onClick: () => void; children: React.ReactNode; primary?: boolean; pressed?: boolean;
}) {
  return (
    <button type="button" aria-pressed={pressed} onClick={e => { e.stopPropagation(); onClick(); }} style={{
      flex: 1, minHeight: 48, borderRadius: 999, cursor: 'pointer', fontFamily: 'var(--font-sans)',
      fontSize: 15, fontWeight: 600, letterSpacing: '0.01em', WebkitTapHighlightColor: 'transparent',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      color: primary ? INK : PARCHMENT,
      background: primary ? PARCHMENT : 'transparent',
      border: `1px solid ${primary ? PARCHMENT : 'rgba(243, 238, 228, 0.35)'}`,
    }}>{children}</button>
  );
}
