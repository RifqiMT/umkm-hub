'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { setSession } from '@/lib/auth';
import { checkRegistrationAvailability } from '@/lib/registration-availability';
import { useTr } from '@/components/Tr';

const USERNAME_RE = /^[a-zA-Z0-9._-]+$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const AVAILABILITY_DEBOUNCE_MS = 350;

/** Matches API REGISTRATION_CONFLICT_MESSAGE — do not reveal which field collided. */
const REGISTER_CONFLICT =
  'This username or email is already in use. Sign in, or try different details.';

type AvailabilityState = 'idle' | 'checking' | 'available' | 'taken';

function passwordStrength(password: string): {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
} {
  if (!password) return { score: 0, label: '' };
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password) || /[^A-Za-z0-9]/.test(password)) score += 1;
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'] as const;
  return { score: score as 0 | 1 | 2 | 3 | 4, label: labels[score] };
}

function usernameHint(value: string): string | null {
  const name = value.trim();
  if (!name) return null;
  if (name.length < 3) return 'Too short (min 3).';
  if (name.length > 64) return 'Too long.';
  if (!USERNAME_RE.test(name)) {
    return 'Letters, numbers, dots, underscores, and hyphens only.';
  }
  return null;
}

function emailHint(value: string): string | null {
  const mail = value.trim();
  if (!mail) return null;
  if (mail.length > 254) return 'Too long.';
  if (!EMAIL_RE.test(mail)) return 'Enter a valid email address.';
  return null;
}

function isRegisterConflict(err: ApiError): boolean {
  if (err.status === 409) return true;
  return /username or email is already (in use|taken|registered)/i.test(
    err.message,
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const tr = useTr();
  const alertRef = useRef<HTMLDivElement>(null);
  const checkSeq = useRef(0);
  const [profileName, setProfileName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [availability, setAvailability] = useState<AvailabilityState>('idle');
  const [loading, setLoading] = useState(false);

  const nameFormatError = useMemo(
    () => usernameHint(profileName),
    [profileName],
  );
  const emailFormatError = useMemo(() => emailHint(email), [email]);
  const strength = useMemo(() => passwordStrength(password), [password]);

  const identityReady =
    !nameFormatError &&
    !emailFormatError &&
    profileName.trim().length >= 3 &&
    email.trim().length > 0;

  const conflict = availability === 'taken';

  useEffect(() => {
    if (!error || !conflict) return;
    alertRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [error, conflict]);

  useEffect(() => {
    if (!identityReady) {
      setAvailability('idle');
      return;
    }

    const seq = ++checkSeq.current;
    setAvailability('checking');

    const timer = window.setTimeout(async () => {
      try {
        const result = await checkRegistrationAvailability(profileName, email);
        if (seq !== checkSeq.current) return;
        if (result.available) {
          setAvailability('available');
          setError('');
        } else {
          setAvailability('taken');
          setError(result.message ?? REGISTER_CONFLICT);
        }
      } catch (err) {
        if (seq !== checkSeq.current) return;
        // Keep typing unblocked if the probe fails; submit still validates.
        console.error('Registration availability check failed', err);
        setAvailability('idle');
      }
    }, AVAILABILITY_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [identityReady, profileName, email]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    const nameErr = usernameHint(profileName);
    const mailErr = emailHint(email);
    if (
      nameErr ||
      mailErr ||
      profileName.trim().length < 3 ||
      !email.trim() ||
      password.length < 8
    ) {
      setError('Check your username, email, and password, then try again.');
      return;
    }

    if (availability === 'taken' || availability === 'checking') {
      setAvailability('taken');
      setError(REGISTER_CONFLICT);
      return;
    }

    setLoading(true);
    try {
      const data = await api<{
        accessToken: string;
        refreshToken: string;
        profile: { id: string; profileName: string };
      }>('/auth/register', {
        method: 'POST',
        auth: false,
        body: {
          profileName: profileName.trim(),
          email: email.trim().toLowerCase(),
          password,
        },
      });
      setSession(data);
      router.replace('/dashboard');
    } catch (err) {
      if (err instanceof ApiError && isRegisterConflict(err)) {
        setError(REGISTER_CONFLICT);
        setAvailability('taken');
      } else if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Registration failed');
      }
    } finally {
      setLoading(false);
    }
  }

  const identityInvalid = Boolean(
    nameFormatError || emailFormatError || conflict,
  );
  const statusClass =
    nameFormatError || conflict
      ? ' is-bad'
      : availability === 'available'
        ? ' is-ok'
        : availability === 'checking'
          ? ' is-pending'
          : '';

  function fieldStatus(formatError: string | null, idleText: string) {
    if (formatError) return formatError;
    if (!identityReady) return idleText;
    if (availability === 'checking') return 'Checking username and email…';
    if (availability === 'taken') {
      return (
        <>
          Already in use —{' '}
          <Link href="/login" className="umkm-field-status-link">
            Sign in
          </Link>
        </>
      );
    }
    if (availability === 'available') return 'Available';
    return idleText;
  }

  const canSubmit =
    !loading &&
    identityReady &&
    availability === 'available' &&
    password.length >= 8;

  return (
    <main className="umkm-auth umkm-auth-register">
      <section className="umkm-auth-hero" aria-label="UMKM Hub">
        <div className="umkm-auth-hero-copy">
          <p className="umkm-auth-brand">UMKM Hub</p>
          <h1>{tr('Your workspace starts here')}</h1>
          <p>
            {tr(
              'One calm place for products, customers, and orders—set up in a minute.',
            )}
          </p>
          <ul className="umkm-auth-points">
            <li>{tr('Unique username + email for your account')}</li>
            <li>{tr('Secure password, ready for daily work')}</li>
            <li>{tr('Jump straight into your dashboard')}</li>
          </ul>
        </div>
      </section>

      <section className="umkm-auth-panel">
        <div className="umkm-panel umkm-auth-card umkm-auth-card-register">
          <header className="umkm-auth-card-head">
            <h1 className="umkm-title">{tr('Create profile')}</h1>
            <p className="umkm-sub">
              {tr('Choose a username and email, then set a password.')}
            </p>
          </header>

          {error ? (
            <div
              ref={alertRef}
              className={`umkm-error umkm-auth-alert${
                conflict ? ' umkm-auth-alert-conflict' : ''
              }`}
              role="alert"
              aria-live="assertive"
            >
              {conflict ? (
                <>
                  <p className="umkm-auth-alert-title">
                    Username or email already in use
                  </p>
                  <p>
                    Sign in with your account, or try a different username and
                    email.
                  </p>
                  <Link href="/login" className="umkm-btn umkm-auth-alert-cta">
                    Sign in
                  </Link>
                </>
              ) : (
                <p>{error}</p>
              )}
            </div>
          ) : null}

          <form className="umkm-auth-form" onSubmit={onSubmit} noValidate>
            <div
              className={`umkm-field umkm-auth-field${
                nameFormatError || conflict
                  ? ' is-invalid'
                  : availability === 'available'
                    ? ' is-valid'
                    : ''
              }`}
            >
              <label htmlFor="profileName">Username</label>
              <input
                id="profileName"
                value={profileName}
                onChange={(e) => {
                  setProfileName(e.target.value.replace(/\s/g, ''));
                  setError('');
                }}
                required
                minLength={3}
                maxLength={64}
                pattern="[a-zA-Z0-9._-]+"
                title="Letters, numbers, dots, underscores, and hyphens only"
                autoComplete="username"
                spellCheck={false}
                autoCapitalize="off"
                placeholder="e.g. sari_umkm"
                aria-describedby="profileName-status"
                aria-invalid={identityInvalid || undefined}
              />
              <p
                id="profileName-status"
                className={`umkm-field-status${statusClass}`}
                role="status"
              >
                {fieldStatus(
                  nameFormatError,
                  '3–64 characters · checked with your email',
                )}
              </p>
            </div>

            <div
              className={`umkm-field umkm-auth-field${
                emailFormatError || conflict
                  ? ' is-invalid'
                  : availability === 'available'
                    ? ' is-valid'
                    : ''
              }`}
            >
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
                required
                maxLength={254}
                autoComplete="email"
                placeholder="you@example.com"
                aria-describedby="email-status"
                aria-invalid={identityInvalid || undefined}
              />
              <p
                id="email-status"
                className={`umkm-field-status${
                  emailFormatError || conflict
                    ? ' is-bad'
                    : availability === 'available'
                      ? ' is-ok'
                      : availability === 'checking'
                        ? ' is-pending'
                        : ''
                }`}
                role="status"
              >
                {fieldStatus(
                  emailFormatError,
                  'Checked with your username · then locked to this account',
                )}
              </p>
            </div>

            <div className="umkm-field umkm-auth-field">
              <label htmlFor="password">Password</label>
              <div className="umkm-auth-password">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  aria-describedby="password-hint"
                />
                <button
                  type="button"
                  className="umkm-auth-password-toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  disabled={!password}
                  aria-pressed={showPassword}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              {password ? (
                <p
                  id="password-hint"
                  className={`umkm-auth-strength is-${strength.score}`}
                  aria-live="polite"
                >
                  <span
                    className="umkm-auth-strength-bar"
                    style={{ width: `${(strength.score / 4) * 100}%` }}
                  />
                  <em>{strength.label}</em>
                </p>
              ) : (
                <p id="password-hint" className="umkm-field-status">
                  Use 8+ characters. Mix letters and numbers if you can.
                </p>
              )}
            </div>

            <button
              className="umkm-btn umkm-auth-submit"
              type="submit"
              disabled={!canSubmit}
            >
              {loading
                ? 'Creating…'
                : availability === 'checking'
                  ? 'Checking…'
                  : 'Create profile'}
            </button>
          </form>

          <p className="umkm-auth-footer">
            Already have an account? <Link href="/login">Sign in</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
