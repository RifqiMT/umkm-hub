import {
  fullPaymentRateFromOrders,
  isOrderFullyPaid,
  orderPaidAmount,
  orderPaymentRatePercent,
  PAYMENT_EPSILON,
} from './order-payment-rate';

describe('order-payment-rate', () => {
  it('sums installments when paidAmount is omitted', () => {
    expect(
      orderPaidAmount({
        installments: [{ amount: 40 }, { amount: 60 }],
      }),
    ).toBe(100);
    expect(orderPaidAmount({ paidAmount: 55, installments: [{ amount: 1 }] })).toBe(
      55,
    );
  });

  it('treats remaining within epsilon as fully paid', () => {
    expect(
      isOrderFullyPaid({
        totalOrderValue: 100,
        paidAmount: 100 - PAYMENT_EPSILON,
      }),
    ).toBe(true);
    expect(
      isOrderFullyPaid({
        totalOrderValue: 100,
        paidAmount: 100 - PAYMENT_EPSILON * 2,
      }),
    ).toBe(false);
  });

  it('reports 100% for fully paid and scaled rates otherwise', () => {
    expect(
      orderPaymentRatePercent({ totalOrderValue: 200, paidAmount: 200 }),
    ).toBe(100);
    expect(
      orderPaymentRatePercent({ totalOrderValue: 200, paidAmount: 50 }),
    ).toBe(25);
    expect(orderPaymentRatePercent({ totalOrderValue: 0, paidAmount: 0 })).toBeNull();
  });

  it('uses amountDue for PKP payment progress', () => {
    expect(
      orderPaymentRatePercent({
        totalOrderValue: 1_000_000,
        amountDue: 1_110_000,
        paidAmount: 555_000,
      }),
    ).toBe(50);
    expect(
      isOrderFullyPaid({
        totalOrderValue: 1_000_000,
        amountDue: 1_110_000,
        paidAmount: 1_110_000,
      }),
    ).toBe(true);
    expect(
      isOrderFullyPaid({
        totalOrderValue: 1_000_000,
        amountDue: 1_110_000,
        paidAmount: 1_000_000,
      }),
    ).toBe(false);
  });

  it('aggregates full-payment rate like the Orders stage KPI', () => {
    const orders = [
      { status: 'CONFIRMED', totalOrderValue: 100, paidAmount: 100 },
      { status: 'SHIPPED', totalOrderValue: 100, paidAmount: 100 },
      { status: 'DELIVERED', totalOrderValue: 100, paidAmount: 100 },
      { status: 'PENDING', totalOrderValue: 100, paidAmount: 40 },
      { status: 'PENDING', totalOrderValue: 100, paidAmount: 0 },
      { status: 'PENDING', totalOrderValue: 100, paidAmount: 0 },
      { status: 'PENDING', totalOrderValue: 100, paidAmount: 0 },
      { status: 'PENDING', totalOrderValue: 100, paidAmount: 0 },
      { status: 'PENDING', totalOrderValue: 100, paidAmount: 0 },
      { status: 'PENDING', totalOrderValue: 100, paidAmount: 0 },
      { status: 'PENDING', totalOrderValue: 100, paidAmount: 0 },
      { status: 'PENDING', totalOrderValue: 100, paidAmount: 0 },
    ];
    // 3 of 12 active fully paid → 25% (matches stage “Paid in full”)
    expect(fullPaymentRateFromOrders(orders)).toBe(25);
  });

  it('excludes cancelled from the full-payment denominator', () => {
    expect(
      fullPaymentRateFromOrders([
        { status: 'CANCELLED', totalOrderValue: 100, paidAmount: 100 },
        { status: 'CONFIRMED', totalOrderValue: 100, paidAmount: 100 },
        { status: 'PENDING', totalOrderValue: 100, paidAmount: 0 },
      ]),
    ).toBe(50);
  });
});
