'use client';

// ─────────────────────────────────────────────────────────────────────────────
// The private verdict UI: a stamp beside each stop, a sheet to set it, and the
// unplanned places Nathan added. Rendered only when useVerdicts says the
// viewer is the owner — see lib/verdicts.ts. Nobody else gets so much as an
// empty stamp.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import type { VerdictValue } from '@/lib/supabase';
import { mapsSearchUrl } from '@/lib/supabase';
import type { VerdictDraft, VerdictRow } from '@/lib/verdicts';

const TONES: Record<VerdictValue, { label: string; hint: string; glyph: string; ink: string; bg: string }> = {
  back: { label: 'go back',   hint: 'would return',  glyph: '↺', ink: '#3F6B21', bg: '#E3EFD3' },
  once: { label: 'fine once', hint: 'glad we went',  glyph: '✓', ink: '#7A5A1E', bg: '#F4E7C9' },
  skip: { label: 'skip',      hint: 'not worth it',  glyph: '✕', ink: '#7A3B2E', bg: '#F3DCD5' },
};
const ORDER: VerdictValue[] = ['back', 'once', 'skip'];

// ── STAMP ───────────────────────────────────────────────────────────────────
// Empty and dashed until judged, then filled. A row of filled stamps down a day
// is meant to read like a passport page.
export function VerdictStamp({ row, onOpen, label }: {
  row: VerdictRow | undefined;
  onOpen: () => void;
  label: string;
}) {
  const tone = row?.verdict ? TONES[row.verdict] : null;
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={tone ? `${label}: ${tone.label}. Change verdict` : `Rate ${label}`}
      style={{
        width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--font-mono)', fontSize: 14, lineHeight: 1,
        color: tone ? tone.ink : 'var(--ink-4)',
        background: tone ? tone.bg : 'transparent',
        border: tone ? `1.5px solid ${tone.ink}` : '1.5px dashed var(--border-mid)',
        position: 'relative',
      }}
    >
      {tone?.glyph ?? ''}
      {row?.note && (
        <span aria-hidden style={{
          position: 'absolute', top: -2, right: -2, width: 7, height: 7, borderRadius: '50%',
          background: 'var(--brass)', border: '1.5px solid var(--surface)',
        }} />
      )}
    </button>
  );
}

// ── UNPLANNED PLACE ROW ─────────────────────────────────────────────────────
export function ExtraPlaceRow({ row, onOpen }: { row: VerdictRow; onOpen: () => void }) {
  return (
    <article style={{
      display: 'grid', gridTemplateColumns: '54px 1fr auto', gap: 6, alignItems: 'start',
      background: 'transparent', border: '1px dashed var(--border-mid)', borderRadius: 14,
      padding: '10px 12px 10px 18px', marginTop: 8,
    }}>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 8.5, letterSpacing: '0.14em', textTransform: 'uppercase',
        color: 'var(--ink-4)', paddingTop: 6,
      }}>
        {row.source === 'share' ? 'shared' : row.source === 'photo' ? 'photos' : 'added'}
      </div>
      <div style={{ minWidth: 0, paddingTop: 3 }}>
        <h3 style={{ fontSize: 14.5, fontWeight: 600, lineHeight: 1.35, color: 'var(--ink)' }}>
          {row.maps_url
            ? <a href={row.maps_url} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none', borderBottom: '1px solid var(--border-mid)' }}>{row.title}</a>
            : row.title}
        </h3>
        {row.note && (
          <div style={{ fontSize: 12.5, color: 'var(--ink-3)', fontStyle: 'italic', marginTop: 3, lineHeight: 1.45 }}>{row.note}</div>
        )}
      </div>
      <VerdictStamp row={row} onOpen={onOpen} label={row.title} />
    </article>
  );
}

export function AddPlaceButton({ onAdd }: { onAdd: () => void }) {
  return (
    <button
      type="button"
      onClick={onAdd}
      style={{
        marginTop: 8, marginLeft: 18, padding: '6px 0',
        fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em',
        color: 'var(--brass)',
      }}
    >
      + somewhere not on the plan
    </button>
  );
}

// ── SHEET ───────────────────────────────────────────────────────────────────
export interface SheetTarget {
  /** 'new' asks for a name first; the others already have one. */
  mode: 'stop' | 'extra' | 'new';
  draft: VerdictDraft;
  /** Shown under the title, e.g. "day 4 · 14:00". */
  context: string;
  /** Used to build the maps link for a place added by name. */
  city: string | null;
}

export function VerdictSheet({ target, onSave, onRemove, onClose }: {
  target: SheetTarget;
  onSave: (row: VerdictDraft) => void;
  onRemove: (key: string) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<VerdictDraft>(target.draft);
  const [name, setName]   = useState(target.draft.title);
  const nameRef = useRef<HTMLInputElement>(null);
  const isNew = target.mode === 'new';

  useEffect(() => { if (isNew) nameRef.current?.focus(); }, [isNew]);

  // Escape closes, like every other sheet on the phone.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') finish(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const named = (d: VerdictDraft): VerdictDraft => {
    if (!isNew) return d;
    const title = name.trim();
    return { ...d, title, maps_url: title ? mapsSearchUrl(title, target.city) : null };
  };

  // A verdict tap saves at once — that is the whole point of the stamp. Tapping
  // the chosen one again clears it.
  const pick = (v: VerdictValue) => {
    const next = { ...draft, verdict: draft.verdict === v ? null : v };
    setDraft(next);
    const row = named(next);
    if (row.title) onSave(row);
  };

  // The note (and a new place's name) save on the way out.
  function finish() {
    const row = named(draft);
    const changed = row.note !== target.draft.note || row.title !== target.draft.title;
    if (row.title && changed) onSave(row);
    onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Verdict"
      onClick={finish}
      style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(28,26,22,0.32)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 'var(--max-w)', background: 'var(--surface)',
          borderTopLeftRadius: 20, borderTopRightRadius: 20,
          boxShadow: '0 -10px 30px rgba(28,26,22,0.15)',
          padding: '10px 18px calc(env(safe-area-inset-bottom, 0px) + 22px)',
        }}
      >
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border-mid)', margin: '0 auto 14px' }} />

        {isNew ? (
          <input
            ref={nameRef}
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Where was it?"
            maxLength={200}
            style={{
              width: '100%', fontFamily: 'var(--font-serif)', fontSize: 20, color: 'var(--ink)',
              background: 'transparent', border: 0, borderBottom: '1px solid var(--border)', padding: '2px 0 6px', outline: 'none',
            }}
          />
        ) : (
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 20, color: 'var(--ink)', lineHeight: 1.2 }}>{draft.title}</div>
        )}
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-4)', margin: '6px 0 14px' }}>
          {target.context}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
          {ORDER.map(v => {
            const t = TONES[v];
            const on = draft.verdict === v;
            return (
              <button
                key={v}
                type="button"
                onClick={() => pick(v)}
                aria-pressed={on}
                disabled={isNew && !name.trim()}
                style={{
                  borderRadius: 12, padding: '12px 4px', textAlign: 'center',
                  border: `1px solid ${on ? t.ink : 'var(--border)'}`,
                  background: on ? t.bg : 'var(--bg)',
                  color: on ? t.ink : 'var(--ink-2)',
                  fontSize: 13, fontWeight: 700,
                  opacity: isNew && !name.trim() ? 0.45 : 1,
                }}
              >
                {t.label}
                <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 400, letterSpacing: '0.04em', color: on ? t.ink : 'var(--ink-4)', marginTop: 3 }}>
                  {t.hint}
                </span>
              </button>
            );
          })}
        </div>

        <textarea
          value={draft.note ?? ''}
          onChange={e => setDraft(d => ({ ...d, note: e.target.value || null }))}
          placeholder="A note for you"
          maxLength={500}
          rows={2}
          style={{
            width: '100%', resize: 'none', fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--ink-2)',
            background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', outline: 'none',
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, gap: 12 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-4)' }}>
            private · only you see this
          </span>
          <span style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            {target.mode === 'extra' && (
              <button
                type="button"
                onClick={() => { onRemove(draft.client_key); onClose(); }}
                style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em', color: TONES.skip.ink }}
              >
                remove
              </button>
            )}
            <button
              type="button"
              onClick={finish}
              style={{
                fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.1em', textTransform: 'uppercase',
                color: 'var(--surface)', background: 'var(--ink)', borderRadius: 999, padding: '7px 16px',
              }}
            >
              done
            </button>
          </span>
        </div>
      </div>
    </div>
  );
}
