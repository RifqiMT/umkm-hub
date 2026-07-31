import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TranslateBatchDto } from './dto/translate-batch.dto';
import { TranslateService } from './translate.service';

@Controller('translate')
export class TranslateController {
  constructor(private readonly translateService: TranslateService) {}

  /** Authenticated batch translate via Google Translate (workspace pages). */
  @Post('batch')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { ttl: 60_000, limit: 300 } })
  batch(@Body() body: TranslateBatchDto) {
    return this.translateService.translateBatch(body.to, body.texts);
  }

  /** Public Google Translate proxy for login/register before session exists. */
  @Post('batch-public')
  @Throttle({ default: { ttl: 60_000, limit: 300 } })
  batchPublic(@Body() body: TranslateBatchDto) {
    return this.translateService.translateBatch(body.to, body.texts);
  }
}
