import { buildWarehouseSummary } from './warehouse-summary';

describe('warehouse-summary', () => {
  it('builds inventory + restock snapshot', () => {
    const summary = buildWarehouseSummary({
      productCount: 4,
      sellValue: 200,
      costedSellValue: 200,
      costValue: 80,
      profitValue: 120,
      hasCost: true,
      inStockCount: 3,
      withCostCount: 2,
      restockCount: 12,
      qtyRestocked: 900,
      earliestRestockDate: '2024-01-01',
      latestRestockDate: '2026-07-01',
    });
    expect(summary.inventorySellValue).toBe(200);
    expect(summary.restockCount).toBe(12);
    expect(summary.profitMarginRate).toBe(60);
    expect(summary.inStockRate).toBe(75);
    expect(summary.outOfStockRate).toBe(25);
    expect(summary.earliestRestockDate).toBe('2024-01-01');
  });
});
