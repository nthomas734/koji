'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewTripPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    slug:         '',
    title:        '',
    subtitle:     '',
    eyebrow:      '',
    meta:         '',
    header_theme: 'forest',
    companion:    '',
    published:    false,
    sort_order:   0,
  });

  function set(k: string, v: unknown) {
    setForm(f => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch('/api/admin/trips', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const { trip } = await res.json();
    router.push(`/admin/trips/${trip.id}`);
  }

  const inp: React.CSSProperties = {
    width: '100%', padding: '9px 11px',
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 6, fontSize: 13, color: 'var(--ink)', marginBottom: 12,
  };
  const lbl: React.CSSProperties = {
    fontFamily: 'var(--font-mono)', fontSize: 9,
    letterSpacing: '0.15em', textTransform: 'uppercase',
    color: 'var(--ink-4)', display: 'block', marginBottom: 4,
  };

  return (
    <div style={{ maxWidth: 'var(--max-w)', margin: '0 auto', padding: '32px var(--px) 60px' }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--brass)', marginBottom: 16 }}>
        <a href="/admin">← trips</a> · new trip
      </div>
      <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 300, fontSize: 26, color: 'var(--ink)', marginBottom: 24 }}>
        New Trip
      </h1>

      <form onSubmit={handleSubmit}>
        <label style={lbl}>Slug (URL — no spaces, use hyphens)</label>
        <input style={inp} value={form.slug} onChange={e => set('slug', e.target.value)} placeholder="san-diego-camping" required />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={lbl}>Title</label>
            <input style={inp} value={form.title} onChange={e => set('title', e.target.value)} placeholder="San Diego + Camping" required />
          </div>
          <div>
            <label style={lbl}>Subtitle</label>
            <input style={inp} value={form.subtitle} onChange={e => set('subtitle', e.target.value)} placeholder="with Your Brother" required />
          </div>
        </div>

        <label style={lbl}>Eyebrow</label>
        <input style={inp} value={form.eyebrow} onChange={e => set('eyebrow', e.target.value)} placeholder="Late Summer · 3 nights" required />

        <label style={lbl}>Meta (tagline)</label>
        <input style={inp} value={form.meta} onChange={e => set('meta', e.target.value)} placeholder="Night 1: Little Italy · Nights 2–3: Laguna Campground" required />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={lbl}>Theme</label>
            <select style={inp} value={form.header_theme} onChange={e => set('header_theme', e.target.value)}>
              {['forest','navy','plum','earth','sand'].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Companion</label>
            <input style={inp} value={form.companion} onChange={e => set('companion', e.target.value)} placeholder="Brother" />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <input type="checkbox" id="pub" checked={form.published} onChange={e => set('published', e.target.checked)} />
          <label htmlFor="pub" style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.1em' }}>
            Published
          </label>
        </div>

        <button
          type="submit"
          disabled={saving}
          style={{
            width: '100%', padding: '12px',
            background: 'var(--ink)', color: 'var(--bg)',
            borderRadius: 8, fontSize: 13, fontWeight: 500,
            fontFamily: 'var(--font-mono)', letterSpacing: '0.1em',
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? 'creating…' : 'Create trip →'}
        </button>
      </form>
    </div>
  );
}
