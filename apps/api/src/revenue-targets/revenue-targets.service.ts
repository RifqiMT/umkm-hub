import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  RevenueTargetMode,
  RevenueTargetMonthSource,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { decimalToNumber } from '../common/utils/serialize';
import { loadOrderActuals } from '../analytics/order-actuals';
import {
  UpsertAnnualTargetDto,
  UpsertMonthlyTargetDto,
} from './dto/revenue-target.dto';
import {
  attainmentPercent,
  annualTargetFromMonthAmounts,
  distributeAnnualToMonths,
  generateSystematicMonthlyAmounts,
  projectNextAnnualAmount,
  sumAmounts,
} from './revenue-target-math';

type PlanWithMonths = Prisma.RevenueTargetPlanGetPayload<{
  include: { months: true };
}>;

@Injectable()
export class RevenueTargetsService {
  private readonly logger = new Logger(RevenueTargetsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async listYears(profileId: string) {
    const plans = await this.prisma.revenueTargetPlan.findMany({
      where: { profileId },
      orderBy: { year: 'desc' },
      select: {
        id: true,
        year: true,
        monthlyMode: true,
        annualMode: true,
        updatedAt: true,
      },
    });
    return { items: plans };
  }

  async getYear(profileId: string, year: number) {
    this.assertYear(year);
    const plan = await this.prisma.revenueTargetPlan.findUnique({
      where: { profileId_year: { profileId, year } },
      include: { months: { orderBy: { month: 'asc' } } },
    });
    if (!plan) {
      const actuals = await this.loadActuals(profileId, year);
      return {
        year,
        plan: null,
        months: [],
        monthlyConfigured: false,
        annualConfigured: false,
        annual: null,
        actuals,
      };
    }
    return this.serializePlanWithActuals(profileId, plan);
  }

  async upsertMonthly(
    profileId: string,
    year: number,
    dto: UpsertMonthlyTargetDto,
  ) {
    this.assertYear(year);
    const monthRows = this.resolveMonths(dto);

    const plan = await this.prisma.$transaction(async (tx) => {
      const saved = await this.ensurePlan(tx, profileId, year);
      const monthlySum = annualTargetFromMonthAmounts(
        monthRows.map((row) => row.amount),
      );
      // Months are source of truth — keep annual fields aligned to their sum.
      const keepYoY =
        saved.annualGrowthPercent != null &&
        Number(saved.annualGrowthPercent) !== 0;

      await tx.revenueTargetPlan.update({
        where: { id: saved.id },
        data: {
          monthlyMode: dto.monthlyMode,
          baseMonthAmount:
            dto.monthlyMode === RevenueTargetMode.SYSTEMATIC
              ? dto.baseMonthAmount!
              : null,
          monthlyGrowthPercent:
            dto.monthlyMode === RevenueTargetMode.SYSTEMATIC
              ? dto.monthlyGrowthPercent!
              : null,
          ...(keepYoY
            ? {
                annualMode: RevenueTargetMode.SYSTEMATIC,
                annualAmount: null,
                baseAnnualAmount: monthlySum,
                annualGrowthPercent: saved.annualGrowthPercent,
              }
            : {
                annualMode: RevenueTargetMode.MANUAL,
                annualAmount: monthlySum,
                baseAnnualAmount: null,
              }),
        },
      });

      await tx.revenueTargetMonth.deleteMany({ where: { planId: saved.id } });
      await tx.revenueTargetMonth.createMany({
        data: monthRows.map((row) => ({
          planId: saved.id,
          month: row.month,
          amount: row.amount,
          source: row.source,
        })),
      });

      return tx.revenueTargetPlan.findUniqueOrThrow({
        where: { id: saved.id },
        include: { months: { orderBy: { month: 'asc' } } },
      });
    });

    this.logger.log(
      `Monthly revenue targets upserted (annual synced) for ${profileId} year ${year}`,
    );
    return this.serializePlanWithActuals(profileId, plan);
  }

  async upsertAnnual(
    profileId: string,
    year: number,
    dto: UpsertAnnualTargetDto,
  ) {
    this.assertYear(year);
    const annualFields = this.resolveAnnualFields(dto);
    const annualTarget =
      annualFields.annualAmount ?? annualFields.baseAnnualAmount!;
    const monthAmounts = distributeAnnualToMonths(annualTarget);

    const plan = await this.prisma.$transaction(async (tx) => {
      const saved = await this.ensurePlan(tx, profileId, year);
      await tx.revenueTargetPlan.update({
        where: { id: saved.id },
        data: {
          annualMode: dto.annualMode,
          annualAmount: annualFields.annualAmount,
          baseAnnualAmount: annualFields.baseAnnualAmount,
          annualGrowthPercent: dto.annualGrowthPercent ?? null,
          // Even monthly breakdown from the annual target (replaces prior months).
          monthlyMode: RevenueTargetMode.MANUAL,
          baseMonthAmount: null,
          monthlyGrowthPercent: null,
        },
      });

      await tx.revenueTargetMonth.deleteMany({ where: { planId: saved.id } });
      await tx.revenueTargetMonth.createMany({
        data: monthAmounts.map((amount, index) => ({
          planId: saved.id,
          month: index + 1,
          amount,
          source: RevenueTargetMonthSource.GENERATED,
        })),
      });

      return tx.revenueTargetPlan.findUniqueOrThrow({
        where: { id: saved.id },
        include: { months: { orderBy: { month: 'asc' } } },
      });
    });

    this.logger.log(
      `Annual revenue target upserted (with monthly split) for ${profileId} year ${year}`,
    );
    return this.serializePlanWithActuals(profileId, plan);
  }

  async clearMonthly(profileId: string, year: number) {
    this.assertYear(year);
    const existing = await this.prisma.revenueTargetPlan.findUnique({
      where: { profileId_year: { profileId, year } },
      include: { months: true },
    });
    if (!existing) {
      throw new NotFoundException('Revenue target plan not found');
    }

    // Monthly and annual stay in sync — clearing months clears the whole plan.
    await this.prisma.revenueTargetPlan.delete({ where: { id: existing.id } });
    const actuals = await this.loadActuals(profileId, year);
    return {
      year,
      plan: null,
      months: [],
      monthlyConfigured: false,
      annualConfigured: false,
      annual: null,
      actuals,
    };
  }

  async clearAnnual(profileId: string, year: number) {
    this.assertYear(year);
    const existing = await this.prisma.revenueTargetPlan.findUnique({
      where: { profileId_year: { profileId, year } },
      include: { months: true },
    });
    if (!existing) {
      throw new NotFoundException('Revenue target plan not found');
    }

    // Annual owns the even monthly breakdown — clearing annual removes both.
    await this.prisma.revenueTargetPlan.delete({ where: { id: existing.id } });
    const actuals = await this.loadActuals(profileId, year);
    return {
      year,
      plan: null,
      months: [],
      monthlyConfigured: false,
      annualConfigured: false,
      annual: null,
      actuals,
    };
  }

  async remove(profileId: string, year: number) {
    this.assertYear(year);
    const existing = await this.prisma.revenueTargetPlan.findUnique({
      where: { profileId_year: { profileId, year } },
    });
    if (!existing) {
      throw new NotFoundException('Revenue target plan not found');
    }
    await this.prisma.revenueTargetPlan.delete({ where: { id: existing.id } });
    this.logger.log(`Revenue targets deleted for ${profileId} year ${year}`);
    return { ok: true };
  }

  private async ensurePlan(
    tx: Prisma.TransactionClient,
    profileId: string,
    year: number,
  ) {
    const existing = await tx.revenueTargetPlan.findUnique({
      where: { profileId_year: { profileId, year } },
    });
    if (existing) return existing;
    return tx.revenueTargetPlan.create({
      data: {
        profileId,
        year,
        monthlyMode: RevenueTargetMode.MANUAL,
        annualMode: RevenueTargetMode.MANUAL,
      },
    });
  }

  private resolveMonths(dto: UpsertMonthlyTargetDto) {
    if (dto.monthlyMode === RevenueTargetMode.SYSTEMATIC) {
      if (dto.baseMonthAmount == null || dto.monthlyGrowthPercent == null) {
        throw new BadRequestException(
          'Systematic monthly mode requires baseMonthAmount and monthlyGrowthPercent',
        );
      }
      const amounts = generateSystematicMonthlyAmounts(
        dto.baseMonthAmount,
        dto.monthlyGrowthPercent,
      );
      return amounts.map((amount, index) => ({
        month: index + 1,
        amount,
        source: RevenueTargetMonthSource.GENERATED,
      }));
    }

    if (!dto.months || dto.months.length !== 12) {
      throw new BadRequestException(
        'Manual monthly mode requires exactly 12 month amounts',
      );
    }
    const seen = new Set<number>();
    for (const row of dto.months) {
      if (seen.has(row.month)) {
        throw new BadRequestException(`Duplicate month ${row.month}`);
      }
      seen.add(row.month);
    }
    if (seen.size !== 12) {
      throw new BadRequestException('Months must cover 1 through 12');
    }
    return [...dto.months]
      .sort((a, b) => a.month - b.month)
      .map((row) => ({
        month: row.month,
        amount: row.amount,
        source: RevenueTargetMonthSource.MANUAL,
      }));
  }

  private resolveAnnualFields(dto: UpsertAnnualTargetDto) {
    if (dto.annualMode === RevenueTargetMode.MANUAL) {
      if (dto.annualAmount == null) {
        throw new BadRequestException(
          'Manual annual mode requires annualAmount',
        );
      }
      return {
        annualAmount: dto.annualAmount,
        baseAnnualAmount: null as number | null,
      };
    }

    if (dto.baseAnnualAmount == null) {
      throw new BadRequestException(
        'Systematic annual mode requires baseAnnualAmount',
      );
    }
    return {
      annualAmount: null as number | null,
      baseAnnualAmount: dto.baseAnnualAmount,
    };
  }

  private isAnnualConfigured(plan: {
    annualAmount: Prisma.Decimal | null;
    baseAnnualAmount: Prisma.Decimal | null;
  }) {
    return plan.annualAmount != null || plan.baseAnnualAmount != null;
  }

  private async serializePlanWithActuals(
    profileId: string,
    plan: PlanWithMonths,
  ) {
    const actuals = await this.loadActuals(profileId, plan.year);
    const monthlyConfigured = plan.months.length === 12;

    const months = monthlyConfigured
      ? plan.months.map((m) => {
          const target = decimalToNumber(m.amount);
          const actual = actuals.byMonth[m.month] ?? 0;
          return {
            id: m.id,
            month: m.month,
            amount: target,
            source: m.source,
            actual,
            attainmentPercent: attainmentPercent(actual, target),
          };
        })
      : [];

    const monthlySum = sumAmounts(months.map((m) => m.amount));

    let annual: {
      target: number;
      actual: number;
      attainmentPercent: number | null;
      nextYearProjected: number | null;
    } | null = null;

    // Prefer month sum whenever 12 months exist so annual never drifts.
    const annualConfigured =
      monthlyConfigured || this.isAnnualConfigured(plan);

    if (annualConfigured) {
      const storedAnnualTarget =
        plan.annualMode === RevenueTargetMode.MANUAL
          ? plan.annualAmount != null
            ? decimalToNumber(plan.annualAmount)
            : null
          : plan.baseAnnualAmount != null
            ? decimalToNumber(plan.baseAnnualAmount)
            : null;
      const annualTarget = monthlyConfigured
        ? monthlySum
        : (storedAnnualTarget ?? 0);
      const annualActual = actuals.yearTotal;
      const growth =
        plan.annualGrowthPercent != null
          ? decimalToNumber(plan.annualGrowthPercent)
          : null;
      const nextYearProjected =
        growth != null && growth !== 0
          ? projectNextAnnualAmount(annualTarget, growth)
          : null;
      annual = {
        target: annualTarget,
        actual: annualActual,
        attainmentPercent: attainmentPercent(annualActual, annualTarget),
        nextYearProjected,
      };
    }

    return {
      year: plan.year,
      plan: {
        id: plan.id,
        year: plan.year,
        monthlyMode: plan.monthlyMode,
        annualMode: plan.annualMode,
        baseMonthAmount: optionalNum(plan.baseMonthAmount),
        monthlyGrowthPercent: optionalNum(plan.monthlyGrowthPercent),
        annualAmount: monthlyConfigured
          ? monthlySum
          : optionalNum(plan.annualAmount),
        baseAnnualAmount: monthlyConfigured
          ? plan.annualMode === RevenueTargetMode.SYSTEMATIC
            ? monthlySum
            : null
          : optionalNum(plan.baseAnnualAmount),
        annualGrowthPercent: optionalNum(plan.annualGrowthPercent),
        monthlySumTarget: monthlySum,
        updatedAt: plan.updatedAt,
      },
      months,
      monthlyConfigured,
      annualConfigured,
      annual,
      actuals,
    };
  }

  private async loadActuals(profileId: string, year: number) {
    return loadOrderActuals(this.prisma, profileId, year);
  }

  private assertYear(year: number) {
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      throw new BadRequestException('Year must be between 2000 and 2100');
    }
  }
}

function optionalNum(
  value: Prisma.Decimal | number | null | undefined,
): number | null {
  if (value == null) return null;
  return decimalToNumber(value);
}
