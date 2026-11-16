'use client';

import { useEffect, useState } from 'react';

// ── GLOSS TIP ───────────────────────────────────────────────────────────────
// The one-line meaning for a glossary word (lib/glossary.ts). One listener for
// the whole page: tapping a dotted word opens a small dark bubble pointing at
// it, above the word when there's room, else below. Tapping anywhere else,
// scrolling or Escape closes it. Mounted once by TripView on Japan and China trips.

type Tip = { text: string; x: number; y: number; below: boolean; word: string; arrow: number };

const W = 260;

export function GlossTip() {
  const [tip, setTip] = useState<Tip | null>(null);

  useEffect(() => {
    let current: HTMLElement | null = null;
    const close = () => {
      current?.classList.remove('gl-on');
      current = null;
      setTip(null);
    };
    const open = (el: HTMLElement) => {
      if (current === el) { close(); return; }
      current?.classList.remove('gl-on');
      current = el;
      el.classList.add('gl-on');
      const r = el.getBoundingClientRect();
      const below = r.top < 120;
      const x = Math.min(Math.max(r.left + r.width / 2, 12 + W / 2), window.innerWidth - 12 - W / 2);
      // The arrow points at the word even when the bubble is pushed in from an edge.
      const arrow = Math.min(Math.max(r.left + r.width / 2 - (x - W / 2), 16), W - 16);
      setTip({ text: el.dataset.gl ?? '', word: el.textContent ?? '', x, y: below ? r.bottom + 10 : r.top - 10, below, arrow });
    };
    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>('.gl');
      if (el) { e.preventDefault(); e.stopPropagation(); open(el); return; }
      if (current) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { close(); return; }
      const el = (e.target as HTMLElement).closest?.<HTMLElement>('.gl');
      if (el && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); open(el); }
    };
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', close, { passive: true });
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', close);
      window.removeEventListener('resize', close);
    };
  }, []);

  if (!tip) return null;
  return (
    <div role="tooltip" className="gl-tip" style={{
      left: tip.x, top: tip.y, width: W,
      transform: `translate(-50%, ${tip.below ? '0' : '-100%'})`,
      ['--gl-arrow' as string]: `${tip.arrow}px`,
    }} data-below={tip.below ? '' : undefined}>
      <span className="gl-word">{tip.word}</span>
      {tip.text}
    </div>
  );
}
