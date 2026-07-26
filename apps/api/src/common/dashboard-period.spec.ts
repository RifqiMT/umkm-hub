import {
  dashboardPeriodRange,
  DASHBOARD_PERIODS,
} from './dashboard-period';

describe('dashboard-period', () => {
  // Local calendar Sunday 26 Jul 2026 (matches order date entry).
  const now = new Date(2026, 6, 26);

  it('lists expected presets', () => {
    expect(DASHBOARD_PERIODS).toEqual([
      'all',
      'today',
      'tomorrow',
      'this_week',
      'this_month',
      'next_month',
      'this_quarter',
      'next_quarter',
      'this_year',
    ]);
  });

  it('all has no bounds', () => {
    expect(dashboardPeriodRange('all', now)).toEqual({});
  });

  it('today and tomorrow are single days', () => {
    expect(dashboardPeriodRange('today', now)).toEqual({
      orderDateFrom: '2026-07-26',
      orderDateTo: '2026-07-26',
    });
    expect(dashboardPeriodRange('tomorrow', now)).toEqual({
      orderDateFrom: '2026-07-27',
      orderDateTo: '2026-07-27',
    });
  });

  it('this week uses ISO Mon–Sun', () => {
    expect(dashboardPeriodRange('this_week', now)).toEqual({
      orderDateFrom: '2026-07-20',
      orderDateTo: '2026-07-26',
    });
  });

  it('this / next month span calendar months', () => {
    expect(dashboardPeriodRange('this_month', now)).toEqual({
      orderDateFrom: '2026-07-01',
      orderDateTo: '2026-07-31',
    });
    expect(dashboardPeriodRange('next_month', now)).toEqual({
      orderDateFrom: '2026-08-01',
      orderDateTo: '2026-08-31',
    });
  });

  it('this / next quarter span calendar quarters', () => {
    expect(dashboardPeriodRange('this_quarter', now)).toEqual({
      orderDateFrom: '2026-07-01',
      orderDateTo: '2026-09-30',
    });
    expect(dashboardPeriodRange('next_quarter', now)).toEqual({
      orderDateFrom: '2026-10-01',
      orderDateTo: '2026-12-31',
    });
  });

  it('next quarter rolls into next year from Q4', () => {
    const late = new Date(2026, 10, 15);
    expect(dashboardPeriodRange('next_quarter', late)).toEqual({
      orderDateFrom: '2027-01-01',
      orderDateTo: '2027-03-31',
    });
  });

  it('this year is Jan–Dec', () => {
    expect(dashboardPeriodRange('this_year', now)).toEqual({
      orderDateFrom: '2026-01-01',
      orderDateTo: '2026-12-31',
    });
  });
});
