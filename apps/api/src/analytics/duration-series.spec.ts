import {
  averageOrderValue,
  bucketDurationsByMonth,
  periodDurationsFromOrders,
  utcDayDiff,
} from './duration-series';

describe('duration-series', () => {
  it('computes UTC day difference', () => {
    expect(
      utcDayDiff(
        new Date(Date.UTC(2026, 0, 1)),
        new Date(Date.UTC(2026, 0, 8)),
      ),
    ).toBe(7);
    expect(
      utcDayDiff(
        new Date(Date.UTC(2026, 0, 10)),
        new Date(Date.UTC(2026, 0, 5)),
      ),
    ).toBe(-5);
  });

  it('averages shipment and payment days by order month', () => {
    const byMonth = bucketDurationsByMonth([
      {
        orderDate: new Date(Date.UTC(2026, 0, 1)),
        shipmentDate: new Date(Date.UTC(2026, 0, 5)),
        firstPaymentDate: new Date(Date.UTC(2026, 0, 8)),
        lastPaymentDate: new Date(Date.UTC(2026, 0, 15)),
      },
      {
        orderDate: new Date(Date.UTC(2026, 0, 10)),
        shipmentDate: new Date(Date.UTC(2026, 0, 20)),
        firstPaymentDate: null,
        lastPaymentDate: null,
      },
      {
        orderDate: new Date(Date.UTC(2026, 1, 1)),
        shipmentDate: null,
        firstPaymentDate: new Date(Date.UTC(2026, 1, 6)),
        lastPaymentDate: new Date(Date.UTC(2026, 1, 11)),
      },
    ]);

    expect(byMonth[1]).toMatchObject({
      avgShipmentDays: 7,
      shipmentSampleSize: 2,
      avgFirstPaymentDays: 7,
      firstPaymentSampleSize: 1,
      avgPaymentDays: 14,
      paymentSampleSize: 1,
    });
    expect(byMonth[2]).toMatchObject({
      avgShipmentDays: null,
      shipmentSampleSize: 0,
      avgFirstPaymentDays: 5,
      firstPaymentSampleSize: 1,
      avgPaymentDays: 10,
      paymentSampleSize: 1,
    });
  });

  it('aggregates period durations', () => {
    const period = periodDurationsFromOrders([
      {
        orderDate: new Date(Date.UTC(2026, 0, 1)),
        shipmentDate: new Date(Date.UTC(2026, 0, 4)),
        firstPaymentDate: new Date(Date.UTC(2026, 0, 11)),
        lastPaymentDate: new Date(Date.UTC(2026, 0, 31)),
      },
      {
        orderDate: new Date(Date.UTC(2025, 5, 1)),
        shipmentDate: new Date(Date.UTC(2025, 5, 3)),
        firstPaymentDate: new Date(Date.UTC(2025, 5, 5)),
        lastPaymentDate: new Date(Date.UTC(2025, 5, 11)),
      },
    ]);
    expect(period.avgShipmentDays).toBe(2.5);
    expect(period.avgFirstPaymentDays).toBe(7);
    expect(period.avgPaymentDays).toBe(20);
    expect(period.shipmentSampleSize).toBe(2);
    expect(period.firstPaymentSampleSize).toBe(2);
    expect(period.paymentSampleSize).toBe(2);
  });

  it('computes average order value', () => {
    expect(averageOrderValue(100_000, 4)).toBe(25_000);
    expect(averageOrderValue(0, 0)).toBeNull();
  });
});
