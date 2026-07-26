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

  it('averages shipment, invoice, and payment days by order month', () => {
    const byMonth = bucketDurationsByMonth([
      {
        orderDate: new Date(Date.UTC(2026, 0, 1)),
        shipmentDate: new Date(Date.UTC(2026, 0, 5)),
        invoiceDate: new Date(Date.UTC(2026, 0, 3)),
        firstPaymentDate: new Date(Date.UTC(2026, 0, 8)),
        lastPaymentDate: new Date(Date.UTC(2026, 0, 15)),
      },
      {
        orderDate: new Date(Date.UTC(2026, 0, 10)),
        shipmentDate: new Date(Date.UTC(2026, 0, 20)),
        invoiceDate: new Date(Date.UTC(2026, 0, 12)),
        firstPaymentDate: null,
        lastPaymentDate: null,
      },
      {
        orderDate: new Date(Date.UTC(2026, 1, 1)),
        shipmentDate: null,
        invoiceDate: null,
        firstPaymentDate: new Date(Date.UTC(2026, 1, 6)),
        lastPaymentDate: new Date(Date.UTC(2026, 1, 11)),
      },
    ]);

    expect(byMonth[1]).toMatchObject({
      avgShipmentDays: 7,
      shipmentSampleSize: 2,
      avgInvoiceDays: 2,
      invoiceSampleSize: 2,
      avgFirstPaymentDays: 7,
      firstPaymentSampleSize: 1,
      avgPaymentDays: 14,
      paymentSampleSize: 1,
    });
    expect(byMonth[2]).toMatchObject({
      avgShipmentDays: null,
      shipmentSampleSize: 0,
      avgInvoiceDays: null,
      invoiceSampleSize: 0,
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
        invoiceDate: new Date(Date.UTC(2026, 0, 2)),
        firstPaymentDate: new Date(Date.UTC(2026, 0, 11)),
        lastPaymentDate: new Date(Date.UTC(2026, 0, 31)),
      },
      {
        orderDate: new Date(Date.UTC(2025, 5, 1)),
        shipmentDate: new Date(Date.UTC(2025, 5, 3)),
        invoiceDate: new Date(Date.UTC(2025, 5, 4)),
        firstPaymentDate: new Date(Date.UTC(2025, 5, 5)),
        lastPaymentDate: new Date(Date.UTC(2025, 5, 11)),
      },
    ]);
    expect(period.avgShipmentDays).toBe(2.5);
    expect(period.avgInvoiceDays).toBe(2);
    expect(period.avgFirstPaymentDays).toBe(7);
    expect(period.avgPaymentDays).toBe(20);
  });

  it('averageOrderValue is null without orders', () => {
    expect(averageOrderValue(100, 0)).toBeNull();
    expect(averageOrderValue(100, 2)).toBe(50);
  });
});
