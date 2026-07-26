import {
  buildQuarterlySeries,
  calendarQuarterKeyFromDate,
  quarterlyTargetFromMonthly,
} from './quarter-series';
import { buildMonthTargetMap } from './weekly-target';

describe('calendarQuarterKeyFromDate', () => {
  it('maps UTC months to Q1–Q4', () => {
    expect(calendarQuarterKeyFromDate(new Date(Date.UTC(2026, 0, 15)))).toBe(
      '2026-Q1',
    );
    expect(calendarQuarterKeyFromDate(new Date(Date.UTC(2026, 3, 1)))).toBe(
      '2026-Q2',
    );
    expect(calendarQuarterKeyFromDate(new Date(Date.UTC(2026, 8, 30)))).toBe(
      '2026-Q3',
    );
    expect(calendarQuarterKeyFromDate(new Date(Date.UTC(2026, 11, 31)))).toBe(
      '2026-Q4',
    );
  });
});

describe('quarterlyTargetFromMonthly', () => {
  it('sums the three months in the quarter', () => {
    const map = buildMonthTargetMap([
      {
        year: 2026,
        months: Array.from({ length: 12 }, (_, i) => ({
          month: i + 1,
          amount: (i + 1) * 1000,
        })),
      },
    ]);
    // Q1 = Jan+Feb+Mar = 1000+2000+3000
    expect(quarterlyTargetFromMonthly(2026, 1, map)).toBe(6000);
    // Q4 = Oct+Nov+Dec = 10000+11000+12000
    expect(quarterlyTargetFromMonthly(2026, 4, map)).toBe(33000);
  });

  it('returns null when no month targets exist', () => {
    expect(quarterlyTargetFromMonthly(2026, 1, new Map())).toBeNull();
  });
});

describe('buildQuarterlySeries', () => {
  it('aggregates revenue and order counts per quarter', () => {
    const points = buildQuarterlySeries({
      quarters: [
        { year: 2026, quarter: 1, label: 'Q1' },
        { year: 2026, quarter: 2, label: 'Q2' },
      ],
      orderValues: [
        {
          orderDate: new Date(Date.UTC(2026, 0, 10)),
          totalOrderValue: 1000,
        },
        {
          orderDate: new Date(Date.UTC(2026, 2, 20)),
          totalOrderValue: 500,
        },
        {
          orderDate: new Date(Date.UTC(2026, 4, 5)),
          totalOrderValue: 2000,
        },
      ],
      marginRows: [],
      durationRows: [],
      ltvRows: [],
      productRevenueRows: [],
      basketRows: [],
      frequencyRows: [],
    });

    expect(points).toHaveLength(2);
    expect(points[0]).toMatchObject({
      year: 2026,
      quarter: 1,
      label: 'Q1',
      revenue: 1500,
      orderCount: 2,
      avgOrderValue: 750,
    });
    expect(points[1]).toMatchObject({
      quarter: 2,
      revenue: 2000,
      orderCount: 1,
    });
  });
});
