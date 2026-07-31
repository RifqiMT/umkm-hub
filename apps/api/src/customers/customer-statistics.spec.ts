import {
  buildCustomerStatistics,
  normalizeEnumBuckets,
  normalizeGeoBuckets,
} from './customer-statistics';

describe('customer-statistics', () => {
  it('normalizes enum buckets with unset', () => {
    expect(
      normalizeEnumBuckets(['A', 'B', 'UNSET'], [
        { key: 'A', count: 2 },
        { key: '', count: 1 },
      ]),
    ).toEqual([
      { key: 'A', count: 2 },
      { key: 'B', count: 0 },
      { key: 'UNSET', count: 1 },
    ]);
  });

  it('normalizes geo buckets with empty and other', () => {
    const rows = [
      { key: '', count: 1 },
      { key: 'Jakarta', count: 5 },
      { key: 'Bandung', count: 3 },
    ];
    expect(normalizeGeoBuckets(rows, 9)).toEqual([
      { key: 'EMPTY', count: 1 },
      { key: 'Jakarta', count: 5 },
      { key: 'Bandung', count: 3 },
    ]);
  });

  it('builds statistics with rates', () => {
    const stats = buildCustomerStatistics({
      customerCount: 4,
      companyType: [{ key: 'RESTAURANT', count: 3 }],
      partnershipStage: [{ key: 'UNSET', count: 4 }],
      status: [{ key: 'INTERESTED', count: 2 }],
      relationshipLevel: [{ key: 'UNSET', count: 4 }],
      customerNeeds: { withCount: 3, withoutCount: 1 },
      desiredStandards: { withCount: 1, withoutCount: 3 },
      remarks: { withCount: 0, withoutCount: 4 },
      customerPromise: {
        withCount: 2,
        withoutCount: 2,
        annualBonus: 1,
        onTimeDelivery: 2,
        packagingBox: 0,
      },
      city: [{ key: 'Jakarta', count: 4 }],
      province: [{ key: '', count: 4 }],
      country: [{ key: 'Indonesia', count: 4 }],
    });

    expect(stats.companyType[0]).toEqual({
      key: 'RESTAURANT',
      count: 3,
      rate: 75,
    });
    expect(stats.customerNeeds.withRate).toBe(75);
    expect(stats.customerPromise.onTimeDeliveryRate).toBe(50);
    expect(stats.city[0]).toEqual({ key: 'Jakarta', count: 4, rate: 100 });
    expect(stats.province[0]).toEqual({ key: 'EMPTY', count: 4, rate: 100 });
  });
});
