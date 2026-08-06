/** Fixed gram/liter pack sizes (smallest first). */
export const GRAM_LITER_PACK_SIZES = [
  1, 5, 10, 25, 50, 100, 250, 500, 1000,
] as const;

type GramLiterPackSize = (typeof GRAM_LITER_PACK_SIZES)[number];

export type GramLiterPackKey = `${GramLiterPackSize}` | 'CUSTOM';

export type PackPriceFields = {
  price1?: number | null;
  price5?: number | null;
  price10?: number | null;
  price25?: number | null;
  price50?: number | null;
  price100?: number | null;
  price250?: number | null;
  price500?: number | null;
  price1000?: number | null;
  priceCustom?: number | null;
  customSize?: number | null;
};

export type PackCostFields = {
  cost1?: number | null;
  cost5?: number | null;
  cost10?: number | null;
  cost25?: number | null;
  cost50?: number | null;
  cost100?: number | null;
  cost250?: number | null;
  cost500?: number | null;
  cost1000?: number | null;
  costCustom?: number | null;
};

export function fixedPackPriceTriples(
  input: PackPriceFields & PackCostFields,
): Array<[number, number | null | undefined, number | null | undefined]> {
  return GRAM_LITER_PACK_SIZES.map((size) => [
    size,
    input[`price${size}` as keyof PackPriceFields] as number | null | undefined,
    input[`cost${size}` as keyof PackCostFields] as number | null | undefined,
  ]);
}

export function fixedPackPricePairs(
  input: PackPriceFields,
): Array<[number, number | null | undefined]> {
  return GRAM_LITER_PACK_SIZES.map((size) => [
    size,
    input[`price${size}` as keyof PackPriceFields] as number | null | undefined,
  ]);
}

export function fixedPackCostPairs(
  input: PackCostFields,
): Array<[number, number | null | undefined]> {
  return GRAM_LITER_PACK_SIZES.map((size) => [
    size,
    input[`cost${size}` as keyof PackCostFields] as number | null | undefined,
  ]);
}

export function nullFixedPackFields(): Record<
  `price${GramLiterPackSize}` | `cost${GramLiterPackSize}`,
  null
> {
  return Object.fromEntries(
    GRAM_LITER_PACK_SIZES.flatMap((size) => [
      [`price${size}`, null],
      [`cost${size}`, null],
    ]),
  ) as Record<
    `price${GramLiterPackSize}` | `cost${GramLiterPackSize}`,
    null
  >;
}
