'use client';

type Option<T extends string> = {
  value: T;
  label: string;
  disabled?: boolean;
  title?: string;
};

type OptionChipsProps<T extends string> = {
  value: T | '';
  onChange: (value: T | '') => void;
  options: ReadonlyArray<Option<T>>;
  allowEmpty?: boolean;
  emptyLabel?: string;
  'aria-label'?: string;
  size?: 'sm' | 'md';
  className?: string;
  disabled?: boolean;
};

export function OptionChips<T extends string>({
  value,
  onChange,
  options,
  allowEmpty = false,
  emptyLabel = 'None',
  'aria-label': ariaLabel,
  size = 'md',
  className,
  disabled = false,
}: OptionChipsProps<T>) {
  const sizeClass = size === 'sm' ? ' is-sm' : '';
  const rootClass = ['umkm-choice-group', sizeClass, className]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={rootClass}
      role="radiogroup"
      aria-label={ariaLabel}
      aria-disabled={disabled || undefined}
    >
      {allowEmpty ? (
        <button
          type="button"
          role="radio"
          className={`umkm-choice-chip${value === '' ? ' is-active' : ''}`}
          aria-checked={value === ''}
          disabled={disabled}
          onClick={() => onChange('')}
        >
          {emptyLabel}
        </button>
      ) : null}
      {options.map((opt) => {
        const active = value === opt.value;
        const optDisabled = disabled || Boolean(opt.disabled);
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            className={`umkm-choice-chip${active ? ' is-active' : ''}`}
            aria-checked={active}
            disabled={optDisabled}
            title={opt.title}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
