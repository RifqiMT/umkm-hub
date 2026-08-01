import {
  cancelRatePercent,
  orderDiscountAmount,
  serializeCustomerOrderTotals,
} from './customer-order-totals';

describe('customer order totals', () => {
  it('computes non-negative discount off', () => {
    expect(orderDiscountAmount(100, 90)).toBe(10);
    expect(orderDiscountAmount(100, 100)).toBe(0);
    expect(orderDiscountAmount(90, 100)).toBe(0);
  });

  it('computes cancel rate from active + cancelled', () => {
    expect(cancelRatePercent(1, 3)).toBe(25);
    expect(cancelRatePercent(0, 4)).toBe(0);
    expect(cancelRatePercent(2, 0)).toBe(100);
    expect(cancelRatePercent(0, 0)).toBeNull();
  });

  it('serializes aggregates with AOV, UPT, and cancel rate', () => {
    const row = serializeCustomerOrderTotals({
      customerId: 'cust-uuid',
      customerCode: 'BuSaR_x',
      name: 'Sari',
      title: 'Owner',
      companyName: 'Warung Sari',
      companyType: 'RESTAURANT',
      email: 'sari@example.com',
      phone: '081',
      totals: 200,
      discount: 20,
      orderTotal: 180,
      orderCount: 2,
      packsSold: 5,
      cancelledCount: 1,
    });
    expect(row.id).toBe('cust-uuid');
    expect(row.customerId).toBe('BuSaR_x');
    expect(row.totals).toBe(200);
    expect(row.discount).toBe(20);
    expect(row.orderTotal).toBe(180);
    expect(row.discountPercent).toBe(10);
    expect(row.orderCount).toBe(2);
    expect(row.packsSold).toBe(5);
    expect(row.cancelledCount).toBe(1);
    expect(row.cancelRate).toBeCloseTo(33.33, 1);
    expect(row.avgOrderValue).toBe(90);
    expect(row.unitsPerTransaction).toBe(2.5);
  });
});
