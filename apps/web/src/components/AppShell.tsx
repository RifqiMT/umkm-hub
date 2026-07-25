'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { clearSession, getStoredProfile, type StoredProfile } from '@/lib/auth';
import { ConfirmProvider } from '@/components/ConfirmProvider';

const LINKS = [
  { href: '/dashboard', label: 'Dashboard', icon: '◈' },
  { href: '/products', label: 'Products', icon: '▣' },
  { href: '/warehouse', label: 'Warehouse', icon: '⬡' },
  { href: '/customers', label: 'Customers', icon: '◎' },
  { href: '/orders', label: 'Orders', icon: '▤' },
  { href: '/targets', label: 'Targets', icon: '◉' },
  { href: '/analytics', label: 'Analytics', icon: '▦' },
  { href: '/profile', label: 'Profile', icon: '◦' },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState<StoredProfile | null>(null);
  const [navOpen, setNavOpen] = useState(false);

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

  function logout() {
    clearSession();
    router.replace('/login');
  }

  return (
    <ConfirmProvider>
      <div className={`umkm-shell${navOpen ? ' is-nav-open' : ''}`}>
        <button
          type="button"
          className={`umkm-nav-backdrop${navOpen ? ' is-visible' : ''}`}
          aria-label="Close menu"
          tabIndex={navOpen ? 0 : -1}
          onClick={() => setNavOpen(false)}
        />
        <aside
          className={`umkm-nav${navOpen ? ' is-open' : ''}`}
          aria-hidden={false}
        >
          <div className="umkm-nav-top">
            <div className="umkm-brand">
              <span className="umkm-brand-mark">UMKM Hub</span>
              <span className="umkm-brand-tag">Workspace</span>
            </div>
            <button
              type="button"
              className="umkm-nav-toggle"
              aria-expanded={navOpen}
              aria-controls="umkm-primary-nav"
              aria-label={navOpen ? 'Close menu' : 'Open menu'}
              onClick={() => setNavOpen((v) => !v)}
            >
              <span className="umkm-nav-toggle-bars" aria-hidden>
                <i />
                <i />
                <i />
              </span>
              <span className="umkm-nav-toggle-label">
                {navOpen ? 'Close' : 'Menu'}
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
                className={pathname.startsWith(link.href) ? 'active' : ''}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="umkm-nav-footer">
            <p className="umkm-nav-user">
              Signed in
              <strong>{profile?.profileName ?? '…'}</strong>
            </p>
            <button
              type="button"
              className="umkm-btn secondary"
              onClick={logout}
            >
              Log out
            </button>
          </div>
        </aside>
        <main className="umkm-main">{children}</main>
      </div>
    </ConfirmProvider>
  );
}
