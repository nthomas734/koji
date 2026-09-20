'use client';

import { useEffect, useMemo, useState } from 'react';

export interface NoteCard {
  slug:      string;
  title:     string;
  subtitle:  string | null;
  /** The kerb layer, rendered on the server so `marked` stays out of the bundle. */
  fieldHtml: string;
  /** The reading layer. Null when the note has not been split yet. */
  readHtml:  string | null;
  /** Position in the plane read; null sorts to the end. */
  readOrder: number | null;
  /** Lowercased title + subtitle + both layers, for the filter. */
  search:    string;
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
//
// It also carries the two-layer toggle. Off — the default — is the shelf: the
// field layer only, in shelf order, which is the version read standing up. On
// is the plane read: both layers, re-ordered into a course. It stays one page
// either way, because the service worker can only cache what has been fetched
// and one page is one fetch.
// ─────────────────────────────────────────────────────────────────────────────

const READ_KEY = 'koma:notes-read';

export function NotesView({ notes, readMinutes }: { notes: NoteCard[]; readMinutes: number }) {
  const [q, setQ] = useState('');
  // Starts false so the server and first client render agree; the stored
  // preference is applied on mount. A plane read is one long session and a
  // reload halfway through should not drop back to the shelf.
  const [read, setRead] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(READ_KEY) === '1') setRead(true);
    } catch { /* private window, blocked storage — the shelf is the safe default */ }
  }, []);

  const toggle = () => {
    setRead(prev => {
      const next = !prev;
      try { localStorage.setItem(READ_KEY, next ? '1' : '0'); } catch { /* ignore */ }
      return next;
    });
  };

  const needle = q.trim().toLowerCase();

  const shown = useMemo(() => {
    const matched = needle ? notes.filter(n => n.search.includes(needle)) : notes;
    if (!read) return matched;
    // Course order. Anything without a read_order falls to the end rather than
    // to the front, so an unplaced note cannot open the read.
    return [...matched].sort(
      (a, b) => (a.readOrder ?? Infinity) - (b.readOrder ?? Infinity),
    );
  }, [notes, needle, read]);

  return (
    <>
      <div style={{ padding: '0 var(--px) 14px' }}>
        <button
          type="button"
          onClick={toggle}
          aria-pressed={read}
          className="tap pressable"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 9,
            minHeight: 44, padding: '0 15px 0 13px', borderRadius: 999,
            border: '0.5px solid rgba(184,60,1,0.34)',
            background: read ? 'rgba(184,60,1,0.12)' : 'var(--surface)',
            color: '#B83C01', font: 'inherit',
            fontFamily: 'var(--font-mono)', fontSize: 10,
            letterSpacing: '0.12em', textTransform: 'uppercase',
            cursor: 'pointer', WebkitAppearance: 'none',
          }}
        >
          <Glyph open={read} />
          {read ? 'Back to the shelf' : 'Read the whole thing'}
        </button>
        <p style={{
          fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.04em',
          color: 'var(--ink-4)', lineHeight: 1.6, margin: '9px 0 0',
        }}>
          {read
            ? `In order, about ${readMinutes} minutes.`
            : `Settings and tables. The full read is about ${readMinutes} minutes.`}
        </p>
      </div>

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
              dangerouslySetInnerHTML={{ __html: n.fieldHtml }}
            />
            {read && n.readHtml && (
              <div
                className="koma-note koma-read"
                style={{ marginTop: 16, paddingLeft: 12 }}
                dangerouslySetInnerHTML={{ __html: n.readHtml }}
              />
            )}
          </section>
        ))}
      </div>
    </>
  );
}

/** Open book when the read is on, closed when it is not. Two strokes rather
 *  than an icon set, to match the film marks elsewhere in koma. */
function Glyph({ open }: { open: boolean }) {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d={open
          ? 'M8 4.2C6.6 3.2 4.9 2.9 3 3.2v9.1c1.9-.3 3.6 0 5 1 1.4-1 3.1-1.3 5-1V3.2c-1.9-.3-3.6 0-5 1z'
          : 'M4.4 2.8h7.2v10.4H4.4z'}
        stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"
      />
      <path d="M8 4.2v9.1" stroke="currentColor" strokeWidth="1.3" />
    </svg>
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
