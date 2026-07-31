'use client';

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';
import {
  dateRangeSummary,
  EMPTY_DATE_RANGE,
  isDateRangeActive,
  type DateRangeValue,
} from '@/lib/date-range-filter';
import { useAnchoredPanel } from '@/lib/use-anchored-panel';
import { useTr } from '@/components/Tr';

export type { DateRangeValue };

type DateRangeFilterProps = {
  label: string;
  value: DateRangeValue;
  onChange: (next: DateRangeValue) => void;
  id?: string;
  allLabel?: string;
  className?: string;
  disabled?: boolean;
};

export function DateRangeFilter({
  label,
  value,
  onChange,
  id,
  allLabel = 'All dates',
  className = '',
  disabled = false,
}: DateRangeFilterProps) {
  const tr = useTr();
  const autoId = useId();
  const rootId = id ?? autoId;
  const panelId = `${rootId}-panel`;
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRangeValue>(value);
  const [mounted, setMounted] = useState(false);
  const { style: panelStyle, isSheet } = useAnchoredPanel(open, rootRef, 17 * 16);

  const summary = dateRangeSummary(value, allLabel);
  const active = isDateRangeActive(value);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);

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

  function apply(next: DateRangeValue) {
    onChange({
      from: next.from.slice(0, 10),
      to: next.to.slice(0, 10),
    });
  }

  function showAll() {
    setDraft(EMPTY_DATE_RANGE);
    onChange(EMPTY_DATE_RANGE);
    setOpen(false);
  }

  function onTriggerKeyDown(e: ReactKeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setOpen(true);
    }
  }

  const rootClass = [
    'umkm-date-range-filter',
    active ? 'is-active' : '',
    open ? 'is-open' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const panel =
    open && mounted && panelStyle
      ? createPortal(
          <>
            {isSheet ? (
              <button
                type="button"
                className="umkm-filter-sheet-backdrop"
                aria-label={tr('Close filter')}
                onClick={() => setOpen(false)}
              />
            ) : null}
            <div
              className={`umkm-date-range-filter-panel is-anchored${isSheet ? ' is-sheet' : ''}`}
              id={panelId}
              role="group"
              aria-labelledby={`${rootId}-label`}
              ref={panelRef}
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
              <div className="umkm-date-range-filter-actions">
                <button
                  type="button"
                  className="umkm-date-range-filter-action"
                  onClick={showAll}
                  disabled={!active && !draft.from && !draft.to}
                >
                  {tr('Show all')}
                </button>
              </div>
              <div className="umkm-date-range-filter-fields">
                <label
                  className="umkm-date-range-filter-field"
                  htmlFor={`${rootId}-from`}
                >
                  <span>{tr('From')}</span>
                  <input
                    id={`${rootId}-from`}
                    type="date"
                    value={draft.from}
                    max={draft.to || undefined}
                    onChange={(e) => {
                      const next = { ...draft, from: e.target.value };
                      setDraft(next);
                      apply(next);
                    }}
                  />
                </label>
                <label
                  className="umkm-date-range-filter-field"
                  htmlFor={`${rootId}-to`}
                >
                  <span>{tr('To')}</span>
                  <input
                    id={`${rootId}-to`}
                    type="date"
                    value={draft.to}
                    min={draft.from || undefined}
                    onChange={(e) => {
                      const next = { ...draft, to: e.target.value };
                      setDraft(next);
                      apply(next);
                    }}
                  />
                </label>
              </div>
            </div>
          </>,
          document.body,
        )
      : null;

  return (
    <div className={rootClass} ref={rootRef}>
      <span className="umkm-date-range-filter-label" id={`${rootId}-label`}>
        {tr(label)}
      </span>
      <button
        type="button"
        id={rootId}
        className="umkm-date-range-filter-trigger"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={panelId}
        aria-labelledby={`${rootId}-label`}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onTriggerKeyDown}
      >
        <span className="umkm-date-range-filter-value">{summary}</span>
        <span className="umkm-date-range-filter-chevron" aria-hidden>
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
      {panel}
    </div>
  );
}
