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
//
// Each note is two layers of the same row, because the shelf is read two ways.
// On a kerb you scan for a number; on a plane you read an argument end to end.
// `field_md` is the kerb layer and is what the page shows by default;
// `body_md` is the reading layer, shown under it only in read mode, where the
// sections also re-order from `sort_order` (the shelf) to `read_order` (a
// course). A number lives in the field layer and an argument in the reading
// layer, never both, so there is no second place a number can be wrong — the
// same discipline as the lens weights living in LensMark.
//
// Deliberately not a third summary document: that is a second copy of every
// number, and it would drift the way the frame notes drifted from the carries.
// ─────────────────────────────────────────────────────────────────────────────

/** 220 wpm is a reading pace for prose you are thinking about, not skimming. */
const WPM = 220;
const words = (md: string | null) => (md ? md.trim().split(/\s+/).length : 0);

export default async function NotesPage() {
  const notes = await getNotes();

  const cards: NoteCard[] = notes.map(n => ({
    slug:      n.slug,
    title:     n.title,
    subtitle:  n.subtitle,
    // Falls back to the reading layer so a note that has not been split yet
    // still renders everything it has rather than rendering blank.
    fieldHtml: renderBlockMd(n.field_md ?? n.body_md),
    readHtml:  n.field_md ? renderBlockMd(n.body_md) : null,
    readOrder: n.read_order,
    search:    `${n.title} ${n.subtitle ?? ''} ${n.field_md ?? ''} ${n.body_md}`.toLowerCase(),
  }));

  const readMinutes = Math.max(
    1,
    Math.round(notes.reduce((t, n) => t + words(n.field_md) + words(n.body_md), 0) / WPM),
  );

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
        <NotesView notes={cards} readMinutes={readMinutes} />
      )}
    </div>
  );
}
