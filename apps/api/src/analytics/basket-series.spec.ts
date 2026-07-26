import {
  averageBasketSize,
  bucketAvgBasketByMonth,
  periodAvgBasketFromOrders,
} from './basket-series';

describe('basket-series', () => {
  it('averageBasketSize returns null without orders', () => {
    expect(averageBasketSize(100, 0)).toBeNull();
  });

  it('averageBasketSize divides total packs by orders', () => {
    expect(averageBasketSize(150, 3)).toBe(50);
  });

  it('buckets monthly averages by UTC order month', () => {
    const monthly = bucketAvgBasketByMonth([
      { orderDate: new Date(Date.UTC(2026, 0, 5)), packCount: 10 },
      { orderDate: new Date(Date.UTC(2026, 0, 20)), packCount: 30 },
      { orderDate: new Date(Date.UTC(2026, 1, 1)), packCount: 5 },
    ]);
    expect(monthly[1]).toBe(20);
    expect(monthly[2]).toBe(5);
    expect(monthly[3]).toBeNull();
  });

  it('periodAvgBasketFromOrders averages packs across the period', () => {
    const period = periodAvgBasketFromOrders([
      { orderDate: new Date(Date.UTC(2026, 0, 1)), packCount: 4 },
      { orderDate: new Date(Date.UTC(2026, 0, 2)), packCount: 6 },
      { orderDate: new Date(Date.UTC(2026, 0, 3)), packCount: 0 },
    ]);
    expect(period).toEqual({
      orderCount: 3,
      totalPacks: 10,
      avgBasketSize: 3.3333,
    });
  });

  it('ignores negative pack count when summing', () => {
    const period = periodAvgBasketFromOrders([
      { orderDate: new Date(Date.UTC(2026, 0, 1)), packCount: -5 },
      { orderDate: new Date(Date.UTC(2026, 0, 2)), packCount: 10 },
    ]);
    expect(period.totalPacks).toBe(10);
    expect(period.avgBasketSize).toBe(5);
  });
});
