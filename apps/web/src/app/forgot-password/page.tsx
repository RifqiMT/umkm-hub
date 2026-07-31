'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useTr } from '@/components/Tr';

export default function ForgotPasswordPage() {
  const tr = useTr();
  const [login, setLogin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<{
    message: string;
    devResetUrl?: string | null;
  } | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api<{
        sent: boolean;
        message: string;
        devResetUrl?: string | null;
      }>('/auth/forgot-password', {
        method: 'POST',
        auth: false,
        body: { login: login.trim() },
      });
      setSuccess({
        message: data.message,
        devResetUrl: data.devResetUrl,
      });
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : tr('Could not process your request. Try again.'),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="umkm-auth">
      <section className="umkm-auth-hero" aria-hidden={false}>
        <h1>UMKM Hub</h1>
        <p>{tr('Recover access to your workspace with a secure reset link.')}</p>
      </section>
      <section className="umkm-auth-panel">
        <div className="umkm-panel umkm-auth-card">
          <h1 className="umkm-title">{tr('Forgot password')}</h1>
          <p className="umkm-sub">
            {tr(
              'Enter your username or email. If an account exists, we will email a reset link to the address on file.',
            )}
          </p>
          {error ? <div className="umkm-error">{error}</div> : null}
          {success ? (
            <>
              <p className="umkm-profile-success" role="status">
                {success.message}
              </p>
              {success.devResetUrl ? (
                <p className="umkm-sub" style={{ marginTop: '0.75rem' }}>
                  {tr('Development link (no RESEND_API_KEY):')}{' '}
                  <a href={success.devResetUrl}>{tr('Open reset page')}</a>
                </p>
              ) : null}
              <div className="umkm-actions" style={{ marginTop: '1.1rem' }}>
                <Link className="umkm-btn" href="/login">
                  {tr('Back to sign in')}
                </Link>
              </div>
            </>
          ) : (
            <form onSubmit={onSubmit}>
              <div className="umkm-field">
                <label htmlFor="login">{tr('Username or email')}</label>
                <input
                  id="login"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  required
                  minLength={3}
                  maxLength={254}
                  autoComplete="username"
                  placeholder="username or you@example.com"
                />
              </div>
              <button className="umkm-btn" type="submit" disabled={loading}>
                {loading ? tr('Sending…') : tr('Send reset link')}
              </button>
            </form>
          )}
          {!success ? (
            <p className="umkm-sub" style={{ marginTop: '1.1rem', marginBottom: 0 }}>
              <Link href="/login">{tr('Back to sign in')}</Link>
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
