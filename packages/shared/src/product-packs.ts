/** Fixed gram/liter pack sizes (smallest first). */
export const GRAM_LITER_PACK_SIZES = [
  1, 5, 10, 25, 50, 100, 250, 500, 1000,
] as const;

export type GramLiterPackSize = (typeof GRAM_LITER_PACK_SIZES)[number];

export type GramLiterPackKey = `${GramLiterPackSize}` | 'CUSTOM';
