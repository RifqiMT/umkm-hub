import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GeoService } from './geo.service';

class PostalLookupQueryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  country!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  postalCode!: string;
}

@Controller('geo')
@UseGuards(JwtAuthGuard)
export class GeoController {
  constructor(private readonly geoService: GeoService) {}

  @Get('postal-lookup')
  lookup(@Query() query: PostalLookupQueryDto) {
    return this.geoService.lookupPostal(query.country, query.postalCode);
  }
}
