import {
  fixedPackCostPairs,
  fixedPackPricePairs,
  fixedPackPriceTriples,
  GRAM_LITER_PACK_SIZES,
  type PackCostFields,
  type PackPriceFields,
} from './pack-sizes';

type PackPricesInput = {
  unit: string;
  pricePerUnit?: number | null;
} & PackPriceFields;

type PackCostsInput = {
  unit: string;
  costPerUnit?: number | null;
} & PackCostFields;

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 10000) / 10000;
}

function hasPackValue(value: number | null | undefined): value is number {
  return value != null && value >= 0;
}

function fixedSellingPackCount(input: PackPricesInput): number {
  return fixedPackPricePairs(input).filter(([, price]) =>
    hasPackValue(price),
  ).length;
}

function hasCustomSellingPack(input: PackPricesInput): boolean {
  return (
    input.priceCustom != null &&
    input.customSize != null &&
    input.customSize > 0
  );
}

/** Non-PCS products may configure exactly one selling pack size. */
function assertSingleSellingPack(input: PackPricesInput): void {
  if (input.unit === 'PCS') return;
  const count =
    fixedSellingPackCount(input) + (hasCustomSellingPack(input) ? 1 : 0);
  if (count > 1) {
    throw new Error(
      'Each product can only have a single pack. Choose one size with its selling price (and optional cost).',
    );
  }
}

/**
 * Cost may only sit on the same pack as the selling price.
 * Extra cost columns on other sizes are rejected.
 */
function assertCostAlignedWithPack(
  input: PackPricesInput & PackCostsInput,
): void {
  if (input.unit === 'PCS') return;

  const customActive = hasCustomSellingPack(input);

  for (const [, price, cost] of fixedPackPriceTriples(input)) {
    if (hasPackValue(cost) && !hasPackValue(price)) {
      throw new Error(
        'Pack cost must use the same size as the selling pack.',
      );
    }
  }

  if (input.costCustom != null && !customActive) {
    throw new Error(
      'Custom pack cost requires the custom selling pack to be set.',
    );
  }
}

export function resolvePricePerUnit(input: PackPricesInput): number {
  if (input.unit === 'PCS') {
    if (input.pricePerUnit == null || input.pricePerUnit < 0) {
      throw new Error('Price per pcs is required');
    }
    return roundMoney(input.pricePerUnit);
  }

  assertSingleSellingPack(input);

  if (hasCustomSellingPack(input)) {
    return roundMoney(input.priceCustom! / input.customSize!);
  }

  for (const [size, price] of fixedPackPricePairs(input)) {
    if (hasPackValue(price)) {
      return roundMoney(price / size);
    }
  }

  throw new Error(
    `For non-pcs units, provide a single pack price (${GRAM_LITER_PACK_SIZES.join('/')}) or custom size + price`,
  );
}

/** Optional COGS/unit. Returns null when no cost data is provided. */
export function resolveCostPerUnit(
  input: PackCostsInput & PackPricesInput,
): number | null {
  if (input.unit === 'PCS') {
    if (input.costPerUnit == null) return null;
    if (input.costPerUnit < 0) {
      throw new Error('Cost per pcs must be ≥ 0');
    }
    return roundMoney(input.costPerUnit);
  }

  assertSingleSellingPack(input);
  assertCostAlignedWithPack(input);

  if (input.costCustom != null) {
    if (input.customSize == null || input.customSize <= 0) {
      throw new Error('Custom pack cost requires a custom size greater than 0');
    }
    if (input.costCustom < 0) {
      throw new Error('Pack cost must be ≥ 0');
    }
    return roundMoney(input.costCustom / input.customSize);
  }

  for (const [size, cost] of fixedPackCostPairs(input)) {
    if (hasPackValue(cost)) {
      return roundMoney(cost / size);
    }
  }

  return null;
}

export function calculatePotentialRevenue(
  stockQty: number,
  pricePerUnit: number,
): number {
  return roundMoney(Math.max(0, stockQty) * Math.max(0, pricePerUnit));
}

/** Inventory COGS value. Null when unit cost is not configured. */
export function calculatePotentialCost(
  stockQty: number,
  costPerUnit: number | null | undefined,
): number | null {
  if (costPerUnit == null) return null;
  return roundMoney(Math.max(0, stockQty) * Math.max(0, costPerUnit));
}

/** Gross unit margin. Null when unit cost is not configured. */
export function calculateUnitProfit(
  pricePerUnit: number,
  costPerUnit: number | null | undefined,
): number | null {
  if (costPerUnit == null) return null;
  return roundMoney(pricePerUnit - costPerUnit);
}

/** Inventory profit at current stock. Null when unit cost is not configured. */
export function calculatePotentialProfit(
  stockQty: number,
  pricePerUnit: number,
  costPerUnit: number | null | undefined,
): number | null {
  const unitProfit = calculateUnitProfit(pricePerUnit, costPerUnit);
  if (unitProfit == null) return null;
  return roundMoney(Math.max(0, stockQty) * unitProfit);
}

/**
 * Gross profit margin % of selling price.
 * `(price − cost) / price × 100`. Null when cost unset or sell price ≤ 0.
 */
export function calculateProfitMarginPercent(
  pricePerUnit: number,
  costPerUnit: number | null | undefined,
): number | null {
  if (costPerUnit == null) return null;
  if (pricePerUnit <= 0) return null;
  const margin = ((pricePerUnit - costPerUnit) / pricePerUnit) * 100;
  return Math.round((margin + Number.EPSILON) * 100) / 100;
}
