import {
  IsEnum,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { OrderStatus, PaymentStatus, BillStatus, InvoiceStatus } from '@prisma/client';

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

function toBillStatusList(value: unknown): BillStatus[] {
  if (value == null || value === '') return [];
  const raw = Array.isArray(value) ? value : String(value).split(',');
  const allowed = new Set(Object.values(BillStatus));
  return raw
    .map((part) => String(part).trim().toUpperCase())
    .filter((part): part is BillStatus => allowed.has(part as BillStatus));
}

function toInvoiceStatusList(value: unknown): InvoiceStatus[] {
  if (value == null || value === '') return [];
  const raw = Array.isArray(value) ? value : String(value).split(',');
  const allowed = new Set(Object.values(InvoiceStatus));
  return raw
    .map((part) => String(part).trim().toUpperCase())
    .filter(
      (part): part is InvoiceStatus => allowed.has(part as InvoiceStatus),
    );
}

function emptyToUndefined({ value }: { value: unknown }): string | undefined {
  if (value == null || value === '') return undefined;
  return String(value).trim();
}

/**
 * Filters for `GET /orders/summary` — same scope as the order list
 * (search, status, paymentStatus, order/shipment/invoice date windows).
 */
export class OrderSummaryQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(({ value }) => toStatusList(value))
  @IsEnum(OrderStatus, { each: true })
  status?: OrderStatus[];

  @IsOptional()
  @Transform(({ value }) => toPaymentStatusList(value))
  @IsEnum(PaymentStatus, { each: true })
  paymentStatus?: PaymentStatus[];

  @IsOptional()
  @Transform(({ value }) => toBillStatusList(value))
  @IsEnum(BillStatus, { each: true })
  billStatus?: BillStatus[];

  @IsOptional()
  @Transform(({ value }) => toInvoiceStatusList(value))
  @IsEnum(InvoiceStatus, { each: true })
  invoiceStatus?: InvoiceStatus[];

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
}
