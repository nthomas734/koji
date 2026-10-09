'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { DinnerOption, DinnerVote, Stop } from '@/lib/supabase';

// ── DINNER VOTES ────────────────────────────────────────────────────────────
// A dinner stop with options shows them as cards the family votes on. No
// logins: the first vote asks for a name from the trip's `voters`, and the
// phone remembers it. Votes are fetched live from /api/votes (never cached);
// the options themselves arrive with the prerendered page.

const SKY = { bg: '#85B7EB', text: '#042C53', bar: '#378ADD' };
const GREEN = { bg: '#97C459', text: '#173404', soft: '#EEF4E6', line: '#C9DCAF' };
const VOTER_COLORS = ['#B8944E', '#3A5A7A', '#7A4A6A', '#4A6A3A', '#A0583A', '#5A5A8A', '#3A7A7A'];
const POLL_MS = 30_000;

type Ctx = {
  voters: string[];
  voter: string | null;
  votes: DinnerVote[];
  cast: (stopId: number, optionId: number | null) => void;
  askName: () => void;
  error: string | null;
};
const DinnerCtx = createContext<Ctx | null>(null);

function storageKey(tripId: number) { return `koji:voter:${tripId}`; }

/** Initials, two letters where a first letter is shared (Mom and Marshall). */
function initialsFor(voters: string[]) {
  const map: Record<string, string> = {};
  for (const v of voters) {
    const clash = voters.some(o => o !== v && o[0]?.toUpperCase() === v[0]?.toUpperCase());
    map[v] = clash ? v.slice(0, 2) : v.slice(0, 1).toUpperCase();
  }
  return map;
}

export function DinnerVoteProvider({ tripId, voters, enabled, children }: {
  tripId: number;
  voters: string[];
  enabled: boolean;
  children: React.ReactNode;
}) {
  const [voter, setVoter] = useState<string | null>(null);
  const [votes, setVotes] = useState<DinnerVote[]>([]);
  const [sheet, setSheet] = useState<{ open: boolean; then?: (name: string) => void }>({ open: false });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey(tripId));
      if (saved && voters.includes(saved)) setVoter(saved);
    } catch { /* private mode */ }
  }, [tripId, voters]);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/votes?trip=${tripId}`, { cache: 'no-store' });
      if (r.ok) setVotes((await r.json()).votes ?? []);
    } catch { /* offline: keep what we have */ }
  }, [tripId]);

  useEffect(() => {
    if (!enabled) return;
    load();
    const tick = () => { if (document.visibilityState === 'visible') load(); };
    const t = setInterval(tick, POLL_MS);
    document.addEventListener('visibilitychange', tick);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', tick); };
  }, [enabled, load]);

  const send = useCallback(async (name: string, stopId: number, optionId: number | null) => {
    setError(null);
    const before = votes;
    // Optimistic: one vote per person per dinner
    setVotes(v => {
      const rest = v.filter(x => !(x.stop_id === stopId && x.voter === name));
      return optionId === null ? rest : [...rest, { stop_id: stopId, option_id: optionId, voter: name }];
    });
    try {
      const r = await fetch('/api/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stopId, optionId, voter: name }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || 'That vote did not save.');
      setVotes(j.votes ?? []);
    } catch (e) {
      setVotes(before);
      setError(navigator.onLine === false
        ? 'No connection, so that vote did not save. Try again when you are back online.'
        : `That vote did not save: ${(e as Error).message}`);
    }
  }, [votes]);

  const choose = useCallback((name: string) => {
    setVoter(name);
    try { localStorage.setItem(storageKey(tripId), name); } catch { /* private mode */ }
    const then = sheet.then;
    setSheet({ open: false });
    then?.(name);
  }, [tripId, sheet]);

  const cast = useCallback((stopId: number, optionId: number | null) => {
    if (!voter) { setSheet({ open: true, then: name => send(name, stopId, optionId) }); return; }
    send(voter, stopId, optionId);
  }, [voter, send]);

  const value = useMemo<Ctx>(() => ({
    voters, voter, votes, cast, error,
    askName: () => setSheet({ open: true }),
  }), [voters, voter, votes, cast, error]);

  return (
    <DinnerCtx.Provider value={value}>
      {children}
      {sheet.open && <NameSheet voters={voters} current={voter} onPick={choose} onClose={() => setSheet({ open: false })} />}
    </DinnerCtx.Provider>
  );
}

function NameSheet({ voters, current, onPick, onClose }: {
  voters: string[]; current: string | null; onPick: (n: string) => void; onClose: () => void;
}) {
  const init = initialsFor(voters);
  return (
    <div role="dialog" aria-modal="true" aria-label="Who's voting?" onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(28,26,22,0.32)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--surface)', width: '100%', maxWidth: 520, borderRadius: '20px 20px 0 0',
        padding: '14px 16px calc(22px + env(safe-area-inset-bottom, 0px))',
        display: 'flex', flexDirection: 'column', gap: 12, borderTop: '0.5px solid var(--border)',
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border-mid)', margin: '0 auto 2px' }} />
        <h4 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 20, lineHeight: 1.15, color: 'var(--ink)' }}>Who&rsquo;s voting?</h4>
        <p style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.5 }}>Pick your name once. This phone remembers it, and your votes show your initials.</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {voters.map((v, i) => (
            <button key={v} type="button" onClick={() => onPick(v)} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 12,
              border: v === current ? `1.5px solid ${SKY.bar}` : '0.5px solid var(--border-mid)',
              background: 'var(--bg)', fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600, color: 'var(--ink)',
              cursor: 'pointer', textAlign: 'left',
            }}>
              <Avatar label={init[v]} color={VOTER_COLORS[i % VOTER_COLORS.length]} size={26} />
              {v}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Avatar({ label, color, size = 20, ring }: { label: string; color: string; size?: number; ring?: boolean }) {
  return (
    <span style={{
      width: size, height: size, borderRadius: '50%', background: color, color: '#FDFAF5',
      display: 'inline-grid', placeItems: 'center', flexShrink: 0,
      fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: size * 0.42, lineHeight: 1,
      border: ring ? '1.5px solid var(--bg)' : undefined,
    }}>{label}</span>
  );
}

function mapsUrl(q: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q).replace(/%20/g, '+')}`;
}

const btn: React.CSSProperties = {
  fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 12, lineHeight: 1, padding: '7px 10px',
  borderRadius: 8, border: '0.5px solid var(--border-mid)', background: 'var(--surface)', color: 'var(--ink-2)',
  textDecoration: 'none', whiteSpace: 'nowrap', cursor: 'pointer',
};
const pill = (bg: string, fg: string): React.CSSProperties => ({
  fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase',
  padding: '3px 7px', borderRadius: 999, background: bg, color: fg, whiteSpace: 'nowrap',
});

function OptionCard({ o, voters, mine, leading, closed, onVote }: {
  o: DinnerOption;
  voters: { name: string; label: string; color: string }[];
  mine: boolean;
  leading: boolean;
  closed: boolean;
  onVote?: () => void;
}) {
  return (
    <div style={{
      border: mine ? `1.5px solid ${SKY.bar}` : '0.5px solid var(--border-mid)',
      background: mine ? '#F3F6F9' : 'var(--bg)',
      borderRadius: 12, padding: mine ? '10px 11px' : '11px 12px',
      display: 'flex', flexDirection: 'column', gap: 5,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
        <b style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--ink)' }}>{o.name}</b>
        {o.price && <span className="num" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--brass)' }}>{o.price}</span>}
        {o.status === 'held' && <span style={pill('#F0997B', '#4A1B0C')}>Held</span>}
        {leading && <span style={{ ...pill(GREEN.bg, GREEN.text), marginLeft: 'auto' }}>Leading</span>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', fontSize: 12, color: 'var(--ink-3)' }}>
        {o.kind && <span>{o.kind}</span>}
        <span style={{
          ...pill(o.walk_in ? '#E3EED6' : '#F7DCD5', o.walk_in ? GREEN.text : '#7A2414'),
          borderRadius: 4, fontSize: 8.5,
        }}>{o.walk_in ? 'Walk-in' : 'Book ahead'}</span>
      </div>
      {o.status === 'held' && o.booked_detail && <div style={{ fontSize: 12, color: '#4A1B0C' }}>{o.booked_detail}</div>}
      {o.draw && <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>{o.draw}</p>}
      {o.order_md && <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}><span style={{ color: 'var(--ink-3)', fontWeight: 600 }}>Order: </span>{o.order_md}</p>}
      {o.note && <p style={{ fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.45 }}>{o.note}</p>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
        {!closed && onVote && (
          <button type="button" onClick={onVote} aria-pressed={mine} style={mine
            ? { ...btn, color: SKY.text, border: `1.5px solid ${SKY.bar}` }
            : { ...btn, background: SKY.text, color: 'var(--surface)', borderColor: SKY.text }}>
            {mine ? '✓ Your vote' : 'Vote'}
          </button>
        )}
        {o.booking_url
          ? <a href={o.booking_url} target="_blank" rel="noopener" style={btn}>Book</a>
          : o.phone ? <a href={`tel:${o.phone.replace(/[^\d+]/g, '').replace(/^0/, '+44')}`} style={btn}>Call {o.phone}</a> : null}
        <a href={mapsUrl(o.maps_query)} target="_blank" rel="noopener" style={btn}>Map</a>
        {voters.length > 0 && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
            <span style={{ display: 'inline-flex' }}>
              {voters.map((v, i) => (
                <span key={v.name} title={v.name} style={{ marginLeft: i ? -5 : 0 }}>
                  <Avatar label={v.label} color={v.color} ring />
                </span>
              ))}
            </span>
            <span className="num" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>{voters.length}</span>
          </span>
        )}
      </div>
    </div>
  );
}

export function DinnerOptions({ stop }: { stop: Stop }) {
  const ctx = useContext(DinnerCtx);
  const [showMore, setShowMore] = useState(false);
  const options = stop.options ?? [];
  if (!ctx || !options.length) return null;
  const { voters, voter, votes, cast, askName, error } = ctx;

  const init = initialsFor(voters);
  const colorOf = (n: string) => VOTER_COLORS[Math.max(0, voters.indexOf(n)) % VOTER_COLORS.length];
  const stopVotes = votes.filter(v => v.stop_id === stop.id && voters.includes(v.voter));
  const votersFor = (o: DinnerOption) => stopVotes.filter(v => v.option_id === o.id)
    .map(v => ({ name: v.voter, label: init[v.voter] ?? v.voter[0], color: colorOf(v.voter) }));
  const counts = options.map(o => votersFor(o).length);
  const max = Math.max(0, ...counts);
  const leaders = options.filter((_, i) => max > 0 && counts[i] === max);
  const myVote = voter ? stopVotes.find(v => v.voter === voter)?.option_id ?? null : null;

  const booked = options.find(o => o.status === 'booked');
  const family = options.filter(o => o.source === 'family');
  const primary = booked ? [booked] : (family.length ? family : options);
  const rest = options.filter(o => !primary.includes(o));

  const label: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 10,
    fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-3)',
  };
  const link: React.CSSProperties = {
    background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: 'inherit', color: 'var(--ink-2)',
    borderBottom: '1px solid var(--border-mid)', textTransform: 'none', letterSpacing: 0, fontFamily: 'var(--font-sans)', fontSize: 12.5,
  };

  if (booked) {
    return (
      <div>
        <div style={{
          marginTop: 10, borderRadius: 12, background: GREEN.soft, border: `0.5px solid ${GREEN.line}`,
          padding: '11px 12px', display: 'flex', flexDirection: 'column', gap: 4,
        }}>
          <span className="num" style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: GREEN.text }}>
            Booked{booked.booked_detail ? ` · ${booked.booked_detail}` : ''}
          </span>
          <b style={{ fontSize: 14.5, color: 'var(--ink)' }}>{booked.name}</b>
          {booked.kind && <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{booked.kind}</span>}
          {booked.order_md && <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}><span style={{ color: 'var(--ink-3)', fontWeight: 600 }}>Order: </span>{booked.order_md}</p>}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
            <a href={mapsUrl(booked.maps_query)} target="_blank" rel="noopener" style={btn}>Map</a>
            {booked.phone && <a href={`tel:${booked.phone.replace(/[^\d+]/g, '').replace(/^0/, '+44')}`} style={btn}>Call {booked.phone}</a>}
          </div>
        </div>
        {rest.length > 0 && (
          <>
            <div style={label}>
              Voting closed ·{' '}
              <button type="button" style={link} onClick={() => setShowMore(v => !v)}>
                {showMore ? 'hide' : `show the ${rest.length === 1 ? 'backup' : `${rest.length} backups`}`}
              </button>
            </div>
            {showMore && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                {rest.map(o => <OptionCard key={o.id} o={o} voters={[]} mine={false} leading={false} closed />)}
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  const voted = new Set(stopVotes.map(v => v.voter)).size;
  const shown = showMore ? [...primary, ...rest] : primary;

  return (
    <div>
      <div style={label}>
        {voter ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--ink-2)' }}>
            <Avatar label={init[voter] ?? voter[0]} color={colorOf(voter)} />
            Voting as {voter} ·{' '}
            <button type="button" style={{ ...link, fontSize: 11 }} onClick={askName}>change</button>
          </span>
        ) : <span>Tap Vote to choose</span>}
        <span className="num">· {voted} of {voters.length} voted</span>
      </div>
      {error && <p role="alert" style={{ marginTop: 8, fontSize: 12.5, color: '#7A2414' }}>{error}</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
        {shown.map(o => (
          <OptionCard
            key={o.id}
            o={o}
            voters={votersFor(o)}
            mine={myVote === o.id}
            leading={leaders.length === 1 && leaders[0].id === o.id}
            closed={false}
            onVote={() => cast(stop.id, myVote === o.id ? null : o.id)}
          />
        ))}
      </div>
      {rest.length > 0 && (
        <div style={{ ...label, textTransform: 'none', letterSpacing: 0, fontFamily: 'var(--font-sans)', fontSize: 12.5 }}>
          <button type="button" style={link} onClick={() => setShowMore(v => !v)}>
            {showMore ? 'Show fewer' : `+ ${rest.length} more idea${rest.length === 1 ? '' : 's'}: ${rest.map(o => o.name).join(', ')}`}
          </button>
        </div>
      )}
    </div>
  );
}

// ── THE DINNERS PAGE ────────────────────────────────────────────────────────
// Voting is a one-off, so it lives on its own page (/trips/[slug]/dinners)
// rather than inside the itinerary. Once the family has decided, the winners
// go into the itinerary's dinner stops by hand.

export type DinnerEntry = { stop: Stop; dayLabel: string };

function splitDayLabel(label: string) {
  const [head, ...rest] = label.split(' - ');
  return { head: head.trim(), sub: rest.join(' · ').trim() };
}

export function DinnerBoard({ tripId, tripTitle, slug, voters, dinners }: {
  tripId: number;
  tripTitle: string;
  slug: string;
  voters: string[];
  dinners: DinnerEntry[];
}) {
  return (
    <DinnerVoteProvider tripId={tripId} voters={voters} enabled={voters.length > 0 && dinners.length > 0}>
      <div style={{ maxWidth: 'var(--max-w)', margin: '0 auto', padding: '0 0 calc(env(safe-area-inset-bottom, 0px) + 40px)' }}>
        <header style={{ padding: 'calc(env(safe-area-inset-top, 0px) + 28px) 16px 8px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <a href={`/trips/${slug}`} style={{
            alignSelf: 'flex-start', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em',
            textTransform: 'uppercase', color: 'var(--ink-3)', textDecoration: 'none',
          }}>← {tripTitle}</a>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 32, lineHeight: 1.05, color: 'var(--ink)' }}>Where we eat</h1>
          <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.55, maxWidth: '58ch' }}>
            One vote per person per dinner. Tap a place to vote, tap again to take it back. Your family&rsquo;s picks come first; Claude&rsquo;s ideas sit under &ldquo;more ideas&rdquo;. Every card has a Book or Call button and a map.
          </p>
        </header>
        <main style={{ padding: '0 12px' }}>
          {dinners.map(({ stop, dayLabel }) => {
            const { head, sub } = splitDayLabel(dayLabel);
            return (
              <section key={stop.id} id={`dinner-${stop.id}`} style={{
                position: 'relative', background: 'var(--surface)', border: '0.5px solid var(--border)',
                borderRadius: 14, padding: '14px 14px 14px 18px', marginTop: 12, overflow: 'hidden',
              }}>
                <div style={{ position: 'absolute', left: 0, top: 10, bottom: 10, width: 3, borderRadius: 4, background: SKY.bar }} />
                <div className="num" style={{
                  fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: SKY.text,
                }}>
                  {stop.time_label ? `${stop.time_label} · ` : ''}{/birthday|first-night/i.test(stop.title) ? stop.title : 'Dinner'}
                </div>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 20, lineHeight: 1.2, color: 'var(--ink)', marginTop: 4 }}>
                  {head}
                </h2>
                {sub && <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 2 }}>{sub}</div>}
                <DinnerOptions stop={stop} />
              </section>
            );
          })}
        </main>
      </div>
    </DinnerVoteProvider>
  );
}
