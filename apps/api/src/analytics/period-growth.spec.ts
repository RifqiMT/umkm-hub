import {
  attachPeriodGrowthLabels,
  formatPeriodGrowth,
  periodGrowthValue,
} from './period-growth';

describe('period-growth', () => {
  it('computes relative percent growth', () => {
    expect(periodGrowthValue(120, 100, 'pct')).toBe(20);
    expect(periodGrowthValue(80, 100, 'pct')).toBe(-20);
    expect(periodGrowthValue(50, 0, 'pct')).toBeNull();
    expect(periodGrowthValue(50, null, 'pct')).toBeNull();
  });

  it('computes basis-point change for rate series', () => {
    expect(periodGrowthValue(47, 45, 'bps')).toBe(200);
    expect(periodGrowthValue(40, 45, 'bps')).toBe(-500);
  });

  it('formats growth labels with sign', () => {
    expect(formatPeriodGrowth(12.5, 'pct')).toBe('+12.5%');
    expect(formatPeriodGrowth(-3, 'pct')).toBe('-3%');
    expect(formatPeriodGrowth(200, 'bps')).toBe('+200 bps');
    expect(formatPeriodGrowth(-50.4, 'bps')).toBe('-50 bps');
    expect(formatPeriodGrowth(null, 'pct')).toBeNull();
  });

  it('attaches growth labels vs prior period', () => {
    const rows = attachPeriodGrowthLabels(
      [
        { key: 'W1', revenue: 100, margin: 40 },
        { key: 'W2', revenue: 120, margin: 42 },
      ],
      [
        { key: 'revenue', mode: 'pct' },
        { key: 'margin', mode: 'bps' },
      ],
    );
    expect(rows[0]!.growthLabels).toEqual({});
    expect(rows[1]!.growthLabels.revenue).toBe('+20%');
    expect(rows[1]!.growthLabels.margin).toBe('+200 bps');
  });
});
