'use client';

import { useEffect, useState } from 'react';

const CHECK_INTERVAL_MS = 5 * 60 * 1000; // throttle: once per 5 min max

// Installed iOS PWAs resume without reloading, so a Vercel deploy is invisible
// until the app is force-quit. This polls the x-vercel-deployment-id header on
// visibilitychange and offers a one-tap reload when a new deploy has landed.
export function UpdateBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let deploymentId: string | null = null;
    let lastChecked = 0;

    async function check() {
      const now = Date.now();
      if (now - lastChecked < CHECK_INTERVAL_MS) return;
      lastChecked = now;

      try {
        const res = await fetch('/', { method: 'HEAD', cache: 'no-store' });
        const id = res.headers.get('x-vercel-deployment-id');
        if (!id) return;
        if (deploymentId === null) {
          // First check — store baseline, no banner
          deploymentId = id;
        } else if (id !== deploymentId) {
          setShow(true);
        }
      } catch {
        // Network error — silently ignore
      }
    }

    function onVisible() {
      if (document.visibilityState === 'visible') check();
    }

    check();
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  if (!show) return null;

  return (
    <div style={{
      position: 'sticky',
      top: 0,
      zIndex: 200,
      background: 'var(--surface)',
      borderBottom: '1px solid var(--border-mid)',
      borderLeft: '3px solid var(--brass)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '9px 14px 9px 11px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--brass)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 19V5M5 12l7-7 7 7"/>
        </svg>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--ink-2)',
          fontWeight: 600,
        }}>
          Update available
        </span>
      </div>
      <button
        onClick={() => window.location.reload()}
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          fontWeight: 700,
          background: 'var(--ink)',
          color: 'var(--surface)',
          border: 'none',
          borderRadius: 5,
          padding: '5px 12px',
          cursor: 'pointer',
        }}
      >
        Reload
      </button>
    </div>
  );
}
