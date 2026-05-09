import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import type { Trip } from '@/lib/supabase';

export default async function AdminPage() {
  const store = cookies();
  const authed = store.get('koji_admin')?.value === process.env.ADMIN_PASSWORD;
  if (!authed) redirect('/admin/login');

  const sb = supabaseAdmin();
  const { data: trips } = await sb
    .from('koji_trips')
    .select('*')
    .order('sort_order');

  const allTrips = (trips ?? []) as Trip[];

  return (
    <div style={{ maxWidth: 'var(--max-w)', margin: '0 auto', padding: '0 0 60px' }}>
      <header style={{
        padding: '32px var(--px) 20px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
      }}>
        <div>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--brass)',
            marginBottom: 6,
          }}>
            <Link href="/">koji</Link> · admin
          </div>
          <h1 style={{
            fontFamily: 'var(--font-serif)',
            fontWeight: 300,
            fontSize: 26,
            color: 'var(--ink)',
          }}>
            Trips
          </h1>
        </div>
        <Link
          href="/admin/trips/new"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            background: 'var(--ink)',
            color: 'var(--bg)',
            padding: '8px 14px',
            borderRadius: 6,
          }}
        >
          + New trip
        </Link>
      </header>

      <main style={{ padding: '12px var(--px) 0' }}>
        {allTrips.length === 0 ? (
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--ink-4)',
            textAlign: 'center',
            padding: '40px 0',
          }}>
            no trips yet — create one
          </div>
        ) : (
          allTrips.map(trip => (
            <div key={trip.id} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 0',
              borderBottom: '1px solid var(--border)',
              gap: 12,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9,
                  letterSpacing: '0.15em',
                  color: 'var(--ink-4)',
                  textTransform: 'uppercase',
                  marginBottom: 3,
                }}>
                  {trip.eyebrow}
                  {!trip.published && (
                    <span style={{
                      marginLeft: 8,
                      color: '#DC2626',
                      background: '#FEF2F2',
                      padding: '1px 5px',
                      borderRadius: 3,
                    }}>
                      draft
                    </span>
                  )}
                </div>
                <div style={{
                  fontSize: 15,
                  fontWeight: 500,
                  color: 'var(--ink)',
                  marginBottom: 2,
                }}>
                  {trip.title} — {trip.subtitle}
                </div>
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9,
                  color: 'var(--ink-4)',
                  letterSpacing: '0.08em',
                }}>
                  /{trip.slug}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <Link
                  href={`/trips/${trip.slug}`}
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 9,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: 'var(--ink-3)',
                    padding: '6px 10px',
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                  }}
                >
                  View
                </Link>
                <Link
                  href={`/admin/trips/${trip.id}`}
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 9,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: 'var(--ink)',
                    padding: '6px 10px',
                    border: '1px solid var(--border-mid)',
                    borderRadius: 6,
                  }}
                >
                  Edit
                </Link>
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  );
}
