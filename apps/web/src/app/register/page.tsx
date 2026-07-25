'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { setSession } from '@/lib/auth';

export default function RegisterPage() {
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
      }>('/auth/register', {
        method: 'POST',
        auth: false,
        body: { profileName, password },
      });
      setSession(data);
      router.replace('/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="umkm-auth">
      <section className="umkm-auth-hero">
        <h1>UMKM Hub</h1>
        <p>
          Set up your profile once, then run inventory, CRM, and orders from one
          place.
        </p>
      </section>
      <section className="umkm-auth-panel">
        <div className="umkm-panel umkm-auth-card">
          <h1 className="umkm-title">Create profile</h1>
          <p className="umkm-sub">
            Your profile unlocks product, customer, and order tools.
          </p>
          {error ? <div className="umkm-error">{error}</div> : null}
          <form onSubmit={onSubmit}>
            <div className="umkm-field">
              <label htmlFor="profileName">Profile name</label>
              <input
                id="profileName"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                required
                minLength={3}
                autoComplete="username"
              />
            </div>
            <div className="umkm-field">
              <label htmlFor="password">Password (min 8)</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            <button className="umkm-btn" type="submit" disabled={loading}>
              {loading ? 'Creating…' : 'Create profile'}
            </button>
          </form>
          <p className="umkm-sub" style={{ marginTop: '1.1rem', marginBottom: 0 }}>
            Already have a profile? <Link href="/login">Sign in</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
