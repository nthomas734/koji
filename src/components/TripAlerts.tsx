'use client';

import { useEffect, useState } from 'react';
import { pushState, subscribe, unsubscribe, type PushState } from '@/lib/push';

// The alerts toggle at the top of the itinerary, for trips that haven't ended.
// Styled as a one-row QuickStrip card.
export function TripAlerts({ slug, title, theme }: { slug: string; title: string; theme: { bg: string; fg: string } }) {
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => { pushState(slug).then(setState).catch(() => setState('unsupported')); }, [slug]);
  if (state == null || state === 'unsupported') return null;

  const on = state === 'on';
  const note =
    msg ||
    (state === 'install' ? 'Add koji to your Home Screen to get alerts on this phone.'
      : state === 'denied' ? 'Notifications are blocked for koji: allow them in Settings.'
      : on ? '30 min before each stop, 15 min before you need to leave, and the plan at 7am.'
      : 'A heads-up before each stop and when it\'s time to leave.');

  const toggle = async () => {
    if (busy || state === 'install' || state === 'denied') return;
    setBusy(true); setMsg('');
    try {
      if (on) { await unsubscribe(slug); setState('off'); }
      else { await subscribe(slug, title); setState('on'); }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    }
    setBusy(false);
  };

  return (
    <div style={{ padding: '12px 12px 0' }}>
      <div style={{
        background: 'var(--surface)',
        border: '0.5px solid var(--border)',
        borderRadius: 14,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 16px',
      }}>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9.5,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: theme.bg,
          flexShrink: 0,
          width: 66,
        }}>
          Alerts
        </span>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-2)', lineHeight: 1.45, flex: 1, minWidth: 0 }}>
          {note}
        </span>
        {(state === 'on' || state === 'off') && (
          <button
            type="button"
            role="switch"
            aria-checked={on}
            aria-label="Trip alerts"
            onClick={toggle}
            disabled={busy}
            style={{
              flexShrink: 0,
              width: 44,
              height: 26,
              borderRadius: 13,
              border: 'none',
              padding: 3,
              background: on ? theme.bg : 'var(--bg-subtle)',
              opacity: busy ? 0.6 : 1,
              transition: 'background 160ms ease',
              cursor: 'pointer',
            }}
          >
            <span style={{
              display: 'block',
              width: 20,
              height: 20,
              borderRadius: 10,
              background: '#fff',
              boxShadow: '0 1px 2px rgba(0,0,0,0.25)',
              transform: `translateX(${on ? 18 : 0}px)`,
              transition: 'transform 160ms ease',
            }} />
          </button>
        )}
      </div>
    </div>
  );
}
