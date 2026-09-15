'use client';

// Shown when a trip page throws (usually Supabase unreachable). A retry button
// beats Next's default grey page for guests on roaming data.
export default function TripError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div style={{ padding: '80px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
      <div style={{ fontFamily: 'var(--font-serif)', fontSize: 20, color: 'var(--ink)' }}>couldn&apos;t load this page</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-4)', maxWidth: 260, lineHeight: 1.6 }}>
        check your connection and try again
      </div>
      <button
        onClick={() => reset()}
        style={{ marginTop: 6, minHeight: 44, padding: '0 22px', borderRadius: 999, background: 'var(--ink)', color: 'var(--bg)', fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase' }}
      >
        retry
      </button>
    </div>
  );
}
