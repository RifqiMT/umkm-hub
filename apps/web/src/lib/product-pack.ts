import type { Product } from '@/lib/types';
import { formatCompactQty } from '@/lib/format-money';

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

  const fixed: Array<[number, number | null, number | null]> = [
    [50, product.price50, product.cost50],
    [100, product.price100, product.cost100],
    [250, product.price250, product.cost250],
    [500, product.price500, product.cost500],
    [1000, product.price1000, product.cost1000],
  ];
  for (const [size, price, cost] of fixed) {
    if (price != null) {
      return {
        sizeLabel: `${size} ${short}`,
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
