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
const GREEN = { bg: '#CFE3C6', text: '#1E4D3A', soft: '#EAF2E6', line: '#B9D3B0' };
/** Pillar-box red, for anything that needs a table booked. */
const RED = { text: '#9E1B1B', bg: '#F7E0DD' };
const VOTER_COLORS = ['#B8944E', '#3A5A7A', '#7A4A6A', '#4A6A3A', '#A0583A', '#5A5A8A', '#3A7A7A'];
const POLL_MS = 30_000;
/** Koji's brass is decorative-only contrast on parchment; prices need to be read. */
const PRICE = '#6E4F14';

type Ctx = {
  voters: string[];
  weights: Record<string, number>;
  voter: string | null;
  votes: DinnerVote[];
  cast: (stopId: number, optionId: number | null, round: number) => void;
  askName: (then?: (name: string) => void) => void;
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

export function DinnerVoteProvider({ tripId, voters, weights = {}, enabled, children }: {
  tripId: number;
  voters: string[];
  weights?: Record<string, number>;
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
    voters, weights, voter, votes, cast, error,
    askName: (then?: (name: string) => void) => setSheet({ open: true, then }),
  }), [voters, weights, voter, votes, cast, error]);

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

/** One tap to a grid of photos of the food; Google Maps has them too, but deeper. */
function photosUrl(q: string) {
  return `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(`${q} food`)}`;
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
        <span style={{ ...pill(o.walk_in ? GREEN.soft : RED.bg, o.walk_in ? GREEN.text : RED.text), borderRadius: 4 }}>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 10, borderTop: '1px solid var(--border)', marginTop: 4 }}>
          <Detail label="Why this one" text={o.why_md} />
          <Detail label="The food" text={o.food_md} />
          <Detail label="Order" text={o.order_md} />
          <Detail label="Getting there" text={o.getting_there} />
          {o.note && <p style={{ fontSize: 14.5, color: 'var(--ink-2)', lineHeight: 1.5 }}>{o.note}</p>}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
            {o.menu_url && <a href={o.menu_url} target="_blank" rel="noopener" style={btn}>Menu</a>}
            <a href={photosUrl(o.maps_query)} target="_blank" rel="noopener" style={btn}>Photos</a>
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
          {open ? 'Less' : 'Details & photos'}
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
  const weights = ctx?.weights ?? {};
  const state = dinnerState(options.map(o => o.id), stopVotes, voters, weights);
  const roundVotes = stopVotes.filter(v => v.round === state.round);
  const tiebreaker = Object.keys(weights).find(k => weights[k] > 1) ?? null;
  const booked = options.find(o => o.status === 'booked') ?? null;
  const voter = ctx?.voter ?? null;
  const myVote = voter ? roundVotes.find(v => v.voter === voter)?.option_id ?? null : null;
  const missing = voters.filter(v => !roundVotes.some(x => x.voter === v));
  const nameOf = (id: number) => options.find(o => o.id === id)?.name ?? '';
  return { ctx, options, voters, state, roundVotes, booked, voter, myVote, missing, nameOf, tiebreaker };
}

function nightStatus(n: ReturnType<typeof useNight>) {
  if (n.booked) return { tone: 'booked' as const, text: `Booked: ${n.booked.name}${n.booked.booked_detail ? `, ${n.booked.booked_detail}` : ''}` };
  if (n.state.winner != null) return { tone: 'decided' as const, text: `Decided: ${n.nameOf(n.state.winner)}${n.state.tiebreak && n.tiebreaker ? ` (${n.tiebreaker}’s tiebreak)` : ''}` };
  if (n.state.round > 1) return { tone: 'runoff' as const, text: `Runoff: ${n.state.eligible.map(n.nameOf).join(' vs ')}` };
  if (n.state.deadlock) return { tone: 'runoff' as const, text: 'Still tied' };
  if (n.state.leaders.length === 1) {
    const id = n.state.leaders[0];
    const v = n.state.raw[id];
    return { tone: 'open' as const, text: `Leading: ${n.nameOf(id)} (${v} vote${v === 1 ? '' : 's'}${n.state.tiebreak && n.tiebreaker ? `, ${n.tiebreaker}’s tiebreak` : ''})` };
  }
  if (n.state.leaders.length > 1) return { tone: 'open' as const, text: `Tied so far: ${n.state.leaders.map(n.nameOf).join(', ')}` };
  return { tone: 'open' as const, text: 'No votes yet' };
}

// ── ONE NIGHT ───────────────────────────────────────────────────────────────
export function DinnerOptions({ stop }: { stop: Stop }) {
  const n = useNight(stop);
  if (!n.ctx || !n.options.length) return null;
  const { voters, cast, askName, error } = n.ctx;
  const { options, state, roundVotes, booked, voter, myVote, missing, nameOf, tiebreaker } = n;

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
            <a href={photosUrl(booked.maps_query)} target="_blank" rel="noopener" style={btn}>Photos</a>
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
            <button type="button" style={link} onClick={() => askName()}>change</button>
          </span>
        ) : <span>Tap Vote on one place</span>}
        <span className="num">· {voters.length - missing.length} of {voters.length} have voted</span>
      </div>
      {missing.length > 0 && missing.length < voters.length && (
        <div style={{ marginTop: 4, fontSize: 14, color: 'var(--ink-2)' }}>Still to vote: <b>{missing.join(', ')}</b></div>
      )}
      {error && <p role="alert" style={{ marginTop: 8, fontSize: 14.5, color: '#7A2414' }}>{error}</p>}
      {state.winner != null && banner(GREEN.soft, GREEN.line, GREEN.text, <>
        <b>Decided: {nameOf(state.winner)}</b> ({state.eligible.map(id => state.raw[id]).sort((a, b) => b - a).join('–')}{state.tiebreak && tiebreaker ? `, ${tiebreaker}’s tiebreak` : ''}). Next step is booking it.
      </>)}
      {state.round > 1 && !state.winner && last && banner('#FFF4DE', '#EBCB8B', '#5A3F12', <>
        <b>Tie in round {last.round}</b> ({Object.values(last.raw).filter(c => c > 0).sort((a, b) => b - a).join('–')}). Runoff between {state.eligible.map(nameOf).join(' and ')}: everyone votes again.
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
// rather than inside the itinerary. A welcome screen explains it once; after
// "Start voting" the page goes one night at a time, with a day strip and an
// "All nights" summary that doubles as the results. Nights are grouped by
// where the trip is (the Cotswolds, then London).

export type DinnerEntry = { stop: Stop; dayLabel: string; place: string };

const FLEURON = '❦';

function splitDayLabel(label: string) {
  const [head, ...rest] = label.split(' - ');
  return { head: head.trim(), sub: rest.join(' · ').trim() };
}

/** "Fri, Oct 16" -> "Fri 16" */
function chipLabel(head: string) {
  const m = head.match(/^(\w{3})\w*,?\s+\w+\s+(\d+)/);
  return m ? `${m[1]} ${m[2]}` : head;
}

function placeName(place: string) {
  return /cotswold/i.test(place) ? 'The Cotswolds' : place || 'Elsewhere';
}

function Rule() {
  return (
    <div aria-hidden style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--ink-2)', margin: '18px 0 14px' }}>
      <span style={{ flex: 1, height: 0, borderTop: '3px double var(--border-mid)' }} />
      <span style={{ fontFamily: 'var(--font-serif)', fontSize: 18, lineHeight: 1 }}>{FLEURON}</span>
      <span style={{ flex: 1, height: 0, borderTop: '3px double var(--border-mid)' }} />
    </div>
  );
}

function PlaceHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 style={{
      fontFamily: 'var(--font-serif)', fontWeight: 400, fontStyle: 'italic', fontSize: 20, color: 'var(--ink)',
      margin: '18px 4px 6px', display: 'flex', alignItems: 'center', gap: 10,
    }}>
      {children}
      <span style={{ flex: 1, height: 0, borderTop: '0.5px solid var(--border-mid)' }} />
    </h3>
  );
}

function OverviewRow({ entry, onPick }: { entry: DinnerEntry; onPick: (id: number) => void }) {
  const n = useNight(entry.stop);
  const { head } = splitDayLabel(entry.dayLabel);
  const st = nightStatus(n);
  const tone = { booked: GREEN.text, decided: GREEN.text, runoff: '#5A3F12', open: 'var(--ink)' }[st.tone];
  const mineDone = n.voter && !n.booked ? !n.missing.includes(n.voter) : null;
  const birthday = /birthday/i.test(entry.stop.title);
  return (
    <button type="button" onClick={() => onPick(entry.stop.id)} style={{
      textAlign: 'left', cursor: 'pointer', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
      padding: '14px 14px', display: 'grid', gridTemplateColumns: '1fr auto', gap: '4px 12px', alignItems: 'center',
      fontFamily: 'var(--font-sans)', color: 'var(--ink)', width: '100%',
    }}>
      <span style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
        <span style={{ fontFamily: 'var(--font-serif)', fontSize: 20, lineHeight: 1.15 }}>
          {head}{birthday && <span style={{ fontStyle: 'italic', color: RED.text }}> · Birthday</span>}
        </span>
        <span style={{ fontSize: 15.5, color: tone, fontWeight: st.tone === 'open' ? 500 : 700 }}>{st.text}</span>
        {!n.booked && (
          <span style={{ fontSize: 14, color: 'var(--ink-2)' }}>
            {n.voters.length - n.missing.length} of {n.voters.length} have voted
            {mineDone === true && <span style={{ color: GREEN.text, fontWeight: 700 }}> · you ✓</span>}
            {mineDone === false && <span style={{ color: RED.text, fontWeight: 700 }}> · your vote needed</span>}
          </span>
        )}
        {!n.booked && n.missing.length > 0 && n.missing.length < n.voters.length && (
          <span style={{ fontSize: 14, color: 'var(--ink-2)' }}>Still to vote: {n.missing.join(', ')}</span>
        )}
      </span>
      <span aria-hidden style={{ fontSize: 24, color: 'var(--ink-2)', lineHeight: 1 }}>›</span>
    </button>
  );
}

function DayChip({ entry, active, onPick }: { entry: DinnerEntry; active: boolean; onPick: () => void }) {
  const n = useNight(entry.stop);
  const { head } = splitDayLabel(entry.dayLabel);
  const done = n.booked || (n.voter ? !n.missing.includes(n.voter) : false);
  return (
    <button type="button" onClick={onPick} aria-current={active ? 'page' : undefined} style={chipStyle(active)}>
      {chipLabel(head)}{done ? ' ✓' : ''}
    </button>
  );
}

function chipStyle(active: boolean): React.CSSProperties {
  return {
    flexShrink: 0, cursor: 'pointer', borderRadius: 999, padding: '10px 14px', whiteSpace: 'nowrap',
    fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 600,
    border: active ? `1.5px solid ${SKY.text}` : '1px solid var(--border-mid)',
    background: active ? SKY.text : 'var(--surface)', color: active ? 'var(--surface)' : 'var(--ink)',
  };
}

const primaryBtn: React.CSSProperties = {
  ...btn, background: SKY.text, color: 'var(--surface)', borderColor: SKY.text, fontSize: 17, padding: '16px 20px',
};

function Intro({ title, onStart, onAll, tiebreaker }: { title: string; onStart: () => void; onAll: () => void; tiebreaker: string | null }) {
  const h: React.CSSProperties = { fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 21, color: 'var(--ink)', marginBottom: 6 };
  const p: React.CSSProperties = { fontSize: 16, lineHeight: 1.55, color: 'var(--ink)' };
  const li: React.CSSProperties = { ...p, marginBottom: 6 };
  const tag = (bg: string, fg: string, text: string) => <span style={{ ...pill(bg, fg), borderRadius: 4 }}>{text}</span>;
  return (
    <div style={{ padding: '0 18px 8px' }}>
      <p style={{ ...p, fontSize: 17 }}>
        Help pick where we eat each night of the trip, from the first evening in the Cotswolds to Mom&rsquo;s birthday dinner in London. Votes show up for everyone as they come in.
      </p>
      <Rule />
      <section>
        <h2 style={h}>How it works</h2>
        <ol style={{ paddingLeft: 22 }}>
          <li style={li}><b>Pick your name</b> the first time you vote. Your phone remembers it.</li>
          <li style={li}><b>Go night by night</b> using the dates along the top. A tick means you&rsquo;ve voted on that night.</li>
          <li style={li}><b>Check the Results</b> tab any time to see what&rsquo;s leading each night and who still needs to vote.</li>
          <li style={li}><b>Tap Vote</b> on one place per night. Tap it again to take your vote back, or tap another place to change it.</li>
          <li style={li}><b>Tap &ldquo;Details&rdquo;</b> on any place for why it&rsquo;s on the list, what the food is like and how to get there, with buttons for the menu, photos of the food, booking and a map.</li>
        </ol>
      </section>
      <Rule />
      <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h2 style={h}>Reading the cards</h2>
        <p style={p}>{tag('#F0E4C8', '#5A3F12', 'Family pick')} came from one of us, and these are listed first. {tag('var(--bg-subtle)', 'var(--ink-2)', 'Claude’s idea')} places follow underneath as other options.</p>
        <p style={p}>{tag(RED.bg, RED.text, 'Book ahead')} needs a table reserved. {tag(GREEN.soft, GREEN.text, 'Walk-in')} means we can just turn up.</p>
        <p style={p}>£ is a casual meal, ££ a normal dinner out, £££ a splurge.</p>
      </section>
      <Rule />
      <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h2 style={h}>Ties and bookings</h2>
        {tiebreaker && (
          <p style={p}>It&rsquo;s {tiebreaker}&rsquo;s trip, so <b>{tiebreaker}&rsquo;s vote counts 1.5</b> and breaks any ties. She votes like everyone else; the extra half does the rest.</p>
        )}
        <p style={p}>If the top places are still tied once all five have voted, that night goes to a <b>runoff</b> between just the tied places, and everyone votes once more.</p>
        <p style={p}>Friday 23rd is already <b>booked</b> at St. John Bread and Wine. For the birthday dinner on Saturday 24th, a table is being <b>held</b> at Bocca di Lupo while we decide.</p>
      </section>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 24 }}>
        <button type="button" onClick={onStart} style={primaryBtn}>Start voting</button>
        <button type="button" onClick={onAll} style={{ ...btn, fontSize: 16, padding: '14px 18px' }}>See the results</button>
      </div>
      <p style={{ ...p, fontSize: 14, color: 'var(--ink-2)', textAlign: 'center', marginTop: 18 }}>{title} · London &amp; the Cotswolds</p>
    </div>
  );
}

function BoardInner({ tripId, tripTitle, slug, dinners }: {
  tripId: number; tripTitle: string; slug: string; dinners: DinnerEntry[];
}) {
  const ctx = useContext(DinnerCtx);
  const seenKey = `koji:dinners:started:${tripId}`;
  const [tab, setTab] = useState<number | 'all' | 'intro'>('intro');

  // Deep link (#night-<stopId>), else straight to the nights once started before
  useEffect(() => {
    const fromHash = () => {
      const m = window.location.hash.match(/^#night-(\d+)$/);
      if (m && dinners.some(d => d.stop.id === Number(m[1]))) { setTab(Number(m[1])); return true; }
      return false;
    };
    if (!fromHash()) {
      try { if (localStorage.getItem(seenKey)) setTab('all'); } catch { /* private mode */ }
    }
    window.addEventListener('hashchange', fromHash);
    return () => window.removeEventListener('hashchange', fromHash);
  }, [dinners, seenKey]);

  const go = useCallback((t: number | 'all' | 'intro') => {
    setTab(t);
    try { history.replaceState(null, '', typeof t === 'number' ? `#night-${t}` : window.location.pathname); } catch { /* ignore */ }
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, []);

  useEffect(() => {
    const el = document.querySelector<HTMLElement>('nav[aria-label="Nights"] [aria-current="page"]');
    el?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [tab]);

  /** First night this person still needs to vote on (booked nights skipped). */
  const firstOpenFor = (name: string) => {
    const votes = ctx?.votes ?? [];
    const voters = ctx?.voters ?? [];
    for (const d of dinners) {
      const opts = d.stop.options ?? [];
      if (opts.some(o => o.status === 'booked')) continue;
      const sv = votes.filter(v => v.stop_id === d.stop.id && voters.includes(v.voter));
      const st = dinnerState(opts.map(o => o.id), sv, voters, ctx?.weights ?? {});
      if (!sv.some(v => v.round === st.round && v.voter === name)) return d.stop.id;
    }
    return 'all' as const;
  };

  const start = () => {
    try { localStorage.setItem(seenKey, '1'); } catch { /* private mode */ }
    if (ctx?.voter) go(firstOpenFor(ctx.voter));
    else ctx?.askName(name => go(firstOpenFor(name)));
  };

  if (tab === 'intro') {
    return (
      <div style={{ maxWidth: 'var(--max-w)', margin: '0 auto', padding: '0 0 calc(env(safe-area-inset-bottom, 0px) + 40px)' }}>
        <header style={{ padding: 'calc(env(safe-area-inset-top, 0px) + 24px) 18px 6px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <a href={`/trips/${slug}`} style={{ alignSelf: 'flex-start', fontSize: 15, fontWeight: 600, color: 'var(--ink-2)', textDecoration: 'none' }}>← {tripTitle}</a>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: RED.text, marginTop: 10 }}>Dinner vote</div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 40, lineHeight: 1.05, color: 'var(--ink)' }}>Where we eat</h1>
        </header>
        <Intro title={tripTitle} tiebreaker={Object.keys(ctx?.weights ?? {}).find(k => (ctx?.weights ?? {})[k] > 1) ?? null} onStart={start} onAll={() => { try { localStorage.setItem(seenKey, '1'); } catch { /* */ } go('all'); }} />
      </div>
    );
  }

  const idx = tab === 'all' ? -1 : dinners.findIndex(d => d.stop.id === tab);
  const current = idx >= 0 ? dinners[idx] : null;
  const prev = idx > 0 ? dinners[idx - 1] : null;
  const next = idx >= 0 && idx < dinners.length - 1 ? dinners[idx + 1] : null;
  const nav: React.CSSProperties = { ...btn, padding: '14px 16px', fontSize: 16 };

  // Group the nights by place, keeping trip order
  const groups: { place: string; items: DinnerEntry[] }[] = [];
  for (const d of dinners) {
    const last = groups[groups.length - 1];
    if (last && last.place === d.place) last.items.push(d);
    else groups.push({ place: d.place, items: [d] });
  }

  return (
    <div style={{ maxWidth: 'var(--max-w)', margin: '0 auto', padding: '0 0 calc(env(safe-area-inset-bottom, 0px) + 40px)' }}>
      <header style={{
        padding: 'calc(env(safe-area-inset-top, 0px) + 16px) 16px 4px',
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12,
      }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 26, color: 'var(--ink)' }}>Where we eat</h1>
        <button type="button" onClick={() => go('intro')} style={{
          background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'var(--font-sans)',
          fontSize: 15, fontWeight: 600, color: SKY.text, borderBottom: `1px solid ${SKY.text}`,
        }}>How it works</button>
      </header>

      <nav aria-label="Nights" style={{
        position: 'sticky', top: 0, zIndex: 20, background: 'var(--bg)',
        padding: 'calc(env(safe-area-inset-top, 0px) + 8px) 0 10px', borderBottom: '3px double var(--border-mid)',
      }}>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '0 12px', scrollbarWidth: 'none', alignItems: 'center' }}>
          <button type="button" onClick={() => go('all')} aria-current={tab === 'all' ? 'page' : undefined} style={chipStyle(tab === 'all')}>Results</button>
          {groups.map((g, gi) => (
            <span key={g.place + gi} style={{ display: 'contents' }}>
              {gi > 0 && <span aria-hidden style={{ flexShrink: 0, width: 1, height: 24, background: 'var(--border-mid)', margin: '0 4px' }} />}
              {g.items.map(d => <DayChip key={d.stop.id} entry={d} active={tab === d.stop.id} onPick={() => go(d.stop.id)} />)}
            </span>
          ))}
        </div>
      </nav>

      <main style={{ padding: '0 12px' }}>
        {!current ? (
          <div style={{ marginTop: 4 }}>
            {groups.map((g, gi) => (
              <section key={g.place + gi}>
                <PlaceHeading>{placeName(g.place)}</PlaceHeading>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {g.items.map(d => <OverviewRow key={d.stop.id} entry={d} onPick={id => go(id)} />)}
                </div>
              </section>
            ))}
          </div>
        ) : (() => {
          const { head, sub } = splitDayLabel(current.dayLabel);
          const stop = current.stop;
          const special = /birthday|first-night/i.test(stop.title);
          return (
            <>
              <section id={`dinner-${stop.id}`} style={{
                position: 'relative', background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 14, padding: '16px 16px 16px 20px', marginTop: 12, overflow: 'hidden',
              }}>
                <div style={{ position: 'absolute', left: 0, top: 12, bottom: 12, width: 4, borderRadius: 4, background: /birthday/i.test(stop.title) ? RED.text : SKY.bar }} />
                <div className="num" style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 13, letterSpacing: '0.06em', textTransform: 'uppercase', color: /birthday/i.test(stop.title) ? RED.text : SKY.text }}>
                  {placeName(current.place)} · {stop.time_label ?? ''}{special ? ` · ${stop.title}` : ''}
                </div>
                <h2 style={{
                  fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 28, lineHeight: 1.15, color: 'var(--ink)',
                  marginTop: 6, paddingBottom: 8, borderBottom: '3px double var(--border-mid)',
                }}>{head}</h2>
                {sub && <div style={{ fontSize: 15, color: 'var(--ink-2)', marginTop: 8 }}>{sub}</div>}
                <DinnerOptions stop={stop} />
              </section>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 14 }}>
                {prev ? <button type="button" style={nav} onClick={() => go(prev.stop.id)}>‹ {chipLabel(splitDayLabel(prev.dayLabel).head)}</button>
                      : <button type="button" style={nav} onClick={() => go('all')}>‹ Results</button>}
                {next ? <button type="button" style={{ ...nav, background: SKY.text, color: 'var(--surface)', borderColor: SKY.text }} onClick={() => go(next.stop.id)}>Next: {chipLabel(splitDayLabel(next.dayLabel).head)} ›</button>
                      : <button type="button" style={{ ...nav, background: SKY.text, color: 'var(--surface)', borderColor: SKY.text }} onClick={() => go('all')}>See results ›</button>}
              </div>
            </>
          );
        })()}
      </main>
    </div>
  );
}

export function DinnerBoard({ tripId, tripTitle, slug, voters, weights = {}, dinners }: {
  tripId: number;
  tripTitle: string;
  slug: string;
  voters: string[];
  weights?: Record<string, number>;
  dinners: DinnerEntry[];
}) {
  return (
    <DinnerVoteProvider tripId={tripId} voters={voters} weights={weights} enabled={voters.length > 0 && dinners.length > 0}>
      <BoardInner tripId={tripId} tripTitle={tripTitle} slug={slug} dinners={dinners} />
    </DinnerVoteProvider>
  );
}
