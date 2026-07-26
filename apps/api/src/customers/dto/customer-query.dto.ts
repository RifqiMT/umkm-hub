import { IsEnum, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import {
  CompanyType,
  CustomerStatus,
  RelationshipLevel,
} from '@prisma/client';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

function toStringList(value: unknown): string[] {
  if (value == null || value === '') return [];
  const raw = Array.isArray(value) ? value : String(value).split(',');
  return raw.map((part) => String(part).trim()).filter(Boolean);
}

function toCustomerStatusList(value: unknown): CustomerStatus[] {
  const allowed = new Set(Object.values(CustomerStatus));
  return toStringList(value)
    .map((part) => part.toUpperCase())
    .filter((part): part is CustomerStatus =>
      allowed.has(part as CustomerStatus),
    );
}

export class CustomerQueryDto extends PaginationQueryDto {
  @IsOptional()
  @Transform(({ value }) => toCustomerStatusList(value))
  @IsEnum(CustomerStatus, { each: true })
  status?: CustomerStatus[];

  @IsOptional()
  @IsEnum(CompanyType)
  companyType?: CompanyType;

  @IsOptional()
  @IsEnum(RelationshipLevel)
  relationshipLevel?: RelationshipLevel;
}

export class CustomerSummaryQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(({ value }) => toCustomerStatusList(value))
  @IsEnum(CustomerStatus, { each: true })
  status?: CustomerStatus[];

  @IsOptional()
  @IsEnum(CompanyType)
  companyType?: CompanyType;

  @IsOptional()
  @IsEnum(RelationshipLevel)
  relationshipLevel?: RelationshipLevel;
}
