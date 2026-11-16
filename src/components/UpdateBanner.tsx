'use client';

import { useEffect, useState } from 'react';

// The deploy this JavaScript was built by, inlined at build (next.config.js).
// It travels with the code, not the HTML: a page from the ISR cache or the
// service worker's cache runs the scripts it was built with, and this is
// their id. Empty in local builds, which turns the banner off.
const RUNNING = process.env.KOJI_DEPLOY_ID || '';

const VISIBLE_GAP_MS = 5 * 60 * 1000; // checks on becoming visible: at most every 5 min
const POLL_MS = 10 * 60 * 1000;       // and every 10 min while the page is open
const DISMISSED_KEY = 'koji:update-dismissed';

// Installed iOS PWAs resume without reloading, so a Vercel deploy is invisible
// until the app is force-quit. This asks /api/version (never cached, never
// touched by the service worker) which deploy is live, and offers the reload
// when it isn't the one running. Once per deploy: a dismissed deploy stays
// quiet until a different one goes live.
export function UpdateBanner() {
  const [live, setLive] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!RUNNING) return;
    let lastChecked = 0;

    async function check() {
      const now = Date.now();
      if (now - lastChecked < VISIBLE_GAP_MS) return;
      lastChecked = now;
      try {
        const res = await fetch('/api/version', { cache: 'no-store' });
        if (!res.ok) return;
        const { id } = (await res.json()) as { id?: string | null };
        if (!id || id === RUNNING) return;
        let dismissed: string | null = null;
        try { dismissed = localStorage.getItem(DISMISSED_KEY); } catch {}
        if (id !== dismissed) setLive(id);
      } catch {
        // Offline or a network error: say nothing
      }
    }

    function onVisible() {
      if (document.visibilityState === 'visible') check();
    }

    check();
    document.addEventListener('visibilitychange', onVisible);
    const timer = setInterval(onVisible, POLL_MS);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      clearInterval(timer);
    };
  }, []);

  if (!live) return null;

  // Navigations with a cached copy fall back to it after 3 s (public/sw.js),
  // so a plain reload on a slow link could show the old page again. Ask the
  // worker to store a fresh copy first, then reload. Capped at 20 s, after
  // which the reload goes ahead regardless.
  async function update() {
    setBusy(true);
    const sw = navigator.serviceWorker?.controller;
    if (sw) {
      await new Promise<void>((resolve) => {
        const done = () => { clearTimeout(cap); navigator.serviceWorker.removeEventListener('message', onMsg); resolve(); };
        const onMsg = (e: MessageEvent) => { if (e.data?.type === 'koji:page-refreshed') done(); };
        const cap = setTimeout(done, 20000);
        navigator.serviceWorker.addEventListener('message', onMsg);
        sw.postMessage({ type: 'koji:refresh-page', url: window.location.href });
      });
    }
    window.location.reload();
  }

  function dismiss() {
    try { localStorage.setItem(DISMISSED_KEY, live!); } catch {}
    setLive(null);
  }

  return (
    // Fixed over the foot of the page, above the home indicator: it holds no
    // space, pushes nothing, and stays clear of the sticky day headers and the
    // owner switch at the top. z 40 keeps it under every sheet (50 and up).
    <div role="status" style={{
      position: 'fixed',
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 40,
      background: 'var(--surface)',
      borderTop: '1px solid var(--border-mid)',
      borderLeft: '3px solid var(--brass)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '9px 14px calc(9px + env(safe-area-inset-bottom, 0px)) 11px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--brass)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 19V5M5 12l7-7 7 7"/>
        </svg>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--ink-2)',
          fontWeight: 600,
        }}>
          Update available
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button
          onClick={update}
          disabled={busy}
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            fontWeight: 700,
            background: 'var(--ink)',
            color: 'var(--surface)',
            border: 'none',
            borderRadius: 5,
            padding: '5px 12px',
            cursor: 'pointer',
            opacity: busy ? 0.6 : 1,
          }}
        >
          Reload
        </button>
        <button
          onClick={dismiss}
          aria-label="Not now"
          style={{
            all: 'unset',
            cursor: 'pointer',
            fontFamily: 'var(--font-mono)',
            fontSize: 15,
            lineHeight: 1,
            color: 'var(--ink-3)',
            padding: '4px 6px',
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}
