import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { InvoiceService } from './invoice.service';
import { InvoiceController } from './invoice.controller';

@Module({
  controllers: [OrdersController, InvoiceController],
  providers: [OrdersService, InvoiceService],
})
export class OrdersModule {}
