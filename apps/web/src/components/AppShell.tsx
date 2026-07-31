'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { getStoredProfile, type StoredProfile } from '@/lib/auth';
import { ConfirmProvider } from '@/components/ConfirmProvider';
import { TranslationDomSync } from '@/components/TranslationDomSync';
import { useTr } from '@/components/Tr';

const LINKS = [
  { href: '/dashboard', label: 'Dashboard', icon: '◈' },
  { href: '/products', label: 'Products', icon: '▣' },
  { href: '/warehouse', label: 'Warehouse', icon: '⬡' },
  { href: '/customers', label: 'Customers', icon: '◎' },
  { href: '/orders', label: 'Orders', icon: '▤' },
  { href: '/targets', label: 'Targets', icon: '◉' },
  { href: '/analytics', label: 'Analytics', icon: '▦' },
  { href: '/glossary', label: 'Dictionary', icon: '◫' },
  { href: '/profile', label: 'Profile', icon: '◦' },
] as const;

/** Thumb-reach destinations on ≤900px (More opens full drawer). */
const PRIMARY_TABS = [
  { href: '/dashboard', label: 'Home', icon: '◈' },
  { href: '/orders', label: 'Orders', icon: '▤' },
  { href: '/products', label: 'Products', icon: '▣' },
  { href: '/warehouse', label: 'Stock', icon: '⬡' },
] as const;

const MORE_PREFIXES = [
  '/customers',
  '/targets',
  '/analytics',
  '/glossary',
  '/profile',
] as const;

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isMoreRoute(pathname: string) {
  return MORE_PREFIXES.some((prefix) => isActivePath(pathname, prefix));
}

function accountMonogram(name: string) {
  const parts = name.trim().split(/[._\s-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || 'UH';
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const tr = useTr();
  const [profile, setProfile] = useState<StoredProfile | null>(null);
  const [navOpen, setNavOpen] = useState(false);
  const moreActive = isMoreRoute(pathname);
  const profileName = profile?.profileName ?? '…';
  const profileActive = isActivePath(pathname, '/profile');

  useEffect(() => {
    setProfile(getStoredProfile());
  }, []);

  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!navOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setNavOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [navOpen]);

  return (
    <ConfirmProvider>
      <TranslationDomSync />
      <div className={`umkm-shell${navOpen ? ' is-nav-open' : ''}`}>
        <button
          type="button"
          className={`umkm-nav-backdrop${navOpen ? ' is-visible' : ''}`}
          aria-label={tr('Close menu')}
          tabIndex={navOpen ? 0 : -1}
          onClick={() => setNavOpen(false)}
        />
        <aside
          className={`umkm-nav${navOpen ? ' is-open' : ''}`}
          aria-hidden={false}
        >
          <div className="umkm-nav-top">
            <div className="umkm-brand notranslate">
              <span className="umkm-brand-mark" data-short="UH">
                UMKM Hub
              </span>
              <span className="umkm-brand-tag">{tr('Workspace')}</span>
            </div>
            <button
              type="button"
              className="umkm-nav-toggle"
              aria-expanded={navOpen}
              aria-controls="umkm-primary-nav"
              aria-label={navOpen ? tr('Close menu') : tr('Open menu')}
              onClick={() => setNavOpen((v) => !v)}
            >
              <span className="umkm-nav-toggle-bars" aria-hidden>
                <i />
                <i />
                <i />
              </span>
              <span className="umkm-nav-toggle-label">
                {navOpen ? tr('Close') : tr('Menu')}
              </span>
            </button>
          </div>
          <nav
            id="umkm-primary-nav"
            className="umkm-nav-links"
            aria-label="Primary"
          >
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                data-icon={link.icon}
                title={tr(link.label)}
                aria-label={tr(link.label)}
                className={isActivePath(pathname, link.href) ? 'active' : ''}
              >
                <span className="umkm-nav-link-label">{tr(link.label)}</span>
              </Link>
            ))}
          </nav>
          <div className="umkm-nav-footer">
            <Link
              href="/profile"
              className={`umkm-nav-account${profileActive ? ' is-active' : ''}`}
              title={tr('Open profile')}
              aria-label={`${tr('Account')}: ${profileName}`}
              aria-current={profileActive ? 'page' : undefined}
            >
              <span className="umkm-nav-account-mark" aria-hidden>
                {accountMonogram(profileName === '…' ? 'UH' : profileName)}
                {profileActive ? (
                  <span className="umkm-nav-account-status" aria-hidden />
                ) : null}
              </span>
              <span className="umkm-nav-account-text">
                <span className="umkm-nav-account-label">
                  {profileActive ? tr('Your profile') : tr('Signed in')}
                </span>
                <strong className="notranslate">@{profileName}</strong>
              </span>
              <svg
                className="umkm-nav-account-chevron"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden
              >
                <path
                  d="M9 6l6 6-6 6"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          </div>
        </aside>
        <main className="umkm-main">{children}</main>
        <nav className="umkm-bottom-nav" aria-label="Primary destinations">
          {PRIMARY_TABS.map((tab) => {
            const active = isActivePath(pathname, tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`umkm-bottom-nav-item${active ? ' is-active' : ''}`}
                aria-current={active ? 'page' : undefined}
                data-icon={tab.icon}
              >
                <span className="umkm-bottom-nav-icon" aria-hidden>
                  {tab.icon}
                </span>
                <span className="umkm-bottom-nav-label">{tr(tab.label)}</span>
              </Link>
            );
          })}
          <button
            type="button"
            className={`umkm-bottom-nav-item${moreActive || navOpen ? ' is-active' : ''}`}
            aria-expanded={navOpen}
            aria-controls="umkm-primary-nav"
            aria-label={tr('More destinations')}
            data-icon="☰"
            onClick={() => setNavOpen((v) => !v)}
          >
            <span className="umkm-bottom-nav-icon" aria-hidden>
              ☰
            </span>
            <span className="umkm-bottom-nav-label">{tr('More')}</span>
          </button>
        </nav>
      </div>
    </ConfirmProvider>
  );
}
