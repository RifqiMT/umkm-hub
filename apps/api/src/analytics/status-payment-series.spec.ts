import { OrderStatus, PaymentStatus } from '@prisma/client';
import {
  attachMixSharesToPoints,
  emptyMixShares,
  periodMixShares,
} from './status-payment-series';

describe('status-payment-series', () => {
  it('emptyMixShares is all zeros', () => {
    expect(emptyMixShares()).toEqual({
      statusShares: {
        PENDING: 0,
        CONFIRMED: 0,
        SHIPPED: 0,
        DELIVERED: 0,
        CANCELLED: 0,
      },
      statusOrderCount: 0,
      paymentShares: {
        CASH: 0,
        CONSIGNMENT: 0,
        DELAYED_PAYMENT: 0,
        KONTRA_BON: 0,
      },
      paymentOrderCount: 0,
    });
  });

  it('periodMixShares includes cancelled in status but not payment', () => {
    const mix = periodMixShares([
      {
        orderDate: new Date(Date.UTC(2026, 0, 1)),
        status: OrderStatus.DELIVERED,
        paymentStatus: PaymentStatus.CASH,
      },
      {
        orderDate: new Date(Date.UTC(2026, 0, 2)),
        status: OrderStatus.CANCELLED,
        paymentStatus: PaymentStatus.CASH,
      },
      {
        orderDate: new Date(Date.UTC(2026, 0, 3)),
        status: OrderStatus.SHIPPED,
        paymentStatus: PaymentStatus.CONSIGNMENT,
      },
      {
        orderDate: new Date(Date.UTC(2026, 0, 4)),
        status: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.DELAYED_PAYMENT,
      },
    ]);

    expect(mix.statusOrderCount).toBe(4);
    expect(mix.statusShares.DELIVERED).toBe(25);
    expect(mix.statusShares.CANCELLED).toBe(25);
    expect(mix.statusShares.SHIPPED).toBe(25);
    expect(mix.statusShares.PENDING).toBe(25);

    expect(mix.paymentOrderCount).toBe(3);
    expect(mix.paymentShares.CASH).toBeCloseTo(33.33, 1);
    expect(mix.paymentShares.CONSIGNMENT).toBeCloseTo(33.33, 1);
    expect(mix.paymentShares.DELAYED_PAYMENT).toBeCloseTo(33.33, 1);
  });

  it('attachMixSharesToPoints buckets by period key', () => {
    const points = attachMixSharesToPoints(
      [{ key: '2026-01' }, { key: '2026-02' }],
      [
        {
          orderDate: new Date(Date.UTC(2026, 0, 10)),
          status: OrderStatus.DELIVERED,
          paymentStatus: PaymentStatus.CASH,
        },
        {
          orderDate: new Date(Date.UTC(2026, 0, 15)),
          status: OrderStatus.CANCELLED,
          paymentStatus: PaymentStatus.CONSIGNMENT,
        },
        {
          orderDate: new Date(Date.UTC(2026, 1, 1)),
          status: OrderStatus.CONFIRMED,
          paymentStatus: PaymentStatus.DELAYED_PAYMENT,
        },
      ],
      (d) =>
        `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`,
      (p) => p.key,
    );

    expect(points[0]!.statusOrderCount).toBe(2);
    expect(points[0]!.statusShares.DELIVERED).toBe(50);
    expect(points[0]!.statusShares.CANCELLED).toBe(50);
    expect(points[0]!.paymentOrderCount).toBe(1);
    expect(points[0]!.paymentShares.CASH).toBe(100);

    expect(points[1]!.statusOrderCount).toBe(1);
    expect(points[1]!.statusShares.CONFIRMED).toBe(100);
    expect(points[1]!.paymentShares.DELAYED_PAYMENT).toBe(100);
  });
});
