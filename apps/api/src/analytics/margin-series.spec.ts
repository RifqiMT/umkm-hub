import {
  bucketMarginByMonth,
  periodMarginFromOrders,
} from './margin-series';

describe('margin-series', () => {
  it('returns null margin when no catalog costs', () => {
    const byMonth = bucketMarginByMonth([
      {
        orderDate: new Date(Date.UTC(2026, 0, 10)),
        totalOrderValue: 1000,
        productQty: 10,
        costPerUnit: null,
      },
    ]);
    expect(byMonth[1]).toMatchObject({
      revenue: 1000,
      cost: null,
      marginPercent: null,
    });
  });

  it('computes monthly margin from costed qty', () => {
    const byMonth = bucketMarginByMonth([
      {
        orderDate: new Date(Date.UTC(2026, 0, 10)),
        totalOrderValue: 1000,
        productQty: 100,
        costPerUnit: 4,
      },
      {
        orderDate: new Date(Date.UTC(2026, 1, 5)),
        totalOrderValue: 500,
        productQty: 50,
        costPerUnit: 2,
      },
    ]);
    expect(byMonth[1]).toMatchObject({
      revenue: 1000,
      cost: 400,
      profit: 600,
      marginPercent: 60,
    });
    expect(byMonth[2]).toMatchObject({
      revenue: 500,
      cost: 100,
      profit: 400,
      marginPercent: 80,
    });
  });

  it('aggregates period margin across rows', () => {
    const period = periodMarginFromOrders([
      {
        orderDate: new Date(Date.UTC(2026, 0, 1)),
        totalOrderValue: 2000,
        productQty: 100,
        costPerUnit: 5,
      },
      {
        orderDate: new Date(Date.UTC(2025, 5, 1)),
        totalOrderValue: 1000,
        productQty: 10,
        costPerUnit: null,
      },
    ]);
    expect(period).toMatchObject({
      revenue: 3000,
      cost: 500,
      profit: 2500,
      marginPercent: 83.3333,
    });
  });
});
