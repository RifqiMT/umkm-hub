import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProductUnit } from '@prisma/client';

function optionalPackPrice() {
  return Type(() => Number);
}

export class CreateProductDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @IsEnum(ProductUnit)
  unit!: ProductUnit;

  /** Optional; defaults to 0. Stock is managed via Warehouse restocks. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  stockQty?: number;

  /** Required when unit is PCS. Ignored/derived for other units. */
  @ValidateIf((o: CreateProductDto) => o.unit === ProductUnit.PCS)
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  pricePerUnit?: number;

  @IsOptional()
  @optionalPackPrice()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  price50?: number | null;

  @IsOptional()
  @optionalPackPrice()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  price100?: number | null;

  @IsOptional()
  @optionalPackPrice()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  price250?: number | null;

  @IsOptional()
  @optionalPackPrice()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  price500?: number | null;

  @IsOptional()
  @optionalPackPrice()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  price1000?: number | null;

  @IsOptional()
  @optionalPackPrice()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  priceCustom?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  costPerUnit?: number | null;

  @IsOptional()
  @optionalPackPrice()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  cost50?: number | null;

  @IsOptional()
  @optionalPackPrice()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  cost100?: number | null;

  @IsOptional()
  @optionalPackPrice()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  cost250?: number | null;

  @IsOptional()
  @optionalPackPrice()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  cost500?: number | null;

  @IsOptional()
  @optionalPackPrice()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  cost1000?: number | null;

  @IsOptional()
  @optionalPackPrice()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  costCustom?: number | null;

  @IsOptional()
  @optionalPackPrice()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.0001)
  customSize?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  details?: string;
}

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsEnum(ProductUnit)
  unit?: ProductUnit;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  pricePerUnit?: number;

  @IsOptional()
  @optionalPackPrice()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  price50?: number | null;

  @IsOptional()
  @optionalPackPrice()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  price100?: number | null;

  @IsOptional()
  @optionalPackPrice()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  price250?: number | null;

  @IsOptional()
  @optionalPackPrice()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  price500?: number | null;

  @IsOptional()
  @optionalPackPrice()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  price1000?: number | null;

  @IsOptional()
  @optionalPackPrice()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  priceCustom?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  costPerUnit?: number | null;

  @IsOptional()
  @optionalPackPrice()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  cost50?: number | null;

  @IsOptional()
  @optionalPackPrice()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  cost100?: number | null;

  @IsOptional()
  @optionalPackPrice()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  cost250?: number | null;

  @IsOptional()
  @optionalPackPrice()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  cost500?: number | null;

  @IsOptional()
  @optionalPackPrice()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  cost1000?: number | null;

  @IsOptional()
  @optionalPackPrice()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  costCustom?: number | null;

  @IsOptional()
  @optionalPackPrice()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.0001)
  customSize?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  details?: string;
}
