import {
  defaultAnalyticsOverviewOptions,
  parseAnalyticsGranularity,
  parseAnalyticsInclude,
  parseAnalyticsOverviewOptions,
  wantsSeriesGranularity,
} from './analytics-query';

describe('analytics-query', () => {
  it('defaults include to all parts', () => {
    expect([...parseAnalyticsInclude()]).toEqual([
      'summary',
      'series',
      'products',
      'customers',
    ]);
  });

  it('parses include subsets', () => {
    expect([...parseAnalyticsInclude('summary,series')].sort()).toEqual([
      'series',
      'summary',
    ]);
  });

  it('rejects invalid include', () => {
    expect(() => parseAnalyticsInclude('summary,foo')).toThrow(/Invalid include/);
  });

  it('defaults granularity to all', () => {
    expect(parseAnalyticsGranularity()).toBe('all');
    expect(parseAnalyticsGranularity('ALL')).toBe('all');
  });

  it('parses granularity', () => {
    expect(parseAnalyticsGranularity('monthly')).toBe('monthly');
  });

  it('rejects invalid granularity', () => {
    expect(() => parseAnalyticsGranularity('day')).toThrow(/Invalid granularity/);
  });

  it('wantsSeriesGranularity respects include and filter', () => {
    const monthlyOnly = parseAnalyticsOverviewOptions('series', 'monthly');
    expect(wantsSeriesGranularity(monthlyOnly, 'monthly')).toBe(true);
    expect(wantsSeriesGranularity(monthlyOnly, 'weekly')).toBe(false);

    const tablesOnly = parseAnalyticsOverviewOptions('products,customers');
    expect(wantsSeriesGranularity(tablesOnly, 'monthly')).toBe(false);

    const full = defaultAnalyticsOverviewOptions();
    expect(wantsSeriesGranularity(full, 'annual')).toBe(true);
  });
});
