import { aggregateCustomerPerformance } from './customer-performance';

describe('aggregateCustomerPerformance', () => {
  it('returns empty for no orders', () => {
    expect(aggregateCustomerPerformance([])).toEqual([]);
  });

  it('sums revenue, discount, and cost per customer', () => {
    const rows = aggregateCustomerPerformance([
      {
        orderId: 'o1',
        customerId: 'c1',
        customerName: 'Budi',
        companyName: 'Warung Budi',
        companyType: 'RESTAURANT',
        orderDate: new Date(Date.UTC(2026, 0, 1)),
        revenue: 1900,
        discount: 100,
        cost: 800,
        packsSold: 4,
      },
      {
        orderId: 'o2',
        customerId: 'c1',
        customerName: 'Budi',
        companyName: 'Warung Budi',
        companyType: 'RESTAURANT',
        orderDate: new Date(Date.UTC(2026, 0, 16)),
        revenue: 950,
        discount: 50,
        cost: 400,
        packsSold: 2,
      },
      {
        orderId: 'o3',
        customerId: 'c2',
        customerName: 'Siti',
        companyName: 'Hotel Siti',
        companyType: 'HOTEL',
        orderDate: new Date(Date.UTC(2026, 0, 5)),
        revenue: 5000,
        discount: 0,
        cost: null,
        packsSold: 12,
      },
    ]);

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      customerId: 'c2',
      revenue: 5000,
      avgOrderValue: 5000,
      discount: 0,
      cost: null,
      profit: null,
      orderCount: 1,
      packsSold: 12,
      firstRepeatOrderDays: null,
      avgRepeatOrderDays: null,
    });
    expect(rows[1]).toMatchObject({
      customerId: 'c1',
      name: 'Budi',
      companyName: 'Warung Budi',
      revenue: 2850,
      avgOrderValue: 1425,
      discount: 150,
      discountPercent: 5,
      orderCount: 2,
      packsSold: 6,
      firstRepeatOrderDays: 15,
      avgRepeatOrderDays: 15,
      cost: 1200,
      profit: 1650,
    });
    expect(
      (rows[1].discountPercent ?? 0) +
        (rows[1].costPercent ?? 0) +
        (rows[1].marginPercent ?? 0),
    ).toBeCloseTo(100, 3);
  });
});
