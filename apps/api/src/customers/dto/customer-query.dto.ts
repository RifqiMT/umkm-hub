import { IsEnum, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import {
  CompanyType,
  CustomerStatus,
  PartnershipStage,
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

function toCompanyTypeList(value: unknown): CompanyType[] {
  const allowed = new Set(Object.values(CompanyType));
  return toStringList(value)
    .map((part) => part.toUpperCase())
    .filter((part): part is CompanyType => allowed.has(part as CompanyType));
}

function toRelationshipLevelList(value: unknown): RelationshipLevel[] {
  const allowed = new Set(Object.values(RelationshipLevel));
  return toStringList(value)
    .map((part) => part.toUpperCase())
    .filter((part): part is RelationshipLevel =>
      allowed.has(part as RelationshipLevel),
    );
}

function toPartnershipStageList(value: unknown): PartnershipStage[] {
  const allowed = new Set(Object.values(PartnershipStage));
  return toStringList(value)
    .map((part) => part.toUpperCase())
    .filter((part): part is PartnershipStage =>
      allowed.has(part as PartnershipStage),
    );
}

export class CustomerQueryDto extends PaginationQueryDto {
  @IsOptional()
  @Transform(({ value }) => toCustomerStatusList(value))
  @IsEnum(CustomerStatus, { each: true })
  status?: CustomerStatus[];

  @IsOptional()
  @Transform(({ value }) => toCompanyTypeList(value))
  @IsEnum(CompanyType, { each: true })
  companyType?: CompanyType[];

  @IsOptional()
  @Transform(({ value }) => toRelationshipLevelList(value))
  @IsEnum(RelationshipLevel, { each: true })
  relationshipLevel?: RelationshipLevel[];

  @IsOptional()
  @Transform(({ value }) => toPartnershipStageList(value))
  @IsEnum(PartnershipStage, { each: true })
  partnershipStage?: PartnershipStage[];
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
  @Transform(({ value }) => toCompanyTypeList(value))
  @IsEnum(CompanyType, { each: true })
  companyType?: CompanyType[];

  @IsOptional()
  @Transform(({ value }) => toRelationshipLevelList(value))
  @IsEnum(RelationshipLevel, { each: true })
  relationshipLevel?: RelationshipLevel[];

  @IsOptional()
  @Transform(({ value }) => toPartnershipStageList(value))
  @IsEnum(PartnershipStage, { each: true })
  partnershipStage?: PartnershipStage[];
}
