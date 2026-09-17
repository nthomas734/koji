import Link from 'next/link';
import { getKomaEntries } from '@/lib/supabase';

export const revalidate = 60;

function fmtDate(iso: string | null, end: string | null): string {
  if (!iso) return 'no date yet';
  const at = (v: string) => { const [y, m, d] = v.split('-').map(Number); return new Date(y, m - 1, d); };
  const a = at(iso);
  if (!end || end === iso) {
    return a.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }
  const b = at(end);
  const sameMonth = a.getMonth() === b.getMonth();
  return `${a.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}–${
    b.toLocaleDateString('en-US', sameMonth ? { day: 'numeric' } : { month: 'short', day: 'numeric' })}`;
}

// An open book with ruled pages — the shelf, at 44px, next to the back link.
// ── The roll as a strip of film ─────────────────────────────────────────────
// koma is named for a single frame, and the index was the one screen that never
// said so — plain cards with a copper rule, next to an itineraries page of deep
// themed blocks. Each row is now a frame: film base, perforated top and bottom,
// with the got/planned count sitting where a frame counter does.
const FILM = {
  base:  '#17150F',   // exposed film base, warm rather than neutral black
  band:  '#0D0C08',   // the edge strip, a shade deeper than the frame
  hole:  'var(--bg)',  // punched through to the page, which is what sells them
  ink:   '#F2ECE1',
  ink2:  '#AFA492',
  ink3:  '#978C7B',   // 5.6:1 on the film base; the old value sat at 4.5
  count: '#FBB04F',
  done:  '#8FCB9B',
};

/** One edge of perforations.
 *
 *  The horizontal gap has to come from the gradient itself. A `to bottom` ramp
 *  tiled with `background-size` fills the whole width of every tile, so the
 *  first version drew two solid cream bands rather than holes — correct code,
 *  no perforations. `repeating-linear-gradient(to right, ...)` makes the
 *  hole/gap rhythm, and a 5px-tall no-repeat strip positions it in the band. */
function Perf() {
  return (
    <div aria-hidden style={{
      height: 13,
      background: FILM.band,
      backgroundImage:
        `repeating-linear-gradient(to right, ${FILM.hole} 0 6px, transparent 6px 11px)`,
      backgroundSize: '100% 5px',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: '0 4px',
    }} />
  );
}

function BookMark() {
  return (
    <svg width="21" height="21" viewBox="0 0 20 20" fill="none" aria-hidden
         style={{ display: 'block' }}>
      <path d="M10 5.3V16" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M10 5.3C8.4 4.1 6.4 3.7 3.6 3.7V14c2.8 0 4.8.4 6.4 1.6"
            stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round" />
      <path d="M10 5.3c1.6-1.2 3.6-1.6 6.4-1.6V14c-2.8 0-4.8.4-6.4 1.6"
            stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round" />
      <path d="M12.4 6.9h2.6M12.4 9.1h2.6M5 6.9h2.6M5 9.1h2.6"
            stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}

export default async function KomaIndex() {
  const entries = await getKomaEntries();

  return (
    <div style={{ maxWidth: 'var(--max-w)', margin: '0 auto', padding: '0 0 60px' }}>
      <header style={{
        padding: 'calc(env(safe-area-inset-top, 0px) + 12px) var(--px) 8px',
        borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <Link href="/" className="tap" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 44,
          fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.22em',
          textTransform: 'uppercase', color: 'var(--brass)',
        }}>
          ← koji
        </Link>
        {/* The shelf is a button, not a row. It is reached for rather than
            browsed, and a full-width card above the rolls made it read as the
            most important thing on the page, which it is not. */}
        <Link href="/koma/notes" className="tap" aria-label="Reference" title="Reference" style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 44, height: 44, marginRight: -10, color: '#B83C01',
        }}>
          <BookMark />
        </Link>
      </header>

      <div style={{ padding: '26px var(--px) 18px' }}>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.2em',
          textTransform: 'uppercase', color: '#B83C01', marginBottom: 8,
        }}>
          <span style={{ opacity: 0.7 }}>齣</span> koma
        </div>
        <h1 style={{
          fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 30,
          letterSpacing: '-0.02em', color: 'var(--ink)', lineHeight: 1.1,
        }}>
          Rolls
        </h1>
        <p style={{ fontSize: 14, color: 'var(--ink-3)', lineHeight: 1.6, marginTop: 8, maxWidth: '38ch' }}>
          One outing&rsquo;s worth of frames. Trip days live on their trip;
          everything else lives here.
        </p>
      </div>

      <div style={{ padding: '0 var(--px)', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {entries.length === 0 && (
          <p style={{
            fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-4)',
            lineHeight: 1.7, padding: '20px 0',
          }}>
            Nothing planned yet.
          </p>
        )}

        {entries.map((roll, i) => (
          <Link
            key={roll.href}
            href={roll.href}
            className="pressable row-in"
            style={{
              animationDelay: `${Math.min(i, 8) * 40}ms`,
              display: 'block', borderRadius: 14, overflow: 'hidden',
              background: FILM.base, color: FILM.ink,
            }}
          >
            <Perf />
            <div style={{ padding: '14px 17px 15px', display: 'flex', alignItems: 'baseline', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h2 style={{
                  fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: 19,
                  letterSpacing: '-0.01em', color: FILM.ink, lineHeight: 1.2,
                }}>
                  {roll.title}
                </h2>
                {roll.subtitle && (
                  <p style={{ fontSize: 13, color: FILM.ink2, lineHeight: 1.45, marginTop: 4 }}>
                    {roll.subtitle}
                  </p>
                )}
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '0.1em',
                  textTransform: 'uppercase', color: FILM.ink3, marginTop: 9,
                }}>
                  {[
                    roll.location,
                    fmtDate(roll.date, roll.date_end),
                    // Only when the date is a single day — with a range on the
                    // line, "3 days" restates it and wraps the row.
                    roll.kind === 'trip' && !roll.date_end ? `${roll.days} days` : null,
                  ].filter(Boolean).join('  ·  ')}
                </div>
              </div>
              {/* Frame counter, in the corner a film counter would be. */}
              <span className="num" style={{
                fontFamily: 'var(--font-mono)', fontSize: 12, flexShrink: 0,
                color: roll.frames && roll.got === roll.frames ? FILM.done : FILM.count,
                letterSpacing: '0.04em',
              }}>
                {roll.got}/{roll.frames}
              </span>
            </div>
            <Perf />
          </Link>
        ))}
      </div>
    </div>
  );
}
