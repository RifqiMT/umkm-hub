import { Module } from '@nestjs/common';
import { RevenueTargetsController } from './revenue-targets.controller';
import { RevenueTargetsService } from './revenue-targets.service';

@Module({
  controllers: [RevenueTargetsController],
  providers: [RevenueTargetsService],
})
export class RevenueTargetsModule {}
