'use client';

import type { Stop } from '@/lib/supabase';
import { renderMd } from '@/lib/markdown';
import { fmtCountdown } from '@/lib/now';
import { fmtClock } from '@/lib/tripAlerts';
import { WhoChip } from './WhoChip';

// Top of today: the next timed stop, how long until it, and what to do about it
// (the stop's lock-screen alert text when it has one). Taps through to the card.
export function NowCard({ stop, minutes, accent }: { stop: Stop; minutes: number; accent: string }) {
  const note = stop.alert_md ? renderMd(stop.alert_md) : '';
  return (
    <a href={`#stop-${stop.id}`} className="tap" style={{
      display: 'block', marginTop: 10, padding: '12px 14px', borderRadius: 14,
      background: `color-mix(in srgb, ${accent} 14%, var(--surface))`,
      border: `1px solid color-mix(in srgb, ${accent} 45%, transparent)`,
      color: 'var(--ink)', textDecoration: 'none',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: `color-mix(in srgb, ${accent} 70%, var(--ink))` }}>
        <span style={{ flex: 1 }}>Next · {fmtCountdown(minutes)}</span>
        <WhoChip who={stop.who} />
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 6 }}>
        <span className="num" style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 600 }}>{stop.time_label}</span>
        <span style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.3 }}>{stop.title}</span>
      </div>
      {note && (
        <div className="body-content" style={{ marginTop: 4, fontSize: 14, lineHeight: 1.5, color: 'var(--ink-2)' }}
          dangerouslySetInnerHTML={{ __html: note }} />
      )}
    </a>
  );
}

/** A hairline across the timeline where "now" falls, before the next stop. */
export function NowRule({ nowMin, accent }: { nowMin: number; accent: string }) {
  return (
    <div aria-label="Now" style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '10px 0 2px', color: accent }}>
      <span style={{ width: 7, height: 7, borderRadius: 99, background: accent }} />
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' }}>now · {fmtClock(nowMin)}</span>
      <span style={{ flex: 1, borderTop: `1.5px solid ${accent}` }} />
    </div>
  );
}
