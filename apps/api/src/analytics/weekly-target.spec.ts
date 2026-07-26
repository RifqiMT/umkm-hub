import {
  buildMonthTargetMap,
  daysInUtcMonth,
  weeklyAttainmentPercent,
  weeklyTargetFromMonthly,
} from './weekly-target';

describe('weekly-target', () => {
  it('counts UTC days in month', () => {
    expect(daysInUtcMonth(2024, 2)).toBe(29);
    expect(daysInUtcMonth(2025, 2)).toBe(28);
    expect(daysInUtcMonth(2026, 1)).toBe(31);
  });

  it('returns null when no month targets exist', () => {
    const week = {
      start: new Date(Date.UTC(2026, 0, 5)), // Mon
      end: new Date(Date.UTC(2026, 0, 12)),
    };
    expect(weeklyTargetFromMonthly(week, undefined)).toBeNull();
    expect(weeklyTargetFromMonthly(week, new Map())).toBeNull();
  });

  it('splits a mid-month week as 7/days × month target', () => {
    const targets = buildMonthTargetMap([
      {
        year: 2026,
        months: Array.from({ length: 12 }, (_, i) => ({
          month: i + 1,
          amount: i === 0 ? 310_000 : 0,
        })),
      },
    ]);
    // Jan 2026 has 31 days; week Mon 5–Sun 11 is fully in January.
    const week = {
      start: new Date(Date.UTC(2026, 0, 5)),
      end: new Date(Date.UTC(2026, 0, 12)),
    };
    expect(weeklyTargetFromMonthly(week, targets)).toBe(70_000);
    expect(weeklyAttainmentPercent(35_000, 70_000)).toBe(50);
  });

  it('weights a week that spans two months', () => {
    const targets = buildMonthTargetMap([
      {
        year: 2026,
        months: Array.from({ length: 12 }, (_, i) => ({
          month: i + 1,
          amount: i === 0 ? 310 : i === 1 ? 280 : 0,
        })),
      },
    ]);
    // Mon 26 Jan 2026 – Sun 1 Feb 2026: 5 days Jan + 2 days Feb
    const week = {
      start: new Date(Date.UTC(2026, 0, 26)),
      end: new Date(Date.UTC(2026, 1, 2)),
    };
    // 5*(310/31) + 2*(280/28) = 50 + 20 = 70
    expect(weeklyTargetFromMonthly(week, targets)).toBe(70);
  });

  it('ignores months without a plan when building the map', () => {
    const map = buildMonthTargetMap([
      { year: 2026, months: [{ month: 1, amount: 100 }] },
    ]);
    expect(map.size).toBe(0);
  });
});
