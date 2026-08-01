'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import {
  firebaseVerifyEmail,
  getFirebaseIdToken,
  isFirebaseConfigured,
} from '@/lib/firebase';
import { useTr } from '@/components/Tr';

type VerifyState =
  | { status: 'pending' }
  | { status: 'ok'; message: string; email?: string }
  | { status: 'error'; message: string };

type VerifyOk = { message: string; email?: string };

/** Survives React Strict Mode remounts in the same tab. */
const verifyInflight = new Map<string, Promise<VerifyOk>>();

function cacheKey(token: string) {
  return `umkm_email_verify:${token}`;
}

function readCached(token: string): VerifyOk | null {
  try {
    const raw = sessionStorage.getItem(cacheKey(token));
    if (!raw) return null;
    return JSON.parse(raw) as VerifyOk;
  } catch {
    return null;
  }
}

function writeCached(token: string, value: VerifyOk) {
  try {
    sessionStorage.setItem(cacheKey(token), JSON.stringify(value));
  } catch {
    /* ignore quota / private mode */
  }
}

function verifyEmailOnce(token: string, firebaseMode: boolean): Promise<VerifyOk> {
  const cached = readCached(token);
  if (cached) return Promise.resolve(cached);

  const existing = verifyInflight.get(token);
  if (existing) return existing;

  const promise = (async () => {
    if (firebaseMode) {
      await firebaseVerifyEmail(token);
      const idToken = await getFirebaseIdToken();
      if (idToken) {
        try {
          await api('/auth/firebase/session', {
            method: 'POST',
            auth: false,
            body: { idToken },
          });
        } catch {
          /* profile sync optional on verify page */
        }
      }
      const ok: VerifyOk = {
        message: 'Email verified successfully. You can sign in now.',
      };
      writeCached(token, ok);
      return ok;
    }

    const result = await api<{
      verified: boolean;
      email?: string;
      message: string;
    }>('/auth/verify-email', {
      method: 'POST',
      auth: false,
      body: { token },
    });
    const ok: VerifyOk = {
      message: result.message || 'Email and account verified successfully.',
      email: result.email,
    };
    writeCached(token, ok);
    return ok;
  })().catch((err) => {
    verifyInflight.delete(token);
    throw err;
  });

  verifyInflight.set(token, promise);
  return promise;
}

function VerifyEmailInner() {
  const tr = useTr();
  const firebaseEnabled = isFirebaseConfigured();
  const searchParams = useSearchParams();
  const legacyToken = searchParams.get('token')?.trim() ?? '';
  const oobCode = searchParams.get('oobCode')?.trim() ?? '';
  const mode = searchParams.get('mode')?.trim() ?? '';
  const firebaseMode =
    firebaseEnabled && (mode === 'verifyEmail' || Boolean(oobCode && !legacyToken));
  const token = firebaseMode ? oobCode : legacyToken;
  const [state, setState] = useState<VerifyState>({ status: 'pending' });
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    setSignedIn(Boolean(getAccessToken()));
  }, []);

  useEffect(() => {
    if (!token) {
      setState({
        status: 'error',
        message: tr('This verification link is missing a token.'),
      });
      return;
    }

    let alive = true;
    async function run() {
      try {
        const result = await verifyEmailOnce(token, firebaseMode);
        if (!alive) return;
        setState({
          status: 'ok',
          message: result.message,
          email: result.email,
        });
      } catch (err) {
        if (!alive) return;
        setState({
          status: 'error',
          message:
            err instanceof ApiError
              ? err.message
              : tr('Could not verify this link. Request a new one from Profile.'),
        });
      }
    }
    void run();
    return () => {
      alive = false;
    };
  }, [token, firebaseMode, tr]);

  return (
    <main className="umkm-auth">
      <section className="umkm-auth-hero" aria-hidden={false}>
        <h1>UMKM Hub</h1>
        <p>{tr('Confirm your email to verify your workspace account.')}</p>
      </section>
      <section className="umkm-auth-panel">
        <div className="umkm-panel umkm-auth-card">
          <h1 className="umkm-title">{tr('Email verification')}</h1>
          {state.status === 'pending' ? (
            <p className="umkm-sub">{tr('Verifying your link…')}</p>
          ) : null}
          {state.status === 'ok' ? (
            <>
              <p className="umkm-profile-success" role="status">
                {state.message}
              </p>
              {state.email ? (
                <p className="umkm-sub">{state.email}</p>
              ) : null}
              <div className="umkm-actions" style={{ marginTop: '1.1rem' }}>
                <Link
                  className="umkm-btn"
                  href={signedIn ? '/profile' : '/login'}
                >
                  {signedIn ? tr('Back to Profile') : tr('Sign in')}
                </Link>
              </div>
            </>
          ) : null}
          {state.status === 'error' ? (
            <>
              <div className="umkm-error" role="alert">
                {state.message}
              </div>
              <div className="umkm-actions" style={{ marginTop: '1.1rem' }}>
                <Link
                  className="umkm-btn"
                  href={signedIn ? '/profile' : '/login'}
                >
                  {signedIn ? tr('Request a new link') : tr('Sign in')}
                </Link>
              </div>
            </>
          ) : null}
        </div>
      </section>
    </main>
  );
}

export default function VerifyEmailPage() {
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
      <VerifyEmailInner />
    </Suspense>
  );
}
