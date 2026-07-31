import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsString()
  @MinLength(3)
  @MaxLength(64)
  @Matches(/^[a-zA-Z0-9._-]+$/, {
    message:
      'Username may only contain letters, numbers, dots, underscores, and hyphens',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  profileName!: string;

  @IsEmail()
  @MaxLength(254)
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}

/** Live uniqueness probe — always requires both fields (anti-enumeration). */
export class RegisterAvailabilityDto {
  @IsString()
  @MinLength(3)
  @MaxLength(64)
  @Matches(/^[a-zA-Z0-9._-]+$/, {
    message:
      'Username may only contain letters, numbers, dots, underscores, and hyphens',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  profileName!: string;

  @IsEmail()
  @MaxLength(254)
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email!: string;
}

/**
 * Login accepts username or email.
 * Prefer `login`; `profileName` remains as a backward-compatible alias.
 */
export class LoginDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(254)
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  login?: string;

  /** @deprecated Prefer `login` — kept for existing clients. */
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(254)
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  profileName?: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}

export class RefreshDto {
  @IsString()
  refreshToken!: string;
}

export class VerifyEmailDto {
  @IsString()
  @MinLength(20)
  @MaxLength(512)
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  token!: string;
}

export class ForgotPasswordDto {
  @IsString()
  @MinLength(3)
  @MaxLength(254)
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  login!: string;
}

export class ResetPasswordDto {
  @IsString()
  @MinLength(20)
  @MaxLength(512)
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  token!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}
