import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';

export class TranslateBatchDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(16)
  to!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(40)
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  texts!: string[];
}
