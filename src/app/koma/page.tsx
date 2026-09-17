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

export default async function KomaIndex() {
  const entries = await getKomaEntries();

  return (
    <div style={{ maxWidth: 'var(--max-w)', margin: '0 auto', padding: '0 0 60px' }}>
      <header style={{
        padding: 'calc(env(safe-area-inset-top, 0px) + 12px) var(--px) 8px',
        borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center',
      }}>
        <Link href="/" className="tap" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 44,
          fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.22em',
          textTransform: 'uppercase', color: 'var(--brass)',
        }}>
          ← koji
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

      {/* The shelf sits above the rolls because it is the thing you reach for
          when there is no plan — and because it is the only page here that is
          worth opening when you are already out. */}
      <div style={{ padding: '0 var(--px) 18px' }}>
        <Link href="/koma/notes" className="pressable" style={{
          display: 'flex', alignItems: 'center', gap: 12,
          background: 'rgba(184,60,1,0.05)', border: '0.5px solid rgba(184,60,1,0.22)',
          borderRadius: 14, padding: '13px 16px',
        }}>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{
              display: 'block', fontFamily: 'var(--font-serif)', fontWeight: 500,
              fontSize: 16, color: 'var(--ink)',
            }}>
              Reference
            </span>
            <span style={{
              display: 'block', fontSize: 12.5, color: 'var(--ink-3)',
              lineHeight: 1.45, marginTop: 2,
            }}>
              Settings and guidelines that do not belong to any one outing.
            </span>
          </span>
          <span aria-hidden style={{
            fontFamily: 'var(--font-mono)', fontSize: 15, color: '#B83C01', flexShrink: 0,
          }}>
            ›
          </span>
        </Link>
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
              display: 'block', background: 'var(--surface)',
              border: '0.5px solid var(--border)', borderRadius: 14,
              padding: '14px 16px', position: 'relative', overflow: 'hidden',
            }}
          >
            <div style={{
              position: 'absolute', left: 0, top: 10, bottom: 10, width: 3,
              background: '#B83C01', borderRadius: 4,
              opacity: roll.frames && roll.got === roll.frames ? 1 : 0.35,
            }} />
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, paddingLeft: 6 }}>
              <h2 style={{
                fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: 18,
                letterSpacing: '-0.01em', color: 'var(--ink)', flex: 1,
              }}>
                {roll.title}
              </h2>
              <span className="num" style={{
                fontFamily: 'var(--font-mono)', fontSize: 11, color: '#B83C01', flexShrink: 0,
              }}>
                {roll.got}/{roll.frames}
              </span>
            </div>
            {roll.subtitle && (
              <p style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.5, marginTop: 4, paddingLeft: 6 }}>
                {roll.subtitle}
              </p>
            )}
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.06em',
              color: 'var(--ink-4)', marginTop: 7, paddingLeft: 6,
            }}>
              {[
                roll.location,
                fmtDate(roll.date, roll.date_end),
                roll.kind === 'trip' ? `${roll.days} days` : null,
              ].filter(Boolean).join(' · ')}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
