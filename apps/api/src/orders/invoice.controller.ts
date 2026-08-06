import {
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Query,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/current-user.decorator';
import { INVOICE_PDF_TEMPLATE_VERSION } from './invoice-pdf';
import { KONTRA_BON_PDF_TEMPLATE_VERSION } from './kontra-bon-pdf';
import { InvoiceService } from './invoice.service';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  /** Download a printable PDF invoice for an order. */
  @Get(':id/invoice/pdf')
  @Header('Cache-Control', 'no-store, no-cache, must-revalidate')
  @Header('X-Invoice-Template', INVOICE_PDF_TEMPLATE_VERSION)
  async downloadPdf(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const file = await this.invoiceService.buildPdf(user.profileId, id);
    return new StreamableFile(file.body, {
      type: file.contentType,
      disposition: `attachment; filename="${file.filename}"`,
    });
  }

  /** Download a printable Kontra bon PDF (goods + payment acknowledgment). */
  @Get(':id/kontra-bon/pdf')
  @Header('Cache-Control', 'no-store, no-cache, must-revalidate')
  @Header('X-Kontra-Bon-Template', KONTRA_BON_PDF_TEMPLATE_VERSION)
  async downloadKontraBonPdf(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const file = await this.invoiceService.buildKontraBonPdf(
      user.profileId,
      id,
    );
    return new StreamableFile(file.body, {
      type: file.contentType,
      disposition: `attachment; filename="${file.filename}"`,
    });
  }

  /** e-Faktur prep export (CSV or XML) for PKP businesses. */
  @Get(':id/invoice/fiscal')
  async downloadFiscal(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('format') format?: string,
  ) {
    const fmt = (format ?? 'csv').trim().toLowerCase();
    const file = await this.invoiceService.buildFiscalExport(
      user.profileId,
      id,
      fmt === 'xml' ? 'xml' : 'csv',
    );
    return new StreamableFile(file.body, {
      type: file.contentType,
      disposition: `attachment; filename="${file.filename}"`,
    });
  }
}
