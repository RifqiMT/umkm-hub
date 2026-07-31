'use client';

import { FormEvent } from 'react';
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

  return (
    <ContentSection
      className="umkm-form-panel umkm-profile-personal"
      eyebrow="Identity"
      title="Personal details"
      description="Contact and location for this workspace owner — not used for sign-in."
    >
      <form className="umkm-profile-personal-form" onSubmit={onSubmit}>
        <FormSection
          title="About you"
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
            description="Permanently linked to your username."
          >
            <div className="umkm-profile-readonly-field">
              <FieldLabel htmlFor="profile-email">Email address</FieldLabel>
              <input
                id="profile-email"
                type="email"
                value={email}
                readOnly
                disabled
                aria-describedby="profile-email-status"
              />
            </div>
          </FormSection>

          {profile?.email && !profile.emailVerified ? (
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
                  Confirm this address to unlock full account verification and
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
          ) : profile?.emailVerified ? (
            <p id="profile-email-status" className="umkm-profile-email-ok">
              Email verified — your account is fully verified.
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
              className="umkm-btn secondary"
              onClick={onDetectLocation}
              disabled={booting || detecting}
            >
              {detecting ? 'Detecting…' : 'Detect from network'}
            </button>
            {showLocationActions ? (
              <button
                type="button"
                className="umkm-btn secondary"
                disabled={booting}
                onClick={onClearLocation}
              >
                Clear location
              </button>
            ) : null}
            {locationSource === 'IP' && locationSet ? (
              <span className="umkm-profile-location-badge">From network</span>
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
