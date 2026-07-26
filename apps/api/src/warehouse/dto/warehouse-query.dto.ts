import { IsEnum, IsIn, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { ProductUnit } from '@prisma/client';

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

function toStockStatusList(
  value: unknown,
): Array<'in_stock' | 'out_of_stock'> {
  const allowed = new Set(['in_stock', 'out_of_stock']);
  return toStringList(value)
    .map((part) => part.toLowerCase())
    .filter((part): part is 'in_stock' | 'out_of_stock' => allowed.has(part));
}

export class WarehouseSummaryQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(({ value }) => toUnitList(value))
  @IsEnum(ProductUnit, { each: true })
  unit?: ProductUnit[];

  @IsOptional()
  @Transform(({ value }) => toStockStatusList(value))
  @IsIn(['in_stock', 'out_of_stock'], { each: true })
  stockStatus?: Array<'in_stock' | 'out_of_stock'>;
}
