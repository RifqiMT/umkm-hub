'use client';

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';
import {
  isMultiFilterActive,
  multiFilterSummary,
  normalizeMultiFilterSelection,
  type MultiSelectOption,
} from '@/lib/multi-filter';
import { useAnchoredPanel } from '@/lib/use-anchored-panel';
import { useTr } from '@/components/Tr';

export type { MultiSelectOption };

type MultiSelectFilterProps = {
  label: string;
  options: MultiSelectOption[];
  value: string[];
  onChange: (next: string[]) => void;
  id?: string;
  /** Shown when nothing is selected. */
  allLabel?: string;
  className?: string;
  disabled?: boolean;
};

export function MultiSelectFilter({
  label,
  options,
  value,
  onChange,
  id,
  allLabel = 'All',
  className = '',
  disabled = false,
}: MultiSelectFilterProps) {
  const tr = useTr();
  const autoId = useId();
  const rootId = id ?? autoId;
  const listId = `${rootId}-list`;
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const selected = useMemo(() => new Set(value), [value]);
  const translatedOptions = useMemo(
    () => options.map((option) => ({ ...option, label: tr(option.label) })),
    [options, tr],
  );
  const summary = multiFilterSummary(value, translatedOptions, tr(allLabel));
  const active = isMultiFilterActive(value);
  const { style: panelStyle, isSheet } = useAnchoredPanel(open, rootRef);

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

  function commit(next: string[]) {
    onChange(normalizeMultiFilterSelection(next, options.length));
  }

  function toggle(optionValue: string) {
    const next = new Set(selected);
    if (next.has(optionValue)) next.delete(optionValue);
    else next.add(optionValue);
    commit(Array.from(next));
  }

  function showAll() {
    commit([]);
  }

  function onTriggerKeyDown(e: ReactKeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setOpen(true);
    }
  }

  const rootClass = [
    'umkm-multi-filter',
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
              className={`umkm-multi-filter-panel is-anchored${isSheet ? ' is-sheet' : ''}`}
              id={listId}
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
              <div className="umkm-multi-filter-actions">
                <button
                  type="button"
                  className="umkm-multi-filter-action"
                  onClick={showAll}
                  disabled={value.length === 0}
                >
                  {tr('Show all')}
                </button>
              </div>
              <ul className="umkm-multi-filter-options">
                {translatedOptions.map((option) => {
                  const checked = selected.has(option.value);
                  const optionId = `${rootId}-${option.value}`;
                  return (
                    <li key={option.value}>
                      <label
                        htmlFor={optionId}
                        className={`umkm-multi-filter-option${checked ? ' is-checked' : ''}`}
                      >
                        <input
                          id={optionId}
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggle(option.value)}
                        />
                        <span>{option.label}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          </>,
          document.body,
        )
      : null;

  return (
    <div className={rootClass} ref={rootRef}>
      <span className="umkm-multi-filter-label" id={`${rootId}-label`}>
        {tr(label)}
      </span>
      <button
        type="button"
        id={rootId}
        className="umkm-multi-filter-trigger"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={listId}
        aria-labelledby={`${rootId}-label`}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onTriggerKeyDown}
      >
        <span className="umkm-multi-filter-value">{summary}</span>
        <span className="umkm-multi-filter-chevron" aria-hidden>
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
