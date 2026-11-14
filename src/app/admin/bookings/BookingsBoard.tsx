'use client';

// The booking-window board. The trip's own hero (three counts and a To book /
// Booked / All switch), then a timeline: Open now, each month, No date yet,
// with a dot per booking coloured by kind. Tap a row to open notes, links and
// the status switch in place. Private: admin cookie only.

import { useEffect, useMemo, useState } from 'react';
import { OwnerNav } from '@/components/OwnerNav';
import {
  type Booking, type BookingKind, type BookingStatus, type WindowType, BOOKING_KINDS, statusLabel,
  effectiveStatus, fmtDate, fmtTime, leadText, mapsUrl, opensAt, zoneAbbr,
} from '@/lib/bookings';

export interface BoardTrip {
  id: number; slug: string; title: string; subtitle: string | null;
  date_start: string | null; date_end: string | null; header_theme: string | null;
  tz?: string | null;
}

const mono: React.CSSProperties = { fontFamily: 'var(--font-mono)' };
const STATUSES: BookingStatus[] = ['not_open', 'open', 'booked', 'skipped'];
const DAY = 86400000;

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** "Thu Jan 14, 10:00am JST" plus "Wed Jan 13, 5:00pm PT" (the phone's zone) when they differ. */
function whenLines(b: Booking): { main: string; local: string | null } {
  if (!b.opens_on) return { main: '', local: null };
  const approx = b.opens_approx ? '~' : '';
  if (!b.opens_time || b.opens_approx) return { main: `${approx}${fmtDate(b.opens_on)}`, local: null };
  const at = opensAt(b)!;
  const main = `${fmtDate(b.opens_on)}, ${fmtTime(b.opens_time)} ${zoneAbbr(b.opens_tz, at)}`;
  const here = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (here === b.opens_tz) return { main, local: null };
  const day = at.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).replace(',', '');
  const hm = at.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).replace(/\s?([AP])M$/, (_, x) => x.toLowerCase() + 'm');
  return { main, local: `${day}, ${hm} ${zoneAbbr(here, at)}` };
}

function countdown(b: Booking, now: Date): { n: string; unit: string } | null {
  const at = opensAt(b);
  if (!at) return null;
  const ms = at.getTime() - now.getTime();
  if (ms <= 0) return null;
  if (ms < DAY) {
    const h = Math.floor(ms / 3600000);
    return h >= 1 ? { n: String(h), unit: h === 1 ? 'hour' : 'hours' } : { n: String(Math.max(1, Math.ceil(ms / 60000))), unit: 'min' };
  }
  const d = Math.ceil(ms / DAY);
  return { n: String(d), unit: d === 1 ? 'day' : 'days' };
}

// ── Form ────────────────────────────────────────────────────────────────────

type Draft = Omit<Booking, 'id' | 'sort_order'> & { id?: number };

function blank(tripId: number): Draft {
  return {
    trip_id: tripId, title: '', kind: 'restaurant', what: '', for_date: '', opens_on: '', opens_time: '',
    opens_tz: 'Asia/Tokyo', opens_approx: false, lead: '', maps_query: '', booking_url: '', status: 'not_open', notes: '', window_type: 'opens',
  };
}

const input: React.CSSProperties = {
  width: '100%', fontFamily: 'var(--font-sans)', fontSize: 14, padding: '8px 10px',
  border: '1px solid var(--border-mid)', borderRadius: 6, background: 'var(--surface)', color: 'var(--ink)',
};
const lbl: React.CSSProperties = { ...mono, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-4)', display: 'block', marginBottom: 4 };

function Field({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return <label style={{ display: 'block', gridColumn: wide ? '1 / -1' : undefined }}><span style={lbl}>{label}</span>{children}</label>;
}

function BookingForm({ draft, trips, onSave, onCancel, onDelete, saving }: {
  draft: Draft; trips: BoardTrip[]; saving: boolean;
  onSave: (d: Draft) => void; onCancel: () => void; onDelete?: () => void;
}) {
  const [d, setD] = useState<Draft>(draft);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD(p => ({ ...p, [k]: v }));
  const str = (v: string | null) => v ?? '';
  return (
    <div className="bk-form" style={{ background: 'var(--surface)', border: '1px dashed var(--border-mid)', borderRadius: 10, padding: 14, marginBottom: 10 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field label="Title" wide><input style={input} value={d.title} onChange={e => set('title', e.target.value)} placeholder="Romancecar" autoFocus /></Field>
        <Field label="Trip">
          <select style={input} value={d.trip_id} onChange={e => set('trip_id', Number(e.target.value))}>
            {trips.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
        </Field>
        <Field label="Kind">
          <select style={input} value={d.kind} onChange={e => set('kind', e.target.value as BookingKind)}>
            {BOOKING_KINDS.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        </Field>
        <Field label="Date means">
          <select style={input} value={d.window_type} onChange={e => set('window_type', e.target.value as WindowType)}>
            <option value="opens">Booking opens</option>
            <option value="deadline">Deadline (act by)</option>
          </select>
        </Field>
        <Field label="What it is" wide><input style={input} value={str(d.what)} onChange={e => set('what', e.target.value)} placeholder="Shinjuku → Hakone, front observation seats" /></Field>
        <Field label="For (the day itself)"><input type="date" style={input} value={str(d.for_date)} onChange={e => set('for_date', e.target.value)} /></Field>
        <Field label="How far out"><input style={input} value={str(d.lead)} onChange={e => set('lead', e.target.value)} placeholder="1 month" /></Field>
        <Field label={d.window_type === 'deadline' ? 'Deadline' : 'Booking opens'}><input type="date" style={input} value={str(d.opens_on)} onChange={e => set('opens_on', e.target.value)} /></Field>
        <Field label="At (local time)"><input type="time" style={input} value={str(d.opens_time).slice(0, 5)} onChange={e => set('opens_time', e.target.value)} /></Field>
        <Field label="Time zone"><input style={input} value={d.opens_tz} onChange={e => set('opens_tz', e.target.value)} placeholder="Asia/Tokyo" /></Field>
        <Field label="Date is approximate">
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, height: 37 }}>
            <input type="checkbox" checked={d.opens_approx} onChange={e => set('opens_approx', e.target.checked)} />
            <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>~ about then</span>
          </span>
        </Field>
        <Field label="Place, for Google Maps" wide><input style={input} value={str(d.maps_query)} onChange={e => set('maps_query', e.target.value)} placeholder="Shinjuku Station Odakyu" /></Field>
        <Field label="Official booking page (optional)" wide><input style={input} value={str(d.booking_url)} onChange={e => set('booking_url', e.target.value)} placeholder="https://…" /></Field>
        <Field label="Notes · no confirmation or seat numbers" wide>
          <textarea style={{ ...input, minHeight: 60, resize: 'vertical' }} value={str(d.notes)} onChange={e => set('notes', e.target.value)} />
        </Field>
        <Field label="Status" wide>
          <StatusSwitch value={d.status} deadline={d.window_type === 'deadline'} onChange={s => set('status', s)} />
        </Field>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 14, alignItems: 'center' }}>
        <button className="bk-btn bk-btn-ink" disabled={saving || !d.title.trim()} onClick={() => onSave(d)}>{saving ? 'Saving…' : 'Save'}</button>
        <button className="bk-btn" onClick={onCancel}>Cancel</button>
        {onDelete && <button className="bk-btn" style={{ marginLeft: 'auto', color: '#B23A1C', borderColor: '#E4B9A6' }}
          onClick={() => { if (confirm(`Delete "${d.title}"?`)) onDelete(); }}>Delete</button>}
      </div>
    </div>
  );
}

function StatusSwitch({ value, onChange, deadline }: { value: BookingStatus; onChange: (s: BookingStatus) => void; deadline?: boolean }) {
  const opts = deadline ? STATUSES.filter(s => s !== 'open') : STATUSES;
  const shown = deadline && value === 'open' ? 'not_open' : value;
  return (
    <div className="bk-seg" role="radiogroup">
      {opts.map(s => (
        <button key={s} role="radio" aria-checked={shown === s} className={shown === s ? 'on' : ''} onClick={() => onChange(s)}>
          {statusLabel({ window_type: deadline ? 'deadline' : 'opens' }, s)}
        </button>
      ))}
    </div>
  );
}

function Links({ b, tz, onEdit }: { b: Booking; tz?: string | null; onEdit: () => void }) {
  let host = '';
  try { host = b.booking_url ? new URL(b.booking_url).hostname.replace(/^www\./, '') : ''; } catch { host = 'Book'; }
  return (
    <div className="bk-links">
      {b.maps_query && <a className="maps" href={mapsUrl(b.maps_query, tz)} target="_blank" rel="noopener noreferrer">Maps</a>}
      {b.booking_url && <a href={b.booking_url} target="_blank" rel="noopener noreferrer" title={host}>Book ↗</a>}
      <button onClick={onEdit}>Edit</button>
    </div>
  );
}

// ── Timeline ────────────────────────────────────────────────────────────────

type View = 'todo' | 'done' | 'all';

/** Dot colour: the itinerary's tag colours, by kind. Deadlines are pink. */
function dotOf(b: Booking): string {
  if (b.window_type === 'deadline') return 'var(--pink-mid)';
  switch (b.kind) {
    case 'restaurant': return 'var(--amber-mid)';
    case 'train': case 'flight': return 'var(--navy-mid)';
    case 'ticket': case 'tour': return 'var(--emerald-mid)';
    case 'hotel': return 'var(--brass-tag-mid)';
    default: return 'var(--gray-tag-mid)';
  }
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** Heading key: open-and-not-booked first, then each month, then undated. */
function sectionOf(b: Booking, now: Date): string {
  const s = effectiveStatus(b, now);
  if (s === 'open') return 'open';
  return b.opens_on ? b.opens_on.slice(0, 7) : 'undated';
}

function sectionLabel(key: string, thisYear: number): string {
  if (key === 'open') return 'Open now';
  if (key === 'undated') return 'No date yet';
  const [y, m] = key.split('-').map(Number);
  return y === thisYear ? MONTHS[m - 1] : `${MONTHS[m - 1]} ${y}`;
}

// Hero themes whose background is light take ink text on tinted controls.
const LIGHT_THEMES = new Set(['linen', 'stone', 'pewter', 'marigold']);

function fmtRange(a: string | null, b: string | null): string {
  if (!a) return '';
  const [, m1, d1] = a.split('-').map(Number);
  const mo = (m: number) => MONTHS[m - 1].slice(0, 3);
  if (!b || b === a) return `${mo(m1)} ${d1}`;
  const [, m2, d2] = b.split('-').map(Number);
  return m1 === m2 ? `${mo(m1)} ${d1}–${d2}` : `${mo(m1)} ${d1} – ${mo(m2)} ${d2}`;
}

// ── Board ───────────────────────────────────────────────────────────────────

const FEED_KEY = 'koji:bookings-feed-subscribed';

export default function BookingsBoard({ initial, trips, feedHttp, feedWebcal }: {
  initial: Booking[]; trips: BoardTrip[]; feedHttp: string; feedWebcal: string;
}) {
  const [rows, setRows] = useState<Booking[]>(initial);
  const [now, setNow] = useState(() => new Date());
  const [tripFilter, setTripFilter] = useState<string>('upcoming');
  const [view, setView] = useState<View>('todo');
  const [open, setOpen] = useState<number | null>(null);
  const [editing, setEditing] = useState<number | 'new' | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  // Once the calendar feed has been subscribed to (or its link copied) on this
  // device, the card folds to one line; it only needs setting up once.
  const [feedDone, setFeedDone] = useState(false);
  const [feedOpen, setFeedOpen] = useState(false);
  useEffect(() => { try { setFeedDone(localStorage.getItem(FEED_KEY) === '1'); } catch {} }, []);
  const markFeedDone = () => { try { localStorage.setItem(FEED_KEY, '1'); } catch {} };

  // Countdowns, sections and "your time" depend on the clock and the phone's
  // zone, which the server (UTC on Vercel) doesn't share, so they render
  // client-side only.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true); setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const today = todayIso();
  const tripById = useMemo(() => new Map(trips.map(t => [t.id, t])), [trips]);
  const upcomingIds = useMemo(() => new Set(trips.filter(t => !(t.date_end ?? t.date_start) || (t.date_end ?? t.date_start)! >= today).map(t => t.id)), [trips, today]);

  const inTrip = rows.filter(b =>
    tripFilter === 'all' ? true : tripFilter === 'upcoming' ? upcomingIds.has(b.trip_id) : String(b.trip_id) === tripFilter);
  const isDone = (b: Booking) => b.status === 'booked' || b.status === 'skipped';
  const visible = inTrip.filter(b => view === 'all' || (view === 'done') === isDone(b));

  const sorted = [...visible].sort((a, b) => {
    const ta = opensAt(a)?.getTime() ?? Infinity, tb = opensAt(b)?.getTime() ?? Infinity;
    return ta - tb || a.sort_order - b.sort_order || a.id - b.id;
  });
  const sections = new Map<string, Booking[]>();
  if (view !== 'done') sections.set('open', []);
  for (const b of sorted) {
    const k = isDone(b) ? (b.opens_on ? b.opens_on.slice(0, 7) : 'undated') : sectionOf(b, now);
    if (!sections.has(k)) sections.set(k, []);
    sections.get(k)!.push(b);
  }
  const order = [...sections.keys()].sort((a, b) => (a === 'open' ? -1 : b === 'open' ? 1 : a === 'undated' ? 1 : b === 'undated' ? -1 : a.localeCompare(b)));

  // The hero takes the trip's colours when the list is one trip's.
  const tripIdsInView = new Set(inTrip.map(b => b.trip_id));
  const oneTrip = tripFilter !== 'all' && tripFilter !== 'upcoming'
    ? tripById.get(Number(tripFilter)) ?? null
    : tripIdsInView.size === 1 ? tripById.get([...tripIdsInView][0]) ?? null : null;
  const theme = oneTrip?.header_theme ?? null;
  const heroBg = theme ? `var(--trip-${theme})` : 'var(--ink)';
  const heroFg = theme ? `var(--trip-${theme}-fg)` : 'var(--bg)';
  const light = theme ? LIGHT_THEMES.has(theme) : false;
  const defaultTrip = oneTrip?.id ?? trips.find(t => upcomingIds.has(t.id))?.id ?? trips[0]?.id;

  const active = inTrip.filter(b => !isDone(b));
  const openNow = active.filter(b => b.window_type !== 'deadline' && effectiveStatus(b, now) === 'open').length;
  const opening = active.filter(b => b.window_type !== 'deadline' && effectiveStatus(b, now) === 'not_open').length;
  const deadlines = active.filter(b => b.window_type === 'deadline').length;
  const tripChoices = trips.filter(t => rows.some(r => r.trip_id === t.id));

  async function save(d: Draft) {
    setSaving(true); setErr(null);
    const { id, ...body } = d;
    const res = await fetch(id ? `/api/admin/bookings?id=${id}` : '/api/admin/bookings', {
      method: id ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) { setErr(json.error ?? `Save failed (${res.status})`); return; }
    setRows(prev => id ? prev.map(r => r.id === id ? json.row : r) : [...prev, json.row]);
    setEditing(null);
  }

  async function setStatus(b: Booking, status: BookingStatus) {
    const before = rows;
    setRows(prev => prev.map(r => r.id === b.id ? { ...r, status } : r));
    const res = await fetch(`/api/admin/bookings?id=${b.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
    });
    if (!res.ok) { setRows(before); setErr('Could not save the status. Check your connection.'); }
  }

  async function remove(id: number) {
    const res = await fetch(`/api/admin/bookings?id=${id}`, { method: 'DELETE' });
    if (!res.ok) { setErr('Delete failed'); return; }
    setRows(prev => prev.filter(r => r.id !== id));
    setEditing(null);
  }

  /** The mono line above the title: when it opens (or is due), and how long until. */
  function dateLine(b: Booking, s: BookingStatus, done: boolean) {
    const w = whenLines(b);
    const cd = !done && s === 'not_open' ? countdown(b, now) : null;
    const dl = b.window_type === 'deadline';
    const parts: React.ReactNode[] = [];
    if (dl) parts.push(<span key="dl" className="dl">{s === 'open' && !done ? 'overdue' : 'deadline'}</span>);
    if (w.main) parts.push(<span key="w">{dl ? 'by ' : ''}{w.main}</span>);
    else if (!done && s === 'open') parts.push(<span key="o">open now</span>);
    else parts.push(<span key="n">no date yet</span>);
    if (cd) parts.push(<i key="cd">{b.opens_approx ? '~' : ''}{cd.n} {cd.unit}{dl ? ' left' : ''}</i>);
    return parts.flatMap((p, i) => i ? [<i key={`s${i}`}> · </i>, p] : [p]);
  }

  const row = (b: Booking) => {
    if (editing === b.id) {
      return <div key={b.id} className="bk-ev" style={{ ['--dot' as string]: dotOf(b) }}>
        <BookingForm draft={{ ...b }} trips={trips} saving={saving} onSave={save} onCancel={() => setEditing(null)} onDelete={() => remove(b.id)} />
      </div>;
    }
    const s = effectiveStatus(b, now);
    const done = isDone(b);
    const w = whenLines(b);
    const trip = tripById.get(b.trip_id);
    const lead = leadText(b);
    const isOpen = open === b.id;
    const sub = [b.what, b.for_date ? `for ${fmtDate(b.for_date)}` : null, !oneTrip && trip ? trip.title : null].filter(Boolean).join(' · ');
    return (
      <div key={b.id} className={`bk-ev${!done && s === 'open' ? ' hot' : ''}${done ? ' done' : ''}`} style={{ ['--dot' as string]: dotOf(b) }}>
        <button className="bk-row" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : b.id)}>
          <div className="bk-dt">{dateLine(b, s, done)}</div>
          <div className="bk-title">{b.title}</div>
          {sub && <div className="bk-what">{sub}</div>}
        </button>
        {isOpen && (
          <div className="bk-x">
            <dl className="bk-kv">
              {w.main && <><dt>{b.window_type === 'deadline' ? 'Due' : 'Opens'}</dt><dd>{w.main}{w.local && <><br />{w.local}</>}</dd></>}
              {b.for_date && <><dt>For</dt><dd>{fmtDate(b.for_date)}</dd></>}
              {lead && b.window_type !== 'deadline' && <><dt>Lead</dt><dd>{lead}</dd></>}
              {!oneTrip && trip && <><dt>Trip</dt><dd>{trip.title}</dd></>}
            </dl>
            {b.notes && <div className="bk-note">{b.notes}</div>}
            <Links b={b} tz={trip?.tz} onEdit={() => setEditing(b.id)} />
            {done
              ? <button className="bk-undo" onClick={() => setStatus(b, 'not_open')}>Undo</button>
              : <StatusSwitch value={b.status === 'not_open' && s === 'open' ? 'open' : b.status} deadline={b.window_type === 'deadline'} onChange={st => setStatus(b, st)} />}
          </div>
        )}
      </div>
    );
  };

  const views: { v: View; l: string }[] = [{ v: 'todo', l: 'To book' }, { v: 'done', l: 'Booked' }, { v: 'all', l: 'All' }];
  const thisYear = now.getFullYear();

  return (
    <div className="bk-page" style={{ maxWidth: 'var(--max-w)', margin: '0 auto', padding: '0 0 80px' }}>
      <OwnerNav here="bookings" />

      <section className={`bk-hero${light ? ' light' : ''}`} style={{ background: heroBg, color: heroFg }}>
        <div className="bk-hero-top">
          <div className="bk-eyebrow">Bookings · {active.length} to make</div>
          <button className="bk-add" style={{ color: heroFg }} onClick={() => { setEditing('new'); setOpen(null); }}>+ Add</button>
        </div>
        <h1>{oneTrip ? oneTrip.title : tripFilter === 'all' ? 'All trips' : 'Upcoming trips'}</h1>
        {oneTrip && <div className="bk-hero-sub">{[oneTrip.subtitle, fmtRange(oneTrip.date_start, oneTrip.date_end)].filter(Boolean).join(' · ')}</div>}
        <div className="bk-tiles" style={{ visibility: mounted ? 'visible' : 'hidden' }}>
          <div className="bk-tile" style={{ borderColor: 'var(--amber-bg)' }}><b>{openNow}</b><span>open now</span></div>
          <div className="bk-tile" style={{ borderColor: 'var(--navy-bg)' }}><b>{opening}</b><span>opening</span></div>
          <div className="bk-tile" style={{ borderColor: 'var(--pink-bg)' }}><b>{deadlines}</b><span>{deadlines === 1 ? 'deadline' : 'deadlines'}</span></div>
        </div>
        <div className="bk-htabs" role="tablist">
          {views.map(o => (
            <button key={o.v} role="tab" aria-selected={view === o.v} className={view === o.v ? 'on' : ''}
              style={view === o.v ? { background: heroFg, color: heroBg } : { color: heroFg }}
              onClick={() => { setView(o.v); setOpen(null); }}>{o.l}</button>
          ))}
        </div>
      </section>

      {tripChoices.length > 1 && (
        <div className="bk-trips">
          {[{ v: 'upcoming', l: 'Upcoming' }, ...tripChoices.map(t => ({ v: String(t.id), l: t.title })), { v: 'all', l: 'All' }]
            .map(o => <button key={o.v} className={`bk-chip${tripFilter === o.v ? ' on' : ''}`} onClick={() => setTripFilter(o.v)}>{o.l}</button>)}
        </div>
      )}

      <main style={{ paddingTop: 4 }}>
        {err && <div style={{ margin: '12px var(--px)', padding: '10px 12px', background: '#FBEDE7', color: '#7A2A12', borderRadius: 8, fontSize: 13 }}>{err}</div>}
        {editing === 'new' && defaultTrip != null && (
          <div style={{ margin: '14px var(--px) 0' }}>
            <BookingForm draft={blank(defaultTrip)} trips={trips} saving={saving} onSave={save} onCancel={() => setEditing(null)} />
          </div>
        )}

        {!mounted && <div className="shimmer-anim" style={{ height: 160, margin: '24px var(--px) 0', borderRadius: 12, backgroundImage: 'linear-gradient(90deg, var(--bg-subtle), var(--surface), var(--bg-subtle))' }} />}

        {mounted && visible.length === 0 && editing !== 'new' && (
          <div style={{ textAlign: 'center', padding: '48px 24px' }}>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 19, fontWeight: 300, color: 'var(--ink-2)' }}>
              {view === 'done' ? 'Nothing booked yet' : view === 'todo' && inTrip.length ? 'All booked' : 'Nothing to book yet'}
            </div>
            {view !== 'done' && !inTrip.length && (
              <p style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 6, lineHeight: 1.5 }}>
                Add each reservation or ticket with the day booking opens.<br />koji will put it on your calendar and remind you.
              </p>
            )}
          </div>
        )}

        {mounted && order.map(k => {
          const list = sections.get(k)!;
          if (!list.length) return null;
          return (
            <section key={k}>
              <div className={`bk-month${k === 'open' ? ' hot' : ''}`}>
                {sectionLabel(k, thisYear)}<span>{list.length}</span>
              </div>
              <div className="bk-line">{list.map(row)}</div>
            </section>
          );
        })}

        {/* Calendar feed: the setup card, or one line once it's set up here */}
        {feedDone && !feedOpen ? (
          <section className="bk-feed" style={{ padding: '10px 14px' }}>
            <div className="bk-feed-ic" style={{ background: heroBg, color: heroFg, width: 26, height: 26, fontSize: 12 }}>✓</div>
            <div style={{ flex: 1, minWidth: 0, fontSize: 13, color: 'var(--ink-2)' }}>On your calendar</div>
            <button className="bk-btn" onClick={() => setFeedOpen(true)}>Link</button>
          </section>
        ) : (
          <section className="bk-feed">
            <div className="bk-feed-ic" style={{ background: heroBg, color: heroFg }}>◷</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Alerts on your calendar</div>
              <p style={{ fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.5, marginTop: 3 }}>
                The day before and when each window opens, plus a Sunday list of what&apos;s open. On a Mac, untick <b>Remove: Alerts</b> and refresh hourly. The link has a private key, so don&apos;t share it.
              </p>
              <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                <a className="bk-btn bk-btn-ink" href={feedWebcal} onClick={markFeedDone}>Subscribe</a>
                <button className="bk-btn" onClick={() => { navigator.clipboard?.writeText(feedHttp).then(() => { markFeedDone(); setCopied(true); setTimeout(() => setCopied(false), 1500); }); }}>
                  {copied ? 'Copied' : 'Copy link'}
                </button>
                <button className="bk-btn" style={{ marginLeft: 'auto' }} onClick={() => { markFeedDone(); setFeedDone(true); setFeedOpen(false); }}>
                  {feedDone ? 'Hide' : 'Already done'}
                </button>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
