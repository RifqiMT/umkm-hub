/** Map Google Translate language codes to BCP 47 tags for Intl formatters. */
function resolveNumberLocale(lang: string | null | undefined): string {
  if (!lang || lang === 'en') return 'en-US';
  return lang;
}

export function formatLocalizedNumber(
  value: number,
  lang: string | null | undefined,
  options?: Intl.NumberFormatOptions,
): string {
  const locale = resolveNumberLocale(lang);
  try {
    return new Intl.NumberFormat(locale, options).format(value);
  } catch {
    return new Intl.NumberFormat('en-US', options).format(value);
  }
}

export function formatLocalizedInteger(
  value: number,
  lang: string | null | undefined,
): string {
  return formatLocalizedNumber(value, lang, {
    maximumFractionDigits: 0,
  });
}
