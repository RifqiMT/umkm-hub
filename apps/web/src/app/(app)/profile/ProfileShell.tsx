'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  profileNavItems,
  profileSectionDomId,
  type ProfileNavIcon,
  type ProfileSectionId,
} from '@/app/(app)/profile/profile-sections';

type ProfileShellProps = {
  booting: boolean;
  personName: string;
  loginName: string;
  avatarLabel: string;
  showData: boolean;
  sectionAlerts?: Partial<Record<ProfileSectionId, number>>;
  dirtySections?: ProfileSectionId[];
  onLogout: () => void;
};

function monogram(name: string) {
  const parts = name.trim().split(/[._\s-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || 'UH';
}

function NavIcon({ kind }: { kind: ProfileNavIcon }) {
  const common = {
    width: 16,
    height: 16,
    viewBox: '0 0 24 24',
    fill: 'none' as const,
    'aria-hidden': true,
  };
  switch (kind) {
    case 'overview':
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.75" />
          <path
            d="M5 20v-1a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v1"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'personal':
      return (
        <svg {...common}>
          <path
            d="M12 13a4 4 0 1 0-4-4M4 20v-1a4 4 0 0 1 4-4h1"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'invoicing':
      return (
        <svg {...common}>
          <path
            d="M6 4h12v16H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"
            stroke="currentColor"
            strokeWidth="1.75"
          />
          <path d="M8 9h8M8 13h5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
      );
    case 'security':
      return (
        <svg {...common}>
          <path
            d="M12 3 4 6.5V11c0 4.2 3.2 7.9 8 9 4.8-1.1 8-4.8 8-9V6.5L12 3Z"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'data':
      return (
        <svg {...common}>
          <path
            d="M12 3v10m0 0 4-4m-4 4-4-4M5 19h14"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'danger':
      return (
        <svg {...common}>
          <path
            d="M12 9v4m0 4h.01M10.3 4.5h3.4l7.3 12.6a1 1 0 0 1-.87 1.5H3.87a1 1 0 0 1-.87-1.5L10.3 4.5Z"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        </svg>
      );
  }
}

export function ProfileShell({
  booting,
  personName,
  loginName,
  avatarLabel,
  showData,
  sectionAlerts = {},
  dirtySections = [],
  onLogout,
}: ProfileShellProps) {
  const items = useMemo(() => profileNavItems(showData), [showData]);
  const [active, setActive] = useState<ProfileSectionId>('overview');
  const [pinned, setPinned] = useState(false);
  const [compact, setCompact] = useState(false);
  const dockRef = useRef<HTMLDivElement>(null);
  const shellRef = useRef<HTMLElement>(null);
  const dirtySet = useMemo(() => new Set(dirtySections), [dirtySections]);

  const syncShellMetrics = useCallback(() => {
    const dock = dockRef.current;
    if (dock) {
      document.documentElement.style.setProperty(
        '--profile-shell-height',
        `${dock.offsetHeight}px`,
      );
    }
    setPinned(window.scrollY > 8);
    setCompact(window.scrollY > 72);
  }, []);

  const resolveActive = useCallback(() => {
    const dock = dockRef.current;
    if (!dock) return;

    const stickyBottom = dock.getBoundingClientRect().bottom;
    const viewportBottom = window.innerHeight;
    let bestId = items[0]?.id ?? 'overview';
    let bestVisible = -1;

    for (const item of items) {
      const el = document.getElementById(profileSectionDomId(item.id));
      if (!el) continue;

      const rect = el.getBoundingClientRect();
      const visibleTop = Math.max(rect.top, stickyBottom);
      const visibleBottom = Math.min(rect.bottom, viewportBottom);
      const visible = Math.max(0, visibleBottom - visibleTop);

      if (visible > bestVisible) {
        bestVisible = visible;
        bestId = item.id;
      }
    }

    if (bestVisible >= 0) {
      setActive(bestId);
    }
  }, [items]);

  useEffect(() => {
    const syncHash = () => {
      const hash = window.location.hash.replace(/^#/, '');
      if (!hash) return;
      const match = items.find((item) => profileSectionDomId(item.id) === hash);
      if (match) setActive(match.id);
    };

    syncHash();
    window.addEventListener('hashchange', syncHash);
    return () => window.removeEventListener('hashchange', syncHash);
  }, [items]);

  useEffect(() => {
    syncShellMetrics();
    resolveActive();

    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        syncShellMetrics();
        resolveActive();
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    const dock = dockRef.current;
    const observer =
      dock && typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => syncShellMetrics())
        : null;
    if (dock && observer) observer.observe(dock);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      observer?.disconnect();
      document.documentElement.style.removeProperty('--profile-shell-height');
    };
  }, [resolveActive, syncShellMetrics]);

  const subtitle = booting
    ? 'Loading account…'
    : personName !== loginName
      ? `${personName} · @${loginName}`
      : `@${loginName}`;

  return (
    <div
      ref={dockRef}
      className={`umkm-profile-shell-dock${pinned ? ' is-pinned' : ''}${compact ? ' is-compact' : ''}`}
    >
      <header ref={shellRef} className="umkm-profile-shell" aria-label="Profile">
      <div className="umkm-profile-shell-head">
        <div className="umkm-profile-shell-identity">
          <span className="umkm-profile-shell-avatar" aria-hidden>
            {booting ? '…' : monogram(avatarLabel)}
          </span>
          <div className="umkm-profile-shell-copy">
            <p className="umkm-profile-shell-kicker">Account settings</p>
            <h1 className="umkm-profile-shell-title">Profile</h1>
            <p className="umkm-profile-shell-sub notranslate">{subtitle}</p>
          </div>
        </div>
        <button
          type="button"
          className="umkm-btn secondary umkm-profile-shell-logout"
          onClick={onLogout}
        >
          Log out
        </button>
      </div>

      <nav className="umkm-profile-shell-nav" aria-label="Jump to section">
        <div className="umkm-profile-shell-nav-track">
          {items.map((item) => {
            const alertCount = sectionAlerts[item.id] ?? 0;
            const isDirty = dirtySet.has(item.id);
            const isActive = active === item.id;
            return (
              <a
                key={item.id}
                href={`#${profileSectionDomId(item.id)}`}
                title={item.hint}
                className={`umkm-profile-shell-tab${isActive ? ' is-active' : ''}${item.id === 'danger' ? ' is-danger' : ''}${alertCount > 0 ? ' has-alert' : ''}${isDirty ? ' is-dirty' : ''}`}
                aria-current={isActive ? 'true' : undefined}
                onClick={() => setActive(item.id)}
              >
                <NavIcon kind={item.icon} />
                <span className="umkm-profile-shell-tab-label">{item.label}</span>
                {alertCount > 0 ? (
                  <span className="umkm-profile-shell-tab-badge">{alertCount}</span>
                ) : null}
                {isDirty ? (
                  <span className="umkm-profile-shell-tab-dot" title="Unsaved changes" />
                ) : null}
              </a>
            );
          })}
        </div>
      </nav>
    </header>
    </div>
  );
}
