'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Roll, Shot } from '@/lib/supabase';
import { KomaRollView } from '@/components/KomaView';
import { KomaMark } from '@/components/KomaMark';

export function RollView({ roll, shots: initial }: { roll: Roll; shots: Shot[] }) {
  const [shots, setShots] = useState<Shot[]>(initial);
  const [sunMode, setSunMode] = useState(false);

  useEffect(() => { setShots(initial); }, [initial]);

  useEffect(() => {
    try { if (localStorage.getItem('koma:sun') === '1') setSunMode(true); } catch { /* private mode */ }
  }, []);

  const toggleSun = useCallback(() => {
    setSunMode(v => {
      const next = !v;
      try { localStorage.setItem('koma:sun', next ? '1' : '0'); } catch { /* private mode */ }
      return next;
    });
  }, []);

  const applyShot = useCallback((next: Shot) => {
    setShots(cur => cur.map(s => (s.id === next.id ? next : s)));
  }, []);

  return (
    <div style={{ maxWidth: 'var(--max-w)', margin: '0 auto', padding: '0 0 calc(env(safe-area-inset-bottom, 0px) + 40px)' }}>
      <header style={{
        padding: 'calc(env(safe-area-inset-top, 0px) + 12px) var(--px) 8px',
        borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center',
      }}>
        <a href="/koma" className="tap" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 44,
          fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.22em',
          textTransform: 'uppercase', color: '#B83C01',
        }}>
          ← rolls
        </a>
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 2, alignItems: 'center' }}>
          <button
            type="button" onClick={toggleSun}
            aria-label="Sun mode" aria-pressed={sunMode}
            style={{
              width: 30, height: 30, borderRadius: 8, cursor: 'pointer', lineHeight: 1,
              border: `1px solid ${sunMode ? '#B83C01' : 'var(--border-mid)'}`,
              background: sunMode ? '#B83C01' : 'transparent',
              color: sunMode ? '#FBE7D4' : 'var(--ink-3)', fontSize: 14,
            }}
          >☀</button>
          <KomaMark on onToggle={() => { window.location.href = '/koma'; }} />
        </span>
      </header>

      <KomaRollView roll={roll} shots={shots} sunMode={sunMode} onShotChange={applyShot} />
    </div>
  );
}
