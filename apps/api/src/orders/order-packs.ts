import { BadRequestException } from '@nestjs/common';
import { Product, ProductUnit } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import {
  GRAM_LITER_PACK_SIZES,
  type GramLiterPackKey,
} from '../products/pack-sizes';

function toNumber(value: Decimal | number | string): number {
  if (typeof value === 'number') return value;
  return Number(value.toString());
}

type ProductPackOption = {
  key: 'PCS' | GramLiterPackKey;
  size: number;
  price: number;
};

type PackSource = Pick<
  Product,
  | 'unit'
  | 'pricePerUnit'
  | 'price1'
  | 'price5'
  | 'price10'
  | 'price25'
  | 'price50'
  | 'price100'
  | 'price250'
  | 'price500'
  | 'price1000'
  | 'priceCustom'
  | 'customSize'
>;

function optionalPrice(
  value: Decimal | number | string | null | undefined,
): number | null {
  if (value == null) return null;
  return toNumber(value);
}

/** Available sellable packs for a product (PCS = single unit option). */
export function listProductPacks(product: PackSource): ProductPackOption[] {
  if (product.unit === ProductUnit.PCS) {
    return [
      {
        key: 'PCS',
        size: 1,
        price: toNumber(product.pricePerUnit),
      },
    ];
  }

  const packs: ProductPackOption[] = [];
  for (const size of GRAM_LITER_PACK_SIZES) {
    const key = String(size) as GramLiterPackKey;
    const price = optionalPrice(
      product[`price${size}` as keyof PackSource] as Decimal | null,
    );
    if (price != null) packs.push({ key, size, price });
  }

  const customPrice = optionalPrice(product.priceCustom);
  const customSize =
    product.customSize == null ? null : toNumber(product.customSize);
  if (customPrice != null && customSize != null && customSize > 0) {
    packs.push({ key: 'CUSTOM', size: customSize, price: customPrice });
  }

  return packs;
}

type ResolvedOrderPack = {
  packKey: ProductPackOption['key'];
  packSize: number;
  packPrice: number;
  packCount: number;
  /** Stock units deducted / ordered. */
  productQty: number;
  /** Price per 1 stock unit (for snapshots / totals). */
  unitPrice: number;
  unit: ProductUnit;
};

/**
 * Resolve order qty/price from a product pack selection.
 * Price is never taken from the client — only from configured product packs.
 */
export function resolveOrderPack(input: {
  product: PackSource & { unit: ProductUnit };
  packSize?: number | null;
  packCount: number;
}): ResolvedOrderPack {
  const { product, packCount } = input;
  if (!(packCount > 0)) {
    throw new BadRequestException('Pack count must be greater than 0');
  }

  const packs = listProductPacks(product);
  if (packs.length === 0) {
    throw new BadRequestException(
      'Product has no pack prices configured. Add pack prices before ordering.',
    );
  }

  let pack: ProductPackOption | undefined;
  if (product.unit === ProductUnit.PCS) {
    pack = packs[0];
  } else {
    if (input.packSize == null) {
      throw new BadRequestException(
        'Select a product pack size for gram/liter orders.',
      );
    }
    pack = packs.find(
      (p) => Math.abs(p.size - Number(input.packSize)) < 1e-9,
    );
    if (!pack) {
      throw new BadRequestException(
        `Pack size ${input.packSize} is not available on this product.`,
      );
    }
  }

  const productQty = pack.size * packCount;
  const unitPrice = pack.price / pack.size;

  return {
    packKey: pack.key,
    packSize: pack.size,
    packPrice: pack.price,
    packCount,
    productQty,
    unitPrice,
    unit: product.unit,
  };
}
