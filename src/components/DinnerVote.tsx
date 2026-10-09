'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { DinnerOption, DinnerVote, Stop } from '@/lib/supabase';
import { dinnerState } from '@/lib/dinnerRounds';

// ── DINNER VOTES ────────────────────────────────────────────────────────────
// A dinner stop with options shows them as cards the family votes on. No
// logins: the first vote asks for a name from the trip's `voters`, and the
// phone remembers it. Votes are fetched live from /api/votes (never cached);
// the options themselves arrive with the prerendered page.

const SKY = { bg: '#85B7EB', text: '#042C53', bar: '#378ADD' };
const GREEN = { bg: '#97C459', text: '#173404', soft: '#EEF4E6', line: '#C9DCAF' };
const VOTER_COLORS = ['#B8944E', '#3A5A7A', '#7A4A6A', '#4A6A3A', '#A0583A', '#5A5A8A', '#3A7A7A'];
const POLL_MS = 30_000;
/** Koji's brass is decorative-only contrast on parchment; prices need to be read. */
const PRICE = '#6E4F14';

type Ctx = {
  voters: string[];
  voter: string | null;
  votes: DinnerVote[];
  cast: (stopId: number, optionId: number | null, round: number) => void;
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

  const send = useCallback(async (name: string, stopId: number, optionId: number | null, round: number) => {
    setError(null);
    const before = votes;
    // Optimistic: one vote per person per dinner
    setVotes(v => {
      const rest = v.filter(x => !(x.stop_id === stopId && x.voter === name && x.round === round));
      return optionId === null ? rest : [...rest, { stop_id: stopId, option_id: optionId, voter: name, round }];
    });
    try {
      const r = await fetch('/api/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stopId, optionId, voter: name, round }),
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

  const cast = useCallback((stopId: number, optionId: number | null, round: number) => {
    if (!voter) { setSheet({ open: true, then: name => send(name, stopId, optionId, round) }); return; }
    send(voter, stopId, optionId, round);
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
        <p style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.5 }}>Pick your name once. This phone remembers it, and your votes show your initials.</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {voters.map((v, i) => (
            <button key={v} type="button" onClick={() => onPick(v)} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '14px 14px', borderRadius: 12,
              border: v === current ? `1.5px solid ${SKY.bar}` : '0.5px solid var(--border-mid)',
              background: 'var(--bg)', fontFamily: 'var(--font-sans)', fontSize: 17, fontWeight: 600, color: 'var(--ink)',
              cursor: 'pointer', textAlign: 'left',
            }}>
              <Avatar label={init[v]} color={VOTER_COLORS[i % VOTER_COLORS.length]} size={30} />
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
  fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 14.5, lineHeight: 1, padding: '11px 14px',
  borderRadius: 10, border: '1px solid var(--border-mid)', background: 'var(--surface)', color: 'var(--ink)',
  textDecoration: 'none', whiteSpace: 'nowrap', cursor: 'pointer',
};
const pill = (bg: string, fg: string): React.CSSProperties => ({
  fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 11.5, letterSpacing: '0.04em', textTransform: 'uppercase',
  padding: '4px 8px', borderRadius: 999, background: bg, color: fg, whiteSpace: 'nowrap',
});

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, marginBottom: 2,
      fontFamily: 'var(--font-sans)', fontSize: 12.5, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--ink-2)',
    }}>
      <span style={{ whiteSpace: 'nowrap' }}>{children}</span>
      <span style={{ flex: 1, height: 0.5, background: 'var(--border-mid)' }} />
    </div>
  );
}

function Detail({ label, text }: { label: string; text: string | null }) {
  if (!text) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--ink-2)' }}>{label}</span>
      <p style={{ fontSize: 15, color: 'var(--ink)', lineHeight: 1.5 }}>{text}</p>
    </div>
  );
}


function telHref(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, '').replace(/^0/, '+44')}`;
}

// ── ONE OPTION ──────────────────────────────────────────────────────────────
// Compact by default so a whole night fits on a phone screen; the long-form
// why / food / getting there and the outbound links sit behind "Details".
function OptionCard({ o, voters, mine, leading, out, onVote, muted }: {
  o: DinnerOption;
  voters: { name: string; label: string; color: string }[];
  mine: boolean;
  leading: boolean;
  out?: boolean;
  onVote?: () => void;
  muted?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{
      border: mine ? `2px solid ${SKY.bar}` : muted ? '1.5px dashed var(--border-mid)' : '1px solid var(--border-mid)',
      background: mine ? '#EAF1F8' : muted ? 'var(--surface)' : 'var(--bg)',
      borderRadius: 12, padding: '13px 14px',
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
        <b style={{ fontSize: 17, fontWeight: 700, color: 'var(--ink)' }}>{o.name}</b>
        {o.price && <span className="num" style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 14, color: PRICE }}>{o.price}</span>}
        {o.status === 'held' && <span style={pill('#F0997B', '#4A1B0C')}>Held</span>}
        {leading && <span style={{ ...pill(GREEN.bg, GREEN.text), marginLeft: 'auto' }}>Leading</span>}
      </div>
      {o.kind && <div style={{ fontSize: 14, color: 'var(--ink-2)' }}>{o.kind}</div>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <span style={{ ...pill(o.walk_in ? '#E3EED6' : '#F7DCD5', o.walk_in ? GREEN.text : '#7A2414'), borderRadius: 4 }}>
          {o.walk_in ? 'Walk-in' : 'Book ahead'}
        </span>
        <span style={{
          ...pill(o.source === 'family' ? '#F0E4C8' : 'var(--bg-subtle)', o.source === 'family' ? '#5A3F12' : 'var(--ink-2)'),
          borderRadius: 4,
        }}>{o.source === 'family' ? 'Family pick' : 'Claude’s idea'}</span>
      </div>
      {o.status === 'held' && o.booked_detail && <div style={{ fontSize: 14, fontWeight: 600, color: '#4A1B0C' }}>{o.booked_detail}</div>}
      {o.draw && <p style={{ fontSize: 15.5, color: 'var(--ink)', lineHeight: 1.5 }}>{o.draw}</p>}

      {open && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, paddingTop: 4, borderTop: '0.5px solid var(--border)', marginTop: 2 }}>
          <Detail label="Why this one" text={o.why_md} />
          <Detail label="The food" text={o.food_md} />
          <Detail label="Order" text={o.order_md} />
          <Detail label="Getting there" text={o.getting_there} />
          {o.note && <p style={{ fontSize: 14.5, color: 'var(--ink-2)', lineHeight: 1.5 }}>{o.note}</p>}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
            {o.menu_url && <a href={o.menu_url} target="_blank" rel="noopener" style={btn}>Menu</a>}
            {o.booking_url
              ? <a href={o.booking_url} target="_blank" rel="noopener" style={btn}>Book</a>
              : o.phone ? <a href={telHref(o.phone)} style={btn}>Call {o.phone}</a> : null}
            <a href={mapsUrl(o.maps_query)} target="_blank" rel="noopener" style={btn}>Map</a>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
        {!out && onVote && (
          <button type="button" onClick={onVote} aria-pressed={mine} style={mine
            ? { ...btn, color: SKY.text, border: `1.5px solid ${SKY.bar}` }
            : { ...btn, background: SKY.text, color: 'var(--surface)', borderColor: SKY.text }}>
            {mine ? '✓ Your vote' : 'Vote'}
          </button>
        )}
        <button type="button" onClick={() => setOpen(v => !v)} aria-expanded={open} style={btn}>
          {open ? 'Less' : 'Details · menu'}
        </button>
        {voters.length > 0 && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
            <span style={{ display: 'inline-flex' }}>
              {voters.map((v, i) => (
                <span key={v.name} title={v.name} style={{ marginLeft: i ? -5 : 0 }}>
                  <Avatar label={v.label} color={v.color} size={24} ring />
                </span>
              ))}
            </span>
            <span className="num" style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 14, color: 'var(--ink-2)' }}>{voters.length}</span>
          </span>
        )}
      </div>
    </div>
  );
}

// ── ONE NIGHT'S DERIVED STATE ───────────────────────────────────────────────
function useNight(stop: Stop) {
  const ctx = useContext(DinnerCtx);
  const options = stop.options ?? [];
  const voters = ctx?.voters ?? [];
  const stopVotes = (ctx?.votes ?? []).filter(v => v.stop_id === stop.id && voters.includes(v.voter));
  const state = dinnerState(options.map(o => o.id), stopVotes, voters);
  const roundVotes = stopVotes.filter(v => v.round === state.round);
  const booked = options.find(o => o.status === 'booked') ?? null;
  const voter = ctx?.voter ?? null;
  const myVote = voter ? roundVotes.find(v => v.voter === voter)?.option_id ?? null : null;
  const missing = voters.filter(v => !roundVotes.some(x => x.voter === v));
  const nameOf = (id: number) => options.find(o => o.id === id)?.name ?? '';
  return { ctx, options, voters, state, roundVotes, booked, voter, myVote, missing, nameOf };
}

function nightStatus(n: ReturnType<typeof useNight>) {
  if (n.booked) return { tone: 'booked' as const, text: `Booked: ${n.booked.name}${n.booked.booked_detail ? `, ${n.booked.booked_detail}` : ''}` };
  if (n.state.winner != null) return { tone: 'decided' as const, text: `Decided: ${n.nameOf(n.state.winner)}` };
  if (n.state.round > 1) return { tone: 'runoff' as const, text: `Runoff: ${n.state.eligible.map(n.nameOf).join(' vs ')}` };
  if (n.state.deadlock) return { tone: 'runoff' as const, text: 'Still tied' };
  if (n.state.leaders.length === 1) return { tone: 'open' as const, text: `Leading: ${n.nameOf(n.state.leaders[0])} (${n.state.counts[n.state.leaders[0]]})` };
  if (n.state.leaders.length > 1) return { tone: 'open' as const, text: `Tied so far: ${n.state.leaders.map(n.nameOf).join(', ')}` };
  return { tone: 'open' as const, text: 'No votes yet' };
}

// ── ONE NIGHT ───────────────────────────────────────────────────────────────
export function DinnerOptions({ stop }: { stop: Stop }) {
  const n = useNight(stop);
  if (!n.ctx || !n.options.length) return null;
  const { voters, cast, askName, error } = n.ctx;
  const { options, state, roundVotes, booked, voter, myVote, missing, nameOf } = n;

  const init = initialsFor(voters);
  const colorOf = (name: string) => VOTER_COLORS[Math.max(0, voters.indexOf(name)) % VOTER_COLORS.length];
  const votersFor = (o: DinnerOption) => roundVotes.filter(v => v.option_id === o.id)
    .map(v => ({ name: v.voter, label: init[v.voter] ?? v.voter[0], color: colorOf(v.voter) }));
  const inRound = (o: DinnerOption) => state.eligible.includes(o.id);

  const label: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 12,
    fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600, color: 'var(--ink-2)',
  };
  const link: React.CSSProperties = {
    background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--ink-2)',
    borderBottom: '1px solid var(--ink-3)', textTransform: 'none', letterSpacing: 0, fontFamily: 'var(--font-sans)', fontSize: 14,
  };
  const banner = (bg: string, line: string, fg: string, text: React.ReactNode) => (
    <div style={{ marginTop: 10, borderRadius: 10, background: bg, border: `0.5px solid ${line}`, padding: '11px 13px', fontSize: 15, lineHeight: 1.5, color: fg }}>{text}</div>
  );

  if (booked) {
    const rest = options.filter(o => o !== booked);
    return (
      <div>
        <div style={{
          marginTop: 10, borderRadius: 12, background: GREEN.soft, border: `0.5px solid ${GREEN.line}`,
          padding: '11px 12px', display: 'flex', flexDirection: 'column', gap: 5,
        }}>
          <span className="num" style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 13, letterSpacing: '0.04em', textTransform: 'uppercase', color: GREEN.text }}>
            Booked{booked.booked_detail ? ` · ${booked.booked_detail}` : ''}
          </span>
          <b style={{ fontSize: 18, color: 'var(--ink)' }}>{booked.name}</b>
          {booked.kind && <span style={{ fontSize: 14, color: 'var(--ink-2)' }}>{booked.kind}</span>}
          <Detail label="The food" text={booked.food_md} />
          <Detail label="Order" text={booked.order_md} />
          <Detail label="Getting there" text={booked.getting_there} />
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
            {booked.menu_url && <a href={booked.menu_url} target="_blank" rel="noopener" style={btn}>Menu</a>}
            <a href={mapsUrl(booked.maps_query)} target="_blank" rel="noopener" style={btn}>Map</a>
            {booked.phone && <a href={telHref(booked.phone)} style={btn}>Call {booked.phone}</a>}
          </div>
        </div>
        {rest.length > 0 && (
          <>
            <GroupLabel>Voting closed · {rest.length === 1 ? 'backup' : 'backups'}</GroupLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
              {rest.map(o => <OptionCard key={o.id} o={o} voters={[]} mine={false} leading={false} out muted />)}
            </div>
          </>
        )}
      </div>
    );
  }

  const family = options.filter(o => o.source === 'family');
  const primary = family.length ? family : options;
  const rest = options.filter(o => !primary.includes(o));
  const leaderId = !state.winner && state.leaders.length === 1 ? state.leaders[0] : null;
  const last = state.history[state.history.length - 1];
  const card = (o: DinnerOption, muted?: boolean) => (
    <OptionCard
      key={o.id}
      o={o}
      voters={inRound(o) ? votersFor(o) : []}
      mine={myVote === o.id}
      leading={leaderId === o.id}
      out={!inRound(o)}
      muted={muted || !inRound(o)}
      onVote={() => cast(stop.id, myVote === o.id ? null : o.id, state.round)}
    />
  );

  return (
    <div>
      <div style={label}>
        {voter ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--ink-2)' }}>
            <Avatar label={init[voter] ?? voter[0]} color={colorOf(voter)} />
            Voting as {voter} ·{' '}
            <button type="button" style={link} onClick={askName}>change</button>
          </span>
        ) : <span>Tap Vote to choose</span>}
        <span className="num">· {voters.length - missing.length} of {voters.length} voted</span>
      </div>
      {missing.length > 0 && missing.length < voters.length && (
        <div style={{ marginTop: 4, fontSize: 14, color: 'var(--ink-2)' }}>Still to vote: <b>{missing.join(', ')}</b></div>
      )}
      {error && <p role="alert" style={{ marginTop: 8, fontSize: 14.5, color: '#7A2414' }}>{error}</p>}
      {state.winner != null && banner(GREEN.soft, GREEN.line, GREEN.text, <>
        <b>Decided: {nameOf(state.winner)}</b> ({state.eligible.map(id => state.counts[id]).sort((a, b) => b - a).join('–')}). Next step is booking it.
      </>)}
      {state.round > 1 && !state.winner && last && banner('#FFF4DE', '#EBCB8B', '#5A3F12', <>
        <b>Tie in round {last.round}</b> ({Object.values(last.counts).filter(c => c > 0).sort((a, b) => b - a).join('–')}). Runoff between {state.eligible.map(nameOf).join(' and ')}: everyone votes again.
      </>)}
      {state.deadlock && banner('#F7DCD5', '#E8B4A8', '#7A2414', <>
        <b>Still tied</b> with everyone voted. Settle it together, or change a vote.
      </>)}
      {state.round > 1 ? (
        <>
          <GroupLabel>Runoff · round {state.round}</GroupLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>{options.filter(inRound).map(o => card(o))}</div>
          <GroupLabel>Out after round {state.round - 1}</GroupLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>{options.filter(o => !inRound(o)).map(o => card(o, true))}</div>
        </>
      ) : (
        <>
          {family.length > 0 && rest.length > 0 && <GroupLabel>Family picks</GroupLabel>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>{primary.map(o => card(o))}</div>
          {rest.length > 0 && (
            <>
              <GroupLabel>Other ideas · Claude&rsquo;s suggestions</GroupLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>{rest.map(o => card(o, true))}</div>
            </>
          )}
        </>
      )}
    </div>
  );
}

// ── THE DINNERS PAGE ────────────────────────────────────────────────────────
// Voting is a one-off, so it lives on its own page (/trips/[slug]/dinners)
// rather than inside the itinerary. One night at a time, with a day strip and
// an "All nights" overview that doubles as the results summary.

export type DinnerEntry = { stop: Stop; dayLabel: string };

function splitDayLabel(label: string) {
  const [head, ...rest] = label.split(' - ');
  return { head: head.trim(), sub: rest.join(' · ').trim() };
}

/** "Fri, Oct 16" -> "Fri 16" */
function chipLabel(head: string) {
  const m = head.match(/^(\w{3})\w*,?\s+\w+\s+(\d+)/);
  return m ? `${m[1]} ${m[2]}` : head;
}

function Overview({ dinners, onPick }: { dinners: DinnerEntry[]; onPick: (id: number) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
      {dinners.map(d => <OverviewRow key={d.stop.id} entry={d} onPick={onPick} />)}
    </div>
  );
}

function OverviewRow({ entry, onPick }: { entry: DinnerEntry; onPick: (id: number) => void }) {
  const n = useNight(entry.stop);
  const { head } = splitDayLabel(entry.dayLabel);
  const st = nightStatus(n);
  const tone = { booked: GREEN.text, decided: GREEN.text, runoff: '#5A3F12', open: 'var(--ink)' }[st.tone];
  const mineDone = n.voter && !n.booked ? !n.missing.includes(n.voter) : null;
  return (
    <button type="button" onClick={() => onPick(entry.stop.id)} style={{
      textAlign: 'left', cursor: 'pointer', background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 12,
      padding: '14px 14px', display: 'grid', gridTemplateColumns: '1fr auto', gap: '4px 10px', alignItems: 'center',
      fontFamily: 'var(--font-sans)', color: 'var(--ink)',
    }}>
      <span style={{ fontFamily: 'var(--font-serif)', fontSize: 20 }}>
        {head}{/birthday/i.test(entry.stop.title) ? ' · Birthday' : ''}
      </span>
      <span className="num" style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 14, color: 'var(--ink-2)' }}>
        {n.booked ? '' : `${n.voters.length - n.missing.length} of ${n.voters.length} voted`}
      </span>
      <span style={{ fontSize: 15.5, color: tone, fontWeight: st.tone === 'open' ? 500 : 700 }}>{st.text}</span>
      <span style={{ fontSize: 14, fontWeight: 600, color: mineDone === false ? '#7A2414' : 'var(--ink-2)', whiteSpace: 'nowrap' }}>
        {mineDone === null ? '›' : mineDone ? '✓ voted ›' : 'Your vote ›'}
      </span>
    </button>
  );
}

function DayChip({ entry, active, onPick }: { entry: DinnerEntry; active: boolean; onPick: () => void }) {
  const n = useNight(entry.stop);
  const { head } = splitDayLabel(entry.dayLabel);
  const done = n.booked || (n.voter ? !n.missing.includes(n.voter) : false);
  return (
    <button type="button" onClick={onPick} aria-current={active ? 'page' : undefined} style={{
      flexShrink: 0, cursor: 'pointer', borderRadius: 999, padding: '10px 14px', whiteSpace: 'nowrap',
      fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 600,
      border: active ? `1.5px solid ${SKY.text}` : '0.5px solid var(--border-mid)',
      background: active ? SKY.text : 'var(--surface)', color: active ? 'var(--surface)' : 'var(--ink-2)',
    }}>
      {chipLabel(head)}{done ? ' ✓' : ''}
    </button>
  );
}

export function DinnerBoard({ tripId, tripTitle, slug, voters, dinners }: {
  tripId: number;
  tripTitle: string;
  slug: string;
  voters: string[];
  dinners: DinnerEntry[];
}) {
  const [tab, setTab] = useState<number | 'all'>('all');

  // Deep link: #night-<stopId>
  useEffect(() => {
    const m = window.location.hash.match(/^#night-(\d+)$/);
    if (m && dinners.some(d => d.stop.id === Number(m[1]))) setTab(Number(m[1]));
  }, [dinners]);

  const go = useCallback((t: number | 'all') => {
    setTab(t);
    try { history.replaceState(null, '', t === 'all' ? window.location.pathname : `#night-${t}`); } catch { /* ignore */ }
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, []);

  // Keep the selected night's chip in view in the strip
  useEffect(() => {
    const el = document.querySelector<HTMLElement>('nav[aria-label="Nights"] [aria-current="page"]');
    el?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [tab]);

  const idx = tab === 'all' ? -1 : dinners.findIndex(d => d.stop.id === tab);
  const current = idx >= 0 ? dinners[idx] : null;
  const prev = idx > 0 ? dinners[idx - 1] : null;
  const next = idx >= 0 && idx < dinners.length - 1 ? dinners[idx + 1] : null;

  const nav: React.CSSProperties = { ...btn, padding: '13px 16px', fontSize: 15.5 };

  return (
    <DinnerVoteProvider tripId={tripId} voters={voters} enabled={voters.length > 0 && dinners.length > 0}>
      <div style={{ maxWidth: 'var(--max-w)', margin: '0 auto', padding: '0 0 calc(env(safe-area-inset-bottom, 0px) + 40px)' }}>
        <header style={{ padding: 'calc(env(safe-area-inset-top, 0px) + 24px) 16px 6px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <a href={`/trips/${slug}`} style={{
            alignSelf: 'flex-start', fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600,
            color: 'var(--ink-2)', textDecoration: 'none',
          }}>← {tripTitle}</a>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 32, lineHeight: 1.05, color: 'var(--ink)' }}>Where we eat</h1>
          <p style={{ fontSize: 16, color: 'var(--ink)', lineHeight: 1.5 }}>
            One vote per person per night. Tap Vote, tap again to take it back. Ties go to a runoff. &ldquo;Details&rdquo; has the menu, the food and how to book.
          </p>
          <p style={{ fontSize: 15, color: 'var(--ink-2)', display: 'flex', flexWrap: 'wrap', gap: '2px 14px' }}>
            <span style={{ whiteSpace: 'nowrap' }}>£ casual</span>
            <span style={{ whiteSpace: 'nowrap' }}>££ dinner out</span>
            <span style={{ whiteSpace: 'nowrap' }}>£££ a splurge</span>
          </p>
        </header>

        <nav aria-label="Nights" style={{
          position: 'sticky', top: 0, zIndex: 20, background: 'var(--bg)',
          padding: 'calc(env(safe-area-inset-top, 0px) + 8px) 0 8px', borderBottom: '0.5px solid var(--border)',
        }}>
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '0 12px', scrollbarWidth: 'none' }}>
            <button type="button" onClick={() => go('all')} aria-current={tab === 'all' ? 'page' : undefined} style={{
              flexShrink: 0, cursor: 'pointer', borderRadius: 999, padding: '10px 14px', whiteSpace: 'nowrap',
              fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 600,
              border: tab === 'all' ? `1.5px solid ${SKY.text}` : '0.5px solid var(--border-mid)',
              background: tab === 'all' ? SKY.text : 'var(--surface)', color: tab === 'all' ? 'var(--surface)' : 'var(--ink-2)',
            }}>All nights</button>
            {dinners.map(d => <DayChip key={d.stop.id} entry={d} active={tab === d.stop.id} onPick={() => go(d.stop.id)} />)}
          </div>
        </nav>

        <main style={{ padding: '0 12px' }}>
          {!current ? (
            <Overview dinners={dinners} onPick={id => go(id)} />
          ) : (() => {
            const { head, sub } = splitDayLabel(current.dayLabel);
            const stop = current.stop;
            return (
              <>
                <section id={`dinner-${stop.id}`} style={{
                  position: 'relative', background: 'var(--surface)', border: '0.5px solid var(--border)',
                  borderRadius: 14, padding: '14px 14px 14px 18px', marginTop: 12, overflow: 'hidden',
                }}>
                  <div style={{ position: 'absolute', left: 0, top: 10, bottom: 10, width: 3, borderRadius: 4, background: SKY.bar }} />
                  <div className="num" style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 13, letterSpacing: '0.05em', textTransform: 'uppercase', color: SKY.text }}>
                    {stop.time_label ? `${stop.time_label} · ` : ''}{/birthday|first-night/i.test(stop.title) ? stop.title : 'Dinner'}
                  </div>
                  <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 26, lineHeight: 1.2, color: 'var(--ink)', marginTop: 4 }}>{head}</h2>
                  {sub && <div style={{ fontSize: 15, color: 'var(--ink-2)', marginTop: 2 }}>{sub}</div>}
                  <DinnerOptions stop={stop} />
                </section>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 14 }}>
                  {prev ? <button type="button" style={nav} onClick={() => go(prev.stop.id)}>‹ {chipLabel(splitDayLabel(prev.dayLabel).head)}</button> : <button type="button" style={nav} onClick={() => go('all')}>‹ All nights</button>}
                  {next ? <button type="button" style={{ ...nav, background: SKY.text, color: 'var(--surface)', borderColor: SKY.text }} onClick={() => go(next.stop.id)}>Next: {chipLabel(splitDayLabel(next.dayLabel).head)} ›</button>
                        : <button type="button" style={nav} onClick={() => go('all')}>All nights ›</button>}
                </div>
              </>
            );
          })()}
        </main>
      </div>
    </DinnerVoteProvider>
  );
}
