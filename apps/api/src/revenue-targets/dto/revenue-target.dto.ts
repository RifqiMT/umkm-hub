import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { RevenueTargetMode } from '@prisma/client';

export class MonthAmountDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  amount!: number;
}

/** Upsert monthly targets and sync annual target to the month sum. */
export class UpsertMonthlyTargetDto {
  @IsEnum(RevenueTargetMode)
  monthlyMode!: RevenueTargetMode;

  @ValidateIf(
    (o: UpsertMonthlyTargetDto) => o.monthlyMode === RevenueTargetMode.SYSTEMATIC,
  )
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  baseMonthAmount?: number;

  @ValidateIf(
    (o: UpsertMonthlyTargetDto) => o.monthlyMode === RevenueTargetMode.SYSTEMATIC,
  )
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  monthlyGrowthPercent?: number;

  @ValidateIf(
    (o: UpsertMonthlyTargetDto) => o.monthlyMode === RevenueTargetMode.MANUAL,
  )
  @IsArray()
  @ArrayMinSize(12)
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => MonthAmountDto)
  months?: MonthAmountDto[];
}

/** Upsert annual target and redistribute an even 12-month breakdown. */
export class UpsertAnnualTargetDto {
  @IsEnum(RevenueTargetMode)
  annualMode!: RevenueTargetMode;

  @ValidateIf(
    (o: UpsertAnnualTargetDto) => o.annualMode === RevenueTargetMode.MANUAL,
  )
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  annualAmount?: number;

  @ValidateIf(
    (o: UpsertAnnualTargetDto) => o.annualMode === RevenueTargetMode.SYSTEMATIC,
  )
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  baseAnnualAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  annualGrowthPercent?: number;
}
