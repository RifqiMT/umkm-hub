'use client';

import { formatDateLabel } from '@/lib/format-money';
import { profileHealthHref } from '@/app/(app)/profile/profile-health';
import type { Profile } from '@/lib/types';

type ProfileHeroProps = {
  embedded?: boolean;
  booting: boolean;
  profile: Profile | null;
  personName: string;
  loginName: string;
  avatarLabel: string;
  copied: boolean;
  businessName: string;
  onCopyProfileId: () => void;
};

function monogram(name: string) {
  const parts = name.trim().split(/[._\s-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || 'UH';
}

function shortId(id: string) {
  if (!id) return '';
  if (id.length <= 28) return id;
  return `${id.slice(0, 14)}…${id.slice(-10)}`;
}

function MetaIcon({ kind }: { kind: 'since' | 'updated' | 'id' }) {
  const common = {
    width: 15,
    height: 15,
    viewBox: '0 0 24 24',
    fill: 'none' as const,
    'aria-hidden': true,
  };
  switch (kind) {
    case 'since':
      return (
        <svg {...common}>
          <rect x="4" y="5" width="16" height="15" rx="2" stroke="currentColor" strokeWidth="1.75" />
          <path d="M8 3v4M16 3v4M4 10h16" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
      );
    case 'updated':
      return (
        <svg {...common}>
          <path
            d="M12 6v6l3.5 2M21 12a9 9 0 1 1-2.64-6.36"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'id':
      return (
        <svg {...common}>
          <path
            d="M7 8V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2M7 16v2a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-2M5 12h14"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        </svg>
      );
  }
}

export function ProfileHero({
  embedded = false,
  booting,
  profile,
  personName,
  loginName,
  avatarLabel,
  copied,
  businessName,
  onCopyProfileId,
}: ProfileHeroProps) {
  const locationLine = [profile?.locationCity, profile?.locationCountry]
    .filter(Boolean)
    .join(', ');

  const quickActions: { label: string; href: string }[] = [];
  if (profile?.email && !profile.emailVerified) {
    quickActions.push({
      label: 'Verify email',
      href: profileHealthHref('personal'),
    });
  }
  if (!businessName.trim()) {
    quickActions.push({
      label: 'Set up invoicing',
      href: profileHealthHref('invoicing'),
    });
  }
  if (!locationLine) {
    quickActions.push({
      label: 'Add location',
      href: profileHealthHref('personal'),
    });
  }

  return (
    <header
      className={`umkm-profile-hero${embedded ? ' is-embedded' : ''}`}
      aria-busy={booting}
    >
      {booting ? (
        <div className="umkm-profile-hero-skel" aria-hidden>
          <span className="umkm-profile-skel-avatar umkm-profile-hero-skel-avatar" />
          <span className="umkm-profile-skel-lines">
            <i />
            <i />
            <i />
          </span>
        </div>
      ) : (
        <>
          <div className="umkm-profile-hero-main">
            <div className="umkm-profile-avatar umkm-profile-hero-avatar" aria-hidden>
              {monogram(avatarLabel)}
            </div>
            <div className="umkm-profile-hero-copy">
              <p className="umkm-profile-eyebrow">Workspace owner</p>
              <h2 className="umkm-profile-name">{personName}</h2>
              {personName !== loginName ? (
                <p className="umkm-profile-login-name notranslate">@{loginName}</p>
              ) : null}
              {(profile?.email || locationLine) && (
                <p className="umkm-profile-hero-contact">
                  {[profile?.email, locationLine].filter(Boolean).join(' · ')}
                </p>
              )}
              {profile?.email ? (
                <div className="umkm-profile-verify-row">
                  <span
                    className={`umkm-profile-verify-badge${profile.emailVerified ? ' is-ok' : ''}`}
                  >
                    {profile.emailVerified ? 'Email verified' : 'Email unverified'}
                  </span>
                  <span
                    className={`umkm-profile-verify-badge${profile.accountVerified ? ' is-ok' : ''}`}
                  >
                    {profile.accountVerified
                      ? 'Account verified'
                      : 'Account unverified'}
                  </span>
                </div>
              ) : null}
              {quickActions.length > 0 ? (
                <div className="umkm-profile-hero-actions">
                  {quickActions.map((action) => (
                    <a
                      key={action.label}
                      href={action.href}
                      className="umkm-profile-hero-action"
                    >
                      {action.label}
                    </a>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <dl className="umkm-profile-hero-meta">
            <div className="umkm-profile-hero-meta-item">
              <dt>
                <span className="umkm-profile-hero-meta-icon">
                  <MetaIcon kind="since" />
                </span>
                Member since
              </dt>
              <dd>{formatDateLabel(profile?.createdAt) || '—'}</dd>
            </div>
            <div className="umkm-profile-hero-meta-item">
              <dt>
                <span className="umkm-profile-hero-meta-icon">
                  <MetaIcon kind="updated" />
                </span>
                Last updated
              </dt>
              <dd>{formatDateLabel(profile?.updatedAt) || '—'}</dd>
            </div>
            <div className="umkm-profile-hero-meta-item umkm-profile-hero-meta-id notranslate">
              <dt>
                <span className="umkm-profile-hero-meta-icon">
                  <MetaIcon kind="id" />
                </span>
                Profile ID
              </dt>
              <dd>
                <div className="umkm-profile-hero-meta-id-row">
                  <code title={profile?.id}>{shortId(profile?.id ?? '')}</code>
                  {profile?.id ? (
                    <button
                      type="button"
                      className={`umkm-profile-hero-meta-copy${copied ? ' is-copied' : ''}`}
                      onClick={onCopyProfileId}
                      aria-label={copied ? 'Profile ID copied' : 'Copy profile ID'}
                    >
                      {copied ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                          <path
                            d="M5 13l4 4L19 7"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                          <rect
                            x="9"
                            y="9"
                            width="11"
                            height="11"
                            rx="2"
                            stroke="currentColor"
                            strokeWidth="1.75"
                          />
                          <path
                            d="M6 15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1"
                            stroke="currentColor"
                            strokeWidth="1.75"
                          />
                        </svg>
                      )}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                  ) : null}
                </div>
              </dd>
            </div>
          </dl>
        </>
      )}
    </header>
  );
}
