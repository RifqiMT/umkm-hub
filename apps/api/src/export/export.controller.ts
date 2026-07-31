import {
  BadRequestException,
  Controller,
  Get,
  Query,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/current-user.decorator';
import { ExportService } from './export.service';
import {
  parseFeatureExportEntity,
} from './export-entities';

@Controller('export')
@UseGuards(JwtAuthGuard)
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Get('eligibility')
  eligibility(@CurrentUser() user: AuthUser) {
    return this.exportService.getEligibility(user);
  }

  /**
   * Authenticated data export.
   * Allowlisted names → all profiles; everyone else → own profile only.
   * format=json | csv (ZIP of sheets) | csv-unified (single CSV).
   */
  @Get()
  @Throttle({ default: { limit: 5, ttl: 3_600_000 } })
  async download(
    @CurrentUser() user: AuthUser,
    @Query('format') format?: string,
    @Query('entity') entityRaw?: string,
  ): Promise<StreamableFile> {
    const fmt = (format ?? 'json').trim().toLowerCase();
    if (fmt !== 'json' && fmt !== 'csv' && fmt !== 'csv-unified') {
      throw new BadRequestException(
        'format must be json, csv, or csv-unified',
      );
    }

    let entity: ReturnType<typeof parseFeatureExportEntity> | undefined;
    if (entityRaw?.trim()) {
      try {
        entity = parseFeatureExportEntity(entityRaw);
      } catch {
        throw new BadRequestException(
          'entity must be products, customers, orders, warehouse, or targets',
        );
      }
    }

    const file =
      fmt === 'csv-unified'
        ? await this.exportService.buildUnifiedCsv(user, entity)
        : fmt === 'csv'
          ? await this.exportService.buildCsvZip(user, entity)
          : await this.exportService.buildJsonFile(user, entity);

    return new StreamableFile(file.body, {
      type: file.contentType,
      disposition: `attachment; filename="${file.filename}"`,
    });
  }
}
