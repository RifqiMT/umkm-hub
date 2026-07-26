import {
  Controller,
  Get,
  Query,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/current-user.decorator';
import { AnalyticsService } from './analytics.service';
import { parseAnalyticsTimeline } from './analytics-period';
import { parseAnalyticsOverviewOptions } from './analytics-query';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get()
  overview(
    @CurrentUser() user: AuthUser,
    @Query('year') yearRaw?: string,
    @Query('years') yearsRaw?: string,
    @Query('include') includeRaw?: string,
    @Query('granularity') granularityRaw?: string,
  ) {
    try {
      const timeline = parseAnalyticsTimeline(yearRaw, yearsRaw);
      const options = parseAnalyticsOverviewOptions(includeRaw, granularityRaw);
      return this.analyticsService.getOverview(
        user.profileId,
        timeline,
        options,
      );
    } catch (err) {
      throw new BadRequestException(
        err instanceof Error ? err.message : 'Invalid analytics query',
      );
    }
  }
}
