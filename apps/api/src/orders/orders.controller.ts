import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { OrdersService } from './orders.service';
import { CreateOrderDto, UpdateOrderDto } from './dto/order.dto';
import { OrderListQueryDto } from './dto/order-list-query.dto';
import { OrderSummaryQueryDto } from './dto/order-summary-query.dto';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateOrderDto) {
    return this.ordersService.create(user.profileId, dto);
  }

  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query() query: OrderListQueryDto) {
    return this.ordersService.findAll(user.profileId, query);
  }

  @Get('summary')
  summary(
    @CurrentUser() user: AuthUser,
    @Query() query: OrderSummaryQueryDto,
  ) {
    return this.ordersService.getSummary(user.profileId, query);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.ordersService.findOne(user.profileId, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrderDto,
  ) {
    return this.ordersService.update(user.profileId, id, dto);
  }
}
