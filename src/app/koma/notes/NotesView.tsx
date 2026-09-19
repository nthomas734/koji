'use client';

import { useMemo, useState } from 'react';

export interface NoteCard {
  slug:     string;
  title:    string;
  subtitle: string | null;
  /** Rendered on the server so `marked` stays out of the client bundle. */
  html:     string;
  /** Lowercased title + subtitle + body, for the filter. */
  search:   string;
}

// ─────────────────────────────────────────────────────────────────────────────
// The shelf was built on "the browser's own find is a better index than a menu
// of links". That is true in a browser and false in the place this is actually
// read: an installed iOS PWA has no address bar and no share sheet, so there is
// no find-in-page at all. Sixteen notes and a dozen tables with nothing to
// filter them is a lot of thumb on a kerb.
//
// So the page carries its own find. It hides whole sections rather than
// highlighting matches inside them, because the question being asked is "which
// note covers this", not "where does this word appear".
// ─────────────────────────────────────────────────────────────────────────────

export function NotesView({ notes }: { notes: NoteCard[] }) {
  const [q, setQ] = useState('');
  const needle = q.trim().toLowerCase();

  const shown = useMemo(
    () => (needle ? notes.filter(n => n.search.includes(needle)) : notes),
    [notes, needle],
  );

  return (
    <>
      <div style={{ padding: '0 var(--px) 12px', position: 'relative' }}>
        <input
          type="search"
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Find a subject or a number"
          aria-label="Filter the reference"
          enterKeyHint="search"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          style={{
            width: '100%', boxSizing: 'border-box', minHeight: 44,
            padding: '11px 13px', borderRadius: 10,
            border: '0.5px solid rgba(184,60,1,0.34)',
            background: 'var(--surface)', color: 'var(--ink)',
            font: 'inherit', fontSize: 14, WebkitAppearance: 'none',
          }}
        />
      </div>

      {notes.length > 1 && shown.length > 0 && (
        <nav style={{
          padding: '0 var(--px) 4px',
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
          gap: 7,
        }}>
          {shown.map(n => (
            <a key={n.slug} href={`#${n.slug}`} className="tap pressable" style={{
              fontSize: 13.5, fontWeight: 500, letterSpacing: '-0.005em',
              color: '#3B2312', background: 'rgba(184,60,1,0.09)',
              border: '0.5px solid rgba(184,60,1,0.34)', borderRadius: 10,
              padding: '11px 9px', minHeight: 48,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              textAlign: 'center', lineHeight: 1.3,
            }}>
              {n.title}
            </a>
          ))}
        </nav>
      )}

      <div style={{ padding: '18px var(--px) 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {shown.length === 0 && (
          <p style={{
            fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-4)',
            lineHeight: 1.7, padding: '8px 0',
          }}>
            Nothing matches “{q.trim()}”.
          </p>
        )}

        {shown.map(n => (
          <section
            key={n.slug}
            id={n.slug}
            style={{
              background: 'var(--surface)', border: '0.5px solid var(--border)',
              borderRadius: 14, padding: '16px 18px 18px', position: 'relative',
              overflow: 'hidden',
              scrollMarginTop: 'calc(env(safe-area-inset-top, 0px) + 14px)',
            }}
          >
            <FilmEdge />
            <h2 style={{
              fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: 21,
              letterSpacing: '-0.01em', color: 'var(--ink)', paddingLeft: 12,
            }}>
              {n.title}
            </h2>
            {n.subtitle && (
              <p style={{
                fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.5,
                marginTop: 3, paddingLeft: 12,
              }}>
                {n.subtitle}
              </p>
            )}
            <div
              className="koma-note"
              style={{ marginTop: 12, paddingLeft: 12 }}
              dangerouslySetInnerHTML={{ __html: n.html }}
            />
          </section>
        ))}
      </div>
    </>
  );
}

/** A film edge down the left of each note, echoing the rolls index without
 *  taking the page dark. The holes are the page colour, so they read as
 *  punched rather than painted. */
function FilmEdge() {
  return (
    <div aria-hidden style={{
      position: 'absolute', left: 0, top: 0, bottom: 0, width: 10,
      background: '#17150F',
      backgroundImage:
        'repeating-linear-gradient(to bottom, var(--bg) 0 6px, transparent 6px 12px)',
      backgroundSize: '4px 100%',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center 7px',
    }} />
  );
}
