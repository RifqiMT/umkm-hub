import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import {
  CompanyType,
  CustomerStatus,
  PartnershipStage,
  RelationshipLevel,
} from '@prisma/client';

function emptyToUndefined({ value }: { value: unknown }) {
  if (value === '' || value === null) return undefined;
  return value;
}

export class CreateCustomerDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  title!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  companyName!: string;

  @IsEnum(CompanyType)
  companyType!: CompanyType;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsEmail()
  email?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MinLength(5)
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  additionalAddress?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  postalCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  province?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  country?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsEnum(PartnershipStage)
  partnershipStage?: PartnershipStage;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsEnum(CustomerStatus)
  status?: CustomerStatus;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  customerNeeds?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  desiredStandards?: string;

  @IsOptional()
  @IsBoolean()
  promiseAnnualBonus?: boolean;

  @IsOptional()
  @IsBoolean()
  promiseOnTimeDelivery?: boolean;

  @IsOptional()
  @IsBoolean()
  promisePackagingBox?: boolean;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsEnum(RelationshipLevel)
  relationshipLevel?: RelationshipLevel;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  approvalPercentage?: number;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  remarks?: string;
}

export class UpdateCustomerDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  companyName?: string;

  @IsOptional()
  @IsEnum(CompanyType)
  companyType?: CompanyType;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsEmail()
  email?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MinLength(5)
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  additionalAddress?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  postalCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  province?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  country?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsEnum(PartnershipStage)
  partnershipStage?: PartnershipStage | null;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsEnum(CustomerStatus)
  status?: CustomerStatus | null;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  customerNeeds?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  desiredStandards?: string;

  @IsOptional()
  @IsBoolean()
  promiseAnnualBonus?: boolean;

  @IsOptional()
  @IsBoolean()
  promiseOnTimeDelivery?: boolean;

  @IsOptional()
  @IsBoolean()
  promisePackagingBox?: boolean;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsEnum(RelationshipLevel)
  relationshipLevel?: RelationshipLevel | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  approvalPercentage?: number;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  remarks?: string;
}
