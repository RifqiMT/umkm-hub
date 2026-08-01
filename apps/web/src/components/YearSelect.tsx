'use client';

import { appYearOptions } from '@/lib/app-timeline';
import { useTr } from '@/components/Tr';

type YearSelectValue = number | 'all';

type YearSelectProps = {
  value: YearSelectValue;
  onChange: (year: YearSelectValue) => void;
  /** Defaults to the shared app timeline (2020–2035, buffered around today). */
  years?: number[];
  id?: string;
  label?: string;
  'aria-label'?: string;
  disabled?: boolean;
  className?: string;
  /** Hide the visible label when an external label is already present. */
  hideLabel?: boolean;
  /** Prepend an “All timelines” option (Analytics scope). */
  allowAll?: boolean;
  allLabel?: string;
};

export function YearSelect({
  value,
  onChange,
  years,
  id = 'year-select',
  label = 'Year',
  'aria-label': ariaLabel,
  disabled = false,
  className = '',
  hideLabel = false,
  allowAll = false,
  allLabel = 'All timelines',
}: YearSelectProps) {
  const tr = useTr();
  const options = years ?? appYearOptions();
  const rootClass = ['umkm-year-select', className].filter(Boolean).join(' ');

  return (
    <div className={rootClass}>
      {hideLabel ? null : (
        <label className="umkm-year-select-label" htmlFor={id}>
          {tr(label)}
        </label>
      )}
      <div className="umkm-year-select-control">
        <select
          id={id}
          value={value === 'all' ? 'all' : String(value)}
          disabled={disabled}
          aria-label={tr(ariaLabel ?? label)}
          onChange={(e) => {
            const next = e.target.value;
            if (next === 'all') onChange('all');
            else onChange(Number(next));
          }}
        >
          {allowAll ? (
            <option value="all">{tr(allLabel)}</option>
          ) : null}
          {options.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <span className="umkm-year-select-chevron" aria-hidden>
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
      </div>
    </div>
  );
}
