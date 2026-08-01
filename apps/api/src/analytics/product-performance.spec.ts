import { aggregateProductPerformance } from './product-performance';

describe('aggregateProductPerformance', () => {
  it('returns empty for no orders', () => {
    expect(aggregateProductPerformance([])).toEqual([]);
  });

  it('sums revenue and estimates cost from catalog unit cost', () => {
    const rows = aggregateProductPerformance([
      {
        orderId: 'o1',
        productId: 'p1',
        productName: 'Cabai',
        unit: 'GRAM',
        orderDate: new Date(Date.UTC(2026, 0, 1)),
        totalOrderValue: 2000,
        discount: 100,
        productQty: 100,
        packCount: 2,
        costPerUnit: 5,
      },
      {
        orderId: 'o2',
        productId: 'p1',
        productName: 'Cabai',
        unit: 'GRAM',
        orderDate: new Date(Date.UTC(2026, 0, 11)),
        totalOrderValue: 1000,
        discount: 50,
        productQty: 50,
        packCount: 1,
        costPerUnit: 5,
      },
      {
        orderId: 'o3',
        productId: 'p2',
        productName: 'Ayam',
        unit: 'PCS',
        orderDate: new Date(Date.UTC(2026, 0, 5)),
        totalOrderValue: 5000,
        discount: 0,
        productQty: 10,
        packCount: 10,
        costPerUnit: null,
      },
    ]);

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      productId: 'p2',
      grossRevenue: 5000,
      revenue: 5000,
      avgOrderValue: 5000,
      discount: 0,
      discountPercent: 0,
      cost: null,
      costPercent: null,
      profit: null,
      marginPercent: null,
      orderCount: 1,
      packsSold: 10,
      firstRepeatOrderDays: null,
      avgRepeatOrderDays: null,
    });
    expect(rows[1]).toMatchObject({
      productId: 'p1',
      name: 'Cabai',
      grossRevenue: 3150,
      revenue: 3000,
      avgOrderValue: 1500,
      discount: 150,
      discountPercent: 4.7619,
      qtySold: 150,
      packsSold: 3,
      orderCount: 2,
      firstRepeatOrderDays: 10,
      avgRepeatOrderDays: 10,
      cost: 750,
      costPercent: 23.8095,
      profit: 2250,
      marginPercent: 71.4286,
    });
    // Discount + COGS + margin shares of gross ≈ 100%
    expect(
      (rows[1].discountPercent ?? 0) +
        (rows[1].costPercent ?? 0) +
        (rows[1].marginPercent ?? 0),
    ).toBeCloseTo(100, 3);
  });

  it('counts distinct orders for multi-line products', () => {
    const rows = aggregateProductPerformance([
      {
        orderId: 'o1',
        productId: 'p1',
        productName: 'Cabai',
        unit: 'GRAM',
        orderDate: new Date(Date.UTC(2026, 0, 1)),
        totalOrderValue: 100,
        discount: 10,
        productQty: 10,
        packCount: 1,
        costPerUnit: null,
      },
      {
        orderId: 'o1',
        productId: 'p1',
        productName: 'Cabai',
        unit: 'GRAM',
        orderDate: new Date(Date.UTC(2026, 0, 1)),
        totalOrderValue: 50,
        discount: 5,
        productQty: 5,
        packCount: 1,
        costPerUnit: null,
      },
    ]);
    expect(rows[0].orderCount).toBe(1);
    expect(rows[0].revenue).toBe(150);
    expect(rows[0].discount).toBe(15);
    expect(rows[0].discountPercent).toBe(9.0909);
    expect(rows[0].qtySold).toBe(15);
    expect(rows[0].packsSold).toBe(2);
    expect(rows[0].firstRepeatOrderDays).toBeNull();
    expect(rows[0].avgRepeatOrderDays).toBeNull();
  });
});
