'use client';

import Link from 'next/link';
import { LanguageSelect } from '@/components/LanguageSelect';
import { FieldLabel } from '@/components/PageHeader';
import { findLanguage, languageLabel } from '@/lib/languages';

type ProfileSidebarProps = {
  booting: boolean;
  uiLanguage: string | null;
  translationStatus: 'off' | 'applying' | 'ready' | 'failed';
  translationProgress: number;
  onLanguageChange: (code: string | null) => void;
  onRetryTranslation: () => void;
  onResetTranslation: () => void;
};

const SHORTCUTS = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    hint: 'Period snapshot',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    href: '/analytics',
    label: 'Analytics',
    hint: 'Trends & mix',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M4 19V5m0 14h16M8 16l3-4 3 2 4-6"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    href: '/targets',
    label: 'Targets',
    hint: 'Plan vs actual',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.75" />
        <path d="M12 8v4l3 2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: '/glossary',
    label: 'Dictionary',
    hint: 'Metric meanings',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M6 4h10a2 2 0 0 1 2 2v14l-4-2-4 2-4-2-4 2V6a2 2 0 0 1 2-2Z"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinejoin="round"
        />
        <path d="M8 8h6M8 12h4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      </svg>
    ),
  },
] as const;

export function ProfileSidebar({
  booting,
  uiLanguage,
  translationStatus,
  translationProgress,
  onLanguageChange,
  onRetryTranslation,
  onResetTranslation,
}: ProfileSidebarProps) {
  const langMeta = uiLanguage
    ? findLanguage(uiLanguage) ?? {
        code: uiLanguage,
        name: uiLanguage,
        nativeName: uiLanguage,
      }
    : null;

  let translationHint =
    'Original English — pick a language to translate labels and page copy.';
  if (uiLanguage && langMeta) {
    const label = languageLabel(langMeta);
    if (translationStatus === 'ready') {
      translationHint = `Workspace copy is translated into ${label}. Cached on this device for faster loading.`;
    } else if (translationStatus === 'failed') {
      translationHint = `Could not translate into ${label}. Check the API is running, then retry.`;
    } else if (translationStatus === 'applying') {
      translationHint = `Translating into ${label}… ${translationProgress > 0 ? `${translationProgress}%` : ''}`;
    }
  }

  return (
    <>
      <section className="umkm-profile-side-card umkm-profile-shortcuts">
        <header>
          <span className="umkm-profile-side-kicker">Shortcuts</span>
          <h3>Go further</h3>
        </header>
        <nav className="umkm-profile-shortcut-grid" aria-label="Profile shortcuts">
          {SHORTCUTS.map((item) => (
            <Link key={item.href} href={item.href} className="umkm-profile-shortcut">
              <span className="umkm-profile-shortcut-icon">{item.icon}</span>
              <span className="umkm-profile-shortcut-copy">
                <strong>{item.label}</strong>
                <em>{item.hint}</em>
              </span>
            </Link>
          ))}
        </nav>
      </section>

      <section className="umkm-profile-side-card umkm-profile-language">
        <header>
          <span className="umkm-profile-side-kicker">Language</span>
          <h3>Display language</h3>
        </header>
        <div className="umkm-field notranslate">
          <FieldLabel htmlFor="profile-ui-language">Auto translation</FieldLabel>
          <LanguageSelect
            id="profile-ui-language"
            value={uiLanguage}
            disabled={booting}
            onChange={onLanguageChange}
          />
          <p className="umkm-profile-field-hint">{translationHint}</p>
          {uiLanguage ? (
            <div className="umkm-profile-translate-actions">
              {translationStatus === 'failed' ? (
                <button
                  type="button"
                  className="umkm-btn secondary umkm-profile-translate-reset"
                  disabled={booting}
                  onClick={onRetryTranslation}
                >
                  Retry translation
                </button>
              ) : null}
              <button
                type="button"
                className="umkm-btn secondary umkm-profile-translate-reset"
                disabled={booting}
                onClick={onResetTranslation}
              >
                Reset translation
              </button>
            </div>
          ) : null}
        </div>
      </section>

      <section className="umkm-profile-side-card umkm-profile-tips">
        <header>
          <span className="umkm-profile-side-kicker">Tips</span>
          <h3>Keep the account healthy</h3>
        </header>
        <ul className="umkm-profile-checklist">
          <li>Use a unique password you do not reuse elsewhere.</li>
          <li>Log out on shared devices when you finish.</li>
          <li>Export data before deleting this profile.</li>
        </ul>
      </section>
    </>
  );
}
