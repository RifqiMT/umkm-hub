import {
  bucketAvgLtvByMonth,
  periodAvgLtvFromOrders,
} from './ltv-series';

describe('ltv-series', () => {
  it('averages LTV by month across active customers', () => {
    const rows = [
      {
        orderDate: new Date(Date.UTC(2026, 0, 5)),
        customerId: 'c1',
        revenue: 1000,
      },
      {
        orderDate: new Date(Date.UTC(2026, 0, 20)),
        customerId: 'c2',
        revenue: 3000,
      },
      {
        orderDate: new Date(Date.UTC(2026, 1, 2)),
        customerId: 'c1',
        revenue: 500,
      },
    ];
    const monthly = bucketAvgLtvByMonth(rows);
    expect(monthly[1]).toBe(2000); // (1000+3000)/2
    expect(monthly[2]).toBe(500);
    expect(monthly[3]).toBeNull();
  });

  it('computes period avg LTV across customers', () => {
    const stats = periodAvgLtvFromOrders([
      {
        orderDate: new Date(Date.UTC(2026, 0, 5)),
        customerId: 'c1',
        revenue: 1000,
      },
      {
        orderDate: new Date(Date.UTC(2026, 2, 5)),
        customerId: 'c1',
        revenue: 500,
      },
      {
        orderDate: new Date(Date.UTC(2026, 0, 10)),
        customerId: 'c2',
        revenue: 1500,
      },
    ]);
    expect(stats.customerCount).toBe(2);
    expect(stats.linkedRevenue).toBe(3000);
    expect(stats.avgLtv).toBe(1500); // c1=1500, c2=1500
  });
});
