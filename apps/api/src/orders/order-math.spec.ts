import {
  allocateLineRevenue,
  calculateMultiLineOrderTotals,
  calculateOrderTotals,
} from './order-math';

describe('calculateOrderTotals', () => {
  it('computes line total and percentage discount', () => {
    const result = calculateOrderTotals({
      unitPrice: 100,
      productQty: 2,
      discountType: 'PERCENTAGE',
      discountValue: 10,
    });
    expect(result.lineTotal).toBe(200);
    expect(result.totalOrderValue).toBe(180);
  });

  it('computes amount discount', () => {
    const result = calculateOrderTotals({
      unitPrice: 50,
      productQty: 3,
      discountType: 'AMOUNT',
      discountValue: 25,
    });
    expect(result.lineTotal).toBe(150);
    expect(result.totalOrderValue).toBe(125);
  });

  it('rejects percentage over 100', () => {
    expect(() =>
      calculateOrderTotals({
        unitPrice: 10,
        productQty: 1,
        discountType: 'PERCENTAGE',
        discountValue: 101,
      }),
    ).toThrow('Percentage discount cannot exceed 100');
  });

  it('rejects amount greater than line total', () => {
    expect(() =>
      calculateOrderTotals({
        unitPrice: 10,
        productQty: 1,
        discountType: 'AMOUNT',
        discountValue: 20,
      }),
    ).toThrow('Discount amount cannot exceed line total');
  });

  it('rejects negative inputs', () => {
    expect(() =>
      calculateOrderTotals({
        unitPrice: -1,
        productQty: 1,
        discountType: 'AMOUNT',
        discountValue: 0,
      }),
    ).toThrow();
  });
});

describe('calculateMultiLineOrderTotals', () => {
  it('sums lines then applies order discount', () => {
    const result = calculateMultiLineOrderTotals({
      lines: [
        { unitPrice: 100, productQty: 2 },
        { unitPrice: 50, productQty: 1 },
      ],
      discountType: 'AMOUNT',
      discountValue: 25,
    });
    expect(result.lineTotal).toBe(250);
    expect(result.totalOrderValue).toBe(225);
  });

  it('rejects empty lines', () => {
    expect(() =>
      calculateMultiLineOrderTotals({
        lines: [],
        discountType: 'AMOUNT',
        discountValue: 0,
      }),
    ).toThrow('Order requires at least one line');
  });
});

describe('allocateLineRevenue', () => {
  it('allocates discount proportionally and preserves total', () => {
    const allocated = allocateLineRevenue([200, 50], 225);
    expect(allocated.reduce((a, b) => a + b, 0)).toBe(225);
    expect(allocated[0]).toBe(180);
    expect(allocated[1]).toBe(45);
  });
});
