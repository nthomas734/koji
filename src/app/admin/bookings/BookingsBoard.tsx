'use client';

// The booking-window board: every reservation and ticket, sorted by urgency.
// Open now → opens within 30 days → later → no date yet → booked/skipped.
// Phone: cards with a countdown and a status switch. Desktop (≥1000px): the
// same rows as a table across trips. Private: admin cookie only.

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  type Booking, type BookingKind, type BookingStatus, type WindowType, BOOKING_KINDS, statusLabel,
  effectiveStatus, fmtDate, fmtTime, leadText, mapsUrl, opensAt, zoneAbbr,
} from '@/lib/bookings';

export interface BoardTrip {
  id: number; slug: string; title: string; subtitle: string | null;
  date_start: string | null; date_end: string | null; header_theme: string | null;
}

const mono: React.CSSProperties = { fontFamily: 'var(--font-mono)' };
const STATUSES: BookingStatus[] = ['not_open', 'open', 'booked', 'skipped'];
const DAY = 86400000;

type Group = 'open' | 'soon' | 'later' | 'undated' | 'done';
const GROUPS: { key: Group; label: string }[] = [
  { key: 'open', label: 'Open now' },
  { key: 'soon', label: 'Opens soon · 30 days' },
  { key: 'later', label: 'Later' },
  { key: 'undated', label: 'No date yet' },
  { key: 'done', label: 'Booked or skipped' },
];

function groupOf(b: Booking, now: Date): Group {
  const s = effectiveStatus(b, now);
  if (s === 'booked' || s === 'skipped') return 'done';
  if (s === 'open') return 'open';
  const at = opensAt(b);
  if (!at) return 'undated';
  return at.getTime() - now.getTime() <= 30 * DAY ? 'soon' : 'later';
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** "Thu Jan 14, 10:00 JST" plus "Wed Jan 13, 7:00 PM your time" when they differ. */
function whenLines(b: Booking): { main: string; local: string | null } {
  if (!b.opens_on) return { main: '', local: null };
  const approx = b.opens_approx ? '~' : '';
  if (!b.opens_time || b.opens_approx) return { main: `${approx}${fmtDate(b.opens_on)}`, local: null };
  const at = opensAt(b)!;
  const main = `${fmtDate(b.opens_on)}, ${fmtTime(b.opens_time)} ${zoneAbbr(b.opens_tz, at)}`;
  const here = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (here === b.opens_tz) return { main, local: null };
  const local = at.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    .replace(/,(?= \d+:)/, ',');
  return { main, local: `${local} your time` };
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

function Pill({ b, s }: { b: Booking; s: BookingStatus }) {
  return <span className={`bk-pill bk-pill-${s}`}>{statusLabel(b, s)}</span>;
}

function Links({ b }: { b: Booking }) {
  if (!b.maps_query && !b.booking_url) return null;
  let host = '';
  try { host = b.booking_url ? new URL(b.booking_url).hostname.replace(/^www\./, '') : ''; } catch { host = 'Book'; }
  return (
    <div className="bk-links">
      {b.maps_query && <a href={mapsUrl(b.maps_query)} target="_blank" rel="noopener noreferrer">Maps</a>}
      {b.booking_url && <a href={b.booking_url} target="_blank" rel="noopener noreferrer">{host || 'Book'}</a>}
    </div>
  );
}

// ── Board ───────────────────────────────────────────────────────────────────

export default function BookingsBoard({ initial, trips, feedHttp, feedWebcal }: {
  initial: Booking[]; trips: BoardTrip[]; feedHttp: string; feedWebcal: string;
}) {
  const [rows, setRows] = useState<Booking[]>(initial);
  const [now, setNow] = useState(() => new Date());
  const [tripFilter, setTripFilter] = useState<string>('upcoming');
  const [editing, setEditing] = useState<number | 'new' | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showDone, setShowDone] = useState(false);
  const [copied, setCopied] = useState(false);

  // Countdowns, grouping and "your time" depend on the clock and the phone's
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

  const visible = rows.filter(b =>
    tripFilter === 'all' ? true : tripFilter === 'upcoming' ? upcomingIds.has(b.trip_id) : String(b.trip_id) === tripFilter);

  const sorted = [...visible].sort((a, b) => {
    const ta = opensAt(a)?.getTime() ?? Infinity, tb = opensAt(b)?.getTime() ?? Infinity;
    return ta - tb || a.sort_order - b.sort_order || a.id - b.id;
  });
  const grouped = new Map<Group, Booking[]>(GROUPS.map(g => [g.key, []]));
  for (const b of sorted) grouped.get(groupOf(b, now))!.push(b);

  const openCount = grouped.get('open')!.length;
  const toBook = visible.filter(b => b.status !== 'booked' && b.status !== 'skipped').length;
  const bookedCount = visible.filter(b => b.status === 'booked').length;
  const oneTrip = tripFilter !== 'all' && tripFilter !== 'upcoming' ? tripById.get(Number(tripFilter)) : null;
  const defaultTrip = oneTrip?.id ?? trips.find(t => upcomingIds.has(t.id))?.id ?? trips[0]?.id;

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

  const card = (b: Booking, g: Group) => {
    if (editing === b.id) {
      return <BookingForm key={b.id} draft={{ ...b }} trips={trips} saving={saving} onSave={save} onCancel={() => setEditing(null)} onDelete={() => remove(b.id)} />;
    }
    const s = effectiveStatus(b, now);
    const w = whenLines(b);
    const cd = g === 'soon' || g === 'later' ? countdown(b, now) : null;
    const trip = tripById.get(b.trip_id);
    const lead = leadText(b);
    return (
      <div key={b.id} className={`bk-card${g === 'open' ? ' hot' : ''}${g === 'done' ? ' done' : ''}`}>
        <div className="bk-ct">
          <div style={{ minWidth: 0 }}>
            <button className="bk-title" onClick={() => setEditing(b.id)} title="Edit">{b.title}</button>
            <div className="bk-what">
              {[b.what, b.for_date ? fmtDate(b.for_date) : null, !oneTrip && trip ? trip.title : null].filter(Boolean).join(' · ')}
            </div>
          </div>
          {cd ? (
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div className={`bk-cd${g === 'soon' ? ' soon' : ''}`}>{b.opens_approx ? '~' : ''}{cd.n}</div>
              <div className="bk-cdl">{b.window_type === 'deadline' ? `${cd.unit} left` : cd.unit}</div>
            </div>
          ) : <Pill b={b} s={s} />}
        </div>
        {(w.main || lead) && (
          <div className="bk-when">
            {g === 'done' || !w.main ? (b.window_type === 'deadline' && w.main ? 'Due ' : '') : (opensAt(b)?.getTime() ?? 0) <= now.getTime() ? (b.window_type === 'deadline' ? 'Was due ' : 'Opened ') : (b.window_type === 'deadline' ? 'Due ' : 'Opens ')}{w.main}
            {w.local && <em> · {w.local}</em>}
            {lead && b.window_type !== 'deadline' && <em> · {lead}</em>}
          </div>
        )}
        <Links b={b} />
        {b.notes && <div className="bk-note">{b.notes}</div>}
        {g !== 'done' && <StatusSwitch value={b.status === 'not_open' && s === 'open' ? 'open' : b.status} deadline={b.window_type === 'deadline'} onChange={st => setStatus(b, st)} />}
        {g === 'done' && <button className="bk-undo" onClick={() => setStatus(b, 'not_open')}>Undo</button>}
      </div>
    );
  };

  return (
    <div className="bk-page" style={{ maxWidth: 'var(--max-w)', margin: '0 auto', padding: '0 0 80px' }}>
      <header style={{ padding: '32px var(--px) 16px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ ...mono, fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--brass)', marginBottom: 6 }}>
          <Link href="/">koji</Link> · <Link href="/admin">admin</Link>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 }}>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 300, fontSize: 26, color: 'var(--ink)' }}>
            {oneTrip ? oneTrip.title : 'Booking windows'}
          </h1>
          <button className="bk-btn bk-btn-ink" onClick={() => setEditing('new')}>+ Add</button>
        </div>
        <div className="num" style={{ ...mono, fontSize: 10, color: 'var(--ink-4)', letterSpacing: '0.06em', marginTop: 4 }}>
          {toBook} to book{mounted ? ` · ${openCount} open now` : ''} · {bookedCount} booked
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 14, flexWrap: 'wrap' }}>
          {[{ v: 'upcoming', l: 'Upcoming trips' }, ...trips.filter(t => upcomingIds.has(t.id) || rows.some(r => r.trip_id === t.id)).map(t => ({ v: String(t.id), l: t.title })), { v: 'all', l: 'All' }]
            .map(o => <button key={o.v} className={`bk-chip${tripFilter === o.v ? ' on' : ''}`} onClick={() => setTripFilter(o.v)}>{o.l}</button>)}
        </div>
      </header>

      <main style={{ padding: '4px var(--px) 0' }}>
        {err && <div style={{ margin: '12px 0', padding: '10px 12px', background: '#FBEDE7', color: '#7A2A12', borderRadius: 8, fontSize: 13 }}>{err}</div>}
        {editing === 'new' && defaultTrip != null && (
          <div style={{ marginTop: 14 }}>
            <BookingForm draft={blank(defaultTrip)} trips={trips} saving={saving} onSave={save} onCancel={() => setEditing(null)} />
          </div>
        )}

        {!mounted && <div className="shimmer-anim" style={{ height: 120, marginTop: 20, borderRadius: 10, backgroundImage: 'linear-gradient(90deg, var(--bg-subtle), var(--surface), var(--bg-subtle))' }} />}

        {mounted && visible.length === 0 && editing !== 'new' && (
          <div style={{ textAlign: 'center', padding: '48px 12px' }}>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 19, fontWeight: 300, color: 'var(--ink-2)' }}>Nothing to book yet</div>
            <p style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 6, lineHeight: 1.5 }}>
              Add each reservation or ticket with the day booking opens.<br />koji will put it on your calendar and remind you.
            </p>
          </div>
        )}

        {/* Phone: grouped cards */}
        {mounted && <>
        <div className="bk-cards">
          {GROUPS.map(({ key, label }) => {
            const list = grouped.get(key)!;
            if (!list.length) return null;
            const collapsed = key === 'done' && !showDone;
            return (
              <section key={key}>
                <div className={`bk-group${key === 'open' ? ' hot' : ''}`}>
                  <span>{label}</span>
                  {key === 'done'
                    ? <button className="bk-undo" style={{ margin: 0 }} onClick={() => setShowDone(v => !v)}>{showDone ? 'hide' : `show ${list.length}`}</button>
                    : <span className="num">{list.length}</span>}
                </div>
                {!collapsed && list.map(b => card(b, key))}
              </section>
            );
          })}
        </div>

        {/* Desktop: one table across trips */}
        {visible.length > 0 && (
          <table className="bk-table">
            <thead><tr><th>Booking</th><th>Opens</th><th>Lead</th><th>For</th><th>Links</th><th>Status</th></tr></thead>
            <tbody>
              {GROUPS.flatMap(({ key }) => (key === 'done' && !showDone ? [] : grouped.get(key)!).map(b => {
                if (editing === b.id) return <tr key={b.id}><td colSpan={6}>{card(b, key)}</td></tr>;
                const s = effectiveStatus(b, now);
                const w = whenLines(b);
                const cd = s === 'not_open' ? countdown(b, now) : null;
                const trip = tripById.get(b.trip_id);
                return (
                  <tr key={b.id} className={`${key === 'open' ? 'hot' : ''}${key === 'done' ? ' done' : ''}`}>
                    <td>
                      {!oneTrip && trip && <span className="bk-trip">{trip.title}</span>}
                      <button className="bk-title" onClick={() => setEditing(b.id)}>{b.title}</button>
                      {(b.what || b.notes) && <div className="bk-what">{[b.what, b.notes].filter(Boolean).join(' · ')}</div>}
                    </td>
                    <td className="m">{b.window_type === 'deadline' && w.main ? 'Due ' : ''}{w.main || '—'}{w.local && <em>{w.local}</em>}{cd && <em>{b.window_type === 'deadline' ? `${cd.n} ${cd.unit} left` : `in ${cd.n} ${cd.unit}`}</em>}</td>
                    <td className="m">{b.window_type === 'deadline' ? 'deadline' : leadText(b) || '—'}</td>
                    <td className="m">{b.for_date ? fmtDate(b.for_date) : '—'}</td>
                    <td><Links b={b} /></td>
                    <td>
                      <select className="bk-select" value={b.status === 'not_open' && s === 'open' ? 'open' : b.status} onChange={e => setStatus(b, e.target.value as BookingStatus)}>
                        {STATUSES.filter(st => b.window_type !== 'deadline' || st !== 'open' || s === 'open').map(st => <option key={st} value={st}>{statusLabel(b, st)}</option>)}
                      </select>
                    </td>
                  </tr>
                );
              }))}
            </tbody>
          </table>
        )}
        {visible.length > 0 && grouped.get('done')!.length > 0 && (
          <button className="bk-undo bk-table-toggle" onClick={() => setShowDone(v => !v)}>
            {showDone ? 'Hide booked and skipped' : `Show ${grouped.get('done')!.length} booked or skipped`}
          </button>
        )}

        </>}

        {/* Calendar feed */}
        <section style={{ marginTop: 36, padding: 16, background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: '3px solid var(--brass)', borderRadius: 8 }}>
          <div style={{ ...mono, fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--brass)' }}>Reminders</div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400, margin: '4px 0 6px' }}>Subscribe in Apple Calendar</div>
          <p style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.55 }}>
            Each window becomes an event with alerts the day before and when it opens, plus a Sunday list of everything open and not booked.
            Booked and skipped items drop off at the next refresh. On a Mac, untick <b>Remove: Alerts</b> when subscribing, and set refresh to every hour.
            The link has a private key in it, so don&apos;t share it.
          </p>
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <a className="bk-btn bk-btn-ink" href={feedWebcal}>Subscribe</a>
            <button className="bk-btn" onClick={() => { navigator.clipboard?.writeText(feedHttp).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }); }}>
              {copied ? 'Copied' : 'Copy link'}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
