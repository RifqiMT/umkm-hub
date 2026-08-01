'use client';

import Link from 'next/link';
import { FormEvent, Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import {
  firebaseConfirmReset,
  isFirebaseConfigured,
} from '@/lib/firebase';
import { useTr } from '@/components/Tr';

function ResetPasswordInner() {
  const tr = useTr();
  const firebaseEnabled = isFirebaseConfigured();
  const searchParams = useSearchParams();
  const legacyToken = searchParams.get('token')?.trim() ?? '';
  const oobCode = searchParams.get('oobCode')?.trim() ?? '';
  const mode = searchParams.get('mode')?.trim() ?? '';
  const firebaseReset = firebaseEnabled && mode === 'resetPassword' && oobCode;
  const token = firebaseReset ? oobCode : legacyToken;
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const mismatch = useMemo(
    () => confirm.length > 0 && password !== confirm,
    [password, confirm],
  );

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError(tr('Passwords do not match.'));
      return;
    }
    setLoading(true);
    try {
      if (firebaseReset) {
        await firebaseConfirmReset(oobCode, password);
        setSuccess(
          tr('Password updated. Sign in with your new password.'),
        );
      } else {
        const data = await api<{ reset: boolean; message: string }>(
          '/auth/reset-password',
          {
            method: 'POST',
            auth: false,
            body: { token, password },
          },
        );
        setSuccess(data.message);
      }
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : tr('Could not reset your password. Request a new link.'),
      );
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <main className="umkm-auth">
        <section className="umkm-auth-hero" aria-hidden={false}>
          <h1>UMKM Hub</h1>
          <p>{tr('Choose a new password for your workspace account.')}</p>
        </section>
        <section className="umkm-auth-panel">
          <div className="umkm-panel umkm-auth-card">
            <h1 className="umkm-title">{tr('Reset password')}</h1>
            <div className="umkm-error" role="alert">
              {tr('This reset link is missing a token. Request a new one.')}
            </div>
            <div className="umkm-actions" style={{ marginTop: '1.1rem' }}>
              <Link className="umkm-btn" href="/forgot-password">
                {tr('Request reset link')}
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="umkm-auth">
      <section className="umkm-auth-hero" aria-hidden={false}>
        <h1>UMKM Hub</h1>
        <p>{tr('Choose a new password for your workspace account.')}</p>
      </section>
      <section className="umkm-auth-panel">
        <div className="umkm-panel umkm-auth-card">
          <h1 className="umkm-title">{tr('Reset password')}</h1>
          {success ? (
            <>
              <p className="umkm-profile-success" role="status">
                {success}
              </p>
              <div className="umkm-actions" style={{ marginTop: '1.1rem' }}>
                <Link className="umkm-btn" href="/login">
                  {tr('Sign in')}
                </Link>
              </div>
            </>
          ) : (
            <>
              <p className="umkm-sub">
                {tr('Enter a new password (minimum 8 characters).')}
              </p>
              {error ? <div className="umkm-error">{error}</div> : null}
              <form onSubmit={onSubmit}>
                <div className="umkm-field">
                  <label htmlFor="password">{tr('New password')}</label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    maxLength={128}
                    autoComplete="new-password"
                  />
                </div>
                <div className="umkm-field">
                  <label htmlFor="confirm">{tr('Confirm password')}</label>
                  <input
                    id="confirm"
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    minLength={8}
                    maxLength={128}
                    autoComplete="new-password"
                  />
                  {mismatch ? (
                    <p className="umkm-field-status" role="alert">
                      {tr('Passwords do not match.')}
                    </p>
                  ) : null}
                </div>
                <button
                  className="umkm-btn"
                  type="submit"
                  disabled={loading || mismatch}
                >
                  {loading ? tr('Updating…') : tr('Update password')}
                </button>
              </form>
              <p className="umkm-sub" style={{ marginTop: '1.1rem', marginBottom: 0 }}>
                <Link href="/forgot-password">{tr('Request a new link')}</Link>
              </p>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

export default function ResetPasswordPage() {
  const tr = useTr();
  return (
    <Suspense
      fallback={
        <main className="umkm-auth">
          <section className="umkm-auth-panel">
            <div className="umkm-panel umkm-auth-card">
              <p className="umkm-sub">{tr('Loading…')}</p>
            </div>
          </section>
        </main>
      }
    >
      <ResetPasswordInner />
    </Suspense>
  );
}
