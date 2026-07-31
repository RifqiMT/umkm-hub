/** Strings that should never be sent to Google Translate. */
export function shouldSkipTranslatableString(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  if (/^@[\w.-]+$/.test(trimmed)) return true;
  if (/^[a-f0-9-]{16,}$/i.test(trimmed)) return true;
  if (/^https?:\/\//i.test(trimmed)) return true;
  return false;
}

/** True when a text node is only a number (optional grouping/separators). */
export function isNumericTranslatableString(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  return /^[\d\s.,+$%-]+$/.test(trimmed);
}
