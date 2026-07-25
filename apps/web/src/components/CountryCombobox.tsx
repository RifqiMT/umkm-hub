'use client';

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { filterCountries } from '@/lib/countries';

type Props = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  id?: string;
  name?: string;
};

export function CountryCombobox({
  value,
  onChange,
  disabled = false,
  placeholder = 'Search country…',
  id,
  name = 'country',
}: Props) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const listId = `${inputId}-list`;
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  const options = filterCountries(query, 10);
  const showList = open && !disabled && options.length > 0;

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setQuery(value);
      }
    }
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open, value]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, open]);

  function commit(next: string) {
    onChange(next);
    setQuery(next);
    setOpen(false);
  }

  function onKeyDown(e: ReactKeyboardEvent<HTMLInputElement>) {
    if (disabled) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      setActiveIndex((i) => Math.min(i + 1, Math.max(options.length - 1, 0)));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === 'Enter') {
      if (open && options[activeIndex]) {
        e.preventDefault();
        commit(options[activeIndex]);
      }
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      setQuery(value);
      return;
    }
  }

  return (
    <div
      className={`umkm-combobox${open ? ' is-open' : ''}${disabled ? ' is-disabled' : ''}`}
      ref={rootRef}
    >
      <div className="umkm-combobox-control">
        <input
          id={inputId}
          name={name}
          type="text"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            showList && options[activeIndex]
              ? `${listId}-${activeIndex}`
              : undefined
          }
          autoComplete="off"
          disabled={disabled}
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            // Defer so option click can commit first.
            window.setTimeout(() => {
              if (!rootRef.current?.contains(document.activeElement)) {
                const trimmed = query.trim();
                if (trimmed !== value) onChange(trimmed);
                setOpen(false);
              }
            }, 0);
          }}
          onKeyDown={onKeyDown}
        />
        <div className="umkm-combobox-affix">
          {value ? (
            <button
              type="button"
              className="umkm-combobox-clear"
              aria-label="Clear country"
              disabled={disabled}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => commit('')}
            >
              ×
            </button>
          ) : null}
          <button
            type="button"
            className="umkm-combobox-toggle"
            aria-label={open ? 'Close country list' : 'Open country list'}
            tabIndex={-1}
            disabled={disabled}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setOpen((v) => !v)}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden>
              <path
                d="M4 6l4 4 4-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>

      {showList ? (
        <ul
          id={listId}
          className="umkm-combobox-list"
          role="listbox"
          aria-label="Countries"
        >
          {options.map((option, index) => (
            <li key={option} role="presentation">
              <button
                type="button"
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === activeIndex}
                className={`umkm-combobox-option${index === activeIndex ? ' is-active' : ''}${option === value ? ' is-selected' : ''}`}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => commit(option)}
              >
                {option}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
