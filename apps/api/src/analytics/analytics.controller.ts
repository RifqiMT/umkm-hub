import {
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/current-user.decorator';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get()
  overview(
    @CurrentUser() user: AuthUser,
    @Query('year', new DefaultValuePipe(new Date().getUTCFullYear()), ParseIntPipe)
    year: number,
  ) {
    return this.analyticsService.getOverview(user.profileId, year);
  }
}
