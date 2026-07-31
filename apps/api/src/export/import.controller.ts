import {
  BadRequestException,
  Controller,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/current-user.decorator';
import { ImportService } from './import.service';
import { parseFeatureExportEntity } from './export-entities';

@Controller('import')
@UseGuards(JwtAuthGuard)
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  /**
   * Merge-import business data from a unified JSON or unified CSV export file.
   * Allowlisted names may merge all profiles; everyone else merges own profile only.
   */
  @Post()
  @Throttle({ default: { limit: 5, ttl: 3_600_000 } })
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024 } }),
  )
  async upload(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: { buffer: Buffer } | undefined,
    @Query('format') format?: string,
    @Query('entity') entityRaw?: string,
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('file is required');
    }

    const fmt = (format ?? 'json').trim().toLowerCase();
    if (fmt !== 'json' && fmt !== 'csv-unified') {
      throw new BadRequestException(
        'format must be json or csv-unified',
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

    const bundle = this.importService.parseImportFile(fmt, file.buffer);
    return entity
      ? this.importService.mergeFeatureImport(user, entity, bundle)
      : this.importService.mergeImport(user, bundle);
  }
}
