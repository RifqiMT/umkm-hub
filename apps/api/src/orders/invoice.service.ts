import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Customer,
  Order,
  OrderInstallment,
  OrderLine,
  Product,
  Profile,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { decimalToNumber, serializeOrder } from '../common/utils/serialize';
import { buildInvoicePdf, type InvoiceDocumentData } from './invoice-pdf';
import {
  formatDiscountLabel,
  formatInvoiceQuantity,
  formatInvoiceQuantityLines,
} from './invoice-line-display';
import {
  buildEFakturCsv,
  buildEFakturXml,
  buildInvoiceNumber,
  computeFiscalBreakdown,
  formatInvoiceNumberDisplay,
  formatNpwp,
  isValidInvoiceNumber,
  resolveIncludePpn,
  type EFakturRow,
} from './fiscal-invoice';
import {
  computeOrderDiscountAmount,
  reconcileInvoicePaymentTotals,
  resolveInvoiceSubtotal,
} from './invoice-totals';

type OrderWithRelations = Order & {
  customer: Customer | null;
  product: Product | null;
  lines: Array<OrderLine & { product: Product | null }>;
  installments: OrderInstallment[];
};

@Injectable()
export class InvoiceService {
  constructor(private readonly prisma: PrismaService) {}

  private async loadOrder(
    profileId: string,
    orderId: string,
  ): Promise<{ order: OrderWithRelations; profile: Profile }> {
    const [order, profile] = await Promise.all([
      this.prisma.order.findFirst({
        where: { id: orderId, profileId },
        include: {
          customer: true,
          product: true,
          lines: { include: { product: true }, orderBy: { sortOrder: 'asc' } },
          installments: { orderBy: { installmentDate: 'asc' } },
        },
      }),
      this.prisma.profile.findFirst({ where: { id: profileId } }),
    ]);
    if (!order || !profile) {
      throw new NotFoundException('Order not found');
    }
    return { order, profile };
  }

  private resolveIncludePpn(order: Order, profile: Profile): boolean {
    return resolveIncludePpn(order, profile);
  }

  private async ensureInvoiceNumber(
    order: OrderWithRelations,
    profile: Profile,
  ): Promise<string> {
    const existing = order.fiscalInvoiceNumber?.trim();
    if (existing && isValidInvoiceNumber(existing)) return existing;

    const invoiceNumber = buildInvoiceNumber({
      prefix: profile.invoicePrefix,
      orderId: order.orderId || order.id,
      orderDate: order.orderDate.toISOString().slice(0, 10),
      fallbackId: order.id,
    });

    await this.prisma.order.update({
      where: { id: order.id },
      data: { fiscalInvoiceNumber: invoiceNumber },
    });

    return invoiceNumber;
  }

  private buildDocument(
    order: OrderWithRelations,
    profile: Profile,
    invoiceNumber: string,
  ): InvoiceDocumentData {
    const serialized = serializeOrder(order);
    const isPkp = this.resolveIncludePpn(order, profile);
    const fiscal = computeFiscalBreakdown({
      orderTotal: serialized.totalOrderValue,
      isPkp,
      ppnPercent: decimalToNumber(profile.defaultPpnPercent),
      taxInclusive: profile.taxInclusive,
    });

    const lineItems =
      serialized.lines && serialized.lines.length > 0
        ? serialized.lines.map((line) => {
            const qty = formatInvoiceQuantityLines({
              packCount: line.packCount,
              packSizeSnapshot: line.packSizeSnapshot,
              productQty: line.productQty,
              unit: line.unit ?? line.unitSnapshot,
            });
            return {
              description: line.product?.name ?? line.productId,
              quantityLabel: formatInvoiceQuantity({
                packCount: line.packCount,
                packSizeSnapshot: line.packSizeSnapshot,
                productQty: line.productQty,
                unit: line.unit ?? line.unitSnapshot,
              }),
              quantityPacks: qty.packs,
              quantityPackSize: qty.packSize,
              unitPrice: line.packPriceSnapshot ?? line.price ?? 0,
              lineTotal: line.lineTotal,
            };
          })
        : (() => {
            const qty = formatInvoiceQuantityLines({
              packCount: serialized.packCount,
              packSizeSnapshot: serialized.packSizeSnapshot,
              productQty: serialized.productQty,
              unit: serialized.unit,
            });
            return [
              {
                description: order.product?.name ?? order.productId,
                quantityLabel: formatInvoiceQuantity({
                  packCount: serialized.packCount,
                  packSizeSnapshot: serialized.packSizeSnapshot,
                  productQty: serialized.productQty,
                  unit: serialized.unit,
                }),
                quantityPacks: qty.packs,
                quantityPackSize: qty.packSize,
                unitPrice: serialized.packPriceSnapshot ?? serialized.price ?? 0,
                lineTotal: serialized.lineTotal,
              },
            ];
          })();

    const subtotal = resolveInvoiceSubtotal(lineItems, serialized.lineTotal);
    const discountAmount = computeOrderDiscountAmount(
      subtotal,
      serialized.totalOrderValue,
    );
    const discountLabel = formatDiscountLabel(
      order.discountType,
      decimalToNumber(order.discountValue),
    );

    const payments = (serialized.installments ?? []).map((row) => ({
      date: row.installmentDate.slice(0, 10),
      amount: row.amount,
    }));
    const paymentTotals = reconcileInvoicePaymentTotals({
      fiscal,
      installments: payments,
    });

    const sellerName =
      profile.businessName.trim() ||
      profile.profileName.replace(/_/g, ' ');
    const buyer = order.customer;

    return {
      invoiceNumber,
      invoiceDisplay: formatInvoiceNumberDisplay(invoiceNumber),
      invoiceDate:
        order.billDate?.toISOString().slice(0, 10) ??
        order.orderDate.toISOString().slice(0, 10),
      dueDate: order.paymentDueDate?.toISOString().slice(0, 10) ?? null,
      seller: {
        name: sellerName,
        address: profile.businessAddress.trim(),
        phone: profile.businessPhone.trim(),
        npwp: profile.npwp.trim() ? formatNpwp(profile.npwp) : '',
        email: profile.email,
      },
      buyer: {
        name: buyer?.name ?? 'Customer',
        company: buyer?.companyName ?? '',
        address: [buyer?.address, buyer?.city, buyer?.province, buyer?.country]
          .filter(Boolean)
          .join(', '),
        npwp: buyer?.npwp?.trim() ? formatNpwp(buyer.npwp) : '',
      },
      orderReference: order.orderId || order.id,
      paymentTerms: order.paymentStatus.replace(/_/g, ' '),
      collectionStatus: order.invoiceStatus.replace(/_/g, ' '),
      lineItems,
      lineTotal: subtotal,
      discountLabel,
      discountAmount,
      fiscal,
      paidAmount: paymentTotals.paidAmount,
      remainingAmount: paymentTotals.remainingAmount,
      payments,
    };
  }

  private buildEFakturRow(
    order: OrderWithRelations,
    profile: Profile,
    invoiceNumber: string,
    fiscal: ReturnType<typeof computeFiscalBreakdown>,
  ): EFakturRow {
    const buyer = order.customer;
    const sellerName =
      profile.businessName.trim() ||
      profile.profileName.replace(/_/g, ' ');
    return {
      invoiceNumber,
      invoiceDate:
        order.billDate?.toISOString().slice(0, 10) ??
        order.orderDate.toISOString().slice(0, 10),
      sellerNpwp: profile.npwp.trim() ? formatNpwp(profile.npwp) : '',
      sellerName,
      buyerNpwp: buyer?.npwp?.trim() ? formatNpwp(buyer.npwp) : '',
      buyerName: buyer?.companyName || buyer?.name || 'Customer',
      buyerAddress: [buyer?.address, buyer?.city, buyer?.country]
        .filter(Boolean)
        .join(', '),
      dpp: fiscal.dpp,
      ppn: fiscal.ppn,
      total: fiscal.total,
      orderReference: order.orderId || order.id,
      paymentTerms: order.paymentStatus.replace(/_/g, ' '),
    };
  }

  async buildPdf(profileId: string, orderId: string) {
    const { order, profile } = await this.loadOrder(profileId, orderId);
    const invoiceNumber = await this.ensureInvoiceNumber(order, profile);
    const document = this.buildDocument(order, profile, invoiceNumber);
    const body = await buildInvoicePdf(document);
    const filename = `${invoiceNumber.replace(/[^\w.-]+/g, '_')}.pdf`;
    return { body, filename, contentType: 'application/pdf' };
  }

  async buildFiscalExport(
    profileId: string,
    orderId: string,
    format: 'csv' | 'xml',
  ) {
    const { order, profile } = await this.loadOrder(profileId, orderId);
    const isPkp = this.resolveIncludePpn(order, profile);
    if (!isPkp) {
      throw new BadRequestException(
        'e-Faktur export requires a PKP (VAT-registered) business. Enable PKP in Profile → Business & tax settings.',
      );
    }
    if (!profile.npwp.trim()) {
      throw new BadRequestException(
        'Seller NPWP is required for e-Faktur export. Add it in Profile → Business & tax settings.',
      );
    }

    const invoiceNumber = await this.ensureInvoiceNumber(order, profile);
    const fiscal = computeFiscalBreakdown({
      orderTotal: decimalToNumber(order.totalOrderValue),
      isPkp: true,
      ppnPercent: decimalToNumber(profile.defaultPpnPercent),
      taxInclusive: profile.taxInclusive,
    });
    const row = this.buildEFakturRow(order, profile, invoiceNumber, fiscal);
    const baseName = invoiceNumber.replace(/[^\w.-]+/g, '_');

    if (format === 'xml') {
      return {
        body: Buffer.from(buildEFakturXml([row]), 'utf8'),
        filename: `${baseName}-efaktur.xml`,
        contentType: 'application/xml; charset=utf-8',
      };
    }

    return {
      body: Buffer.from(buildEFakturCsv([row]), 'utf8'),
      filename: `${baseName}-efaktur.csv`,
      contentType: 'text/csv; charset=utf-8',
    };
  }
}
