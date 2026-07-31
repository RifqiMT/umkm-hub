'use client';

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { useAnchoredPanel } from '@/lib/use-anchored-panel';
import {
  type DashboardPeriod,
} from '@/lib/dashboard-period';
import { useLabels } from '@/hooks/useLabels';
import { useTr } from '@/components/Tr';

const PERIOD_GROUP_KEYS = [
  { label: 'Near term', options: ['today', 'tomorrow', 'this_week'] as DashboardPeriod[] },
  {
    label: 'Months & quarters',
    options: ['this_month', 'next_month', 'this_quarter', 'next_quarter'] as DashboardPeriod[],
  },
  { label: 'Longer', options: ['this_year', 'all'] as DashboardPeriod[] },
];

type DashboardPeriodFilterProps = {
  value: DashboardPeriod;
  onChange: (period: DashboardPeriod) => void;
  caption?: string | null;
  id?: string;
  label?: string;
  disabled?: boolean;
  className?: string;
};

export function DashboardPeriodFilter({
  value,
  onChange,
  caption = null,
  id,
  label = 'Period',
  disabled = false,
  className = '',
}: DashboardPeriodFilterProps) {
  const tr = useTr();
  const { dashboardPeriod } = useLabels();
  const autoId = useId();
  const rootId = id ?? autoId;
  const listId = `${rootId}-panel`;
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { style: panelStyle, isSheet } = useAnchoredPanel(open, rootRef, 16 * 16);
  const displayLabel = dashboardPeriod[value];
  const rootClass = [
    'umkm-dash-period',
    className,
    open ? 'is-open' : '',
  ]
    .filter(Boolean)
    .join(' ');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  function select(period: DashboardPeriod) {
    onChange(period);
    setOpen(false);
  }

  function onTriggerKeyDown(e: ReactKeyboardEvent<HTMLButtonElement>) {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setOpen(true);
    }
  }

  return (
    <div className={rootClass} ref={rootRef}>
      <span className="umkm-dash-period-label" id={`${rootId}-label`}>
        {tr(label)}
      </span>
      <button
        type="button"
        id={rootId}
        className="umkm-dash-period-trigger"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-labelledby={`${rootId}-label`}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onTriggerKeyDown}
      >
        <span className="umkm-dash-period-value">{displayLabel}</span>
        <span className="umkm-dash-period-chevron" aria-hidden>
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
      </button>
      {caption ? (
        <p className="umkm-dash-period-caption">{caption}</p>
      ) : null}

      {mounted && open && panelStyle
        ? createPortal(
            <>
              {isSheet ? (
                <button
                  type="button"
                  className="umkm-filter-sheet-backdrop"
                  aria-label={tr('Close period filter')}
                  onClick={() => setOpen(false)}
                />
              ) : null}
              <div
                ref={panelRef}
                id={listId}
                className={`umkm-dash-period-panel${isSheet ? ' is-sheet' : ''}`}
                role="listbox"
                aria-label={tr(label)}
                style={panelStyle}
              >
                {isSheet ? (
                  <div className="umkm-filter-sheet-head">
                    <span className="umkm-filter-sheet-title">{tr(label)}</span>
                    <button
                      type="button"
                      className="umkm-filter-sheet-done"
                      onClick={() => setOpen(false)}
                    >
                      {tr('Done')}
                    </button>
                  </div>
                ) : null}
                {PERIOD_GROUP_KEYS.map((group) => (
                  <div key={group.label} className="umkm-dash-period-group">
                    <span className="umkm-dash-period-group-label">
                      {tr(group.label)}
                    </span>
                    <div className="umkm-dash-period-options">
                      {group.options.map((period) => {
                        const active = period === value;
                        return (
                          <button
                            key={period}
                            type="button"
                            role="option"
                            aria-selected={active}
                            className={`umkm-dash-period-option${active ? ' is-active' : ''}`}
                            onClick={() => select(period)}
                          >
                            {dashboardPeriod[period]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </>,
            document.body,
          )
        : null}
    </div>
  );
}
