'use client';

import {
  languageLabel,
  PRIORITY_LANGUAGE_CODES,
  UI_LANGUAGES,
} from '@/lib/languages';

type Props = {
  value: string | null;
  onChange: (code: string | null) => void;
  disabled?: boolean;
  id?: string;
  name?: string;
};

export function LanguageSelect({
  value,
  onChange,
  disabled = false,
  id,
  name = 'uiLanguage',
}: Props) {
  const priority = new Set<string>(PRIORITY_LANGUAGE_CODES);
  const popular = UI_LANGUAGES.filter((lang) => priority.has(lang.code));
  const rest = UI_LANGUAGES.filter((lang) => !priority.has(lang.code));

  return (
    <select
      id={id}
      name={name}
      className="notranslate"
      value={value ?? ''}
      disabled={disabled}
      onChange={(event) => {
        const next = event.target.value.trim();
        onChange(next || null);
      }}
    >
      <option value="">Original (English)</option>
      <optgroup label="Popular">
        {popular.map((lang) => (
          <option key={`popular-${lang.code}`} value={lang.code}>
            {languageLabel(lang)}
          </option>
        ))}
      </optgroup>
      <optgroup label="All languages">
        {rest.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {languageLabel(lang)}
          </option>
        ))}
      </optgroup>
    </select>
  );
}
