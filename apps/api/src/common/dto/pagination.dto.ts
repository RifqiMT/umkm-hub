import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

/** Upper bound for `limit=all` / large page sizes on list endpoints. */
/** Hard cap — keeps list + installment aggregation queries bounded. */
export const LIST_PAGE_MAX = 1000;

export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(LIST_PAGE_MAX)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  search?: string;
}
