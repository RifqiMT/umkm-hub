import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Put,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/current-user.decorator';
import {
  UpsertAnnualTargetDto,
  UpsertMonthlyTargetDto,
} from './dto/revenue-target.dto';
import { RevenueTargetsService } from './revenue-targets.service';

@Controller('revenue-targets')
@UseGuards(JwtAuthGuard)
export class RevenueTargetsController {
  constructor(private readonly revenueTargetsService: RevenueTargetsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.revenueTargetsService.listYears(user.profileId);
  }

  @Get(':year')
  getYear(
    @CurrentUser() user: AuthUser,
    @Param('year', ParseIntPipe) year: number,
  ) {
    return this.revenueTargetsService.getYear(user.profileId, year);
  }

  @Put(':year/monthly')
  upsertMonthly(
    @CurrentUser() user: AuthUser,
    @Param('year', ParseIntPipe) year: number,
    @Body() dto: UpsertMonthlyTargetDto,
  ) {
    return this.revenueTargetsService.upsertMonthly(
      user.profileId,
      year,
      dto,
    );
  }

  @Put(':year/annual')
  upsertAnnual(
    @CurrentUser() user: AuthUser,
    @Param('year', ParseIntPipe) year: number,
    @Body() dto: UpsertAnnualTargetDto,
  ) {
    return this.revenueTargetsService.upsertAnnual(user.profileId, year, dto);
  }

  @Delete(':year/monthly')
  clearMonthly(
    @CurrentUser() user: AuthUser,
    @Param('year', ParseIntPipe) year: number,
  ) {
    return this.revenueTargetsService.clearMonthly(user.profileId, year);
  }

  @Delete(':year/annual')
  clearAnnual(
    @CurrentUser() user: AuthUser,
    @Param('year', ParseIntPipe) year: number,
  ) {
    return this.revenueTargetsService.clearAnnual(user.profileId, year);
  }

  @Delete(':year')
  remove(
    @CurrentUser() user: AuthUser,
    @Param('year', ParseIntPipe) year: number,
  ) {
    return this.revenueTargetsService.remove(user.profileId, year);
  }
}
