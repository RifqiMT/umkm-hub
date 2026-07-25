import { bucketOrdersByMonth, emptyOrderActuals } from './order-actuals';

describe('bucketOrdersByMonth', () => {
  it('returns empty buckets for no orders', () => {
    const result = bucketOrdersByMonth([]);
    expect(result.yearTotal).toBe(0);
    expect(result.yearOrderCount).toBe(0);
    expect(result.byMonth[1]).toBe(0);
    expect(result.byMonth[12]).toBe(0);
    expect(result.orderCountByMonth[6]).toBe(0);
  });

  it('sums revenue and counts by UTC month', () => {
    const result = bucketOrdersByMonth([
      {
        orderDate: new Date(Date.UTC(2026, 0, 15)),
        totalOrderValue: 1000,
      },
      {
        orderDate: new Date(Date.UTC(2026, 0, 20)),
        totalOrderValue: 500.5,
      },
      {
        orderDate: new Date(Date.UTC(2026, 6, 1)),
        totalOrderValue: 200,
      },
    ]);

    expect(result.byMonth[1]).toBe(1500.5);
    expect(result.orderCountByMonth[1]).toBe(2);
    expect(result.byMonth[7]).toBe(200);
    expect(result.orderCountByMonth[7]).toBe(1);
    expect(result.yearTotal).toBe(1700.5);
    expect(result.yearOrderCount).toBe(3);
  });

  it('emptyOrderActuals initializes all 12 months', () => {
    const empty = emptyOrderActuals();
    for (let m = 1; m <= 12; m += 1) {
      expect(empty.byMonth[m]).toBe(0);
      expect(empty.orderCountByMonth[m]).toBe(0);
    }
  });
});
