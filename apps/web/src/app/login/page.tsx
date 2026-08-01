'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { setSession } from '@/lib/auth';
import {
  firebaseSignIn,
  getFirebaseIdToken,
  isFirebaseConfigured,
} from '@/lib/firebase';
import { useTr } from '@/components/Tr';

export default function LoginPage() {
  const router = useRouter();
  const tr = useTr();
  const firebaseEnabled = isFirebaseConfigured();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (firebaseEnabled) {
        const email = login.trim().toLowerCase();
        if (!email.includes('@')) {
          setError(
            tr('Sign in with your email address when using Firebase auth.'),
          );
          return;
        }
        await firebaseSignIn(email, password);
        const idToken = await getFirebaseIdToken();
        if (!idToken) {
          throw new Error(tr('Login failed'));
        }
        const data = await api<{
          accessToken: string;
          refreshToken: string;
          profile: { id: string; profileName: string };
        }>('/auth/firebase/session', {
          method: 'POST',
          auth: false,
          body: { idToken },
        });
        setSession(data);
      } else {
        const data = await api<{
          accessToken: string;
          refreshToken: string;
          profile: { id: string; profileName: string };
        }>('/auth/login', {
          method: 'POST',
          auth: false,
          body: { login: login.trim(), password },
        });
        setSession(data);
      }
      router.replace('/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : tr('Login failed'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="umkm-auth">
      <section className="umkm-auth-hero" aria-hidden={false}>
        <h1>UMKM Hub</h1>
        <p>
          {tr(
            'A calm workspace to manage products, customers, and orders for your growing business.',
          )}
        </p>
      </section>
      <section className="umkm-auth-panel">
        <div className="umkm-panel umkm-auth-card">
          <h1 className="umkm-title">{tr('Welcome back')}</h1>
          <p className="umkm-sub">{tr('Sign in to continue to your workspace.')}</p>
          {error ? <div className="umkm-error">{error}</div> : null}
          <form onSubmit={onSubmit}>
            <div className="umkm-field">
              <label htmlFor="login">
                {firebaseEnabled ? tr('Email') : tr('Username or email')}
              </label>
              <input
                id="login"
                type={firebaseEnabled ? 'email' : 'text'}
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                required
                minLength={3}
                maxLength={254}
                autoComplete="username"
                placeholder={
                  firebaseEnabled ? 'you@example.com' : 'username or you@example.com'
                }
              />
            </div>
            <div className="umkm-field">
              <label htmlFor="password">{tr('Password')}</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <p className="umkm-sub" style={{ marginTop: '-0.35rem', marginBottom: '0.85rem' }}>
              <Link href="/forgot-password">{tr('Forgot password?')}</Link>
            </p>
            <button className="umkm-btn" type="submit" disabled={loading}>
              {loading ? tr('Signing in…') : tr('Sign in')}
            </button>
          </form>
          <p className="umkm-sub" style={{ marginTop: '1.1rem', marginBottom: 0 }}>
            {tr('New here?')}{' '}
            <Link href="/register">{tr('Create a profile')}</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
