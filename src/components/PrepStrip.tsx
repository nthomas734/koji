'use client';

import { renderMd } from '@/lib/markdown';
import type { Prep } from '@/lib/stopPrep';

// The owner's "before you go" note on a stop card, in Plan mode only. Amber
// so it reads as a to-do, not as part of the plan; ticked notes go quiet.
const AMBER = '#B7791F';

export function PrepStrip({ prep, onToggle }: { prep: Prep; onToggle: () => void }) {
  const done = !!prep.done_at;
  return (
    <div style={{
      display: 'flex', gap: 10, alignItems: 'flex-start', marginTop: 10, padding: '8px 10px',
      borderRadius: 10, background: done ? 'transparent' : `color-mix(in srgb, ${AMBER} 12%, var(--surface))`,
      border: `1px ${done ? 'dashed' : 'solid'} color-mix(in srgb, ${AMBER} ${done ? 25 : 40}%, transparent)`,
    }}>
      <button
        type="button"
        role="checkbox"
        aria-checked={done}
        aria-label={done ? 'Mark not done' : 'Mark done'}
        onClick={onToggle}
        style={{
          flexShrink: 0, width: 22, height: 22, marginTop: 1, borderRadius: 6, cursor: 'pointer',
          border: `1.5px solid ${AMBER}`, background: done ? AMBER : 'transparent', color: '#fff',
          fontSize: 13, lineHeight: '19px', padding: 0,
        }}
      >
        {done ? '✓' : ''}
      </button>
      <div style={{ minWidth: 0, opacity: done ? 0.55 : 1 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: AMBER }}>
          Before you go · only you see this
        </div>
        <div className="body-content" style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--ink-2)', textDecoration: done ? 'line-through' : 'none' }}
          dangerouslySetInnerHTML={{ __html: renderMd(prep.prep_md) }} />
      </div>
    </div>
  );
}
