'use client';

// Save a trip onto this phone before it starts (2026-11-21).
//
// The service worker already keeps a copy of any page this phone has opened,
// but only of pages it happened to open, and nothing said whether it had. So:
// while a trip is within SAVE_DAYS of starting, or under way, opening it asks
// the worker to store the trip page, its part page if any, and the home page,
// with the scripts each one names (sw.js `koji:save-trip`). When every page
// stored, the time goes in localStorage and the trip's footer says "Saved on
// this phone". Offline, the Now card and the footer say which copy you're on.
// At most once every SAVE_EVERY_MS per page, and never without a worker.

import { useEffect, useSyncExternalStore } from 'react';

export const SAVE_DAYS = 14;
const SAVE_EVERY_MS = 6 * 60 * 60 * 1000;
const KEY = 'koji:saved:';
const EVENT = 'koji:saved';

function keyFor(path: string) { return KEY + path.replace(/\/+$/, ''); }

function readSaved(): string | null {
  try { return localStorage.getItem(keyFor(window.location.pathname)); } catch { return null; }
}

/** Ask the worker to store these pages; resolves true when all of them stored. */
function askWorker(urls: string[]): Promise<boolean> {
  return new Promise(resolve => {
    const sw = navigator.serviceWorker?.controller;
    if (!sw) return resolve(false);
    const ch = new MessageChannel();
    const timer = setTimeout(() => resolve(false), 60_000);
    ch.port1.onmessage = (e) => { clearTimeout(timer); resolve(!!e.data?.ok); };
    sw.postMessage({ type: 'koji:save-trip', urls }, [ch.port2]);
  });
}

/** Runs once per trip page open while `on` (the trip is close or under way). */
export function useSaveTrip(on: boolean, urls: string[]) {
  const list = urls.join('|');
  useEffect(() => {
    if (!on || typeof window === 'undefined' || !navigator.onLine) return;
    const last = readSaved();
    if (last && Date.now() - Date.parse(last) < SAVE_EVERY_MS) return;
    let cancelled = false;
    // After the page has settled, so it never competes with the first paint.
    const id = setTimeout(async () => {
      const ok = await askWorker([...new Set(list.split('|'))]);
      if (!ok || cancelled) return;
      try { localStorage.setItem(keyFor(window.location.pathname), new Date().toISOString()); } catch { /* private mode */ }
      window.dispatchEvent(new Event(EVENT));
    }, 4000);
    return () => { cancelled = true; clearTimeout(id); };
  }, [on, list]);
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener('online', cb);
  window.addEventListener('offline', cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener('online', cb);
    window.removeEventListener('offline', cb);
  };
}

/** Whether the phone is online, and when this page was last saved here. */
export function useSavedCopy(): { online: boolean; savedAt: string | null } {
  const online = useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
  const savedAt = useSyncExternalStore(subscribe, readSaved, () => null);
  return { online, savedAt };
}

/** "Mon Feb 8, 9:14pm" in the phone's own zone */
export function fmtSaved(iso: string): string {
  const d = new Date(iso);
  const day = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const t = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).replace(' ', '').toLowerCase();
  return `${day}, ${t}`;
}
