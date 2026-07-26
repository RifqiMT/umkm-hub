import {
  averagePurchaseFrequency,
  bucketAvgPurchaseFrequencyByMonth,
  periodAvgPurchaseFrequencyFromOrders,
} from './purchase-frequency-series';

describe('purchase-frequency-series', () => {
  it('averagePurchaseFrequency returns null without customers', () => {
    expect(averagePurchaseFrequency(10, 0)).toBeNull();
  });

  it('averagePurchaseFrequency divides orders by unique customers', () => {
    expect(averagePurchaseFrequency(10, 4)).toBe(2.5);
  });

  it('buckets monthly averages by UTC order month', () => {
    const monthly = bucketAvgPurchaseFrequencyByMonth([
      { orderDate: new Date(Date.UTC(2026, 0, 5)), customerId: 'a' },
      { orderDate: new Date(Date.UTC(2026, 0, 20)), customerId: 'a' },
      { orderDate: new Date(Date.UTC(2026, 0, 22)), customerId: 'b' },
      { orderDate: new Date(Date.UTC(2026, 1, 1)), customerId: 'c' },
    ]);
    expect(monthly[1]).toBe(1.5); // 3 orders / 2 customers
    expect(monthly[2]).toBe(1);
    expect(monthly[3]).toBeNull();
  });

  it('periodAvgPurchaseFrequencyFromOrders averages across the period', () => {
    const period = periodAvgPurchaseFrequencyFromOrders([
      { orderDate: new Date(Date.UTC(2026, 0, 1)), customerId: 'a' },
      { orderDate: new Date(Date.UTC(2026, 0, 2)), customerId: 'a' },
      { orderDate: new Date(Date.UTC(2026, 0, 3)), customerId: 'b' },
    ]);
    expect(period).toEqual({
      orderCount: 3,
      customerCount: 2,
      avgPurchaseFrequency: 1.5,
    });
  });
});
