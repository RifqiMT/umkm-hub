import {
  calculatePotentialCost,
  calculatePotentialProfit,
  calculatePotentialRevenue,
  calculateProfitMarginPercent,
  calculateUnitProfit,
  resolveCostPerUnit,
  resolvePricePerUnit,
} from './product-pricing';

describe('product pricing', () => {
  it('uses price per pcs for PCS unit', () => {
    expect(
      resolvePricePerUnit({ unit: 'PCS', pricePerUnit: 12.5 }),
    ).toBe(12.5);
  });

  it('derives unit price from pack 100', () => {
    expect(
      resolvePricePerUnit({
        unit: 'GRAM',
        price100: 20000,
      }),
    ).toBe(200);
  });

  it('derives unit price from custom pack', () => {
    expect(
      resolvePricePerUnit({
        unit: 'LITER',
        priceCustom: 9000,
        customSize: 75,
      }),
    ).toBe(120);
  });

  it('rejects multiple selling packs', () => {
    expect(() =>
      resolvePricePerUnit({
        unit: 'GRAM',
        price50: 5000,
        price100: 9000,
      }),
    ).toThrow(/single pack/);
  });

  it('rejects fixed pack plus custom pack', () => {
    expect(() =>
      resolvePricePerUnit({
        unit: 'LITER',
        price50: 5000,
        priceCustom: 9000,
        customSize: 75,
      }),
    ).toThrow(/single pack/);
  });

  it('rejects non-pcs without pack prices', () => {
    expect(() => resolvePricePerUnit({ unit: 'QTY' })).toThrow(
      /single pack price/,
    );
  });

  it('calculates potential revenue', () => {
    expect(calculatePotentialRevenue(10, 1500)).toBe(15000);
  });
});

describe('product cost', () => {
  it('returns null when no cost provided', () => {
    expect(resolveCostPerUnit({ unit: 'PCS' })).toBeNull();
    expect(resolveCostPerUnit({ unit: 'GRAM' })).toBeNull();
  });

  it('uses cost per pcs for PCS unit', () => {
    expect(resolveCostPerUnit({ unit: 'PCS', costPerUnit: 8 })).toBe(8);
  });

  it('derives unit cost from pack 100', () => {
    expect(
      resolveCostPerUnit({
        unit: 'GRAM',
        price100: 4500,
        cost100: 3000,
      }),
    ).toBe(30);
  });

  it('derives unit cost from custom pack', () => {
    expect(
      resolveCostPerUnit({
        unit: 'LITER',
        priceCustom: 9000,
        costCustom: 4500,
        customSize: 75,
      }),
    ).toBe(60);
  });

  it('rejects cost on a different size than the selling pack', () => {
    expect(() =>
      resolveCostPerUnit({
        unit: 'GRAM',
        price100: 4500,
        cost50: 1000,
      }),
    ).toThrow(/same size/);
  });

  it('rejects custom cost without custom selling pack', () => {
    expect(() =>
      resolveCostPerUnit({ unit: 'GRAM', price100: 4500, costCustom: 1000 }),
    ).toThrow(/custom selling pack/);
  });

  it('calculates potential cost from stock and unit cost', () => {
    expect(calculatePotentialCost(100, 30)).toBe(3000);
    expect(calculatePotentialCost(100, null)).toBeNull();
  });

  it('calculates unit and inventory profit when cost is set', () => {
    expect(calculateUnitProfit(50, 30)).toBe(20);
    expect(calculateUnitProfit(50, null)).toBeNull();
    expect(calculatePotentialProfit(100, 50, 30)).toBe(2000);
    expect(calculatePotentialProfit(100, 50, null)).toBeNull();
  });

  it('calculates profit margin percent of selling price', () => {
    expect(calculateProfitMarginPercent(50, 30)).toBe(40);
    expect(calculateProfitMarginPercent(200, 50)).toBe(75);
    expect(calculateProfitMarginPercent(50, null)).toBeNull();
    expect(calculateProfitMarginPercent(0, 10)).toBeNull();
  });
});
