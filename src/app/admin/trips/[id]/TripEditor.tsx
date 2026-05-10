'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Trip, Day, Stop, Logistics } from '@/lib/supabase';

const TAG_COLOR_OPTIONS = [
  'green','navy','amber','pink','sky','emerald','gray','brass',
];

const THEME_OPTIONS = ['forest','navy','plum','earth','sand'];

// ── SMALL HELPERS ──────────────────────────────────────────────────────────

function inputStyle(extra?: React.CSSProperties): React.CSSProperties {
  return {
    width: '100%',
    padding: '8px 10px',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    fontSize: 13,
    color: 'var(--ink)',
    ...extra,
  };
}

function labelStyle(): React.CSSProperties {
  return {
    fontFamily: 'var(--font-mono)',
    fontSize: 9,
    letterSpacing: '0.15em',
    textTransform: 'uppercase' as const,
    color: 'var(--ink-4)',
    display: 'block',
    marginBottom: 4,
  };
}

function Field({
  label, value, onChange, type = 'text', rows,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  rows?: number;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={labelStyle()}>{label}</label>
      {rows ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          rows={rows}
          style={{ ...inputStyle(), resize: 'vertical' }}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          style={inputStyle()}
        />
      )}
    </div>
  );
}

function Select({
  label, value, onChange, options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={labelStyle()}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} style={inputStyle()}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

// ── STOP EDITOR ────────────────────────────────────────────────────────────

function StopEditor({
  stop,
  onSave,
  onDelete,
}: {
  stop: Stop;
  onSave: (updated: Partial<Stop>) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [open, setOpen]     = useState(false);
  const [saving, setSaving] = useState(false);
  const [data, setData]     = useState({
    time_label: stop.time_label ?? '',
    tag:        stop.tag,
    tag_color:  stop.tag_color,
    title:      stop.title,
    body_md:    stop.body_md,
  });

  const set = (k: string, v: string) => setData(d => ({ ...d, [k]: v }));

  async function save() {
    setSaving(true);
    await onSave(data);
    setSaving(false);
    setOpen(false);
  }

  return (
    <div style={{
      border: '1px solid var(--border)',
      borderRadius: 8,
      marginBottom: 6,
      overflow: 'hidden',
    }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 12px',
          cursor: 'pointer',
          background: open ? 'var(--surface-mid)' : 'var(--surface)',
        }}
      >
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          color: 'var(--ink-4)',
          minWidth: 32,
        }}>
          {data.time_label || '—'}
        </span>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          background: 'var(--bg-subtle)',
          padding: '1px 6px',
          borderRadius: 3,
          color: 'var(--ink-3)',
          textTransform: 'uppercase',
        }}>
          {data.tag}
        </span>
        <span style={{ fontSize: 13, fontWeight: 500, flex: 1, color: 'var(--ink)' }}>
          {data.title}
        </span>
        <span style={{ fontSize: 12, color: 'var(--ink-4)' }}>{open ? '▲' : '▼'}</span>
      </div>

      {open && (
        <div style={{ padding: '14px 12px', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Time" value={data.time_label} onChange={v => set('time_label', v)} />
            <Select label="Tag color" value={data.tag_color} onChange={v => set('tag_color', v)} options={TAG_COLOR_OPTIONS} />
          </div>
          <Field label="Tag" value={data.tag} onChange={v => set('tag', v)} />
          <Field label="Title" value={data.title} onChange={v => set('title', v)} />
          <Field label="Body (Markdown)" value={data.body_md} onChange={v => set('body_md', v)} rows={4} />

          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button
              onClick={save}
              disabled={saving}
              style={{
                ...inputStyle({ width: 'auto' }),
                background: 'var(--ink)',
                color: 'var(--bg)',
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                letterSpacing: '0.1em',
                cursor: 'pointer',
                padding: '8px 16px',
              }}
            >
              {saving ? 'saving…' : 'Save stop'}
            </button>
            <button
              onClick={onDelete}
              style={{
                ...inputStyle({ width: 'auto' }),
                color: '#DC2626',
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                letterSpacing: '0.1em',
                cursor: 'pointer',
                padding: '8px 16px',
              }}
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── DAY EDITOR ─────────────────────────────────────────────────────────────

function DayEditor({
  day,
  onAddStop,
  onSaveStop,
  onDeleteStop,
  onDeleteDay,
}: {
  day: Day;
  onAddStop: (dayId: number) => Promise<void>;
  onSaveStop: (stopId: number, data: Partial<Stop>) => Promise<void>;
  onDeleteStop: (stopId: number, dayId: number) => Promise<void>;
  onDeleteDay: (dayId: number) => Promise<void>;
}) {
  const [adding, setAdding] = useState(false);

  async function addStop() {
    setAdding(true);
    await onAddStop(day.id);
    setAdding(false);
  }

  return (
    <div style={{
      marginBottom: 16,
      border: '1px solid var(--border)',
      borderRadius: 10,
      overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 14px',
        background: 'var(--bg-subtle)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          color: 'var(--ink-2)',
        }}>
          {day.label}
        </div>
        <button
          onClick={() => onDeleteDay(day.id)}
          style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#DC2626', cursor: 'pointer' }}
        >
          Delete day
        </button>
      </div>

      <div style={{ padding: '10px 12px' }}>
        {(day.stops ?? []).map(stop => (
          <StopEditor
            key={stop.id}
            stop={stop}
            onSave={async data => onSaveStop(stop.id, data)}
            onDelete={async () => onDeleteStop(stop.id, day.id)}
          />
        ))}

        <button
          onClick={addStop}
          disabled={adding}
          style={{
            width: '100%',
            padding: '8px',
            border: '1px dashed var(--border-mid)',
            borderRadius: 6,
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            letterSpacing: '0.1em',
            color: 'var(--ink-3)',
            cursor: 'pointer',
            background: 'transparent',
            marginTop: 4,
          }}
        >
          {adding ? 'adding…' : '+ add stop'}
        </button>
      </div>
    </div>
  );
}

// ── LOGISTICS EDITOR ───────────────────────────────────────────────────────

function LogisticsRowEditor({
  row,
  onSave,
  onDelete,
}: {
  row: Logistics;
  onSave: (updated: Partial<Logistics>) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [label, setLabel]     = useState(row.label);
  const [value, setValue]     = useState(row.value_md);
  const [saving, setSaving]   = useState(false);

  // Save when either field loses focus, only if changed
  async function maybeSave() {
    if (label === row.label && value === row.value_md) return;
    setSaving(true);
    await onSave({ label, value_md: value });
    setSaving(false);
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 2fr auto',
      gap: 6,
      marginBottom: 6,
      alignItems: 'start',
    }}>
      <input
        value={label}
        onChange={e => setLabel(e.target.value)}
        onBlur={maybeSave}
        placeholder="Label"
        style={inputStyle({ fontSize: 12 })}
      />
      <textarea
        value={value}
        onChange={e => setValue(e.target.value)}
        onBlur={maybeSave}
        placeholder="Value (Markdown ok)"
        rows={1}
        style={inputStyle({ fontSize: 12, resize: 'vertical', minHeight: 34 })}
      />
      <button
        onClick={onDelete}
        title="Delete row"
        style={{
          padding: '6px 10px',
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          color: '#DC2626',
          background: 'transparent',
          border: '1px solid var(--border)',
          borderRadius: 6,
          cursor: 'pointer',
          opacity: saving ? 0.4 : 1,
        }}
      >
        ✕
      </button>
    </div>
  );
}

function LogisticsColumn({
  title,
  columnKey,
  rows,
  onAdd,
  onSave,
  onDelete,
}: {
  title: string;
  columnKey: 'logistics' | 'book';
  rows: Logistics[];
  onAdd: (col: 'logistics' | 'book') => Promise<void>;
  onSave: (id: number, data: Partial<Logistics>) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}) {
  const [adding, setAdding] = useState(false);

  async function add() {
    setAdding(true);
    await onAdd(columnKey);
    setAdding(false);
  }

  return (
    <div>
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 9,
        letterSpacing: '0.15em',
        textTransform: 'uppercase',
        color: 'var(--ink-3)',
        marginBottom: 8,
      }}>
        {title}
      </div>

      {rows.map(row => (
        <LogisticsRowEditor
          key={row.id}
          row={row}
          onSave={async data => onSave(row.id, data)}
          onDelete={async () => onDelete(row.id)}
        />
      ))}

      <button
        onClick={add}
        disabled={adding}
        style={{
          width: '100%',
          padding: '7px',
          border: '1px dashed var(--border-mid)',
          borderRadius: 6,
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          letterSpacing: '0.1em',
          color: 'var(--ink-3)',
          cursor: 'pointer',
          background: 'transparent',
          marginTop: 4,
        }}
      >
        {adding ? 'adding…' : '+ add row'}
      </button>
    </div>
  );
}

// ── MAIN EDITOR ────────────────────────────────────────────────────────────

export default function TripEditor({
  trip: initialTrip,
  logistics: initialLogistics,
  days: initialDays,
}: {
  trip: Trip;
  logistics: Logistics[];
  days: Day[];
}) {
  const [trip, setTrip]         = useState(initialTrip);
  const [logistics, setLogistics] = useState(initialLogistics);
  const [days, setDays]         = useState(initialDays);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [addingDay, setAddingDay] = useState(false);

  function setField(k: keyof Trip, v: unknown) {
    setTrip(t => ({ ...t, [k]: v }));
  }

  async function saveTrip() {
    setSaving(true);
    await fetch(`/api/admin/trips/${trip.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: trip.title,
        subtitle: trip.subtitle,
        eyebrow: trip.eyebrow,
        meta: trip.meta,
        header_theme: trip.header_theme,
        companion: trip.companion,
        published: trip.published,
      }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  // ── Logistics handlers ──
  async function addLogisticsRow(col: 'logistics' | 'book') {
    const colRows = logistics.filter(r => r.column_key === col);
    const nextSort = colRows.length
      ? Math.max(...colRows.map(r => r.sort_order)) + 1
      : 0;
    const res = await fetch('/api/admin/logistics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trip_id: trip.id,
        column_key: col,
        label: 'Label',
        value_md: '',
        sort_order: nextSort,
      }),
    });
    const { row } = await res.json();
    setLogistics(prev => [...prev, row]);
  }

  async function saveLogisticsRow(id: number, data: Partial<Logistics>) {
    setLogistics(prev => prev.map(r => r.id === id ? { ...r, ...data } : r));
    await fetch(`/api/admin/logistics?id=${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  }

  async function deleteLogisticsRow(id: number) {
    if (!confirm('Delete this row?')) return;
    setLogistics(prev => prev.filter(r => r.id !== id));
    await fetch(`/api/admin/logistics?id=${id}`, { method: 'DELETE' });
  }

  async function addDay() {
    setAddingDay(true);
    const res = await fetch('/api/admin/days', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trip_id: trip.id,
        label: 'New Day',
        sort_order: days.length + 1,
      }),
    });
    const { day } = await res.json();
    setDays(d => [...d, { ...day, stops: [] }]);
    setAddingDay(false);
  }

  async function deleteDay(dayId: number) {
    if (!confirm('Delete this day and all its stops?')) return;
    await fetch(`/api/admin/days?id=${dayId}`, { method: 'DELETE' });
    setDays(d => d.filter(day => day.id !== dayId));
  }

  async function addStop(dayId: number) {
    const res = await fetch('/api/admin/stops', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        day_id: dayId,
        time_label: '',
        tag: 'note',
        tag_color: 'gray',
        title: 'New stop',
        body_md: '',
        sort_order: 99,
      }),
    });
    const { stop } = await res.json();
    setDays(d => d.map(day =>
      day.id === dayId
        ? { ...day, stops: [...(day.stops ?? []), stop] }
        : day
    ));
  }

  async function saveStop(stopId: number, data: Partial<Stop>) {
    await fetch(`/api/admin/stops?id=${stopId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    setDays(d => d.map(day => ({
      ...day,
      stops: (day.stops ?? []).map(s =>
        s.id === stopId ? { ...s, ...data } : s
      ),
    })));
  }

  async function deleteStop(stopId: number, dayId: number) {
    if (!confirm('Delete this stop?')) return;
    await fetch(`/api/admin/stops?id=${stopId}`, { method: 'DELETE' });
    setDays(d => d.map(day =>
      day.id === dayId
        ? { ...day, stops: (day.stops ?? []).filter(s => s.id !== stopId) }
        : day
    ));
  }

  return (
    <div style={{ maxWidth: 'var(--max-w)', margin: '0 auto', padding: '0 0 80px' }}>
      {/* Header */}
      <header style={{
        padding: '24px var(--px) 16px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: 'var(--brass)',
            marginBottom: 4,
          }}>
            <Link href="/admin">← trips</Link>
          </div>
          <h1 style={{
            fontFamily: 'var(--font-serif)',
            fontWeight: 300,
            fontSize: 22,
            color: 'var(--ink)',
          }}>
            {trip.title}
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Link
            href={`/trips/${trip.slug}`}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--ink-3)',
              padding: '8px 12px',
              border: '1px solid var(--border)',
              borderRadius: 6,
            }}
          >
            View
          </Link>
          <button
            onClick={saveTrip}
            disabled={saving}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              background: saved ? '#2D6B4A' : 'var(--ink)',
              color: 'var(--bg)',
              padding: '8px 14px',
              borderRadius: 6,
              cursor: saving ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
            }}
          >
            {saving ? 'saving…' : saved ? '✓ saved' : 'Save trip'}
          </button>
        </div>
      </header>

      <div style={{ padding: '20px var(--px) 0' }}>
        {/* Trip fields */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: '16px',
          marginBottom: 20,
        }}>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: 'var(--brass)',
            marginBottom: 14,
          }}>
            Trip details
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Title" value={trip.title} onChange={v => setField('title', v)} />
            <Field label="Subtitle" value={trip.subtitle} onChange={v => setField('subtitle', v)} />
          </div>
          <Field label="Eyebrow" value={trip.eyebrow} onChange={v => setField('eyebrow', v)} />
          <Field label="Meta (tagline)" value={trip.meta} onChange={v => setField('meta', v)} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Select label="Theme" value={trip.header_theme} onChange={v => setField('header_theme', v)} options={THEME_OPTIONS} />
            <Field label="Companion" value={trip.companion ?? ''} onChange={v => setField('companion', v)} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
            <input
              type="checkbox"
              id="published"
              checked={trip.published}
              onChange={e => setField('published', e.target.checked)}
            />
            <label
              htmlFor="published"
              style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.1em' }}
            >
              Published (visible on home page)
            </label>
          </div>
        </div>

        {/* Logistics */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: '16px',
          marginBottom: 20,
        }}>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: 'var(--brass)',
            marginBottom: 14,
          }}>
            Logistics
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 20,
          }}>
            <LogisticsColumn
              title="Logistics"
              columnKey="logistics"
              rows={logistics.filter(r => r.column_key === 'logistics').sort((a, b) => a.sort_order - b.sort_order)}
              onAdd={addLogisticsRow}
              onSave={saveLogisticsRow}
              onDelete={deleteLogisticsRow}
            />
            <LogisticsColumn
              title="To book"
              columnKey="book"
              rows={logistics.filter(r => r.column_key === 'book').sort((a, b) => a.sort_order - b.sort_order)}
              onAdd={addLogisticsRow}
              onSave={saveLogisticsRow}
              onDelete={deleteLogisticsRow}
            />
          </div>
        </div>

        {/* Days + Stops */}
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: 'var(--brass)',
          marginBottom: 12,
        }}>
          Days & Stops
        </div>

        {days.map(day => (
          <DayEditor
            key={day.id}
            day={day}
            onAddStop={addStop}
            onSaveStop={saveStop}
            onDeleteStop={deleteStop}
            onDeleteDay={deleteDay}
          />
        ))}

        <button
          onClick={addDay}
          disabled={addingDay}
          style={{
            width: '100%',
            padding: '12px',
            border: '2px dashed var(--border-mid)',
            borderRadius: 8,
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            letterSpacing: '0.1em',
            color: 'var(--ink-3)',
            cursor: 'pointer',
            background: 'transparent',
            marginTop: 4,
          }}
        >
          {addingDay ? 'adding…' : '+ add day'}
        </button>
      </div>
    </div>
  );
}
