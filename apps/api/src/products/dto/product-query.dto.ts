import {
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ProductUnit } from '@prisma/client';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

function toStringList(value: unknown): string[] {
  if (value == null || value === '') return [];
  const raw = Array.isArray(value) ? value : String(value).split(',');
  return raw.map((part) => String(part).trim()).filter(Boolean);
}

function toUnitList(value: unknown): ProductUnit[] {
  const allowed = new Set(Object.values(ProductUnit));
  return toStringList(value)
    .map((part) => part.toUpperCase())
    .filter((part): part is ProductUnit => allowed.has(part as ProductUnit));
}

function toCostSetList(value: unknown): Array<'set' | 'unset'> {
  const allowed = new Set(['set', 'unset']);
  return toStringList(value)
    .map((part) => part.toLowerCase())
    .filter((part): part is 'set' | 'unset' => allowed.has(part));
}

function toPackReadyList(value: unknown): Array<'ready' | 'not_ready'> {
  const allowed = new Set(['ready', 'not_ready']);
  return toStringList(value)
    .map((part) => part.toLowerCase())
    .filter((part): part is 'ready' | 'not_ready' => allowed.has(part));
}

function toStockStatusList(
  value: unknown,
): Array<'in_stock' | 'out_of_stock'> {
  const allowed = new Set(['in_stock', 'out_of_stock']);
  return toStringList(value)
    .map((part) => part.toLowerCase())
    .filter((part): part is 'in_stock' | 'out_of_stock' => allowed.has(part));
}

/** Shared list + summary filters for catalog products. */
export class ProductQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  declare search?: string;

  @IsOptional()
  @Transform(({ value }) => toUnitList(value))
  @IsEnum(ProductUnit, { each: true })
  unit?: ProductUnit[];

  @IsOptional()
  @Transform(({ value }) => toCostSetList(value))
  @IsIn(['set', 'unset'], { each: true })
  costSet?: Array<'set' | 'unset'>;

  @IsOptional()
  @Transform(({ value }) => toPackReadyList(value))
  @IsIn(['ready', 'not_ready'], { each: true })
  packReady?: Array<'ready' | 'not_ready'>;

  @IsOptional()
  @Transform(({ value }) => toStockStatusList(value))
  @IsIn(['in_stock', 'out_of_stock'], { each: true })
  stockStatus?: Array<'in_stock' | 'out_of_stock'>;
}

export class ProductSummaryQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(({ value }) => toUnitList(value))
  @IsEnum(ProductUnit, { each: true })
  unit?: ProductUnit[];

  @IsOptional()
  @Transform(({ value }) => toCostSetList(value))
  @IsIn(['set', 'unset'], { each: true })
  costSet?: Array<'set' | 'unset'>;

  @IsOptional()
  @Transform(({ value }) => toPackReadyList(value))
  @IsIn(['ready', 'not_ready'], { each: true })
  packReady?: Array<'ready' | 'not_ready'>;

  @IsOptional()
  @Transform(({ value }) => toStockStatusList(value))
  @IsIn(['in_stock', 'out_of_stock'], { each: true })
  stockStatus?: Array<'in_stock' | 'out_of_stock'>;
}
