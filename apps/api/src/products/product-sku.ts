import { getActivePackFromPricing, type PackPricingInput } from './product-pack-math';

const VOWELS = new Set(['A', 'E', 'I', 'O', 'U']);

/** Common Indonesian color / descriptor words skipped for initials. */
const SKIP_WORDS = new Set([
  'MERAH',
  'HIJAU',
  'PUTIH',
  'HITAM',
  'KUNING',
  'BIRU',
  'UNGU',
  'ORANGE',
  'PINK',
  'COKLAT',
  'ABU',
]);

function wordLetters(word: string): string {
  return word
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase();
}

/** Remove trailing "(100)" / "(1250)" pack hints from catalog names. */
function stripPackHintFromName(name: string): string {
  return name.replace(/\s*\(\s*[\d.]+\s*\)\s*$/g, '').trim();
}

function consonantsOf(word: string): string {
  return [...wordLetters(word)].filter((ch) => !VOWELS.has(ch)).join('');
}

/**
 * Product code initials matching catalog style:
 * - Ignore trailing "(pack size)" in the name
 * - Skip color descriptors (Merah, Hijau, …) and pure numbers
 * - One remaining word → first two consonants (Cabai → CB)
 * - Multiple words → first letter of each (Kaki Ayam → KA)
 */
export function productNameInitials(name: string): string {
  const rawWords = stripPackHintFromName(name)
    .split(/[\s_\-]+/)
    .map((w) => wordLetters(w))
    .filter((w) => w.length > 0 && !/^\d+(\.\d+)?$/.test(w));

  const words = rawWords.filter((w) => !SKIP_WORDS.has(w));
  const effective = words.length > 0 ? words : rawWords;

  if (effective.length === 0) return 'XX';

  if (effective.length === 1) {
    const consonants = consonantsOf(effective[0]);
    if (consonants.length >= 2) return consonants.slice(0, 2);
    const letters = effective[0];
    if (letters.length >= 2) return letters.slice(0, 2);
    return `${letters}X`.slice(0, 2);
  }

  return effective
    .map((w) => w[0]!)
    .join('')
    .slice(0, 6);
}

/** Pack size segment without trailing zeros (100, 1250, 12.5). */
export function formatSkuPackSize(size: number): string {
  if (!Number.isFinite(size) || size < 0) return '0';
  const rounded = Math.round((size + Number.EPSILON) * 10000) / 10000;
  if (Number.isInteger(rounded)) return String(rounded);
  return String(rounded).replace(/\.?0+$/, '');
}

/**
 * Human prefix only: `{INITIALS}_{PACK}_`
 * e.g. Cabai Merah @ 100 → CB_100_
 */
export function buildProductSkuPrefix(name: string, packSize: number): string {
  const initials = productNameInitials(name);
  const size = formatSkuPackSize(packSize);
  return `${initials}_${size}_`;
}

/**
 * Full product ID: `{INITIALS}_{PACK}_{systemUuid}`
 * e.g. CB_100_00000000-0000-4000-8000-000000000001
 */
export function buildProductSku(
  name: string,
  packSize: number,
  productId: string,
): string {
  return `${buildProductSkuPrefix(name, packSize)}${productId}`;
}

function packSizeForSku(
  name: string,
  product: PackPricingInput,
): number {
  const pack = getActivePackFromPricing(product);
  const hintMatch = name.match(/\(\s*([\d.]+)\s*\)\s*$/);
  const hintSize = hintMatch ? Number(hintMatch[1]) : null;

  if (product.unit !== 'PCS' && pack && pack.size > 0) {
    return pack.size;
  }
  if (hintSize != null && Number.isFinite(hintSize) && hintSize > 0) {
    return hintSize;
  }
  return pack?.size ?? 1;
}

export function buildProductSkuFromProduct(
  name: string,
  product: PackPricingInput,
  productId: string,
): string {
  return buildProductSku(name, packSizeForSku(name, product), productId);
}

/** Compact list label: keep prefix, shorten the UUID tail. */
export function compactProductSku(sku: string): string {
  const m = sku.match(/^([A-Z0-9]+_[0-9]+(?:\.[0-9]+)?_)(.+)$/i);
  if (!m) return sku;
  const prefix = m[1];
  const systemId = m[2];
  if (systemId.length <= 13) return sku;
  const compact = systemId.replace(/-/g, '');
  return `${prefix}${compact.slice(0, 8)}…`;
}
