'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { setSession } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [profileName, setProfileName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api<{
        accessToken: string;
        refreshToken: string;
        profile: { id: string; profileName: string };
      }>('/auth/login', {
        method: 'POST',
        auth: false,
        body: { profileName, password },
      });
      setSession(data);
      router.replace('/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="umkm-auth">
      <section className="umkm-auth-hero" aria-hidden={false}>
        <h1>UMKM Hub</h1>
        <p>
          A calm workspace to manage products, customers, and orders for your
          growing business.
        </p>
      </section>
      <section className="umkm-auth-panel">
        <div className="umkm-panel umkm-auth-card">
          <h1 className="umkm-title">Welcome back</h1>
          <p className="umkm-sub">Sign in to continue to your workspace.</p>
          {error ? <div className="umkm-error">{error}</div> : null}
          <form onSubmit={onSubmit}>
            <div className="umkm-field">
              <label htmlFor="profileName">Profile name</label>
              <input
                id="profileName"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                required
                autoComplete="username"
              />
            </div>
            <div className="umkm-field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <button className="umkm-btn" type="submit" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
          <p className="umkm-sub" style={{ marginTop: '1.1rem', marginBottom: 0 }}>
            New here? <Link href="/register">Create a profile</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
