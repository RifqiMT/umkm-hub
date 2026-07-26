import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { OrderStatus, PaymentStatus } from '@prisma/client';

const SORT_KEYS = ['date', 'product', 'status', 'total', 'payment'] as const;
const SORT_DIRS = ['asc', 'desc'] as const;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function toStatusList(value: unknown): OrderStatus[] {
  if (value == null || value === '') return [];
  const raw = Array.isArray(value) ? value : String(value).split(',');
  const allowed = new Set(Object.values(OrderStatus));
  return raw
    .map((part) => String(part).trim().toUpperCase())
    .filter((part): part is OrderStatus => allowed.has(part as OrderStatus));
}

function toPaymentStatusList(value: unknown): PaymentStatus[] {
  if (value == null || value === '') return [];
  const raw = Array.isArray(value) ? value : String(value).split(',');
  const allowed = new Set(Object.values(PaymentStatus));
  return raw
    .map((part) => String(part).trim().toUpperCase())
    .filter(
      (part): part is PaymentStatus => allowed.has(part as PaymentStatus),
    );
}

function emptyToUndefined({ value }: { value: unknown }): string | undefined {
  if (value == null || value === '') return undefined;
  return String(value).trim();
}

export class OrderListQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  search?: string;

  /** Comma-separated or repeated OrderStatus values. */
  @IsOptional()
  @Transform(({ value }) => toStatusList(value))
  @IsEnum(OrderStatus, { each: true })
  status?: OrderStatus[];

  /** Comma-separated or repeated PaymentStatus values. */
  @IsOptional()
  @Transform(({ value }) => toPaymentStatusList(value))
  @IsEnum(PaymentStatus, { each: true })
  paymentStatus?: PaymentStatus[];

  @IsOptional()
  @Transform(emptyToUndefined)
  @Matches(DATE_ONLY, { message: 'orderDateFrom must be YYYY-MM-DD' })
  orderDateFrom?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @Matches(DATE_ONLY, { message: 'orderDateTo must be YYYY-MM-DD' })
  orderDateTo?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @Matches(DATE_ONLY, { message: 'shipmentDateFrom must be YYYY-MM-DD' })
  shipmentDateFrom?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @Matches(DATE_ONLY, { message: 'shipmentDateTo must be YYYY-MM-DD' })
  shipmentDateTo?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @Matches(DATE_ONLY, { message: 'invoiceDateFrom must be YYYY-MM-DD' })
  invoiceDateFrom?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @Matches(DATE_ONLY, { message: 'invoiceDateTo must be YYYY-MM-DD' })
  invoiceDateTo?: string;

  @IsOptional()
  @IsIn(SORT_KEYS)
  sort?: (typeof SORT_KEYS)[number] = 'date';

  @IsOptional()
  @IsIn(SORT_DIRS)
  dir?: (typeof SORT_DIRS)[number] = 'desc';
}
