import type { Product } from '@/lib/types';
import { formatCompactQty } from '@/lib/format-money';

export const GRAM_LITER_PACK_SIZES = [
  1, 5, 10, 25, 50, 100, 250, 500, 1000,
] as const;

export type GramLiterPackSize = (typeof GRAM_LITER_PACK_SIZES)[number];
export type PackSizeOption = `${GramLiterPackSize}` | 'CUSTOM';

export type ActivePack = {
  sizeLabel: string;
  size: number;
  price: number;
  cost: number | null;
  shortUnit: string;
};

function unitShort(unit?: string) {
  switch (unit) {
    case 'GRAM':
      return 'g';
    case 'LITER':
      return 'L';
    default:
      return 'pcs';
  }
}

function formatPackSize(value: number) {
  return formatCompactQty(value);
}

function marginFromSellCost(
  sell: number,
  cost: number | null | undefined,
) {
  if (cost == null || sell <= 0) return null;
  return Math.round((((sell - cost) / sell) * 100 + Number.EPSILON) * 100) / 100;
}

/** Active selling pack for a catalog product (pcs or single gram/liter pack). */
export function getActivePack(product: Product): ActivePack | null {
  const short = unitShort(product.unit);
  if (product.unit === 'PCS') {
    return {
      sizeLabel: '1 pcs',
      size: 1,
      price: product.pricePerUnit,
      cost: product.costPerUnit,
      shortUnit: 'pcs',
    };
  }

  for (const size of GRAM_LITER_PACK_SIZES) {
    const price = product[`price${size}` as keyof Product] as number | null;
    const cost = product[`cost${size}` as keyof Product] as number | null;
    if (price != null) {
      return {
        sizeLabel: `${formatPackSize(size)} ${short}`,
        size,
        price,
        cost,
        shortUnit: short,
      };
    }
  }
  if (product.priceCustom != null && product.customSize != null) {
    return {
      sizeLabel: `${formatPackSize(product.customSize)} ${short}`,
      size: product.customSize,
      price: product.priceCustom,
      cost: product.costCustom,
      shortUnit: short,
    };
  }
  return null;
}

export function packEconomics(pack: ActivePack | null) {
  if (!pack) {
    return {
      sell: null as number | null,
      cost: null as number | null,
      profit: null as number | null,
      margin: null as number | null,
      sellRate: null as number | null,
      costRate: null as number | null,
      profitRate: null as number | null,
    };
  }
  const sellRate = pack.price / pack.size;
  const costRate = pack.cost != null ? pack.cost / pack.size : null;
  const profit = pack.cost != null ? pack.price - pack.cost : null;
  const profitRate = profit != null ? profit / pack.size : null;
  const margin = marginFromSellCost(pack.price, pack.cost);
  return {
    sell: pack.price,
    cost: pack.cost,
    profit,
    margin,
    sellRate,
    costRate,
    profitRate,
  };
}

/** How many active packs fit in current stock (null if no pack / size). */
export function packsOnHand(
  stockQty: number,
  pack: ActivePack | null,
): number | null {
  if (!pack || !(pack.size > 0)) return null;
  return Math.round((stockQty / pack.size + Number.EPSILON) * 10000) / 10000;
}

/** Convert pack count → base unit qty for restock. */
export function qtyFromPackCount(packCount: number, packSize: number): number {
  if (!(packSize > 0) || !(packCount >= 0)) return 0;
  return Math.round((packCount * packSize + Number.EPSILON) * 10000) / 10000;
}

/**
 * Human label for packs in stock.
 * e.g. "2.00 Bn packs (100 g)" or "12 pcs"
 */
export function formatPacksOnHand(
  stockQty: number,
  pack: ActivePack | null,
): string | null {
  const count = packsOnHand(stockQty, pack);
  if (count == null || !pack) return null;
  if (pack.size === 1 && pack.shortUnit === 'pcs') {
    return `${formatCompactQty(count)} pcs`;
  }
  return `${formatCompactQty(count)} packs (${pack.sizeLabel})`;
}

export function emptyPackFormFields(): Record<
  `price${GramLiterPackSize}` | `cost${GramLiterPackSize}`,
  number | ''
> {
  return Object.fromEntries(
    GRAM_LITER_PACK_SIZES.flatMap((size) => [
      [`price${size}`, ''],
      [`cost${size}`, ''],
    ]),
  ) as Record<
    `price${GramLiterPackSize}` | `cost${GramLiterPackSize}`,
    number | ''
  >;
}

export function clearedPackFormFields(): Record<
  | `price${GramLiterPackSize}`
  | `cost${GramLiterPackSize}`
  | 'priceCustom'
  | 'costCustom'
  | 'customSize',
  number | ''
> {
  return {
    ...emptyPackFormFields(),
    priceCustom: '',
    costCustom: '',
    customSize: '',
  };
}
