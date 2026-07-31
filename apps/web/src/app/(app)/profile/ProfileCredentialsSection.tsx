'use client';

import { FormEvent } from 'react';
import {
  ContentSection,
  FieldLabel,
  FormSection,
} from '@/components/PageHeader';
import { ProfileFormActions } from '@/app/(app)/profile/ProfileFormActions';

type ProfileCredentialsSectionProps = {
  booting: boolean;
  loading: boolean;
  dirty: boolean;
  profileName: string;
  password: string;
  confirmPassword: string;
  showPassword: boolean;
  strengthScore: 0 | 1 | 2 | 3 | 4;
  strengthLabel: string;
  onSubmit: (e: FormEvent) => void;
  onDiscard: () => void;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onToggleShowPassword: () => void;
};

export function ProfileCredentialsSection({
  booting,
  loading,
  dirty,
  profileName,
  password,
  confirmPassword,
  showPassword,
  strengthScore,
  strengthLabel,
  onSubmit,
  onDiscard,
  onPasswordChange,
  onConfirmPasswordChange,
  onToggleShowPassword,
}: ProfileCredentialsSectionProps) {
  const mismatch =
    password.length > 0 &&
    confirmPassword.length > 0 &&
    password !== confirmPassword;

  return (
    <ContentSection
      className="umkm-form-panel umkm-profile-credentials"
      eyebrow="Security"
      title="Credentials"
      description="Your username is permanent. Update your password anytime."
    >
      <form className="umkm-profile-credentials-form" onSubmit={onSubmit}>
        <div className="umkm-profile-security-intro">
          <span className="umkm-profile-security-icon" aria-hidden>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 3 4 6.5V11c0 4.2 3.2 7.9 8 9 4.8-1.1 8-4.8 8-9V6.5L12 3Z"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinejoin="round"
              />
              <path
                d="M9.5 11.5 11.5 13.5 15 10"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <p>
            Use a strong, unique password. Leave fields blank to keep your
            current password unchanged.
          </p>
        </div>

        <FormSection
          title="Sign-in details"
          description="Username was set at registration and cannot be changed."
        >
          <div className="umkm-profile-readonly-field">
            <FieldLabel htmlFor="profile-name">Username</FieldLabel>
            <input
              id="profile-name"
              className="notranslate"
              value={profileName}
              readOnly
              autoComplete="username"
              disabled
            />
          </div>
        </FormSection>

        <FormSection title="New password">
          <div className="umkm-profile-field-grid">
            <div className="umkm-field">
              <FieldLabel htmlFor="profile-password">New password</FieldLabel>
              <div className="umkm-profile-password-wrap">
                <input
                  id="profile-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => onPasswordChange(e.target.value)}
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                  placeholder="8+ characters"
                  disabled={booting}
                />
                <button
                  type="button"
                  className="umkm-profile-password-toggle"
                  onClick={onToggleShowPassword}
                  disabled={!password}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              {password ? (
                <p
                  className={`umkm-profile-strength is-${strengthScore}`}
                  aria-live="polite"
                >
                  <span
                    className="umkm-profile-strength-bar"
                    style={{ width: `${(strengthScore / 4) * 100}%` }}
                  />
                  <em>{strengthLabel}</em>
                </p>
              ) : (
                <p className="umkm-profile-field-hint">
                  Mix letters, numbers, and symbols for a stronger password.
                </p>
              )}
            </div>
            <div className="umkm-field">
              <FieldLabel htmlFor="profile-password-confirm">
                Confirm password
              </FieldLabel>
              <input
                id="profile-password-confirm"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => onConfirmPasswordChange(e.target.value)}
                minLength={8}
                maxLength={128}
                autoComplete="new-password"
                placeholder="Repeat new password"
                disabled={booting || !password}
                aria-invalid={mismatch || undefined}
              />
              {mismatch ? (
                <p className="umkm-profile-field-error" role="alert">
                  Passwords do not match.
                </p>
              ) : null}
            </div>
          </div>
        </FormSection>

        <ProfileFormActions
          dirty={dirty}
          loading={loading}
          booting={booting}
          saveLabel="Save password"
          onDiscard={onDiscard}
        />
      </form>
    </ContentSection>
  );
}
