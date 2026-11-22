'use client';

import type { Stop } from '@/lib/supabase';
import { renderMd } from '@/lib/markdown';
import { fmtCountdown } from '@/lib/now';
import { fmtClock, leaveBy } from '@/lib/tripAlerts';
import { useSavedCopy, fmtSaved } from '@/lib/saveTrip';
import { WhoChip } from './WhoChip';

// Top of today: the next timed stop, how long until it, and what to do about it
// (the stop's lock-screen alert text when it has one). Ink on the parchment page
// (chosen 2026-11-21 over the brass tint, which read brown): the one dark thing
// below the header, so the eye lands on it, and it reads in bright sun.
// Buttons: Directions (the stop's own Maps link) and Ticket (scrolls to the
// journey ticket). The title taps through to the stop card.
export function NowCard({ stop, minutes, nowMin, dirHref, ticket }: {
  stop: Stop; minutes: number; nowMin: number; dirHref: string | null; ticket: boolean;
}) {
  const note = stop.alert_md ? renderMd(stop.alert_md) : '';
  const leave = leaveBy(stop);
  const showLeave = leave != null && leave >= nowMin;
  const { online, savedAt } = useSavedCopy();
  const pill = (primary: boolean): React.CSSProperties => ({
    display: 'inline-block', fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.06em',
    padding: '6px 12px', borderRadius: 999, textDecoration: 'none', lineHeight: 1.2,
    border: `1px solid ${primary ? 'var(--bg)' : 'rgba(245,240,232,.35)'}`,
    background: primary ? 'var(--bg)' : 'transparent',
    color: primary ? 'var(--ink)' : 'var(--bg)',
  });
  return (
    <div className="now-ink" style={{
      marginTop: 10, padding: '12px 14px', borderRadius: 14,
      background: 'var(--ink)', color: 'var(--bg)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(245,240,232,.62)' }}>
        <span style={{ flex: 1 }}>Next · <span style={{ color: 'var(--bg)' }}>{fmtCountdown(minutes)}</span></span>
        <WhoChip who={stop.who} color="rgba(245,240,232,.62)" />
      </div>
      <a href={`#stop-${stop.id}`} className="tap" style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 6, color: 'inherit', textDecoration: 'none' }}>
        <span className="num" style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 600 }}>{stop.time_label}</span>
        <span style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.3 }}>{stop.title}</span>
      </a>
      {showLeave && (
        <div className="num" style={{ marginTop: 3, fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, letterSpacing: '0.04em', color: '#F0997B' }}>
          Leave by {fmtClock(leave!)}
        </div>
      )}
      {note && (
        <div className="body-content" style={{ marginTop: 4, fontSize: 14, lineHeight: 1.5, color: 'rgba(245,240,232,.8)' }}
          dangerouslySetInnerHTML={{ __html: note }} />
      )}
      {(dirHref || ticket) && (
        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          {dirHref && <a href={dirHref} target="_blank" rel="noopener noreferrer" className="tap" style={pill(true)}>Directions ↗</a>}
          {ticket && <a href={`#stop-${stop.id}`} className="tap" style={pill(!dirHref)}>Ticket</a>}
        </div>
      )}
      {!online && (
        <div style={{ marginTop: 10, fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.08em', color: 'rgba(245,240,232,.55)' }}>
          {savedAt ? `Offline · saved ${fmtSaved(savedAt)}` : 'Offline'}
        </div>
      )}
    </div>
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
