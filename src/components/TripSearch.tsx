'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Day, Logistics } from '@/lib/supabase';
import { plainText } from '@/lib/tripAlerts';

// ── SEARCH ──────────────────────────────────────────────────────────────────
// Everything the trip page already has in memory: stops, their dinner options,
// day labels and logistics. No server round trip, so it works offline too.

export type SearchTarget = { kind: 'stop'; id: number } | { kind: 'day'; index: number } | { kind: 'log'; id: number };

interface Entry {
  key: string;
  target: SearchTarget;
  where: string;          // "Wed, Oct 21" or "Logistics · Hotel"
  time: string | null;
  title: string;
  text: string;           // plain text searched and snipped
  hay: string;            // lowercased title + text
}

function norm(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function buildIndex(days: Day[], logistics: Logistics[]): Entry[] {
  const out: Entry[] = [];
  days.forEach((day, i) => {
    const dayName = day.label.split(' - ')[0];
    out.push({ key: `d${day.id}`, target: { kind: 'day', index: i }, where: `Day ${i + 1}`, time: null, title: day.label, text: '', hay: norm(day.label) });
    for (const s of day.stops ?? []) {
      const text = plainText(s.body_md || '');
      out.push({ key: `s${s.id}`, target: { kind: 'stop', id: s.id }, where: dayName, time: s.time_label, title: s.title, text, hay: norm(`${s.title} ${s.tag} ${text}`) });
      for (const o of s.options ?? []) {
        const otext = [o.kind, o.draw, o.why_md, o.food_md, o.getting_there, o.note].filter(Boolean).map(t => plainText(t!)).join(' · ');
        out.push({ key: `o${o.id}`, target: { kind: 'stop', id: s.id }, where: `${dayName} · dinner option`, time: s.time_label, title: o.name, text: otext, hay: norm(`${o.name} ${otext}`) });
      }
    }
  });
  for (const l of logistics) {
    const text = plainText(l.value_md || '');
    out.push({ key: `l${l.id}`, target: { kind: 'log', id: l.id }, where: `Logistics · ${l.category}`, time: null, title: l.label, text, hay: norm(`${l.label} ${l.category} ${text}`) });
  }
  return out;
}

function snippet(text: string, terms: string[]): string {
  if (!text) return '';
  const n = norm(text);
  let at = -1;
  for (const t of terms) { const i = n.indexOf(t); if (i >= 0 && (at < 0 || i < at)) at = i; }
  if (at < 0) return text.length > 120 ? `${text.slice(0, 119)}…` : text;
  const start = Math.max(0, at - 50);
  const end = Math.min(text.length, at + 90);
  return `${start > 0 ? '…' : ''}${text.slice(start, end)}${end < text.length ? '…' : ''}`;
}

function Highlight({ text, terms }: { text: string; terms: string[] }) {
  if (!terms.length || !text) return <>{text}</>;
  // NFD folding keeps one char per char for Latin text, so indexes line up
  const n = norm(text);
  const marks: [number, number][] = [];
  for (const t of terms) {
    let i = n.indexOf(t);
    while (i >= 0) { marks.push([i, i + t.length]); i = n.indexOf(t, i + t.length); }
  }
  if (!marks.length || n.length !== text.length) return <>{text}</>;
  marks.sort((a, b) => a[0] - b[0]);
  const parts: React.ReactNode[] = [];
  let pos = 0;
  marks.forEach(([a, b], k) => {
    if (a < pos) return;
    if (a > pos) parts.push(text.slice(pos, a));
    parts.push(<mark key={k} style={{ background: 'color-mix(in srgb, var(--brass) 28%, transparent)', color: 'inherit', borderRadius: 3, padding: '0 1px' }}>{text.slice(a, b)}</mark>);
    pos = b;
  });
  parts.push(text.slice(pos));
  return <>{parts}</>;
}

export function TripSearch({ days, logistics, onPick, onClose }: {
  days: Day[];
  logistics: Logistics[];
  onPick: (t: SearchTarget) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const index = useMemo(() => buildIndex(days, logistics), [days, logistics]);

  useEffect(() => {
    input.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  const terms = norm(q).split(/\s+/).filter(Boolean);
  const results = terms.length === 0 ? [] : index
    .filter(e => terms.every(t => e.hay.includes(t)))
    .map(e => ({ e, score: terms.reduce((s, t) => s + (norm(e.title).includes(t) ? 2 : 0), 0) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 60)
    .map(r => r.e);

  return (
    <div
      role="dialog"
      aria-label="Search this trip"
      style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}
    >
      <div style={{ maxWidth: 'var(--max-w)', width: '100%', margin: '0 auto', padding: 'calc(env(safe-area-inset-top, 0px) + 10px) 12px 10px', display: 'flex', gap: 8, alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
        <input
          ref={input}
          type="search"
          inputMode="search"
          enterKeyHint="search"
          autoComplete="off"
          placeholder="Search stops, dinners, logistics"
          value={q}
          onChange={e => setQ(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && results[0]) onPick(results[0].target); }}
          style={{
            flex: 1, minWidth: 0, minHeight: 44, padding: '0 14px', borderRadius: 12,
            border: '0.5px solid var(--border-mid)', background: 'var(--surface)', color: 'var(--ink)',
            fontSize: 16, fontFamily: 'var(--font-sans)', outline: 'none',
          }}
        />
        <button
          type="button" onClick={onClose} className="tap"
          style={{ minHeight: 44, padding: '0 6px', background: 'transparent', border: 'none', color: 'var(--brass)', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', cursor: 'pointer' }}
        >
          Done
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <div style={{ maxWidth: 'var(--max-w)', margin: '0 auto', padding: '6px 12px calc(env(safe-area-inset-bottom, 0px) + 24px)' }}>
          {terms.length > 0 && results.length === 0 && (
            <div style={{ padding: '40px 8px', textAlign: 'center', color: 'var(--ink-4)', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
              Nothing matches
            </div>
          )}
          {results.map(r => (
            <button
              key={r.key}
              type="button"
              className="pressable"
              onClick={() => onPick(r.target)}
              style={{
                display: 'block', width: '100%', textAlign: 'left', marginTop: 8, cursor: 'pointer',
                background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 14, padding: '10px 14px',
              }}
            >
              <div className="num" style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 3 }}>
                {r.where}{r.time ? ` · ${r.time}` : ''}
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.35 }}>
                <Highlight text={r.title} terms={terms} />
              </div>
              {r.text && (
                <div style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.5, marginTop: 2 }}>
                  <Highlight text={snippet(r.text, terms)} terms={terms} />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
