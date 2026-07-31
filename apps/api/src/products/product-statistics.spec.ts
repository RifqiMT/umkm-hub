import { buildProductStatistics } from './product-statistics';

describe('product-statistics', () => {
  it('builds product statistics with rates', () => {
    const stats = buildProductStatistics({
      productCount: 10,
      unit: [
        { key: 'PCS', count: 6 },
        { key: 'GRAM', count: 4 },
      ],
      stockStatus: [
        { key: 'in_stock', count: 7 },
        { key: 'out_of_stock', count: 3 },
      ],
      costSet: [
        { key: 'set', count: 8 },
        { key: 'unset', count: 2 },
      ],
      packReady: [
        { key: 'ready', count: 5 },
        { key: 'not_ready', count: 5 },
      ],
      details: { withCount: 4, withoutCount: 6 },
    });

    expect(stats.unit[0]).toEqual({ key: 'PCS', count: 6, rate: 60 });
    expect(stats.details.withRate).toBe(40);
    expect(stats.stockStatus[1]).toEqual({
      key: 'out_of_stock',
      count: 3,
      rate: 30,
    });
  });
});
