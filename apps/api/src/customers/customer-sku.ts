/**
 * Customer ID prefix: first 2 letters of each name word + company type letter + `_`
 * Examples:
 * - Budi Santoso, Restaurant → BuSaR_
 * - Rifqi Muhammad Tjahyono, Hotel → RiMuTjH_
 * - Afif Rizaldi Muhammad Tjahyono, Store → AfRiMuTjS_
 * - Siti Aminah, Restaurant → SiAmR_
 */

export function companyTypeLetter(companyType: string): string {
  switch (companyType.toUpperCase()) {
    case 'RESTAURANT':
      return 'R';
    case 'HOTEL':
      return 'H';
    case 'STORE':
      return 'S';
    default: {
      const cleaned = companyType.replace(/[^a-zA-Z]/g, '');
      return cleaned ? cleaned[0]!.toUpperCase() : 'X';
    }
  }
}

/** Bu / Sa / Tj from a single name word. */
export function customerNameSegment(word: string): string {
  const letters = word
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z]/g, '');
  if (!letters) return '';
  if (letters.length === 1) return letters[0]!.toUpperCase();
  return `${letters[0]!.toUpperCase()}${letters[1]!.toLowerCase()}`;
}

/**
 * Prefix only: `{NameSegments}{CompanyType}_`
 * e.g. Budi Santoso + RESTAURANT → BuSaR_
 */
export function buildCustomerSkuPrefix(
  name: string,
  companyType: string,
): string {
  const segments = name
    .split(/[\s_\-]+/)
    .map((w) => customerNameSegment(w))
    .filter((s) => s.length > 0);

  const namePart = segments.length > 0 ? segments.join('') : 'Xx';
  return `${namePart}${companyTypeLetter(companyType)}_`;
}

/**
 * Full Customer ID: `{prefix}{systemUuid}`
 * e.g. BuSaR_00000000-0000-4000-8000-000000000001
 */
export function buildCustomerSku(
  name: string,
  companyType: string,
  customerId: string,
): string {
  return `${buildCustomerSkuPrefix(name, companyType)}${customerId}`;
}
