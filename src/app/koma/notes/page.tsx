import Link from 'next/link';
import { getNotes } from '@/lib/supabase';
import { renderBlockMd } from '@/lib/markdown';

export const revalidate = 60;

// ─────────────────────────────────────────────────────────────────────────────
// The reference shelf.
//
// Everything is on ONE page rather than a list that navigates to a detail, for
// two reasons. It is read in the field, where a second request may not resolve
// and where the service worker can only cache what has actually been fetched —
// one page means one thing to have cached. And it is read by scanning: you are
// at a table or on a kerb looking for a number, so the browser's own find is a
// better index than a menu of links.
// ─────────────────────────────────────────────────────────────────────────────

// A film edge down the left of each note, echoing the rolls index without
// taking the page dark — this is long-form reading, and a dark ground would
// cost more in legibility than the reference gains in character. The holes are
// the page colour, so they read as punched rather than painted.
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

export default async function NotesPage() {
  const notes = await getNotes();

  return (
    <div style={{ maxWidth: 'var(--max-w)', margin: '0 auto', padding: '0 0 72px' }}>
      <header style={{
        padding: 'calc(env(safe-area-inset-top, 0px) + 12px) var(--px) 8px',
        borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center',
      }}>
        <Link href="/koma" className="tap" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 44,
          fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.22em',
          textTransform: 'uppercase', color: '#B83C01',
        }}>
          ← koma
        </Link>
      </header>

      <div style={{ padding: '26px var(--px) 16px' }}>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.2em',
          textTransform: 'uppercase', color: '#B83C01', marginBottom: 8,
        }}>
          reference
        </div>
        <h1 style={{
          fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 30,
          letterSpacing: '-0.02em', color: 'var(--ink)', lineHeight: 1.1,
        }}>
          How it behaves
        </h1>
        <p style={{ fontSize: 14, color: 'var(--ink-3)', lineHeight: 1.6, marginTop: 8, maxWidth: '38ch' }}>
          Not a plan. The numbers that are the same everywhere, for checking at
          the table rather than reading at home.
        </p>
      </div>

      {notes.length > 1 && (
        // A grid, not a scrolling row. The row clipped the last subject at
        // 375px, which is the one case that matters: you cannot pick from a
        // list whose end you cannot see.
        <nav style={{
          padding: '0 var(--px) 4px',
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(104px, 1fr))',
          gap: 7,
        }}>
          {notes.map(n => (
            <a key={n.slug} href={`#${n.slug}`} className="tap pressable" style={{
              fontFamily: 'var(--font-mono)', fontSize: 10,
              letterSpacing: '0.09em', textTransform: 'uppercase',
              color: '#B83C01', background: 'rgba(184,60,1,0.07)',
              border: '0.5px solid rgba(184,60,1,0.22)', borderRadius: 10,
              padding: '10px 10px', minHeight: 42,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              textAlign: 'center', lineHeight: 1.25,
            }}>
              {n.title}
            </a>
          ))}
        </nav>
      )}

      <div style={{ padding: '18px var(--px) 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {notes.length === 0 && (
          <p style={{
            fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-4)',
            lineHeight: 1.7, padding: '20px 0',
          }}>
            Nothing on the shelf yet.
          </p>
        )}

        {notes.map(n => (
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
              dangerouslySetInnerHTML={{ __html: renderBlockMd(n.body_md) }}
            />
          </section>
        ))}
      </div>
    </div>
  );
}
