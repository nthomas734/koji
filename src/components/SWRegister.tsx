'use client';

import { useEffect } from 'react';

// Registers the offline service worker (public/sw.js). Renders nothing.
export function SWRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Registration failing (private mode, old browser) just means no offline support
      });
    }
  }, []);
  return null;
}
