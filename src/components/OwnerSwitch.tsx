'use client';

// ─────────────────────────────────────────────────────────────────────────────
// OwnerSwitch — the one way into koji's owner views from a trip page.
//
// A single pill in the site header names the current mode ("Plan ▾"); tapping
// it raises a sheet with the three modes for this trip (Plan / Shoot /
// Verdicts) and the owner pages (Bookings, Edit this trip, Admin, Rolls, All
// trips). Rendered only when useVerdicts says `owner`, so a logged-out visitor
// never sees it. Plan is exactly what Dez sees: verdict circles appear only in
// Verdicts mode.
//
// This replaced (2026-11-10) the hidden long-press on KomaMark, the gear icon
// every visitor could see, and having to type /admin. A logged-out phone still
// reaches koma by link (/trips/<slug>#koma), which keeps "hidden, not locked".
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { TripPart } from '@/lib/supabase';

export type OwnerMode = 'plan' | 'shoot' | 'verdicts';

const MODES: { key: OwnerMode; label: string; sub: string }[] = [
  { key: 'plan', label: 'Plan', sub: 'The itinerary, exactly as Dez sees it' },
  { key: 'shoot', label: 'Shoot', sub: 'koma: frames and areas near you' },
  { key: 'verdicts', label: 'Verdicts', sub: 'Go back, fine once or skip, on every stop' },
];

const COPPER = '#B83C01';

function Glyph({ mode, color }: { mode: OwnerMode; color: string }) {
  const p = { fill: 'none', stroke: color, strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (mode === 'plan') return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden><path {...p} d="M4 6h16M4 12h16M4 18h10" /></svg>
  );
  if (mode === 'shoot') return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden>
      <path {...p} d="M8.8 6.2 L9.7 4.4 H14.3 L15.2 6.2" />
      <rect {...p} x="2.4" y="6.2" width="19.2" height="13.4" rx="3.2" />
      <circle {...p} cx="12" cy="12.9" r="4.3" />
    </svg>
  );
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden>
      <circle {...p} cx="12" cy="12" r="8" />
      <path d="M12 4a8 8 0 0 1 0 16z" fill={color} />
    </svg>
  );
}

function shortRange(from: string, to: string): string {
  const f = (iso: string, withMonth: boolean) =>
    new Date(iso + 'T00:00').toLocaleDateString('en-US', withMonth ? { month: 'short', day: 'numeric' } : { day: 'numeric' });
  return `${f(from, true)}–${f(to, from.slice(0, 7) !== to.slice(0, 7))}`;
}

export function OwnerSwitch({ mode, onMode, tripId, hasShots, slug, parts = [] }: {
  mode: OwnerMode;
  onMode: (m: OwnerMode) => void;
  tripId: number;
  hasShots: boolean;
  slug: string;
  parts?: TripPart[];
}) {
  const [open, setOpen] = useState(false);
  const [shared, setShared] = useState<string | null>(null);

  // Share a link to the whole trip or one part. The phone's share sheet when
  // there is one (straight into Messages), otherwise the clipboard.
  async function share(path: string, title: string) {
    const url = window.location.origin + path;
    try {
      if (navigator.share) { await navigator.share({ title, url }); return; }
      await navigator.clipboard.writeText(url);
      setShared(path);
      setTimeout(() => setShared(s => (s === path ? null : s)), 1800);
    } catch { /* dismissed the share sheet, or no clipboard: nothing to do */ }
  }
  const [openCount, setOpenCount] = useState<number | null>(null);

  // Ask how many booking windows are open when the sheet comes up. Offline or
  // not signed in on this request: just no badge.
  useEffect(() => {
    if (!open) return;
    let gone = false;
    fetch('/api/admin/bookings', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then(j => { if (!gone && j && typeof j.open === 'number') setOpenCount(j.open); })
      .catch(() => {});
    return () => { gone = true; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [open]);

  const label = MODES.find(m => m.key === mode)!.label;
  const shoot = mode === 'shoot';
  const modes = MODES.filter(m => m.key !== 'shoot' || hasShots);

  return (
    <>
      <button
        type="button"
        className={`owner-pill pressable${shoot ? ' cu' : ''}`}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Glyph mode={mode} color="currentColor" />
        <span>{label}</span>
        <svg width="9" height="9" viewBox="0 0 24 24" aria-hidden style={{ opacity: 0.6 }}>
          <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && typeof document !== 'undefined' && createPortal(
        <div className="owner-layer" role="dialog" aria-label="Owner views" aria-modal="true">
          <div className="owner-scrim" onClick={() => setOpen(false)} />
          <div className="owner-sheet">
            <div className="owner-grab" />
            <div className="owner-lbl">This trip</div>
            <div className="seg-track" role="tablist" aria-label="Mode">
              {modes.map(m => {
                const on = m.key === mode;
                return (
                  <button
                    key={m.key}
                    type="button"
                    role="tab"
                    aria-selected={on}
                    className={`seg-btn pressable${on ? ' on' : ''}${m.key === 'shoot' ? ' cu' : ''}`}
                    onClick={() => { onMode(m.key); setOpen(false); }}
                  >
                    <Glyph mode={m.key} color={on ? 'var(--bg)' : m.key === 'shoot' ? COPPER : 'var(--ink-3)'} />
                    {m.label}
                  </button>
                );
              })}
            </div>
            <div className="owner-mode-note">{MODES.find(m => m.key === mode)!.sub}</div>
            {parts.length > 0 && (
              <>
                <div className="owner-lbl">Share</div>
                {[{ path: `/trips/${slug}`, label: 'Whole trip', sub: null as string | null }, ...parts.map(p => ({ path: `/trips/${slug}/${p.key}`, label: p.label, sub: shortRange(p.from, p.to) }))].map(r => (
                  <button key={r.path} type="button" className="owner-link pressable" onClick={() => share(r.path, r.label)}
                    style={{ all: 'unset', boxSizing: 'border-box', width: '100%', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: 46, padding: '0 4px', borderBottom: '1px solid var(--border)', fontSize: 14.5, color: 'var(--ink)' }}>
                    <span style={{ color: 'var(--ink)' }}>{r.label}{r.sub && <span style={{ color: 'var(--ink-4)', fontFamily: 'var(--font-mono)', fontSize: 10, marginLeft: 8 }}>{r.sub}</span>}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--brass)' }}>
                      {shared === r.path ? 'copied' : 'share link'}
                    </span>
                  </button>
                ))}
              </>
            )}
            <div className="owner-lbl">Owner</div>
            <a className="owner-link" href="/admin/bookings">
              Bookings
              <span>{openCount ? <em className="owner-badge">{openCount} open</em> : null} ›</span>
            </a>
            <a className="owner-link" href={`/admin/trips/${tripId}`}>Edit this trip <span>›</span></a>
            <a className="owner-link" href="/admin">Admin <span>›</span></a>
            <a className="owner-link" href="/koma">Rolls <span>›</span></a>
            <a className="owner-link" href="/">All trips <span>›</span></a>
          </div>
        </div>,
        // On <body>, not inside the header: a fixed layer under an ancestor
        // with a transform or filter is positioned against that ancestor.
        document.body,
      )}
    </>
  );
}
