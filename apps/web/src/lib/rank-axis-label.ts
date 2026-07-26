/**
 * Compact axis labels for Analytics Top/Bottom 5 charts.
 * Full names stay in tooltips / `fullName`.
 */

function stripPackHint(name: string): { base: string; pack: string | null } {
  const match = name.match(/^(.*?)\s*\(\s*([\d.]+)\s*\)\s*$/);
  if (!match) return { base: name.trim(), pack: null };
  return { base: match[1]!.trim(), pack: match[2]! };
}

function wordStem(word: string, max = 3): string {
  const letters = word
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '');
  if (!letters) return '';
  const head = letters[0]!.toUpperCase();
  const rest = letters.slice(1, max).toLowerCase();
  return `${head}${rest}`;
}

/**
 * Product axis label — short stems + pack size.
 * Examples: "Daging Sapi Tenderloin (1000)" → "D.S.Ten 1000"
 *           "Kaki Ayam (500)" → "Kak.A 500"
 *           "Cabai Merah (100)" → "Cab.M 100"
 */
export function abbreviateProductAxisLabel(name: string): string {
  const { base, pack } = stripPackHint(name);
  const words = base.split(/[\s_\-]+/).filter(Boolean);
  let code: string;
  if (words.length === 0) {
    code = '?';
  } else if (words.length === 1) {
    code = wordStem(words[0]!, 4);
  } else if (words.length === 2) {
    code = `${wordStem(words[0]!, 3)}.${words[1]![0]!.toUpperCase()}`;
  } else {
    const head = words
      .slice(0, -1)
      .map((w) => w[0]!.toUpperCase())
      .join('.');
    code = `${head}.${wordStem(words[words.length - 1]!, 3)}`;
  }
  return pack ? `${code} ${pack}` : code;
}

/**
 * Customer axis label — first initial + last name.
 * Example: "Budi Santoso" → "B. Santoso"
 */
export function abbreviateCustomerAxisLabel(name: string): string {
  const parts = name
    .trim()
    .split(/[\s_\-]+/)
    .filter(Boolean);
  if (parts.length === 0) return '—';
  if (parts.length === 1) {
    const w = parts[0]!;
    return w.length <= 10 ? w : `${w.slice(0, 9)}…`;
  }
  const first = parts[0]![0]!.toUpperCase();
  const last = parts[parts.length - 1]!;
  return `${first}. ${last}`;
}

/** Ensure axis keys stay unique when abbreviations collide. */
export function uniqueAxisKeys(labels: string[]): string[] {
  const seen = new Map<string, number>();
  return labels.map((label) => {
    const n = (seen.get(label) ?? 0) + 1;
    seen.set(label, n);
    return n === 1 ? label : `${label}·${n}`;
  });
}
