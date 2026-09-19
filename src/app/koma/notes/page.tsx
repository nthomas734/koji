import Link from 'next/link';
import { getNotes } from '@/lib/supabase';
import { renderBlockMd } from '@/lib/markdown';
import { NotesView, type NoteCard } from './NotesView';

export const revalidate = 60;

// ─────────────────────────────────────────────────────────────────────────────
// The reference shelf.
//
// Everything is on ONE page rather than a list that navigates to a detail: it
// is read in the field, where a second request may not resolve and where the
// service worker can only cache what has actually been fetched, so one page is
// one thing to have cached.
//
// The original rationale added "and the browser's own find beats a menu of
// links", which was wrong about the only place that matters. An installed iOS
// PWA has no address bar and no share sheet, so it has no find-in-page. The
// page carries its own filter instead — see NotesView.
//
// Markdown is rendered here rather than in the client component so `marked`
// never reaches the browser bundle, and the filter matches a lowercased
// haystack built alongside it.
// ─────────────────────────────────────────────────────────────────────────────

export default async function NotesPage() {
  const notes = await getNotes();

  const cards: NoteCard[] = notes.map(n => ({
    slug:     n.slug,
    title:    n.title,
    subtitle: n.subtitle,
    html:     renderBlockMd(n.body_md),
    search:   `${n.title} ${n.subtitle ?? ''} ${n.body_md}`.toLowerCase(),
  }));

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

      <div style={{ padding: '24px var(--px) 14px' }}>
        <h1 style={{
          fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 30,
          letterSpacing: '-0.02em', color: 'var(--ink)', lineHeight: 1.1,
        }}>
          Reference
        </h1>
      </div>

      {cards.length === 0 ? (
        <p style={{
          fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-4)',
          lineHeight: 1.7, padding: '20px var(--px)',
        }}>
          Nothing on the shelf yet.
        </p>
      ) : (
        <NotesView notes={cards} />
      )}
    </div>
  );
}
