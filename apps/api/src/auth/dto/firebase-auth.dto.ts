import { IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class FirebaseIdTokenDto {
  @IsString()
  @MinLength(20)
  @MaxLength(8192)
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  idToken!: string;
}

export class FirebaseRegisterDto extends FirebaseIdTokenDto {
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
}
