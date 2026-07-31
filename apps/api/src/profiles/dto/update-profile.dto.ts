import { LocationSource } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

function emptyToNull({ value }: { value: unknown }) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  return typeof value === 'string' ? value.trim() : value;
}

export class CheckEmailAvailabilityDto {
  @IsOptional()
  @IsString()
  @MaxLength(254)
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  email?: string;
}

export class UpdateProfileDto {
  /**
   * Accepted only when it matches the existing username exactly.
   * Username is permanently bound at registration and cannot be changed.
   */
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(64)
  @Matches(/^[a-zA-Z0-9._-]+$/, {
    message:
      'Username may only contain letters, numbers, dots, underscores, and hyphens',
  })
  profileName?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password?: string;

  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  firstName?: string | null;

  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  lastName?: string | null;

  /**
   * Ignored when it matches the existing address; any other value is rejected.
   * Email is permanently bound to the username at registration.
   */
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  locationCity?: string | null;

  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  locationCountry?: string | null;

  /** Set by clients when the user manually edits location; IP detect sets IP server-side. */
  @IsOptional()
  @IsEnum(LocationSource)
  locationSource?: LocationSource;

  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsString()
  @MaxLength(200)
  businessName?: string | null;

  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsString()
  @MaxLength(40)
  businessPhone?: string | null;

  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsString()
  @MaxLength(500)
  businessAddress?: string | null;

  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsString()
  @MaxLength(20)
  npwp?: string | null;

  @IsOptional()
  @IsBoolean()
  isPkp?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  defaultPpnPercent?: number;

  @IsOptional()
  @IsBoolean()
  taxInclusive?: boolean;

  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsString()
  @MaxLength(20)
  invoicePrefix?: string | null;
}

export class DetectLocationDto {
  @IsOptional()
  @Transform(({ value }) => {
    if (value === true || value === 'true' || value === '1') return true;
    if (value === false || value === 'false' || value === '0') return false;
    return value;
  })
  @IsBoolean()
  save?: boolean;
}
