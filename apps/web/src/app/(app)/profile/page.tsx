'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { confirmDelete } from '@/lib/confirm';
import { CountryCombobox } from '@/components/CountryCombobox';
import {
  ContentSection,
  FormSection,
  PageHeader,
} from '@/components/PageHeader';
import { clearSession } from '@/lib/auth';
import { formatDateLabel, formatMoney, formatQty } from '@/lib/format-money';
import type {
  CustomerSummary,
  DetectLocationResponse,
  LocationSource,
  OrderSummary,
  ProductSummary,
  Profile,
} from '@/lib/types';

type WorkspaceSnapshot = {
  products: ProductSummary | null;
  customers: CustomerSummary | null;
  orders: OrderSummary | null;
};

function monogram(name: string) {
  const parts = name.trim().split(/[._\s-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || 'UH';
}

function shortId(id: string) {
  if (id.length <= 12) return id;
  return `${id.slice(0, 8)}…${id.slice(-4)}`;
}

function displayPersonName(profile: Profile | null, fallback: string) {
  const first = profile?.firstName?.trim() ?? '';
  const last = profile?.lastName?.trim() ?? '';
  const full = `${first} ${last}`.trim();
  return full || fallback;
}

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

function validateCredentials(
  password: string,
  confirmPassword: string,
): string | null {
  if (!password) {
    return 'Enter a new password to update credentials.';
  }
  if (password.length < 8) {
    return 'Password must be at least 8 characters.';
  }
  if (password.length > 128) {
    return 'Password must be at most 128 characters.';
  }
  if (password !== confirmPassword) {
    return 'New password and confirmation do not match.';
  }
  return null;
}

function validatePersonal(
  firstName: string,
  lastName: string,
  locationCity: string,
  locationCountry: string,
): string | null {
  if (firstName && (firstName.length < 1 || firstName.length > 64)) {
    return 'First name must be at most 64 characters.';
  }
  if (lastName && (lastName.length < 1 || lastName.length > 64)) {
    return 'Last name must be at most 64 characters.';
  }
  if (locationCity.length > 120 || locationCountry.length > 120) {
    return 'City and country must be at most 120 characters.';
  }
  return null;
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileName, setProfileName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [locationCity, setLocationCity] = useState('');
  const [locationCountry, setLocationCountry] = useState('');
  const [locationSource, setLocationSource] = useState<LocationSource | null>(
    null,
  );
  const [locationSet, setLocationSet] = useState(false);
  const [clearLocation, setClearLocation] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loadingCreds, setLoadingCreds] = useState(false);
  const [loadingPersonal, setLoadingPersonal] = useState(false);
  const [sendingVerify, setSendingVerify] = useState(false);
  const [devVerifyUrl, setDevVerifyUrl] = useState<string | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [booting, setBooting] = useState(true);
  const [copied, setCopied] = useState(false);
  const [snapshot, setSnapshot] = useState<WorkspaceSnapshot>({
    products: null,
    customers: null,
    orders: null,
  });
  const [snapshotLoading, setSnapshotLoading] = useState(true);

  function applyProfile(me: Profile) {
    setProfile(me);
    setProfileName(me.profileName);
    setFirstName(me.firstName ?? '');
    setLastName(me.lastName ?? '');
    setEmail(me.email ?? '');
    setLocationCity(me.locationCity ?? '');
    setLocationCountry(me.locationCountry ?? '');
    setLocationSource(me.locationSource ?? null);
    setLocationSet(Boolean(me.locationSet));
    setClearLocation(false);
    setDevVerifyUrl(null);
  }

  async function onSendVerification() {
    setError('');
    setMessage('');
    setDevVerifyUrl(null);
    if (!profile?.email) {
      setError('This profile has no email address to verify.');
      return;
    }
    setSendingVerify(true);
    try {
      const result = await api<{
        sent: boolean;
        alreadyVerified: boolean;
        message: string;
        devVerifyUrl: string | null;
      }>('/profiles/me/email/send-verification', { method: 'POST', body: {} });
      setMessage(result.message);
      if (result.devVerifyUrl) setDevVerifyUrl(result.devVerifyUrl);
      if (result.alreadyVerified) {
        const me = await api<Profile>('/profiles/me');
        applyProfile(me);
      }
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Could not send verification email.',
      );
    } finally {
      setSendingVerify(false);
    }
  }

  async function detectLocationInBrowser(): Promise<{
    city: string;
    country: string;
  } | null> {
    try {
      const res = await fetch('https://ipapi.co/json/', {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(4000),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as {
        error?: boolean;
        city?: string | null;
        country_name?: string | null;
        country?: string | null;
      };
      if (data.error) return null;
      const city = (data.city ?? '').trim();
      const country = (data.country_name ?? data.country ?? '').trim();
      if (!city && !country) return null;
      return { city, country };
    } catch {
      return null;
    }
  }

  useEffect(() => {
    async function load() {
      setBooting(true);
      setSnapshotLoading(true);
      try {
        const me = await api<Profile>('/profiles/me');
        applyProfile(me);
        setError('');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        setBooting(false);
      }

      try {
        const [products, customers, orders] = await Promise.all([
          api<ProductSummary>('/products/summary').catch(() => null),
          api<CustomerSummary>('/customers/summary').catch(() => null),
          api<OrderSummary>('/orders/summary').catch(() => null),
        ]);
        setSnapshot({ products, customers, orders });
      } finally {
        setSnapshotLoading(false);
      }
    }
    void load();
  }, []);

  // After verifying in another tab/window, refresh badges without wiping a dirty form.
  useEffect(() => {
    async function refreshVerification() {
      try {
        const me = await api<Profile>('/profiles/me');
        setProfile((prev) => {
          if (!prev) return me;
          return {
            ...prev,
            email: me.email,
            emailVerified: me.emailVerified,
            accountVerified: me.accountVerified,
            emailVerifiedAt: me.emailVerifiedAt,
            accountVerifiedAt: me.accountVerifiedAt,
          };
        });
        if (me.emailVerified) setDevVerifyUrl(null);
      } catch {
        /* keep current UI */
      }
    }
    function onFocus() {
      if (document.visibilityState === 'visible') void refreshVerification();
    }
    document.addEventListener('visibilitychange', onFocus);
    window.addEventListener('focus', onFocus);
    return () => {
      document.removeEventListener('visibilitychange', onFocus);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  const dirtyCreds = useMemo(() => {
    return password.length > 0 || confirmPassword.length > 0;
  }, [password, confirmPassword]);

  const locationDirty = useMemo(() => {
    if (clearLocation) return true;
    return (
      locationCity.trim() !== (profile?.locationCity ?? '') ||
      locationCountry.trim() !== (profile?.locationCountry ?? '')
    );
  }, [
    clearLocation,
    locationCity,
    locationCountry,
    profile?.locationCity,
    profile?.locationCountry,
  ]);

  const dirtyPersonal = useMemo(() => {
    return (
      firstName.trim() !== (profile?.firstName ?? '') ||
      lastName.trim() !== (profile?.lastName ?? '') ||
      locationDirty
    );
  }, [
    firstName,
    lastName,
    locationDirty,
    profile?.firstName,
    profile?.lastName,
  ]);

  const strength = useMemo(() => passwordStrength(password), [password]);

  function logout() {
    clearSession();
    router.replace('/login');
  }

  async function copyProfileId() {
    if (!profile?.id) return;
    try {
      await navigator.clipboard.writeText(profile.id);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setError('Could not copy profile ID.');
    }
  }

  async function onSubmitCredentials(e: FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');

    const validation = validateCredentials(password, confirmPassword);
    if (validation) {
      setError(validation);
      return;
    }

    setLoadingCreds(true);
    try {
      const updated = await api<Profile>('/profiles/me', {
        method: 'PATCH',
        body: { password },
      });
      applyProfile(updated);
      setPassword('');
      setConfirmPassword('');
      setShowPassword(false);
      setMessage('Password updated.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Update failed');
    } finally {
      setLoadingCreds(false);
    }
  }

  async function onSubmitPersonal(e: FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');

    const validation = validatePersonal(
      firstName.trim(),
      lastName.trim(),
      locationCity.trim(),
      locationCountry.trim(),
    );
    if (validation) {
      setError(validation);
      return;
    }
    if (!dirtyPersonal) {
      setError('No changes to save.');
      return;
    }

    setLoadingPersonal(true);
    try {
      const city = clearLocation ? null : locationCity.trim() || null;
      const country = clearLocation ? null : locationCountry.trim() || null;
      const body: Record<string, string | null | undefined> = {
        firstName: firstName.trim() || null,
        lastName: lastName.trim() || null,
      };
      if (locationDirty) {
        body.locationCity = city;
        body.locationCountry = country;
        if (!city && !country) {
          // clearing — server nulls source + IP hash
        } else {
          body.locationSource = locationSource ?? 'MANUAL';
        }
      }

      const updated = await api<Profile>('/profiles/me', {
        method: 'PATCH',
        body,
      });
      applyProfile(updated);
      setMessage('Personal details updated.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Update failed');
    } finally {
      setLoadingPersonal(false);
    }
  }

  async function onDetectLocation() {
    setError('');
    setMessage('');
    setDetecting(true);
    try {
      try {
        const result = await api<DetectLocationResponse>(
          '/profiles/me/detect-location',
          { method: 'POST', body: { save: true } },
        );
        if (result.profile) applyProfile(result.profile);
        setLocationCity(result.city);
        setLocationCountry(result.country);
        setLocationSource('IP');
        setClearLocation(false);
        setMessage('Location detected and saved.');
        return;
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : '';
        const canFallback =
          /local or private|network address|timed out|lookup failed|refused/i.test(
            msg,
          );
        if (!canFallback) throw err;
      }

      // Localhost / private IP: resolve from the browser’s public network view.
      const browser = await detectLocationInBrowser();
      if (!browser) {
        throw new Error(
          'Could not detect location on this network. Enter city and country manually.',
        );
      }
      setLocationCity(browser.city);
      setLocationCountry(browser.country);
      setLocationSource('MANUAL');
      setClearLocation(false);
      const updated = await api<Profile>('/profiles/me', {
        method: 'PATCH',
        body: {
          locationCity: browser.city || null,
          locationCountry: browser.country || null,
          locationSource: 'MANUAL',
        },
      });
      applyProfile(updated);
      setLocationCity(browser.city);
      setLocationCountry(browser.country);
      setMessage('Location detected from your browser network and saved.');
    } catch (err) {
      setError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : 'Could not detect location. Enter city and country manually.',
      );
    } finally {
      setDetecting(false);
    }
  }

  async function onDelete() {
    if (
      !(await confirmDelete(
        'profile',
        profile?.profileName,
        'This removes the profile and all related products, customers, orders, and warehouse history. This cannot be undone.',
      ))
    ) {
      return;
    }
    try {
      await api('/profiles/me', { method: 'DELETE' });
      clearSession();
      router.replace('/login');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Delete failed');
    }
  }

  const loginName = profile?.profileName ?? (profileName.trim() || '…');
  const personName = displayPersonName(profile, loginName);
  const avatarLabel =
    firstName.trim() || lastName.trim()
      ? `${firstName.trim()} ${lastName.trim()}`.trim()
      : loginName === '…'
        ? 'UH'
        : loginName;

  const locationHint = profile?.locationNeedsReentry
    ? 'Your previous location used an older hash format and must be entered again.'
    : 'Optional. Detect from your network or type city and country. Stored encrypted; IP is hashed.';

  return (
    <section className="umkm-profile">
      <PageHeader
        title="Profile"
        description="Your identity, workspace login, security, and a snapshot of what you manage in UMKM Hub."
        actions={
          <button
            type="button"
            className="umkm-btn secondary"
            onClick={logout}
          >
            Log out
          </button>
        }
      />

      {error ? (
        <div className="umkm-error" role="alert">
          {error}
        </div>
      ) : null}
      {message ? (
        <p className="umkm-profile-success" role="status">
          {message}
        </p>
      ) : null}

      <div className="umkm-profile-layout">
        <div className="umkm-profile-main-col">
          <div className="umkm-profile-identity" aria-busy={booting}>
            {booting ? (
              <div className="umkm-profile-identity-skel" aria-hidden>
                <span className="umkm-profile-skel-avatar" />
                <span className="umkm-profile-skel-lines">
                  <i />
                  <i />
                  <i />
                </span>
              </div>
            ) : (
              <>
                <div className="umkm-profile-avatar" aria-hidden>
                  {monogram(avatarLabel)}
                </div>
                <div className="umkm-profile-identity-text">
                  <p className="umkm-profile-eyebrow">Signed in as</p>
                  <h2 className="umkm-profile-name">{personName}</h2>
                  {personName !== loginName ? (
                    <p className="umkm-profile-login-name">@{loginName}</p>
                  ) : null}
                  <dl className="umkm-profile-meta">
                    <div>
                      <dt>Member since</dt>
                      <dd>{formatDateLabel(profile?.createdAt) || '—'}</dd>
                    </div>
                    <div>
                      <dt>Last updated</dt>
                      <dd>{formatDateLabel(profile?.updatedAt) || '—'}</dd>
                    </div>
                    <div className="umkm-profile-meta-id">
                      <dt>Profile ID</dt>
                      <dd>
                        <code title={profile?.id}>
                          {shortId(profile?.id ?? '')}
                        </code>
                        {profile?.id ? (
                          <button
                            type="button"
                            className="umkm-profile-copy"
                            onClick={() => void copyProfileId()}
                          >
                            {copied ? 'Copied' : 'Copy'}
                          </button>
                        ) : null}
                      </dd>
                    </div>
                  </dl>
                  {(profile?.email ||
                    profile?.locationCity ||
                    profile?.locationCountry ||
                    profile?.accountVerified) && (
                    <div className="umkm-profile-identity-extra">
                      <p>
                        {[
                          profile?.email,
                          [profile?.locationCity, profile?.locationCountry]
                            .filter(Boolean)
                            .join(', '),
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                      {profile?.email ? (
                        <p className="umkm-profile-verify-row">
                          <span
                            className={`umkm-profile-verify-badge${profile.emailVerified ? ' is-ok' : ''}`}
                          >
                            {profile.emailVerified
                              ? 'Email verified'
                              : 'Email unverified'}
                          </span>
                          <span
                            className={`umkm-profile-verify-badge${profile.accountVerified ? ' is-ok' : ''}`}
                          >
                            {profile.accountVerified
                              ? 'Account verified'
                              : 'Account unverified'}
                          </span>
                        </p>
                      ) : null}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <ContentSection
            className="umkm-profile-snapshot"
            eyebrow="Workspace"
            title="At a glance"
            description="Live counts from your catalog, CRM, and orders—so you know what this login owns."
          >
            <ul className="umkm-profile-stats" aria-busy={snapshotLoading}>
              <li>
                <span>Products</span>
                <strong>
                  {snapshotLoading
                    ? '…'
                    : formatQty(snapshot.products?.productCount ?? 0)}
                </strong>
                <em>
                  {snapshot.products
                    ? `${formatMoney(snapshot.products.inventorySellValue)} stock value`
                    : 'Catalog SKUs'}
                </em>
              </li>
              <li>
                <span>Customers</span>
                <strong>
                  {snapshotLoading
                    ? '…'
                    : formatQty(snapshot.customers?.customerCount ?? 0)}
                </strong>
                <em>
                  {snapshot.customers?.interestedCount != null
                    ? `${formatQty(snapshot.customers.interestedCount)} interested`
                    : 'CRM contacts'}
                </em>
              </li>
              <li>
                <span>Orders</span>
                <strong>
                  {snapshotLoading
                    ? '…'
                    : formatQty(snapshot.orders?.orderCount ?? 0)}
                </strong>
                <em>
                  {snapshot.orders
                    ? `${formatMoney(snapshot.orders.totalRevenue)} revenue`
                    : 'Active sales'}
                </em>
              </li>
              <li>
                <span>Margin</span>
                <strong>
                  {snapshotLoading
                    ? '…'
                    : snapshot.orders?.profitMarginRate != null
                      ? `${snapshot.orders.profitMarginRate.toFixed(1)}%`
                      : '—'}
                </strong>
                <em>From orders with known cost</em>
              </li>
            </ul>
          </ContentSection>

          <ContentSection
            className="umkm-form-panel umkm-profile-personal"
            eyebrow="Identity"
            title="Personal details"
            description="Optional contact details for this workspace owner. They are not used for sign-in."
          >
            <form onSubmit={onSubmitPersonal}>
              <FormSection
                title="About you"
                description="Shown on your profile so you recognize this account at a glance."
              >
                <div className="umkm-profile-field-grid">
                  <div className="umkm-field">
                    <label htmlFor="profile-first-name">First name</label>
                    <input
                      id="profile-first-name"
                      value={firstName}
                      onChange={(e) => {
                        setFirstName(e.target.value);
                        setMessage('');
                      }}
                      maxLength={64}
                      autoComplete="given-name"
                      disabled={booting}
                    />
                  </div>
                  <div className="umkm-field">
                    <label htmlFor="profile-last-name">Last name</label>
                    <input
                      id="profile-last-name"
                      value={lastName}
                      onChange={(e) => {
                        setLastName(e.target.value);
                        setMessage('');
                      }}
                      maxLength={64}
                      autoComplete="family-name"
                      disabled={booting}
                    />
                  </div>
                </div>
                <div className="umkm-field">
                  <label htmlFor="profile-email">Email address</label>
                  <input
                    id="profile-email"
                    type="email"
                    value={email}
                    readOnly
                    maxLength={254}
                    autoComplete="email"
                    disabled
                    aria-describedby="profile-email-status"
                  />
                  <p id="profile-email-status" className="umkm-name-check">
                    Permanently linked to this username — email cannot be
                    changed.
                  </p>
                  <div className="umkm-profile-email-verify">
                    <p className="umkm-profile-field-hint">
                      {profile?.emailVerified
                        ? 'This email is verified and your account is verified.'
                        : 'Send a verification link to confirm this email and verify your account.'}
                    </p>
                    {!profile?.emailVerified && profile?.email ? (
                      <button
                        type="button"
                        className="umkm-btn secondary"
                        disabled={booting || sendingVerify}
                        onClick={() => void onSendVerification()}
                      >
                        {sendingVerify
                          ? 'Sending…'
                          : 'Send verification email'}
                      </button>
                    ) : null}
                    {devVerifyUrl ? (
                      <div className="umkm-profile-dev-verify" role="status">
                        <strong>No email provider configured</strong>
                        <p>
                          Outbound email is not set up (`RESEND_API_KEY`), so
                          nothing was sent to your inbox. Open this link to
                          verify now:
                        </p>
                        <a className="umkm-btn" href={devVerifyUrl}>
                          Open verification link
                        </a>
                        <p className="umkm-profile-dev-verify-url">
                          <a href={devVerifyUrl}>{devVerifyUrl}</a>
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>
              </FormSection>
              <FormSection
                className="umkm-profile-location"
                title="Location"
                description={locationHint}
              >
                <div className="umkm-profile-location-grid">
                  <div className="umkm-field">
                    <label htmlFor="profile-city">City</label>
                    <input
                      id="profile-city"
                      value={locationCity}
                      onChange={(e) => {
                        setLocationCity(e.target.value);
                        setLocationSource('MANUAL');
                        setClearLocation(false);
                        setMessage('');
                      }}
                      maxLength={120}
                      autoComplete="address-level2"
                      placeholder="e.g. Jakarta"
                      disabled={booting}
                    />
                  </div>
                  <div className="umkm-field">
                    <label htmlFor="profile-country">Country</label>
                    <CountryCombobox
                      id="profile-country"
                      value={locationCountry}
                      onChange={(country) => {
                        setLocationCountry(country);
                        setLocationSource('MANUAL');
                        setClearLocation(false);
                        setMessage('');
                      }}
                      disabled={booting}
                      placeholder="Search country…"
                    />
                  </div>
                </div>
                <div className="umkm-profile-location-actions">
                  <button
                    type="button"
                    className="umkm-btn secondary"
                    onClick={() => void onDetectLocation()}
                    disabled={booting || detecting}
                  >
                    {detecting ? 'Detecting…' : 'Detect from network'}
                  </button>
                  {locationSet ||
                  locationCity ||
                  locationCountry ||
                  clearLocation ? (
                    <button
                      type="button"
                      className="umkm-btn secondary"
                      disabled={booting}
                      onClick={() => {
                        setLocationCity('');
                        setLocationCountry('');
                        setLocationSource(null);
                        setClearLocation(true);
                        setMessage('');
                      }}
                    >
                      Clear location
                    </button>
                  ) : null}
                  {locationSource === 'IP' && locationSet ? (
                    <span className="umkm-profile-location-badge">
                      From network
                    </span>
                  ) : null}
                </div>
              </FormSection>
              <div className="umkm-actions umkm-profile-actions">
                <button
                  className="umkm-btn"
                  type="submit"
                  disabled={loadingPersonal || booting || !dirtyPersonal}
                >
                  {loadingPersonal ? 'Saving…' : 'Save personal details'}
                </button>
                {dirtyPersonal ? (
                  <button
                    type="button"
                    className="umkm-btn secondary"
                    disabled={loadingPersonal}
                    onClick={() => {
                      if (profile) applyProfile(profile);
                      setError('');
                      setMessage('');
                    }}
                  >
                    Discard
                  </button>
                ) : null}
              </div>
            </form>
          </ContentSection>

          <ContentSection
            className="umkm-form-panel umkm-profile-credentials"
            eyebrow="Security"
            title="Credentials"
            description="Your username is permanent and unique. You can update your password here."
          >
            <form onSubmit={onSubmitCredentials}>
              <FormSection
                title="Sign-in details"
                description="Username was set at registration and cannot be changed."
              >
                <div className="umkm-field">
                  <label htmlFor="profile-name">Username</label>
                  <input
                    id="profile-name"
                    value={profileName}
                    readOnly
                    autoComplete="username"
                    disabled
                    aria-describedby="profile-name-status"
                  />
                  <p id="profile-name-status" className="umkm-name-check">
                    Username cannot be changed or reused by another account.
                  </p>
                </div>
                <div className="umkm-profile-field-grid">
                  <div className="umkm-field">
                    <label htmlFor="profile-password">New password</label>
                    <div className="umkm-profile-password-wrap">
                      <input
                        id="profile-password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          setMessage('');
                        }}
                        minLength={8}
                        maxLength={128}
                        autoComplete="new-password"
                        placeholder="Leave blank to keep current"
                        disabled={booting}
                      />
                      <button
                        type="button"
                        className="umkm-profile-password-toggle"
                        onClick={() => setShowPassword((v) => !v)}
                        disabled={!password}
                      >
                        {showPassword ? 'Hide' : 'Show'}
                      </button>
                    </div>
                    {password ? (
                      <p
                        className={`umkm-profile-strength is-${strength.score}`}
                        aria-live="polite"
                      >
                        <span
                          className="umkm-profile-strength-bar"
                          style={{
                            width: `${(strength.score / 4) * 100}%`,
                          }}
                        />
                        <em>{strength.label}</em>
                      </p>
                    ) : (
                      <p className="umkm-profile-field-hint">
                        Use 8+ characters. Mixing letters and numbers helps.
                      </p>
                    )}
                  </div>
                  <div className="umkm-field">
                    <label htmlFor="profile-password-confirm">
                      Confirm password
                    </label>
                    <input
                      id="profile-password-confirm"
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setMessage('');
                      }}
                      minLength={8}
                      maxLength={128}
                      autoComplete="new-password"
                      placeholder="Repeat new password"
                      disabled={booting || !password}
                    />
                  </div>
                </div>
              </FormSection>
              <div className="umkm-actions umkm-profile-actions">
                <button
                  className="umkm-btn"
                  type="submit"
                  disabled={loadingCreds || booting || !dirtyCreds}
                >
                  {loadingCreds ? 'Saving…' : 'Save password'}
                </button>
                {dirtyCreds ? (
                  <button
                    type="button"
                    className="umkm-btn secondary"
                    disabled={loadingCreds}
                    onClick={() => {
                      setPassword('');
                      setConfirmPassword('');
                      setShowPassword(false);
                      setError('');
                      setMessage('');
                    }}
                  >
                    Discard
                  </button>
                ) : null}
              </div>
            </form>
          </ContentSection>
        </div>

        <aside className="umkm-profile-side">
          <ContentSection
            className="umkm-profile-shortcuts"
            eyebrow="Shortcuts"
            title="Go further"
            description="Jump to tools that help you understand and grow this workspace."
          >
            <nav className="umkm-profile-links" aria-label="Profile shortcuts">
              <Link href="/glossary" className="umkm-profile-link">
                <strong>Dictionary</strong>
                <span>Plain-English meanings for every metric</span>
              </Link>
              <Link href="/analytics" className="umkm-profile-link">
                <strong>Analytics</strong>
                <span>Trends, mix, and lead times</span>
              </Link>
              <Link href="/targets" className="umkm-profile-link">
                <strong>Targets</strong>
                <span>Annual plan vs actual revenue</span>
              </Link>
              <Link href="/dashboard" className="umkm-profile-link">
                <strong>Dashboard</strong>
                <span>Period snapshot of the whole workspace</span>
              </Link>
            </nav>
          </ContentSection>

          <ContentSection
            className="umkm-profile-tips"
            eyebrow="Tips"
            title="Keep the account healthy"
            description="Small habits that protect your data."
          >
            <ul className="umkm-profile-checklist">
              <li>Use a unique password you do not reuse elsewhere.</li>
              <li>Log out on shared devices when you finish.</li>
              <li>Delete the profile only after you have exported what you need.</li>
            </ul>
          </ContentSection>
        </aside>
      </div>

      <ContentSection
        className="umkm-profile-danger"
        eyebrow="Danger zone"
        title="Delete profile"
        description="Permanently removes this login and all related products, customers, orders, targets, and warehouse history."
      >
        <div className="umkm-profile-danger-body">
          <p>
            Deletion cannot be undone. Export anything you need before
            continuing.
          </p>
          <button
            className="umkm-btn danger"
            type="button"
            onClick={() => void onDelete()}
            disabled={booting || !profile}
          >
            Delete profile
          </button>
        </div>
      </ContentSection>
    </section>
  );
}
