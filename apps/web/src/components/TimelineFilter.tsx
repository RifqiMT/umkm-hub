'use client';

import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { appYearOptions } from '@/lib/app-timeline';
import { useAnchoredPanel } from '@/lib/use-anchored-panel';
import { useTr } from '@/components/Tr';

/** Analytics timeline: all history, or one-or-more calendar years. */
export type TimelineFilterValue = 'all' | number[];

export function formatTimelineLabel(
  value: TimelineFilterValue,
  allLabel = 'All timelines',
): string {
  if (value === 'all') return allLabel;
  const years = uniqueSorted(value);
  if (years.length === 0) return allLabel;
  if (years.length === 1) return String(years[0]);
  const consecutive = years.every(
    (y, i) => i === 0 || y === years[i - 1]! + 1,
  );
  if (consecutive) return `${years[0]}–${years[years.length - 1]}`;
  if (years.length <= 3) return years.join(', ');
  return `${years.length} years`;
}

export function timelineToYearsParam(value: TimelineFilterValue): string {
  if (value === 'all') return 'all';
  return uniqueSorted(value).join(',');
}

function uniqueSorted(years: number[]): number[] {
  return [...new Set(years)].sort((a, b) => a - b);
}

/** Portal panels into native fullscreen ancestors so dropdowns stay visible. */
function resolvePortalTarget(anchor: HTMLElement | null): HTMLElement {
  if (!anchor) return document.body;
  const fs =
    anchor.closest(':fullscreen') ??
    anchor.closest(':-webkit-full-screen') ??
    anchor.closest('.umkm-analytics-fs-host.is-open');
  return (fs as HTMLElement | null) ?? document.body;
}

type TimelineFilterProps = {
  value: TimelineFilterValue;
  onChange: (next: TimelineFilterValue) => void;
  years?: number[];
  id?: string;
  label?: string;
  'aria-label'?: string;
  disabled?: boolean;
  className?: string;
  allLabel?: string;
  /** Optional caption under the trigger (e.g. annual rolling window). */
  caption?: string | null;
  /** Highlight “this year” in the panel. */
  nowYear?: number;
};

function ChevronLeftIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M10 4 6 8l4 4"
        stroke="currentColor"
        strokeWidth="1.85"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M6 4l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.85"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M4 6.2 8 10l4-3.8"
        stroke="currentColor"
        strokeWidth="1.85"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function TimelineFilter({
  value,
  onChange,
  years,
  id,
  label = 'Timeline',
  'aria-label': ariaLabel,
  disabled = false,
  className = '',
  allLabel = 'All timelines',
  caption = null,
  nowYear = new Date().getUTCFullYear(),
}: TimelineFilterProps) {
  const tr = useTr();
  const autoId = useId();
  const rootId = id ?? autoId;
  const listId = `${rootId}-panel`;
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  const options = useMemo(() => years ?? appYearOptions(nowYear), [years, nowYear]);
  const yearSet = useMemo(() => new Set(options), [options]);
  const isAll = value === 'all';
  const selected = useMemo(
    () => (value === 'all' ? [] : uniqueSorted(value)),
    [value],
  );
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const displayLabel = formatTimelineLabel(value, allLabel);
  const isMulti = selected.length > 1;
  const { style: panelStyle, isSheet } = useAnchoredPanel(open, rootRef, 18 * 16);
  const rootClass = [
    'umkm-timeline-filter',
    className,
    open ? 'is-open' : '',
    isMulti ? 'is-multi' : '',
    isAll ? 'is-all' : '',
  ]
    .filter(Boolean)
    .join(' ');

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setPortalTarget(null);
      return;
    }
    setPortalTarget(resolvePortalTarget(rootRef.current));
  }, [open]);

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

  function commitYears(next: number[]) {
    const sorted = uniqueSorted(next.filter((y) => yearSet.has(y)));
    if (sorted.length === 0) {
      onChange('all');
      return;
    }
    onChange(sorted);
  }

  function selectAll() {
    onChange('all');
    setOpen(false);
  }

  function toggleYear(y: number) {
    if (isAll) {
      commitYears([y]);
      return;
    }
    if (selectedSet.has(y)) {
      commitYears(selected.filter((x) => x !== y));
      return;
    }
    commitYears([...selected, y]);
  }

  function selectThisYear() {
    if (!yearSet.has(nowYear)) return;
    commitYears([nowYear]);
  }

  function selectLastThree() {
    const lastThree = uniqueSorted(
      options.filter((y) => y <= nowYear).slice(0, 3),
    );
    if (lastThree.length === 0) return;
    commitYears(lastThree);
  }

  function step(delta: number) {
    if (disabled || isAll || selected.length === 0) return;
    const next = selected.map((y) => y + delta);
    if (!next.every((y) => yearSet.has(y))) return;
    commitYears(next);
  }

  function onTriggerKeyDown(e: ReactKeyboardEvent<HTMLButtonElement>) {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setOpen(true);
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      step(-1);
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      step(1);
    }
  }

  const canStepPrev =
    !isAll &&
    selected.length > 0 &&
    selected.every((y) => yearSet.has(y - 1));
  const canStepNext =
    !isAll &&
    selected.length > 0 &&
    selected.every((y) => yearSet.has(y + 1));

  const lastThreeYears = useMemo(
    () => uniqueSorted(options.filter((y) => y <= nowYear).slice(0, 3)),
    [options, nowYear],
  );
  const isLastThreeActive =
    !isAll &&
    selected.length === lastThreeYears.length &&
    lastThreeYears.every((y) => selectedSet.has(y));

  const triggerHint = isAll
    ? tr('Full history')
    : isMulti
      ? tr(`${selected.length} years`)
      : caption && selected.length === 1 && selected[0] === nowYear
        ? caption
        : tr('Tap to change');

  return (
    <div className={rootClass} ref={rootRef}>
      {label ? (
        <div className="umkm-timeline-filter-head">
          <span className="umkm-timeline-filter-label" id={`${rootId}-label`}>
            {label}
          </span>
          {caption && !open ? (
            <span className="umkm-timeline-filter-head-note">{caption}</span>
          ) : null}
        </div>
      ) : null}

      <div className="umkm-timeline-filter-bar">
        <button
          type="button"
          className="umkm-timeline-filter-nav is-prev"
          aria-label={tr('Earlier year')}
          disabled={disabled || !canStepPrev}
          onClick={() => step(-1)}
        >
          <ChevronLeftIcon />
        </button>

        <button
          type="button"
          id={rootId}
          className={`umkm-timeline-filter-trigger${isAll ? ' is-all' : ''}${isMulti ? ' is-multi' : ''}`}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          aria-labelledby={label ? `${rootId}-label` : undefined}
          aria-label={ariaLabel ?? label}
          disabled={disabled}
          onClick={() => setOpen((v) => !v)}
          onKeyDown={onTriggerKeyDown}
        >
          <span className="umkm-timeline-filter-trigger-copy">
            <span className="umkm-timeline-filter-value">{displayLabel}</span>
            <span className="umkm-timeline-filter-hint">{triggerHint}</span>
          </span>
          <span className="umkm-timeline-filter-chevron" aria-hidden>
            <ChevronDownIcon />
          </span>
        </button>

        <button
          type="button"
          className="umkm-timeline-filter-nav is-next"
          aria-label={tr('Later year')}
          disabled={disabled || !canStepNext}
          onClick={() => step(1)}
        >
          <ChevronRightIcon />
        </button>
      </div>

      {mounted && open && panelStyle && portalTarget
        ? createPortal(
            <>
              {isSheet ? (
                <button
                  type="button"
                  className="umkm-filter-sheet-backdrop"
                  aria-label={tr('Close timeline filter')}
                  onClick={() => setOpen(false)}
                />
              ) : null}
              <div
                ref={panelRef}
                id={listId}
                className={`umkm-timeline-filter-panel${isSheet ? ' is-sheet' : ''}`}
                role="listbox"
                aria-multiselectable="true"
                aria-label={ariaLabel ?? label}
                style={panelStyle}
              >
                {isSheet ? (
                  <div className="umkm-filter-sheet-head">
                    <span className="umkm-filter-sheet-title">{label}</span>
                    <button
                      type="button"
                      className="umkm-filter-sheet-done"
                      onClick={() => setOpen(false)}
                    >
                      {tr('Done')}
                    </button>
                  </div>
                ) : null}

                <div className="umkm-timeline-filter-presets" role="group" aria-label={tr('Quick picks')}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isAll}
                    className={`umkm-timeline-filter-preset${isAll ? ' is-active' : ''}`}
                    onClick={selectAll}
                  >
                    {allLabel}
                  </button>
                  {yearSet.has(nowYear) ? (
                    <button
                      type="button"
                      className={`umkm-timeline-filter-preset${!isAll && selected.length === 1 && selected[0] === nowYear ? ' is-active' : ''}`}
                      onClick={selectThisYear}
                    >
                      {tr('This year')}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className={`umkm-timeline-filter-preset${isLastThreeActive ? ' is-active' : ''}`}
                    onClick={selectLastThree}
                  >
                    {tr('Last 3')}
                  </button>
                </div>

                <p className="umkm-timeline-filter-panel-note">
                  {tr('Select one or more years to compare')}
                </p>

                <div className="umkm-timeline-filter-grid">
                  {options.map((y) => {
                    const active = selectedSet.has(y);
                    return (
                      <button
                        key={y}
                        type="button"
                        role="option"
                        aria-selected={active}
                        className={`umkm-timeline-filter-year${active ? ' is-active' : ''}${y === nowYear ? ' is-now' : ''}`}
                        onClick={() => toggleYear(y)}
                      >
                        {y}
                      </button>
                    );
                  })}
                </div>

                {!isSheet ? (
                  <div className="umkm-timeline-filter-footer">
                    <p className="umkm-timeline-filter-footer-hint">
                      {isAll
                        ? tr('Pick years below, or use quick picks')
                        : isMulti
                          ? tr(`${selected.length} years selected`)
                          : tr('Add another year to compare')}
                    </p>
                    <button
                      type="button"
                      className="umkm-timeline-filter-done"
                      onClick={() => setOpen(false)}
                    >
                      {tr('Done')}
                    </button>
                  </div>
                ) : null}
              </div>
            </>,
            portalTarget,
          )
        : null}
    </div>
  );
}
