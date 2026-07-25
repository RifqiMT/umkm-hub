import { calculateOrderTotals } from '../orders/order-math';

describe('order math sanity (auth package CI hook)', () => {
  it('zero amount discount equals line total', () => {
    const result = calculateOrderTotals({
      unitPrice: 12.5,
      productQty: 4,
      discountType: 'AMOUNT',
      discountValue: 0,
    });
    expect(result.lineTotal).toBe(50);
    expect(result.totalOrderValue).toBe(50);
  });
});
