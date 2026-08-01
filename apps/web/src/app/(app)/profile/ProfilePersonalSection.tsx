'use client';

import { FormEvent, useMemo } from 'react';
import { CountryCombobox } from '@/components/CountryCombobox';
import {
  ContentSection,
  FieldLabel,
  FormSection,
} from '@/components/PageHeader';
import { ProfileFormActions } from '@/app/(app)/profile/ProfileFormActions';
import type { LocationSource, Profile } from '@/lib/types';

type ProfilePersonalSectionProps = {
  booting: boolean;
  loading: boolean;
  dirty: boolean;
  profile: Profile | null;
  firstName: string;
  lastName: string;
  email: string;
  locationCity: string;
  locationCountry: string;
  locationSource: LocationSource | null;
  locationSet: boolean;
  clearLocation: boolean;
  locationHint: string;
  sendingVerify: boolean;
  devVerifyUrl: string | null;
  detecting: boolean;
  onSubmit: (e: FormEvent) => void;
  onDiscard: () => void;
  onFirstNameChange: (value: string) => void;
  onLastNameChange: (value: string) => void;
  onSendVerification: () => void;
  onLocationCityChange: (value: string) => void;
  onLocationCountryChange: (value: string) => void;
  onDetectLocation: () => void;
  onClearLocation: () => void;
};

function personalMonogram(firstName: string, lastName: string, email: string) {
  const first = firstName.trim();
  const last = lastName.trim();
  if (first && last) {
    return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase();
  }
  if (first) return first.slice(0, 2).toUpperCase();
  if (last) return last.slice(0, 2).toUpperCase();
  const local = email.split('@')[0]?.trim() ?? '';
  return local.slice(0, 2).toUpperCase() || 'UH';
}

export function ProfilePersonalSection({
  booting,
  loading,
  dirty,
  profile,
  firstName,
  lastName,
  email,
  locationCity,
  locationCountry,
  locationSource,
  locationSet,
  clearLocation,
  locationHint,
  sendingVerify,
  devVerifyUrl,
  detecting,
  onSubmit,
  onDiscard,
  onFirstNameChange,
  onLastNameChange,
  onSendVerification,
  onLocationCityChange,
  onLocationCountryChange,
  onDetectLocation,
  onClearLocation,
}: ProfilePersonalSectionProps) {
  const showLocationActions =
    locationSet || locationCity || locationCountry || clearLocation;
  const displayName = [firstName.trim(), lastName.trim()]
    .filter(Boolean)
    .join(' ');
  const monogram = useMemo(
    () => personalMonogram(firstName, lastName, email),
    [firstName, lastName, email],
  );
  const emailVerified = Boolean(profile?.emailVerified);
  const hasEmail = Boolean(profile?.email);
  const locationSummary = [locationCity.trim(), locationCountry.trim()]
    .filter(Boolean)
    .join(', ');

  return (
    <ContentSection
      className="umkm-form-panel umkm-profile-personal"
      eyebrow="Identity"
      title="Personal details"
      description="Optional contact and location for this workspace. These details are separate from sign-in."
    >
      <form className="umkm-profile-personal-form" onSubmit={onSubmit}>
        <div
          className={`umkm-profile-personal-preview${dirty ? ' is-dirty' : ''}`}
          aria-live="polite"
        >
          <span className="umkm-profile-personal-avatar" aria-hidden>
            {monogram}
          </span>
          <div className="umkm-profile-personal-preview-copy">
            <strong className={displayName ? undefined : 'is-placeholder'}>
              {displayName || 'Add your name'}
            </strong>
            <p className="umkm-profile-personal-preview-meta">
              <span className="notranslate">{email || 'No email on file'}</span>
              {locationSummary && !clearLocation ? (
                <>
                  <span aria-hidden>·</span>
                  <span>{locationSummary}</span>
                </>
              ) : null}
            </p>
          </div>
          {hasEmail ? (
            <span
              className={`umkm-profile-personal-status${emailVerified ? ' is-ok' : ' is-warn'}`}
            >
              {emailVerified ? 'Verified' : 'Unverified'}
            </span>
          ) : null}
        </div>

        <FormSection
          title="Name"
          description="How you appear on this profile page."
        >
          <div className="umkm-profile-field-grid">
            <div className="umkm-field">
              <FieldLabel htmlFor="profile-first-name">First name</FieldLabel>
              <input
                id="profile-first-name"
                value={firstName}
                onChange={(e) => onFirstNameChange(e.target.value)}
                maxLength={64}
                autoComplete="given-name"
                disabled={booting}
                placeholder="Optional"
              />
            </div>
            <div className="umkm-field">
              <FieldLabel htmlFor="profile-last-name">Last name</FieldLabel>
              <input
                id="profile-last-name"
                value={lastName}
                onChange={(e) => onLastNameChange(e.target.value)}
                maxLength={64}
                autoComplete="family-name"
                disabled={booting}
                placeholder="Optional"
              />
            </div>
          </div>
        </FormSection>

        <div className="umkm-profile-email-block">
          <FormSection
            title="Email"
            description="Linked to your username at registration and cannot be changed."
          >
            <div className="umkm-profile-email-locked">
              <div className="umkm-profile-readonly-field">
                <FieldLabel htmlFor="profile-email">Email address</FieldLabel>
                <div className="umkm-profile-email-input-row">
                  <input
                    id="profile-email"
                    type="email"
                    value={email}
                    readOnly
                    disabled
                    aria-describedby="profile-email-status"
                  />
                  {hasEmail ? (
                    <span
                      className={`umkm-profile-email-chip${emailVerified ? ' is-ok' : ' is-warn'}`}
                      aria-hidden
                    >
                      {emailVerified ? 'Verified' : 'Needs verify'}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </FormSection>

          {hasEmail && !emailVerified ? (
            <div className="umkm-profile-verify-callout" role="status">
              <div className="umkm-profile-verify-callout-icon" aria-hidden>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11A2.5 2.5 0 0 1 17.5 20h-11A2.5 2.5 0 0 1 4 17.5v-11Z"
                    stroke="currentColor"
                    strokeWidth="1.75"
                  />
                  <path
                    d="m4 7 8 6 8-6"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div className="umkm-profile-verify-callout-copy">
                <strong>Verify your email</strong>
                <p>
                  Confirm this address to finish account verification and enable
                  recovery options.
                </p>
                <button
                  type="button"
                  className="umkm-btn"
                  disabled={booting || sendingVerify}
                  onClick={onSendVerification}
                >
                  {sendingVerify ? 'Sending…' : 'Send verification email'}
                </button>
              </div>
            </div>
          ) : emailVerified ? (
            <p id="profile-email-status" className="umkm-profile-email-ok">
              Email verified. Your account is fully verified.
            </p>
          ) : (
            <p id="profile-email-status" className="umkm-name-check">
              Email cannot be changed after registration.
            </p>
          )}

          {devVerifyUrl ? (
            <div className="umkm-profile-dev-verify" role="status">
              <strong>No email provider configured</strong>
              <p>
                Outbound email is not set up (`RESEND_API_KEY`), so nothing was
                sent. Open this link to verify now:
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

        <FormSection
          className="umkm-profile-location umkm-profile-location-panel"
          title="Location"
          description={locationHint}
        >
          <div className="umkm-profile-location-grid">
            <div className="umkm-field">
              <FieldLabel htmlFor="profile-city">City</FieldLabel>
              <input
                id="profile-city"
                value={locationCity}
                onChange={(e) => onLocationCityChange(e.target.value)}
                maxLength={120}
                autoComplete="address-level2"
                placeholder="e.g. Jakarta"
                disabled={booting}
              />
            </div>
            <div className="umkm-field">
              <FieldLabel htmlFor="profile-country">Country</FieldLabel>
              <CountryCombobox
                id="profile-country"
                value={locationCountry}
                onChange={onLocationCountryChange}
                disabled={booting}
                placeholder="Search country…"
              />
            </div>
          </div>
          <div className="umkm-profile-location-actions">
            <button
              type="button"
              className="umkm-btn secondary umkm-profile-location-detect"
              onClick={onDetectLocation}
              disabled={booting || detecting}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden
              >
                <path
                  d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                />
                <circle
                  cx="12"
                  cy="12"
                  r="3.25"
                  stroke="currentColor"
                  strokeWidth="1.75"
                />
                <circle
                  cx="12"
                  cy="12"
                  r="7"
                  stroke="currentColor"
                  strokeWidth="1.75"
                />
              </svg>
              {detecting ? 'Detecting…' : 'Detect from network'}
            </button>
            {showLocationActions ? (
              <button
                type="button"
                className="umkm-btn ghost"
                disabled={booting}
                onClick={onClearLocation}
              >
                Clear
              </button>
            ) : null}
            {locationSource === 'IP' && locationSet ? (
              <span className="umkm-profile-location-badge">From network</span>
            ) : locationSource === 'MANUAL' && locationSet ? (
              <span className="umkm-profile-location-badge is-manual">
                Manual
              </span>
            ) : null}
          </div>
        </FormSection>

        <ProfileFormActions
          dirty={dirty}
          loading={loading}
          booting={booting}
          saveLabel="Save personal details"
          onDiscard={onDiscard}
        />
      </form>
    </ContentSection>
  );
}
