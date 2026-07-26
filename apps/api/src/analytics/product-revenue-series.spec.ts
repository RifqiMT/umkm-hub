import {
  bucketAvgProductRevenueByMonth,
  periodAvgProductRevenueFromLines,
} from './product-revenue-series';

describe('product-revenue-series', () => {
  it('averages product revenue by month across sold products', () => {
    const monthly = bucketAvgProductRevenueByMonth([
      {
        orderDate: new Date('2026-01-10T00:00:00.000Z'),
        productId: 'p1',
        revenue: 100,
      },
      {
        orderDate: new Date('2026-01-20T00:00:00.000Z'),
        productId: 'p2',
        revenue: 300,
      },
      {
        orderDate: new Date('2026-02-05T00:00:00.000Z'),
        productId: 'p1',
        revenue: 50,
      },
    ]);
    expect(monthly[1]).toBe(200); // (100+300)/2
    expect(monthly[2]).toBe(50);
    expect(monthly[3]).toBeNull();
  });

  it('computes period avg product revenue', () => {
    const stats = periodAvgProductRevenueFromLines([
      {
        orderDate: new Date('2026-01-01T00:00:00.000Z'),
        productId: 'p1',
        revenue: 100,
      },
      {
        orderDate: new Date('2026-03-01T00:00:00.000Z'),
        productId: 'p1',
        revenue: 50,
      },
      {
        orderDate: new Date('2026-03-01T00:00:00.000Z'),
        productId: 'p2',
        revenue: 150,
      },
    ]);
    expect(stats.productCount).toBe(2);
    expect(stats.productRevenue).toBe(300);
    expect(stats.avgProductRevenue).toBe(150); // p1=150, p2=150
  });
});
