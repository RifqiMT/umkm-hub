import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { PaginationQueryDto } from '../common/dto/pagination.dto';
import { WarehouseService } from './warehouse.service';
import { CreateWarehouseRestockDto } from './dto/warehouse.dto';
import { WarehouseSummaryQueryDto } from './dto/warehouse-query.dto';

@Controller('warehouse')
@UseGuards(JwtAuthGuard)
export class WarehouseController {
  constructor(private readonly warehouseService: WarehouseService) {}

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateWarehouseRestockDto,
  ) {
    return this.warehouseService.create(user.profileId, dto);
  }

  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query() query: PaginationQueryDto) {
    return this.warehouseService.findAll(user.profileId, query);
  }

  @Get('summary')
  getSummary(
    @CurrentUser() user: AuthUser,
    @Query() query: WarehouseSummaryQueryDto,
  ) {
    return this.warehouseService.getSummary(user.profileId, query);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.warehouseService.findOne(user.profileId, id);
  }
}
