/** Draft type for editable numeric inputs — empty string while clearing/typing. */
export type NumberDraft = number | '';

/** Parse an input event value without collapsing '' → 0 mid-edit. */
export function parseNumberDraft(raw: string): NumberDraft {
  if (raw.trim() === '') return '';
  const n = Number(raw);
  return Number.isFinite(n) ? n : '';
}

/**
 * Value for controlled number inputs.
 * Prefer seeding drafts as `''` (not `0`) so new forms start blank.
 * Keep typed `0` visible so decimals like `0.5` remain editable.
 */
export function numberInputValue(
  value: NumberDraft | number | null | undefined,
  opts?: { emptyWhenZero?: boolean },
): number | '' {
  if (value === '' || value == null) return '';
  const emptyWhenZero = opts?.emptyWhenZero === true;
  if (emptyWhenZero && value === 0) return '';
  return value;
}

/** Coerce draft → number for submit / math (blank → fallback). */
export function numberDraftToNumber(
  value: NumberDraft | number | null | undefined,
  fallback = 0,
): number {
  if (value === '' || value == null) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** Coerce draft → optional number (blank → null). */
export function numberDraftToOptional(
  value: NumberDraft | number | null | undefined,
): number | null {
  if (value === '' || value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
