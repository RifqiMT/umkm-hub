import {
  allocatedLineRevenueShare,
  inventoryTurnoverRatio,
  productSoldCost,
  sellThroughRate,
  serializeProductStockSales,
  stockToSalesRatio,
} from './product-stock-sales';

describe('product stock sales metrics', () => {
  it('computes STR as sold / (sold + current)', () => {
    expect(sellThroughRate(75, 25)).toBe(75);
    expect(sellThroughRate(0, 10)).toBe(0);
    expect(sellThroughRate(10, 0)).toBe(100);
    expect(sellThroughRate(0, 0)).toBeNull();
  });

  it('computes ITR as sold / average inventory', () => {
    // beginning=125, ending=25, average=75 → 100/75
    expect(inventoryTurnoverRatio(100, 25)).toBeCloseTo(1.3333, 3);
    // Stocked out: average = sold/2 → ITR = 2 (bounded, not infinite)
    expect(inventoryTurnoverRatio(10, 0)).toBe(2);
    expect(inventoryTurnoverRatio(0, 0)).toBeNull();
    expect(inventoryTurnoverRatio(-5, 10)).toBe(0);
    // Equal sold and on-hand: average = 1.5×sold → ITR = 2/3
    expect(inventoryTurnoverRatio(50, 50)).toBeCloseTo(0.6667, 3);
  });

  it('computes SSR as current / sold', () => {
    expect(stockToSalesRatio(50, 100)).toBe(2);
    expect(stockToSalesRatio(0, 10)).toBeNull();
    expect(stockToSalesRatio(10, -5)).toBe(0);
  });

  it('allocates line revenue by order gross share', () => {
    // Order gross 250, net 225 → line 200 gets 180.
    expect(allocatedLineRevenueShare(200, 250, 225)).toBe(180);
    expect(allocatedLineRevenueShare(50, 250, 225)).toBe(45);
    expect(allocatedLineRevenueShare(100, 0, 90)).toBe(0);
  });

  it('estimates COGS from sold qty × catalog unit cost', () => {
    expect(productSoldCost(10, 5)).toBe(50);
    expect(productSoldCost(10, null)).toBeNull();
    expect(productSoldCost(10, undefined)).toBeNull();
  });

  it('sets total stocks and money fields from seeds', () => {
    const row = serializeProductStockSales({
      productUuid: 'prod-1',
      productCode: 'CB_100_x',
      name: 'Cabai',
      unit: 'GRAM',
      currentStocks: 25,
      soldStocks: 75,
      orderCount: 3,
      packsSold: 9,
      revenue: 300,
      discount: 30,
      costPerUnit: 2,
    });
    expect(row.currentStocks).toBe(25);
    expect(row.soldStocks).toBe(75);
    expect(row.totalStocks).toBe(100);
    expect(row.revenue).toBe(300);
    expect(row.discount).toBe(30);
    expect(row.discountPercent).toBeCloseTo(9.09, 1);
    expect(row.cost).toBe(150);
    expect(row.profit).toBe(150);
    expect(row.sellThroughRate).toBe(75);
    // beginning=100, ending=25, average=62.5 → 75/62.5 = 1.2
    expect(row.inventoryTurnover).toBe(1.2);
    expect(row.stockToSalesRatio).toBeCloseTo(0.3333, 3);
    expect(row.avgOrderValue).toBe(100);
    expect(row.unitsPerTransaction).toBe(3);
  });

  it('nulls cost and profit when catalog cost is unset', () => {
    const row = serializeProductStockSales({
      productUuid: 'prod-2',
      productCode: 'XX_1_x',
      name: 'Empty',
      unit: 'PCS',
      currentStocks: -3,
      soldStocks: -1,
      orderCount: 0,
      packsSold: 0,
      revenue: 0,
      discount: 0,
      costPerUnit: null,
    });
    expect(row.currentStocks).toBe(0);
    expect(row.soldStocks).toBe(0);
    expect(row.totalStocks).toBe(0);
    expect(row.revenue).toBe(0);
    expect(row.discount).toBe(0);
    expect(row.discountPercent).toBeNull();
    expect(row.cost).toBeNull();
    expect(row.profit).toBeNull();
    expect(row.sellThroughRate).toBeNull();
    expect(row.avgOrderValue).toBeNull();
    expect(row.unitsPerTransaction).toBeNull();
  });

  it('uses allocated net revenue for AOV (not pre-discount gross)', () => {
    const row = serializeProductStockSales({
      productUuid: 'prod-3',
      productCode: 'YY_1_x',
      name: 'Discounted',
      unit: 'PCS',
      currentStocks: 10,
      soldStocks: 20,
      orderCount: 2,
      packsSold: 4,
      revenue: 180,
      discount: 20,
      costPerUnit: 1,
    });
    expect(row.avgOrderValue).toBe(90);
    expect(row.discount).toBe(20);
    expect(row.cost).toBe(20);
    expect(row.profit).toBe(160);
  });
});
