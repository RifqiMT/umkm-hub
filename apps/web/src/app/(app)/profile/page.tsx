'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError, downloadDataExport, uploadDataImport } from '@/lib/api';
import { confirmDelete } from '@/lib/confirm';
import { useTr } from '@/components/Tr';
import { clearSession } from '@/lib/auth';
import { firebaseSignOut, isFirebaseConfigured } from '@/lib/firebase';
import { getUiLanguageCode, resetUiLanguage, setUiLanguageCode } from '@/lib/ui-language';
import { useTranslationStatus } from '@/hooks/useTranslationStatus';
import { ProfileInvoicingSection } from '@/app/(app)/profile/ProfileInvoicingSection';
import { ProfileShell } from '@/app/(app)/profile/ProfileShell';
import { ProfileSidebar } from '@/app/(app)/profile/ProfileSidebar';
import { ProfileFeedback } from '@/app/(app)/profile/ProfileFeedback';
import { ProfilePersonalSection } from '@/app/(app)/profile/ProfilePersonalSection';
import { ProfileCredentialsSection } from '@/app/(app)/profile/ProfileCredentialsSection';
import { ProfileOverview } from '@/app/(app)/profile/ProfileOverview';
import { ProfileDataSection } from '@/app/(app)/profile/ProfileDataSection';
import { ProfileDangerSection } from '@/app/(app)/profile/ProfileDangerSection';
import {
  computeProfileHealth,
  profileSectionAlerts,
} from '@/app/(app)/profile/profile-health';
import { profileSectionDomId, type ProfileSectionId } from '@/app/(app)/profile/profile-sections';
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
  const tr = useTr();
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
  const [loadingBusiness, setLoadingBusiness] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [npwp, setNpwp] = useState('');
  const [isPkp, setIsPkp] = useState(false);
  const [defaultPpnPercent, setDefaultPpnPercent] = useState(11);
  const [taxInclusive, setTaxInclusive] = useState(false);
  const [invoicePrefix, setInvoicePrefix] = useState('');
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
  const [exportScope, setExportScope] = useState<
    'all-profiles' | 'own-profile' | null
  >(null);
  const [exporting, setExporting] = useState<
    'json' | 'csv' | 'csv-unified' | null
  >(null);
  const [importing, setImporting] = useState<
    'json' | 'csv-unified' | null
  >(null);
  const [uiLanguage, setUiLanguage] = useState<string | null>(null);
  const { status: translationStatus, progress: translationProgress, retry: retryTranslationUi } =
    useTranslationStatus();

  useEffect(() => {
    setUiLanguage(getUiLanguageCode());
  }, []);

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
    setBusinessName(me.businessName ?? '');
    setBusinessPhone(me.businessPhone ?? '');
    setBusinessAddress(me.businessAddress ?? '');
    setNpwp(me.npwp ?? '');
    setIsPkp(Boolean(me.isPkp));
    setDefaultPpnPercent(me.defaultPpnPercent ?? 11);
    setTaxInclusive(Boolean(me.taxInclusive));
    setInvoicePrefix(me.invoicePrefix ?? '');
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

      try {
        const eligibility = await api<{
          allowed: boolean;
          scope: 'all-profiles' | 'own-profile';
        }>('/export/eligibility');
        if (eligibility.allowed) {
          setExportScope(eligibility.scope);
        } else {
          setExportScope(null);
        }
      } catch {
        setExportScope(null);
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

  const dirtyBusiness = useMemo(() => {
    if (!profile) return false;
    return (
      businessName.trim() !== (profile.businessName ?? '') ||
      businessPhone.trim() !== (profile.businessPhone ?? '') ||
      businessAddress.trim() !== (profile.businessAddress ?? '') ||
      npwp.trim() !== (profile.npwp ?? '') ||
      isPkp !== Boolean(profile.isPkp) ||
      defaultPpnPercent !== (profile.defaultPpnPercent ?? 11) ||
      taxInclusive !== Boolean(profile.taxInclusive) ||
      invoicePrefix.trim() !== (profile.invoicePrefix ?? '')
    );
  }, [
    profile,
    businessName,
    businessPhone,
    businessAddress,
    npwp,
    isPkp,
    defaultPpnPercent,
    taxInclusive,
    invoicePrefix,
  ]);

  const invoicingValues = useMemo(
    () => ({
      businessName,
      businessPhone,
      businessAddress,
      npwp,
      isPkp,
      defaultPpnPercent,
      taxInclusive,
      invoicePrefix,
    }),
    [
      businessName,
      businessPhone,
      businessAddress,
      npwp,
      isPkp,
      defaultPpnPercent,
      taxInclusive,
      invoicePrefix,
    ],
  );

  const profileHealth = useMemo(
    () =>
      computeProfileHealth({
        firstName,
        lastName,
        email: profile?.email,
        emailVerified: Boolean(profile?.emailVerified),
        locationCity,
        locationCountry,
        businessName,
      }),
    [
      firstName,
      lastName,
      profile?.email,
      profile?.emailVerified,
      locationCity,
      locationCountry,
      businessName,
    ],
  );

  const sectionAlerts = useMemo(
    () => profileSectionAlerts(profileHealth),
    [profileHealth],
  );

  const dirtySections = useMemo(() => {
    const sections: ProfileSectionId[] = [];
    if (dirtyPersonal) sections.push('personal');
    if (dirtyBusiness) sections.push('invoicing');
    if (dirtyCreds) sections.push('security');
    return sections;
  }, [dirtyPersonal, dirtyBusiness, dirtyCreds]);

  const strength = useMemo(() => {
    const s = passwordStrength(password);
    return { ...s, label: s.label ? tr(s.label) : '' };
  }, [password, tr]);

  async function logout() {
    if (isFirebaseConfigured()) {
      await firebaseSignOut();
    }
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

  async function onSubmitBusiness(e: FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoadingBusiness(true);
    try {
      const updated = await api<Profile>('/profiles/me', {
        method: 'PATCH',
        body: {
          businessName: businessName.trim() || null,
          businessPhone: businessPhone.trim() || null,
          businessAddress: businessAddress.trim() || null,
          npwp: npwp.trim() || null,
          isPkp,
          defaultPpnPercent,
          taxInclusive,
          invoicePrefix: invoicePrefix.trim() || null,
        },
      });
      applyProfile(updated);
      setMessage('Invoice profile saved.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Update failed');
    } finally {
      setLoadingBusiness(false);
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

  async function onExport(format: 'json' | 'csv' | 'csv-unified') {
    setError('');
    setMessage('');
    setExporting(format);
    try {
      const { blob, filename } = await downloadDataExport(format);
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
      setMessage(
        format === 'csv'
          ? 'CSV export downloaded (ZIP with one sheet per table).'
          : format === 'csv-unified'
            ? 'Unified CSV downloaded (all tables in one file).'
            : 'JSON export downloaded.',
      );
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Export failed—please try again.',
      );
    } finally {
      setExporting(null);
    }
  }

  async function onImport(format: 'json' | 'csv-unified', file: File | undefined) {
    if (!file) return;
    setError('');
    setMessage('');
    setImporting(format);
    try {
      const result = await uploadDataImport(format, file);
      const totals = Object.values(result.merged).reduce(
        (acc, row) => ({
          created: acc.created + row.created,
          updated: acc.updated + row.updated,
          skipped: acc.skipped + row.skipped,
        }),
        { created: 0, updated: 0, skipped: 0 },
      );
      setMessage(
        `Import merged (${result.scope}): ${totals.created} created, ${totals.updated} updated, ${totals.skipped} skipped.`,
      );
      setSnapshotLoading(true);
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
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Import failed—please try again.',
      );
    } finally {
      setImporting(null);
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
      <ProfileShell
        booting={booting}
        personName={personName}
        loginName={loginName}
        avatarLabel={avatarLabel}
        showData={Boolean(exportScope)}
        sectionAlerts={sectionAlerts}
        dirtySections={dirtySections}
        onLogout={logout}
      />

      <ProfileFeedback
        error={error}
        message={message}
        onDismiss={() => {
          setError('');
          setMessage('');
        }}
      />

      <div className="umkm-profile-layout">
        <div className="umkm-profile-main-col">
          <section
            id={profileSectionDomId('overview')}
            className="umkm-profile-section umkm-profile-section-overview"
          >
            <ProfileOverview
              booting={booting}
              profile={profile}
              personName={personName}
              loginName={loginName}
              avatarLabel={avatarLabel}
              copied={copied}
              businessName={businessName}
              firstName={firstName}
              lastName={lastName}
              snapshotLoading={snapshotLoading}
              snapshot={snapshot}
              onCopyProfileId={() => void copyProfileId()}
            />
          </section>

          <div
            id={profileSectionDomId('personal')}
            className="umkm-profile-section"
          >
          <ProfilePersonalSection
            booting={booting}
            loading={loadingPersonal}
            dirty={dirtyPersonal}
            profile={profile}
            firstName={firstName}
            lastName={lastName}
            email={email}
            locationCity={locationCity}
            locationCountry={locationCountry}
            locationSource={locationSource}
            locationSet={locationSet}
            clearLocation={clearLocation}
            locationHint={locationHint}
            sendingVerify={sendingVerify}
            devVerifyUrl={devVerifyUrl}
            detecting={detecting}
            onSubmit={onSubmitPersonal}
            onDiscard={() => {
              if (profile) applyProfile(profile);
              setError('');
              setMessage('');
            }}
            onFirstNameChange={(value) => {
              setFirstName(value);
              setMessage('');
            }}
            onLastNameChange={(value) => {
              setLastName(value);
              setMessage('');
            }}
            onSendVerification={() => void onSendVerification()}
            onLocationCityChange={(value) => {
              setLocationCity(value);
              setLocationSource('MANUAL');
              setClearLocation(false);
              setMessage('');
            }}
            onLocationCountryChange={(country) => {
              setLocationCountry(country);
              setLocationSource('MANUAL');
              setClearLocation(false);
              setMessage('');
            }}
            onDetectLocation={() => void onDetectLocation()}
            onClearLocation={() => {
              setLocationCity('');
              setLocationCountry('');
              setLocationSource(null);
              setClearLocation(true);
              setMessage('');
            }}
          />
          </div>

          <section
            id={profileSectionDomId('invoicing')}
            className="umkm-profile-section umkm-profile-section-invoicing"
          >
          <ProfileInvoicingSection
            values={invoicingValues}
            onChange={(patch) => {
              if (patch.businessName !== undefined) {
                setBusinessName(patch.businessName);
              }
              if (patch.businessPhone !== undefined) {
                setBusinessPhone(patch.businessPhone);
              }
              if (patch.businessAddress !== undefined) {
                setBusinessAddress(patch.businessAddress);
              }
              if (patch.npwp !== undefined) setNpwp(patch.npwp);
              if (patch.isPkp !== undefined) setIsPkp(patch.isPkp);
              if (patch.defaultPpnPercent !== undefined) {
                setDefaultPpnPercent(patch.defaultPpnPercent);
              }
              if (patch.taxInclusive !== undefined) {
                setTaxInclusive(patch.taxInclusive);
              }
              if (patch.invoicePrefix !== undefined) {
                setInvoicePrefix(patch.invoicePrefix);
              }
              setMessage('');
            }}
            onSubmit={(e) => void onSubmitBusiness(e)}
            onDiscard={() => {
              if (profile) applyProfile(profile);
              setError('');
              setMessage('');
            }}
            loading={loadingBusiness}
            booting={booting}
            dirty={dirtyBusiness}
            ownerEmail={profile?.email}
            loginName={profile?.profileName}
          />
          </section>

          <section
            id={profileSectionDomId('security')}
            className="umkm-profile-section"
          >
          <ProfileCredentialsSection
            booting={booting}
            loading={loadingCreds}
            dirty={dirtyCreds}
            profileName={profileName}
            password={password}
            confirmPassword={confirmPassword}
            showPassword={showPassword}
            strengthScore={strength.score}
            strengthLabel={strength.label}
            onSubmit={onSubmitCredentials}
            onDiscard={() => {
              setPassword('');
              setConfirmPassword('');
              setShowPassword(false);
              setError('');
              setMessage('');
            }}
            onPasswordChange={(value) => {
              setPassword(value);
              setMessage('');
            }}
            onConfirmPasswordChange={(value) => {
              setConfirmPassword(value);
              setMessage('');
            }}
            onToggleShowPassword={() => setShowPassword((v) => !v)}
          />
          </section>
        </div>

        <aside className="umkm-profile-side">
          <ProfileSidebar
            booting={booting}
            uiLanguage={uiLanguage}
            translationStatus={translationStatus}
            translationProgress={translationProgress}
            onLanguageChange={(code) => {
              setUiLanguage(code);
              setUiLanguageCode(code);
            }}
            onRetryTranslation={() => retryTranslationUi()}
            onResetTranslation={() => resetUiLanguage()}
          />
        </aside>
      </div>

      {exportScope ? (
        <div
          id={profileSectionDomId('data')}
          className="umkm-profile-section umkm-profile-section-wide"
        >
          <ProfileDataSection
            exportScope={exportScope}
            booting={booting}
            hasProfile={Boolean(profile)}
            exporting={exporting}
            importing={importing}
            onExport={(format) => void onExport(format)}
            onImport={(format, file) => void onImport(format, file)}
          />
        </div>
      ) : null}

      <div
        id={profileSectionDomId('danger')}
        className="umkm-profile-section umkm-profile-section-wide"
      >
        <ProfileDangerSection
          booting={booting}
          disabled={!profile}
          onDelete={() => void onDelete()}
        />
      </div>
    </section>
  );
}
