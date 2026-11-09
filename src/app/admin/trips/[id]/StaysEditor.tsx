'use client';

// ── STAYS ───────────────────────────────────────────────────────────────────
// One row per town you sleep in. These drive the band of towns in the hero,
// the colour under each day pill and the chapter heading before each town.
// Leave the list empty and the trip page looks exactly as it did before.

import { useState } from 'react';
import { STAY_COLORS, type Stay, type StayColor } from '@/lib/supabase';
import { STAY_PALETTE } from '@/components/Stays';

const box: React.CSSProperties = {
  width: '100%', padding: '8px 10px', background: 'var(--surface)',
  border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, color: 'var(--ink)',
};
const lab: React.CSSProperties = {
  fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase',
  color: 'var(--ink-4)', display: 'block', marginBottom: 4,
};
const btn: React.CSSProperties = {
  fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', padding: '8px 14px',
  borderRadius: 6, border: '1px solid var(--border)', cursor: 'pointer',
};

function F({ label, value, onChange, type = 'text', rows }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; rows?: number;
}) {
  return (
    <div style={{ marginBottom: 10, minWidth: 0 }}>
      <label style={lab}>{label}</label>
      {rows
        ? <textarea value={value} rows={rows} onChange={e => onChange(e.target.value)} style={{ ...box, resize: 'vertical' }} />
        : <input type={type} value={value} onChange={e => onChange(e.target.value)} style={box} />}
    </div>
  );
}

type Draft = {
  place: string; local_name: string; check_in: string; nights: string; color: StayColor;
  hotel: string; hotel_query: string; booked: boolean; desk_hours: string; intro_md: string; photo_url: string;
};

function toDraft(s: Stay): Draft {
  return {
    place: s.place, local_name: s.local_name ?? '', check_in: s.check_in, nights: String(s.nights), color: s.color,
    hotel: s.hotel ?? '', hotel_query: s.hotel_query ?? '', booked: s.booked, desk_hours: s.desk_hours ?? '',
    intro_md: s.intro_md ?? '', photo_url: s.photo_url ?? '',
  };
}

function fromDraft(d: Draft): Partial<Stay> {
  const n = (v: string) => (v.trim() ? v.trim() : null);
  return {
    place: d.place.trim() || 'Somewhere', local_name: n(d.local_name), check_in: d.check_in,
    nights: Math.max(1, parseInt(d.nights) || 1), color: d.color, hotel: n(d.hotel), hotel_query: n(d.hotel_query),
    booked: d.booked, desk_hours: n(d.desk_hours), intro_md: n(d.intro_md), photo_url: n(d.photo_url),
  };
}

function StayRow({ stay, onSave, onDelete }: {
  stay: Stay; onSave: (d: Partial<Stay>) => Promise<void>; onDelete: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [d, setD] = useState<Draft>(toDraft(stay));
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD(cur => ({ ...cur, [k]: v }));

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 8, marginBottom: 6, overflow: 'hidden' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', textAlign: 'left',
          background: open ? 'var(--surface-mid)' : 'var(--surface)', borderLeft: `4px solid ${STAY_PALETTE[d.color].ink}`,
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', flex: 1, minWidth: 0 }}>
          {d.place} {d.local_name && <span style={{ color: 'var(--ink-4)' }}>{d.local_name}</span>}
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-4)' }}>
          {d.check_in} · {d.nights}n
        </span>
        <span style={{ fontSize: 12, color: 'var(--ink-4)' }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{ padding: '14px 12px', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <F label="Town" value={d.place} onChange={v => set('place', v)} />
            <F label="Local name" value={d.local_name} onChange={v => set('local_name', v)} />
            <F label="Check-in" type="date" value={d.check_in} onChange={v => set('check_in', v)} />
            <F label="Nights" type="number" value={d.nights} onChange={v => set('nights', v)} />
          </div>

          <label style={lab}>Colour</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
            {STAY_COLORS.map(c => (
              <button
                key={c}
                type="button"
                aria-label={c}
                aria-pressed={d.color === c}
                onClick={() => set('color', c)}
                style={{
                  width: 28, height: 28, borderRadius: 999, background: STAY_PALETTE[c].ink,
                  outline: d.color === c ? '2px solid var(--ink)' : 'none', outlineOffset: 2,
                }}
              />
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <F label="Hotel" value={d.hotel} onChange={v => set('hotel', v)} />
            <F label="Maps search (optional)" value={d.hotel_query} onChange={v => set('hotel_query', v)} />
          </div>
          <F label="Desk hours" value={d.desk_hours} onChange={v => set('desk_hours', v)} />
          <F label="Intro (Markdown)" value={d.intro_md} onChange={v => set('intro_md', v)} rows={2} />
          <F label="Photo URL" value={d.photo_url} onChange={v => set('photo_url', v)} />

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-3)' }}>
            <input type="checkbox" checked={d.booked} onChange={e => set('booked', e.target.checked)} />
            Booked
          </label>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              disabled={saving}
              onClick={async () => { setSaving(true); await onSave(fromDraft(d)); setSaving(false); setOpen(false); }}
              style={{ ...btn, background: 'var(--ink)', color: 'var(--bg)' }}
            >
              {saving ? 'saving…' : 'Save stay'}
            </button>
            <button type="button" onClick={onDelete} style={{ ...btn, color: '#DC2626', background: 'var(--surface)' }}>
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function StaysEditor({ tripId, dateStart, initial }: {
  tripId: number; dateStart: string | null; initial: Stay[];
}) {
  const [stays, setStays] = useState(initial);
  const [adding, setAdding] = useState(false);
  const sorted = [...stays].sort((a, b) => a.check_in.localeCompare(b.check_in) || a.sort_order - b.sort_order);

  async function add() {
    setAdding(true);
    // Start the new stay where the last one ends, so adding them in order is quick.
    const last = sorted[sorted.length - 1];
    let check_in = dateStart ?? new Date().toISOString().slice(0, 10);
    if (last) {
      const dt = new Date(last.check_in + 'T00:00');
      dt.setDate(dt.getDate() + last.nights);
      check_in = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    }
    const color = STAY_COLORS[stays.length % STAY_COLORS.length];
    const res = await fetch('/api/admin/stays', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trip_id: tripId, place: 'New town', check_in, nights: 2, color, sort_order: stays.length }),
    });
    const { stay } = await res.json();
    if (stay) setStays(s => [...s, stay]);
    setAdding(false);
  }

  async function save(id: number, data: Partial<Stay>) {
    await fetch(`/api/admin/stays?id=${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    setStays(s => s.map(x => (x.id === id ? { ...x, ...data } : x)));
  }

  async function remove(id: number) {
    if (!confirm('Delete this stay?')) return;
    await fetch(`/api/admin/stays?id=${id}`, { method: 'DELETE' });
    setStays(s => s.filter(x => x.id !== id));
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, marginBottom: 20 }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--brass)', marginBottom: 6 }}>
        Stays
      </div>
      <p style={{ fontSize: 12, color: 'var(--ink-3)', margin: '0 0 12px', lineHeight: 1.5 }}>
        One per town you sleep in. They colour the day pills and start a chapter on the trip page.
      </p>
      {sorted.map(s => (
        <StayRow key={s.id} stay={s} onSave={d => save(s.id, d)} onDelete={() => remove(s.id)} />
      ))}
      <button
        type="button"
        onClick={add}
        disabled={adding}
        style={{
          width: '100%', padding: 8, border: '1px dashed var(--border-mid)', borderRadius: 6, background: 'transparent',
          fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', color: 'var(--ink-3)', cursor: 'pointer', marginTop: 4,
        }}
      >
        {adding ? 'adding…' : '+ add stay'}
      </button>
    </div>
  );
}
