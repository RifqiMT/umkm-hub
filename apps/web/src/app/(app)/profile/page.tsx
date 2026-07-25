'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { confirmDelete } from '@/lib/confirm';
import { ContentSection, FormSection, PageHeader } from '@/components/PageHeader';
import { clearSession, setSession, getRefreshToken, getAccessToken } from '@/lib/auth';
import type { Profile } from '@/lib/types';

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileName, setProfileName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const me = await api<Profile>('/profiles/me');
        setProfile(me);
        setProfileName(me.profileName);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      }
    }
    void load();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const body: { profileName?: string; password?: string } = {};
      if (profileName && profileName !== profile?.profileName) {
        body.profileName = profileName;
      }
      if (password) body.password = password;
      const updated = await api<Profile>('/profiles/me', {
        method: 'PATCH',
        body,
      });
      setProfile(updated);
      setPassword('');
      const accessToken = getAccessToken();
      const refreshToken = getRefreshToken();
      if (accessToken && refreshToken) {
        setSession({
          accessToken,
          refreshToken,
          profile: { id: updated.id, profileName: updated.profileName },
        });
      }
      setMessage('Profile updated.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Update failed');
    } finally {
      setLoading(false);
    }
  }

  async function onDelete() {
    if (
      !(await confirmDelete(
        'profile',
        profile?.profileName,
        'This removes the profile and all related data. This cannot be undone.',
      ))
    ) {
      return;
    }
    try {
      await api('/profiles/me', { method: 'DELETE' });
      clearSession();
      router.replace('/register');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Delete failed');
    }
  }

  return (
    <section>
      <PageHeader
        title="Profile"
        description="Update login credentials for UMKM Hub access."
      />
      {error ? <div className="umkm-error">{error}</div> : null}
      {message ? <p className="umkm-sub">{message}</p> : null}

      <ContentSection
        className="umkm-form-panel"
        eyebrow="Account"
        title="Credentials"
        description={`Profile ID: ${profile?.id ?? '…'}`}
      >
        <form onSubmit={onSubmit}>
          <FormSection
            title="Sign-in details"
            description="Change your profile name or set a new password."
          >
            <div className="umkm-field">
              <label>Profile name</label>
              <input
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                required
                minLength={3}
              />
            </div>
            <div className="umkm-field">
              <label>New password (optional)</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                autoComplete="new-password"
              />
            </div>
          </FormSection>
          <div className="umkm-actions">
            <button className="umkm-btn" type="submit" disabled={loading}>
              Save changes
            </button>
          </div>
        </form>
      </ContentSection>

      <ContentSection
        eyebrow="Danger zone"
        title="Delete profile"
        description="Removes this profile and all related products, customers, orders, and warehouse history."
      >
        <button
          className="umkm-btn danger"
          type="button"
          onClick={() => void onDelete()}
        >
          Delete profile
        </button>
      </ContentSection>
    </section>
  );
}
