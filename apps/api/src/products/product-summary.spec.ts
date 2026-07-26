import { buildProductSummary } from './product-summary';

describe('product-summary', () => {
  it('builds volume and rates', () => {
    const summary = buildProductSummary({
      productCount: 10,
      totalStockQty: 500,
      sellValue: 1000,
      costedSellValue: 1000,
      costValue: 400,
      hasCost: true,
      inStockCount: 8,
      withCostCount: 5,
      packReadyCount: 9,
    });
    expect(summary.productCount).toBe(10);
    expect(summary.inventorySellValue).toBe(1000);
    expect(summary.outOfStockRate).toBe(20);
    expect(summary.inStockRate).toBe(80);
    expect(summary.costCoverageRate).toBe(50);
    expect(summary.profitMarginRate).toBe(60);
    expect(summary.packReadyRate).toBe(90);
  });

  it('returns null rates when empty', () => {
    const summary = buildProductSummary({
      productCount: 0,
      totalStockQty: 0,
      sellValue: 0,
      costedSellValue: 0,
      costValue: 0,
      hasCost: false,
      inStockCount: 0,
      withCostCount: 0,
      packReadyCount: 0,
    });
    expect(summary.outOfStockRate).toBeNull();
    expect(summary.profitMarginRate).toBeNull();
  });
});
