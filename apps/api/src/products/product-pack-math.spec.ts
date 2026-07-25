import {
  formatPacksOnHand,
  getActivePackFromPricing,
  packEconomics,
  packsOnHand,
  qtyFromPackCount,
  type PackPricingInput,
} from './product-pack-math';

function base(over: Partial<PackPricingInput> = {}): PackPricingInput {
  return {
    unit: 'GRAM',
    pricePerUnit: 0,
    costPerUnit: null,
    price50: null,
    price100: 20000,
    price250: null,
    price500: null,
    price1000: null,
    priceCustom: null,
    cost50: null,
    cost100: 12000,
    cost250: null,
    cost500: null,
    cost1000: null,
    costCustom: null,
    customSize: null,
    ...over,
  };
}

describe('getActivePackFromPricing', () => {
  it('returns pcs pack for PCS products', () => {
    expect(
      getActivePackFromPricing(
        base({
          unit: 'PCS',
          pricePerUnit: 10,
          costPerUnit: 4,
          price100: null,
          cost100: null,
        }),
      ),
    ).toEqual({
      sizeLabel: '1 pcs',
      size: 1,
      price: 10,
      cost: 4,
      shortUnit: 'pcs',
    });
  });

  it('picks the first configured gram/liter pack', () => {
    const pack = getActivePackFromPricing(base());
    expect(pack?.sizeLabel).toBe('100 g');
    expect(pack?.price).toBe(20000);
  });

  it('returns null when no pack price is set', () => {
    expect(
      getActivePackFromPricing(base({ price100: null, cost100: null })),
    ).toBeNull();
  });
});

describe('packEconomics', () => {
  it('computes rates and margin', () => {
    const eco = packEconomics(getActivePackFromPricing(base()));
    expect(eco.sellRate).toBe(200);
    expect(eco.costRate).toBe(120);
    expect(eco.profit).toBe(8000);
    expect(eco.margin).toBe(40);
  });
});

describe('packsOnHand', () => {
  it('divides stock by pack size', () => {
    const pack = getActivePackFromPricing(base());
    expect(packsOnHand(500, pack)).toBe(5);
    expect(formatPacksOnHand(500, pack)).toBe('5 × 100 g');
  });

  it('returns null without a pack', () => {
    expect(packsOnHand(100, null)).toBeNull();
  });
});

describe('qtyFromPackCount', () => {
  it('multiplies packs by size', () => {
    expect(qtyFromPackCount(3, 100)).toBe(300);
    expect(qtyFromPackCount(1.5, 250)).toBe(375);
  });

  it('returns 0 for invalid inputs', () => {
    expect(qtyFromPackCount(-1, 100)).toBe(0);
    expect(qtyFromPackCount(2, 0)).toBe(0);
  });
});
