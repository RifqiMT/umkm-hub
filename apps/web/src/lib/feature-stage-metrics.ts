import type { AnalyticsOverview, RevenueTargetYear } from '@/lib/types';

function roundRate(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function ratePercent(
  numerator: number,
  denominator: number,
): number | null {
  if (!(denominator > 0) || !Number.isFinite(numerator)) return null;
  return roundRate((numerator / denominator) * 100);
}

/** Elapsed calendar months for pace (1–12). Future years → 0; past → 12. */
function elapsedMonthsForYear(
  year: number,
  now = new Date(),
): number {
  const currentYear = now.getUTCFullYear();
  if (year > currentYear) return 0;
  if (year < currentYear) return 12;
  return Math.min(12, Math.max(1, now.getUTCMonth() + 1));
}

export type TargetsStageMetrics = {
  annualTarget: number;
  annualActual: number;
  nextYearProjected: number | null;
  attainmentRate: number | null;
  monthsOnPlanRate: number | null;
  paceRate: number | null;
  monthCoverageRate: number | null;
};

export function buildTargetsStageMetrics(
  data: RevenueTargetYear | null,
  now = new Date(),
): TargetsStageMetrics | null {
  if (!data) return null;
  const year = data.year;
  const annualTarget = data.annual?.target ?? 0;
  const annualActual = data.annual?.actual ?? data.actuals.yearTotal ?? 0;
  const months = data.months ?? [];

  const targeted = months.filter((m) => m.amount > 0);
  const onPlan = targeted.filter(
    (m) => m.attainmentPercent != null && m.attainmentPercent >= 100,
  );

  const elapsed = elapsedMonthsForYear(year, now);
  let pacedTarget = 0;
  for (const m of months) {
    if (m.month <= elapsed) pacedTarget += Math.max(0, m.amount);
  }
  const ytdActual =
    elapsed >= 12
      ? annualActual
      : months
          .filter((m) => m.month <= elapsed)
          .reduce((sum, m) => sum + Math.max(0, m.actual), 0);

  return {
    annualTarget,
    annualActual,
    nextYearProjected: data.annual?.nextYearProjected ?? null,
    attainmentRate: data.annual?.attainmentPercent ?? null,
    monthsOnPlanRate: ratePercent(onPlan.length, targeted.length),
    paceRate: ratePercent(ytdActual, pacedTarget),
    monthCoverageRate: ratePercent(targeted.length, 12),
  };
}

export type AnalyticsStageMetrics = {
  revenue: number;
  target: number | null;
  profit: number | null;
  attainmentRate: number | null;
  marginRate: number | null;
  yoyGrowthRate: number | null;
  paceRate: number | null;
};

export function buildAnalyticsStageMetrics(
  data: AnalyticsOverview | null,
  now = new Date(),
): AnalyticsStageMetrics | null {
  if (!data) return null;
  const summary = data.summary;
  const year = data.year;

  if (year == null || data.scope === 'all' || data.scope === 'years') {
    const focus = data.years?.length
      ? [...data.years].sort((a, b) => a - b)
      : [...data.annual].map((r) => r.year).sort((a, b) => a - b);
    const latestYear = focus[focus.length - 1];
    const latest = latestYear != null
      ? data.annual.find((r) => r.year === latestYear)
      : undefined;
    const prior =
      latestYear != null
        ? data.annual.find((r) => r.year === latestYear - 1)
        : undefined;
    const yoyGrowthRate =
      latest && prior && prior.revenue > 0
        ? roundRate(((latest.revenue - prior.revenue) / prior.revenue) * 100)
        : null;
    return {
      revenue: summary.revenue,
      target: data.scope === 'years' ? summary.target : null,
      profit: summary.profit,
      attainmentRate: data.scope === 'years' ? summary.attainmentPercent : null,
      marginRate: summary.marginPercent,
      yoyGrowthRate,
      paceRate: null,
    };
  }

  const elapsed = elapsedMonthsForYear(year, now);

  let pacedTarget = 0;
  let ytdRevenue = 0;
  for (const m of data.monthly) {
    if (m.year != null && m.year !== year) continue;
    if (m.month > elapsed) continue;
    ytdRevenue += Math.max(0, m.revenue);
    if (m.target != null) pacedTarget += Math.max(0, m.target);
  }

  const prior = data.annual.find((row) => row.year === year - 1);
  const yoyGrowthRate =
    prior && prior.revenue > 0
      ? roundRate(((summary.revenue - prior.revenue) / prior.revenue) * 100)
      : null;

  return {
    revenue: summary.revenue,
    target: summary.target,
    profit: summary.profit,
    attainmentRate: summary.attainmentPercent,
    marginRate: summary.marginPercent,
    yoyGrowthRate,
    paceRate: ratePercent(ytdRevenue, pacedTarget),
  };
}
