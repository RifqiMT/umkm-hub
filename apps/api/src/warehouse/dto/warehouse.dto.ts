import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateWarehouseRestockDto {
  @IsUUID()
  productId!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.0001)
  qtyAdded!: number;

  /** Defaults to today when omitted. */
  @IsOptional()
  @IsDateString()
  restockDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class UpdateWarehouseRestockDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.0001)
  qtyAdded?: number;

  @IsOptional()
  @IsDateString()
  restockDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
