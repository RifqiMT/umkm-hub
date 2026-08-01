import {
  fixedPackPriceTriples,
  type PackCostFields,
  type PackPriceFields,
} from './pack-sizes';

export type PackPricingInput = {
  unit: 'PCS' | 'GRAM' | 'LITER';
  pricePerUnit: number;
  costPerUnit: number | null;
} & PackPriceFields &
  PackCostFields;

export type ActivePackMath = {
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

function formatMoney(value: number) {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  });
}

function marginFromSellCost(
  sell: number,
  cost: number | null | undefined,
) {
  if (cost == null || sell <= 0) return null;
  return Math.round((((sell - cost) / sell) * 100 + Number.EPSILON) * 100) / 100;
}

export function getActivePackFromPricing(
  product: PackPricingInput,
): ActivePackMath | null {
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

  for (const [size, price, cost] of fixedPackPriceTriples(product)) {
    if (price != null) {
      return {
        sizeLabel: `${size} ${short}`,
        size,
        price,
        cost: cost ?? null,
        shortUnit: short,
      };
    }
  }
  if (product.priceCustom != null && product.customSize != null) {
    return {
      sizeLabel: `${formatMoney(product.customSize)} ${short}`,
      size: product.customSize,
      price: product.priceCustom,
      cost: product.costCustom ?? null,
      shortUnit: short,
    };
  }
  return null;
}

export function packEconomics(pack: ActivePackMath | null) {
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

export function packsOnHand(
  stockQty: number,
  pack: ActivePackMath | null,
): number | null {
  if (!pack || !(pack.size > 0)) return null;
  return Math.round((stockQty / pack.size + Number.EPSILON) * 10000) / 10000;
}

/** Convert pack count → base unit qty for restock. */
export function qtyFromPackCount(
  packCount: number,
  packSize: number,
): number {
  if (!(packSize > 0) || !(packCount >= 0)) return 0;
  return Math.round((packCount * packSize + Number.EPSILON) * 10000) / 10000;
}

export function formatPacksOnHand(
  stockQty: number,
  pack: ActivePackMath | null,
): string | null {
  const count = packsOnHand(stockQty, pack);
  if (count == null || !pack) return null;
  if (pack.size === 1 && pack.shortUnit === 'pcs') {
    return `${formatMoney(count)} pcs`;
  }
  return `${formatMoney(count)} × ${pack.sizeLabel}`;
}
