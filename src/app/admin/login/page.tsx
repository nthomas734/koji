'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await fetch('/api/admin/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      router.push('/admin');
    } else {
      setError('Wrong password');
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
    }}>
      <div style={{ width: '100%', maxWidth: 320, padding: '0 20px' }}>
        <div style={{
          fontFamily: 'var(--font-serif)',
          fontWeight: 300,
          fontSize: 28,
          color: 'var(--ink)',
          marginBottom: 4,
        }}>
          koji
        </div>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: 'var(--brass)',
          marginBottom: 28,
        }}>
          admin
        </div>

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="password"
            autoFocus
            style={{
              width: '100%',
              padding: '12px 14px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              fontSize: 14,
              marginBottom: 10,
              outline: 'none',
            }}
          />
          {error && (
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: '#DC2626',
              marginBottom: 10,
              letterSpacing: '0.05em',
            }}>
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading || !password}
            style={{
              width: '100%',
              padding: '12px',
              background: 'var(--ink)',
              color: 'var(--bg)',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.1em',
              opacity: loading || !password ? 0.5 : 1,
              cursor: loading || !password ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'entering...' : 'enter'}
          </button>
        </form>
      </div>
    </div>
  );
}
