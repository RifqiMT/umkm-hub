'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { useTr, useFormatNumber } from '@/components/Tr';

const NARROW_MQ = '(max-width: 1100px)';

type CollapsibleFiltersProps = {
  children: ReactNode;
  /** Number of active filter groups (shown as a badge when collapsed). */
  activeCount?: number;
  label?: string;
  className?: string;
  /** Class for the expandable body (default: catalog filter row). */
  bodyClassName?: string;
  /** Hint when nothing is active (default: All). */
  idleHint?: string;
};

/**
 * Filter chrome that stays always-open on desktop (>1100px) and collapses
 * by default on tablet / phone / narrow viewports.
 */
export function CollapsibleFilters({
  children,
  activeCount = 0,
  label = 'Filters',
  className = '',
  bodyClassName = 'umkm-catalog-filters',
  idleHint = 'All',
}: CollapsibleFiltersProps) {
  const tr = useTr();
  const { formatInteger } = useFormatNumber();
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const panelId = useId();

  useEffect(() => {
    const el = detailsRef.current;
    if (!el) return;

    const mq = window.matchMedia(NARROW_MQ);

    function sync() {
      if (!el) return;
      if (!mq.matches) {
        // Desktop: keep filters visible; mark so we can collapse again on narrow.
        el.open = true;
        el.dataset.desktopOpen = '1';
      } else if (el.dataset.desktopOpen === '1') {
        // Entering narrow from desktop — return to collapsed default.
        el.open = false;
        delete el.dataset.desktopOpen;
      }
    }

    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  const rootClass = [
    'umkm-filters-disclosure',
    activeCount > 0 ? 'is-active' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <details ref={detailsRef} className={rootClass}>
      <summary
        className="umkm-filters-disclosure-summary"
        aria-controls={panelId}
      >
        <span className="umkm-filters-disclosure-label">{tr(label)}</span>
        {activeCount > 0 ? (
          <span className="umkm-filters-disclosure-badge">
            {formatInteger(activeCount)} {tr('active')}
          </span>
        ) : (
          <span className="umkm-filters-disclosure-hint">{tr(idleHint)}</span>
        )}
        <span className="umkm-filters-disclosure-chevron" aria-hidden>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path
              d="M4 6.2 8 10l4-3.8"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </summary>
      <div className={bodyClassName} id={panelId}>
        {children}
      </div>
    </details>
  );
}
