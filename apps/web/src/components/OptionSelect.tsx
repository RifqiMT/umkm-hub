'use client';

import { useTr } from '@/components/Tr';

type Option<T extends string> = {
  value: T;
  label: string;
  disabled?: boolean;
  title?: string;
};

type OptionSelectProps<T extends string> = {
  value: T | '';
  onChange: (value: T | '') => void;
  options: ReadonlyArray<Option<T>>;
  allowEmpty?: boolean;
  emptyLabel?: string;
  'aria-label'?: string;
  id?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
};

function SelectChevron() {
  return (
    <span className="umkm-select-chevron" aria-hidden>
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
  );
}

/** Native select for form enum fields — modern control chrome + custom chevron. */
export function OptionSelect<T extends string>({
  value,
  onChange,
  options,
  allowEmpty = false,
  emptyLabel = 'None',
  'aria-label': ariaLabel,
  id,
  className,
  disabled = false,
  required = false,
}: OptionSelectProps<T>) {
  const tr = useTr();
  const emptySentinel = '';
  const isPlaceholder = value === '';
  const controlClass = [
    'umkm-select-control',
    isPlaceholder ? 'is-placeholder' : '',
    disabled ? 'is-disabled' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={controlClass}>
      <select
        id={id}
        aria-label={ariaLabel ? tr(ariaLabel) : undefined}
        value={value}
        disabled={disabled}
        required={required && !allowEmpty}
        onChange={(e) => {
          const next = e.target.value;
          if (next === emptySentinel) {
            onChange('' as T | '');
            return;
          }
          onChange(next as T);
        }}
      >
        {allowEmpty ? (
          <option value={emptySentinel}>{tr(emptyLabel)}</option>
        ) : null}
        {!allowEmpty && value === '' ? (
          <option value="" disabled>
            {tr('Select…')}
          </option>
        ) : null}
        {options.map((opt) => (
          <option
            key={opt.value}
            value={opt.value}
            disabled={opt.disabled}
            title={opt.title ? tr(opt.title) : undefined}
          >
            {tr(opt.label)}
          </option>
        ))}
      </select>
      <SelectChevron />
    </div>
  );
}
