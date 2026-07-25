import { IsEnum, IsOptional } from 'class-validator';
import {
  CompanyType,
  CustomerStatus,
  RelationshipLevel,
} from '@prisma/client';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

export class CustomerQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(CustomerStatus)
  status?: CustomerStatus;

  @IsOptional()
  @IsEnum(CompanyType)
  companyType?: CompanyType;

  @IsOptional()
  @IsEnum(RelationshipLevel)
  relationshipLevel?: RelationshipLevel;
}
