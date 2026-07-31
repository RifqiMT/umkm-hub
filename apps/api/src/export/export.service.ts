import {
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import {
  hasStoredLocationPart,
  isLegacyLocationHash,
  openLocationValue,
} from '../profiles/location-privacy.util';
import {
  type DataExportScope,
  isCrossTenantExportAllowed,
} from './export-allowlist';
import { resolveExporterContext } from './export-exporter.util';
import { rowsToCsv, rowsToUnifiedCsv } from './export-csv';
import { sealExportPasswordHash, openExportPasswordHash } from './export-password.util';
import {
  parseSandboxExportPasswords,
  resolveSandboxExportPassword,
} from './export-sandbox-passwords.util';
import { buildZipStore } from './export-zip';
import {
  entitySheetNames,
  featureExportFilenamePrefix,
  type FeatureExportEntity,
} from './export-entities';

function decimalToPlain(value: Decimal | number | string | null | undefined) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return value;
  return value.toString();
}

function dateToIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  return value.toISOString();
}

function dateOnly(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

export type ExportedProfile = {
  id: string;
  profileName: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  emailVerifiedAt: string | null;
  accountVerifiedAt: string | null;
  /** Human-readable city (decrypted from AES seal when present). */
  locationCity: string | null;
  /** Human-readable country (decrypted from AES seal when present). */
  locationCountry: string | null;
  locationSet: boolean;
  locationNeedsReentry: boolean;
  locationSource: string | null;
  /**
   * Own-profile export: AES-GCM sealed bcrypt hash (`pwd1:…`).
   * All-profiles export: plaintext bcrypt hash (allowlisted operator only).
   * Privileged export also includes human-readable `password` from
   * SANDBOX_EXPORT_PASSWORDS (operator-configured sandbox backup).
   */
  passwordHash?: string | null;
  password?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DataExportBundle = {
  exportedAt: string;
  exporterProfileId: string;
  exporterProfileName: string;
  scope: DataExportScope;
  /** Present on feature-scoped exports (products, customers, orders, warehouse). */
  featureEntity?: FeatureExportEntity;
  notes: string[];
  profiles: ExportedProfile[];
  products: Array<Record<string, unknown>>;
  customers: Array<Record<string, unknown>>;
  orders: Array<Record<string, unknown>>;
  orderLines: Array<Record<string, unknown>>;
  orderInstallments: Array<Record<string, unknown>>;
  warehouseRestocks: Array<Record<string, unknown>>;
  revenueTargetPlans: Array<Record<string, unknown>>;
  revenueTargetMonths: Array<Record<string, unknown>>;
};

const PROFILE_EXPORT_SELECT = {
  id: true,
  profileName: true,
  firstName: true,
  lastName: true,
  email: true,
  emailVerifiedAt: true,
  accountVerifiedAt: true,
  locationCity: true,
  locationCountry: true,
  locationSource: true,
  passwordHash: true,
  createdAt: true,
  updatedAt: true,
  // locationIpHash intentionally omitted
} as const;

@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private locationSecret(): string {
    return (
      this.config.get<string>('PROFILE_LOCATION_SECRET') ||
      this.config.get<string>('JWT_ACCESS_SECRET') ||
      'umkm-profile-location-dev-only'
    );
  }

  private allowlistRaw(): string | undefined {
    return this.config.get<string>('DATA_EXPORT_PROFILE_NAMES');
  }

  private sandboxPasswords(): Map<string, string> {
    return parseSandboxExportPasswords(
      this.config.get<string>('SANDBOX_EXPORT_PASSWORDS'),
    );
  }

  /** Every authenticated user may export; scope differs by allowlist. */
  async getEligibility(user: AuthUser): Promise<{
    allowed: true;
    scope: DataExportScope;
  }> {
    const ctx = await resolveExporterContext(
      this.prisma,
      user,
      this.allowlistRaw(),
    );
    return { allowed: true, scope: ctx.scope };
  }

  private serializeProfile(
    row: {
      id: string;
      profileName: string;
      firstName: string | null;
      lastName: string | null;
      email: string;
      emailVerifiedAt: Date | null;
      accountVerifiedAt: Date | null;
      locationCity: string | null;
      locationCountry: string | null;
      locationSource: string | null;
      passwordHash: string;
      createdAt: Date;
      updatedAt: Date;
    },
    secret: string,
    plaintextPasswordExport: boolean,
    sandboxPasswords: Map<string, string>,
  ): ExportedProfile {
    const city = openLocationValue(row.locationCity, secret);
    const country = openLocationValue(row.locationCountry, secret);
    const locationSet =
      hasStoredLocationPart(row.locationCity) ||
      hasStoredLocationPart(row.locationCountry);

    const openedHash =
      openExportPasswordHash(row.passwordHash, secret) ?? row.passwordHash;
    const passwordHash = plaintextPasswordExport
      ? openedHash
      : sealExportPasswordHash(openedHash, secret);
    const password = plaintextPasswordExport
      ? resolveSandboxExportPassword(row.profileName, sandboxPasswords)
      : null;

    return {
      id: row.id,
      profileName: row.profileName,
      firstName: row.firstName,
      lastName: row.lastName,
      email: row.email,
      emailVerifiedAt: dateToIso(row.emailVerifiedAt),
      accountVerifiedAt: dateToIso(row.accountVerifiedAt),
      locationCity: city,
      locationCountry: country,
      locationSet,
      locationNeedsReentry:
        locationSet &&
        city == null &&
        country == null &&
        (isLegacyLocationHash(row.locationCity) ||
          isLegacyLocationHash(row.locationCountry)),
      locationSource: row.locationSource,
      ...(password != null ? { password } : {}),
      ...(plaintextPasswordExport ? {} : { passwordHash }),
      createdAt: dateToIso(row.createdAt)!,
      updatedAt: dateToIso(row.updatedAt)!,
    };
  }

  async buildDump(user: AuthUser): Promise<DataExportBundle> {
    const ctx = await resolveExporterContext(
      this.prisma,
      user,
      this.allowlistRaw(),
    );
    const { scope, crossTenant, profileName } = ctx;

    this.logger.log(
      `Data export requested by profileId=${user.profileId} profileName=${profileName} scope=${scope}`,
    );

    const secret = this.locationSecret();
    const profileWhere = crossTenant ? undefined : { id: user.profileId };
    const tenantWhere = crossTenant ? undefined : { profileId: user.profileId };
    const orderChildWhere = crossTenant
      ? undefined
      : { order: { profileId: user.profileId } };
    const planMonthWhere = crossTenant
      ? undefined
      : { plan: { profileId: user.profileId } };

    const [
      profiles,
      products,
      customers,
      orders,
      orderLines,
      orderInstallments,
      warehouseRestocks,
      revenueTargetPlans,
      revenueTargetMonths,
    ] = await Promise.all([
      this.prisma.profile.findMany({
        where: profileWhere,
        select: PROFILE_EXPORT_SELECT,
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.product.findMany({
        where: tenantWhere,
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.customer.findMany({
        where: tenantWhere,
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.order.findMany({
        where: tenantWhere,
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.orderLine.findMany({
        where: orderChildWhere,
        orderBy: [{ orderId: 'asc' }, { sortOrder: 'asc' }],
      }),
      this.prisma.orderInstallment.findMany({
        where: orderChildWhere,
        orderBy: [{ orderId: 'asc' }, { installmentDate: 'asc' }],
      }),
      this.prisma.warehouseRestock.findMany({
        where: tenantWhere,
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.revenueTargetPlan.findMany({
        where: tenantWhere,
        orderBy: [{ profileId: 'asc' }, { year: 'asc' }],
      }),
      this.prisma.revenueTargetMonth.findMany({
        where: planMonthWhere,
        orderBy: [{ planId: 'asc' }, { month: 'asc' }],
      }),
    ]);

    if (!crossTenant && profiles.length === 0) {
      throw new ForbiddenException('Profile not found for export');
    }

    return {
      exportedAt: new Date().toISOString(),
      exporterProfileId: user.profileId,
      exporterProfileName: profileName,
      scope,
      notes: [
        crossTenant
          ? 'Cross-tenant dump of all profiles and owned business data.'
          : 'Own-profile dump: only data belonging to the authenticated profile.',
        crossTenant
          ? 'Privileged export: profiles include a human-readable password column only (no passwordHash). Configure SANDBOX_EXPORT_PASSWORDS for accounts not listed by default.'
          : 'Profile password hash is included sealed as pwd1:… (AES-GCM) in the export file.',
        'Profile locationCity/locationCountry are decrypted to plaintext for human readability.',
        'locationIpHash (one-way) and email verification token hashes are omitted.',
      ],
      profiles: profiles.map((p) =>
        this.serializeProfile(
          p,
          secret,
          crossTenant ||
            isCrossTenantExportAllowed(profileName, this.allowlistRaw()),
          this.sandboxPasswords(),
        ),
      ),
      products: products.map((p) => ({
        id: p.id,
        profileId: p.profileId,
        name: p.name,
        productId: p.productId,
        unit: p.unit,
        stockQty: decimalToPlain(p.stockQty),
        pricePerUnit: decimalToPlain(p.pricePerUnit),
        price50: decimalToPlain(p.price50),
        price100: decimalToPlain(p.price100),
        price250: decimalToPlain(p.price250),
        price500: decimalToPlain(p.price500),
        price1000: decimalToPlain(p.price1000),
        priceCustom: decimalToPlain(p.priceCustom),
        costPerUnit: decimalToPlain(p.costPerUnit),
        cost50: decimalToPlain(p.cost50),
        cost100: decimalToPlain(p.cost100),
        cost250: decimalToPlain(p.cost250),
        cost500: decimalToPlain(p.cost500),
        cost1000: decimalToPlain(p.cost1000),
        costCustom: decimalToPlain(p.costCustom),
        customSize: decimalToPlain(p.customSize),
        details: p.details,
        createdAt: dateToIso(p.createdAt),
        updatedAt: dateToIso(p.updatedAt),
      })),
      customers: customers.map((c) => ({
        id: c.id,
        profileId: c.profileId,
        name: c.name,
        customerId: c.customerId,
        title: c.title,
        companyName: c.companyName,
        companyType: c.companyType,
        email: c.email,
        phone: c.phone,
        address: c.address,
        additionalAddress: c.additionalAddress,
        postalCode: c.postalCode,
        city: c.city,
        province: c.province,
        country: c.country,
        partnershipStage: c.partnershipStage,
        status: c.status,
        customerNeeds: c.customerNeeds,
        desiredStandards: c.desiredStandards,
        promiseAnnualBonus: c.promiseAnnualBonus,
        promiseOnTimeDelivery: c.promiseOnTimeDelivery,
        promisePackagingBox: c.promisePackagingBox,
        relationshipLevel: c.relationshipLevel,
        approvalPercentage: c.approvalPercentage,
        remarks: c.remarks,
        createdAt: dateToIso(c.createdAt),
        updatedAt: dateToIso(c.updatedAt),
      })),
      orders: orders.map((o) => ({
        id: o.id,
        profileId: o.profileId,
        orderId: o.orderId,
        customerId: o.customerId,
        productId: o.productId,
        orderDate: dateOnly(o.orderDate),
        shipmentDate: dateOnly(o.shipmentDate),
        productQty: decimalToPlain(o.productQty),
        packSizeSnapshot: decimalToPlain(o.packSizeSnapshot),
        packPriceSnapshot: decimalToPlain(o.packPriceSnapshot),
        packCount: decimalToPlain(o.packCount),
        unitSnapshot: o.unitSnapshot,
        unitPriceSnapshot: decimalToPlain(o.unitPriceSnapshot),
        stockQtySnapshot: decimalToPlain(o.stockQtySnapshot),
        lineTotal: decimalToPlain(o.lineTotal),
        discountType: o.discountType,
        discountValue: decimalToPlain(o.discountValue),
        totalOrderValue: decimalToPlain(o.totalOrderValue),
        status: o.status,
        paymentStatus: o.paymentStatus,
        billStatus: o.billStatus,
        billDate: dateOnly(o.billDate),
        invoiceStatus: o.invoiceStatus,
        invoiceDate: dateOnly(o.invoiceDate),
        paymentDueDate: dateOnly(o.paymentDueDate),
        createdAt: dateToIso(o.createdAt),
        updatedAt: dateToIso(o.updatedAt),
      })),
      orderLines: orderLines.map((l) => ({
        id: l.id,
        orderId: l.orderId,
        productId: l.productId,
        sortOrder: l.sortOrder,
        productQty: decimalToPlain(l.productQty),
        packSizeSnapshot: decimalToPlain(l.packSizeSnapshot),
        packPriceSnapshot: decimalToPlain(l.packPriceSnapshot),
        packCount: decimalToPlain(l.packCount),
        unitSnapshot: l.unitSnapshot,
        unitPriceSnapshot: decimalToPlain(l.unitPriceSnapshot),
        stockQtySnapshot: decimalToPlain(l.stockQtySnapshot),
        lineTotal: decimalToPlain(l.lineTotal),
        createdAt: dateToIso(l.createdAt),
        updatedAt: dateToIso(l.updatedAt),
      })),
      orderInstallments: orderInstallments.map((i) => ({
        id: i.id,
        orderId: i.orderId,
        amount: decimalToPlain(i.amount),
        installmentDate: dateOnly(i.installmentDate),
        createdAt: dateToIso(i.createdAt),
        updatedAt: dateToIso(i.updatedAt),
      })),
      warehouseRestocks: warehouseRestocks.map((r) => ({
        id: r.id,
        profileId: r.profileId,
        productId: r.productId,
        qtyAdded: decimalToPlain(r.qtyAdded),
        restockDate: dateOnly(r.restockDate),
        notes: r.notes,
        unitSnapshot: r.unitSnapshot,
        stockBefore: decimalToPlain(r.stockBefore),
        stockAfter: decimalToPlain(r.stockAfter),
        createdAt: dateToIso(r.createdAt),
        updatedAt: dateToIso(r.updatedAt),
      })),
      revenueTargetPlans: revenueTargetPlans.map((p) => ({
        id: p.id,
        profileId: p.profileId,
        year: p.year,
        monthlyMode: p.monthlyMode,
        annualMode: p.annualMode,
        baseMonthAmount: decimalToPlain(p.baseMonthAmount),
        monthlyGrowthPercent: decimalToPlain(p.monthlyGrowthPercent),
        annualAmount: decimalToPlain(p.annualAmount),
        baseAnnualAmount: decimalToPlain(p.baseAnnualAmount),
        annualGrowthPercent: decimalToPlain(p.annualGrowthPercent),
        createdAt: dateToIso(p.createdAt),
        updatedAt: dateToIso(p.updatedAt),
      })),
      revenueTargetMonths: revenueTargetMonths.map((m) => ({
        id: m.id,
        planId: m.planId,
        month: m.month,
        amount: decimalToPlain(m.amount),
        source: m.source,
        createdAt: dateToIso(m.createdAt),
        updatedAt: dateToIso(m.updatedAt),
      })),
    };
  }

  private mapProductRows(
    products: Array<{
      id: string;
      profileId: string;
      name: string;
      productId: string;
      unit: string;
      stockQty: Decimal;
      pricePerUnit: Decimal | null;
      price50: Decimal | null;
      price100: Decimal | null;
      price250: Decimal | null;
      price500: Decimal | null;
      price1000: Decimal | null;
      priceCustom: Decimal | null;
      costPerUnit: Decimal | null;
      cost50: Decimal | null;
      cost100: Decimal | null;
      cost250: Decimal | null;
      cost500: Decimal | null;
      cost1000: Decimal | null;
      costCustom: Decimal | null;
      customSize: Decimal | null;
      details: string | null;
      createdAt: Date;
      updatedAt: Date;
    }>,
  ) {
    return products.map((p) => ({
      id: p.id,
      profileId: p.profileId,
      name: p.name,
      productId: p.productId,
      unit: p.unit,
      stockQty: decimalToPlain(p.stockQty),
      pricePerUnit: decimalToPlain(p.pricePerUnit),
      price50: decimalToPlain(p.price50),
      price100: decimalToPlain(p.price100),
      price250: decimalToPlain(p.price250),
      price500: decimalToPlain(p.price500),
      price1000: decimalToPlain(p.price1000),
      priceCustom: decimalToPlain(p.priceCustom),
      costPerUnit: decimalToPlain(p.costPerUnit),
      cost50: decimalToPlain(p.cost50),
      cost100: decimalToPlain(p.cost100),
      cost250: decimalToPlain(p.cost250),
      cost500: decimalToPlain(p.cost500),
      cost1000: decimalToPlain(p.cost1000),
      costCustom: decimalToPlain(p.costCustom),
      customSize: decimalToPlain(p.customSize),
      details: p.details,
      createdAt: dateToIso(p.createdAt),
      updatedAt: dateToIso(p.updatedAt),
    }));
  }

  private mapCustomerRows(
    customers: Array<{
      id: string;
      profileId: string;
      name: string;
      customerId: string;
      title: string | null;
      companyName: string | null;
      companyType: string | null;
      email: string | null;
      phone: string | null;
      address: string | null;
      additionalAddress: string | null;
      postalCode: string | null;
      city: string | null;
      province: string | null;
      country: string | null;
      partnershipStage: string | null;
      status: string | null;
      customerNeeds: string | null;
      desiredStandards: string | null;
      promiseAnnualBonus: boolean | null;
      promiseOnTimeDelivery: boolean | null;
      promisePackagingBox: boolean | null;
      relationshipLevel: string | null;
      approvalPercentage: Decimal | number | null;
      remarks: string | null;
      createdAt: Date;
      updatedAt: Date;
    }>,
  ) {
    return customers.map((c) => ({
      id: c.id,
      profileId: c.profileId,
      name: c.name,
      customerId: c.customerId,
      title: c.title,
      companyName: c.companyName,
      companyType: c.companyType,
      email: c.email,
      phone: c.phone,
      address: c.address,
      additionalAddress: c.additionalAddress,
      postalCode: c.postalCode,
      city: c.city,
      province: c.province,
      country: c.country,
      partnershipStage: c.partnershipStage,
      status: c.status,
      customerNeeds: c.customerNeeds,
      desiredStandards: c.desiredStandards,
      promiseAnnualBonus: c.promiseAnnualBonus,
      promiseOnTimeDelivery: c.promiseOnTimeDelivery,
      promisePackagingBox: c.promisePackagingBox,
      relationshipLevel: c.relationshipLevel,
      approvalPercentage: decimalToPlain(c.approvalPercentage),
      remarks: c.remarks,
      createdAt: dateToIso(c.createdAt),
      updatedAt: dateToIso(c.updatedAt),
    }));
  }

  private mapOrderRows(
    orders: Array<{
      id: string;
      profileId: string;
      orderId: string;
      customerId: string | null;
      productId: string;
      orderDate: Date;
      shipmentDate: Date | null;
      productQty: Decimal;
      packSizeSnapshot: Decimal;
      packPriceSnapshot: Decimal;
      packCount: Decimal;
      unitSnapshot: string;
      unitPriceSnapshot: Decimal;
      stockQtySnapshot: Decimal;
      lineTotal: Decimal;
      discountType: string | null;
      discountValue: Decimal | null;
      totalOrderValue: Decimal;
      status: string;
      paymentStatus: string;
      billStatus: string;
      billDate: Date | null;
      invoiceStatus: string;
      invoiceDate: Date | null;
      createdAt: Date;
      updatedAt: Date;
    }>,
  ) {
    return orders.map((o) => ({
      id: o.id,
      profileId: o.profileId,
      orderId: o.orderId,
      customerId: o.customerId,
      productId: o.productId,
      orderDate: dateOnly(o.orderDate),
      shipmentDate: dateOnly(o.shipmentDate),
      productQty: decimalToPlain(o.productQty),
      packSizeSnapshot: decimalToPlain(o.packSizeSnapshot),
      packPriceSnapshot: decimalToPlain(o.packPriceSnapshot),
      packCount: decimalToPlain(o.packCount),
      unitSnapshot: o.unitSnapshot,
      unitPriceSnapshot: decimalToPlain(o.unitPriceSnapshot),
      stockQtySnapshot: decimalToPlain(o.stockQtySnapshot),
      lineTotal: decimalToPlain(o.lineTotal),
      discountType: o.discountType,
      discountValue: decimalToPlain(o.discountValue),
      totalOrderValue: decimalToPlain(o.totalOrderValue),
      status: o.status,
      paymentStatus: o.paymentStatus,
      billStatus: o.billStatus,
      billDate: dateOnly(o.billDate),
      invoiceStatus: o.invoiceStatus,
      invoiceDate: dateOnly(o.invoiceDate),
      createdAt: dateToIso(o.createdAt),
      updatedAt: dateToIso(o.updatedAt),
    }));
  }

  private mapOrderLineRows(
    orderLines: Array<{
      id: string;
      orderId: string;
      productId: string;
      sortOrder: number;
      productQty: Decimal;
      packSizeSnapshot: Decimal;
      packPriceSnapshot: Decimal;
      packCount: Decimal;
      unitSnapshot: string;
      unitPriceSnapshot: Decimal;
      stockQtySnapshot: Decimal;
      lineTotal: Decimal;
      createdAt: Date;
      updatedAt: Date;
    }>,
  ) {
    return orderLines.map((l) => ({
      id: l.id,
      orderId: l.orderId,
      productId: l.productId,
      sortOrder: l.sortOrder,
      productQty: decimalToPlain(l.productQty),
      packSizeSnapshot: decimalToPlain(l.packSizeSnapshot),
      packPriceSnapshot: decimalToPlain(l.packPriceSnapshot),
      packCount: decimalToPlain(l.packCount),
      unitSnapshot: l.unitSnapshot,
      unitPriceSnapshot: decimalToPlain(l.unitPriceSnapshot),
      stockQtySnapshot: decimalToPlain(l.stockQtySnapshot),
      lineTotal: decimalToPlain(l.lineTotal),
      createdAt: dateToIso(l.createdAt),
      updatedAt: dateToIso(l.updatedAt),
    }));
  }

  private mapOrderInstallmentRows(
    orderInstallments: Array<{
      id: string;
      orderId: string;
      amount: Decimal;
      installmentDate: Date;
      createdAt: Date;
      updatedAt: Date;
    }>,
  ) {
    return orderInstallments.map((i) => ({
      id: i.id,
      orderId: i.orderId,
      amount: decimalToPlain(i.amount),
      installmentDate: dateOnly(i.installmentDate),
      createdAt: dateToIso(i.createdAt),
      updatedAt: dateToIso(i.updatedAt),
    }));
  }

  private mapWarehouseRestockRows(
    warehouseRestocks: Array<{
      id: string;
      profileId: string;
      productId: string;
      qtyAdded: Decimal;
      restockDate: Date;
      notes: string | null;
      unitSnapshot: string;
      stockBefore: Decimal;
      stockAfter: Decimal;
      createdAt: Date;
      updatedAt: Date;
    }>,
  ) {
    return warehouseRestocks.map((r) => ({
      id: r.id,
      profileId: r.profileId,
      productId: r.productId,
      qtyAdded: decimalToPlain(r.qtyAdded),
      restockDate: dateOnly(r.restockDate),
      notes: r.notes,
      unitSnapshot: r.unitSnapshot,
      stockBefore: decimalToPlain(r.stockBefore),
      stockAfter: decimalToPlain(r.stockAfter),
      createdAt: dateToIso(r.createdAt),
      updatedAt: dateToIso(r.updatedAt),
    }));
  }

  private mapRevenueTargetPlanRows(
    plans: Array<{
      id: string;
      profileId: string;
      year: number;
      monthlyMode: string;
      annualMode: string;
      baseMonthAmount: Decimal | null;
      monthlyGrowthPercent: Decimal | null;
      annualAmount: Decimal | null;
      baseAnnualAmount: Decimal | null;
      annualGrowthPercent: Decimal | null;
      createdAt: Date;
      updatedAt: Date;
    }>,
  ) {
    return plans.map((p) => ({
      id: p.id,
      profileId: p.profileId,
      year: p.year,
      monthlyMode: p.monthlyMode,
      annualMode: p.annualMode,
      baseMonthAmount: decimalToPlain(p.baseMonthAmount),
      monthlyGrowthPercent: decimalToPlain(p.monthlyGrowthPercent),
      annualAmount: decimalToPlain(p.annualAmount),
      baseAnnualAmount: decimalToPlain(p.baseAnnualAmount),
      annualGrowthPercent: decimalToPlain(p.annualGrowthPercent),
      createdAt: dateToIso(p.createdAt),
      updatedAt: dateToIso(p.updatedAt),
    }));
  }

  private mapRevenueTargetMonthRows(
    months: Array<{
      id: string;
      planId: string;
      month: number;
      amount: Decimal;
      source: string;
      createdAt: Date;
      updatedAt: Date;
    }>,
  ) {
    return months.map((m) => ({
      id: m.id,
      planId: m.planId,
      month: m.month,
      amount: decimalToPlain(m.amount),
      source: m.source,
      createdAt: dateToIso(m.createdAt),
      updatedAt: dateToIso(m.updatedAt),
    }));
  }

  /** Own-profile export limited to one feature area (products, customers, orders, warehouse). */
  async buildFeatureDump(
    user: AuthUser,
    entity: FeatureExportEntity,
  ): Promise<DataExportBundle> {
    const ctx = await resolveExporterContext(
      this.prisma,
      user,
      this.allowlistRaw(),
    );
    const profileId = ctx.profileId;

    this.logger.log(
      `Feature export entity=${entity} profileId=${profileId} profileName=${ctx.profileName}`,
    );

    const header: DataExportBundle = {
      exportedAt: new Date().toISOString(),
      exporterProfileId: user.profileId,
      exporterProfileName: ctx.profileName,
      scope: 'own-profile',
      featureEntity: entity,
      notes: [
        `Feature-scoped export: ${entity} only (authenticated profile).`,
        'Import this file from the same feature page to merge rows without duplicates.',
      ],
      profiles: [],
      products: [],
      customers: [],
      orders: [],
      orderLines: [],
      orderInstallments: [],
      warehouseRestocks: [],
      revenueTargetPlans: [],
      revenueTargetMonths: [],
    };

    switch (entity) {
      case 'products': {
        const products = await this.prisma.product.findMany({
          where: { profileId },
          orderBy: { createdAt: 'asc' },
        });
        return { ...header, products: this.mapProductRows(products) };
      }
      case 'customers': {
        const customers = await this.prisma.customer.findMany({
          where: { profileId },
          orderBy: { createdAt: 'asc' },
        });
        return { ...header, customers: this.mapCustomerRows(customers) };
      }
      case 'orders': {
        const [orders, orderLines, orderInstallments] = await Promise.all([
          this.prisma.order.findMany({
            where: { profileId },
            orderBy: { createdAt: 'asc' },
          }),
          this.prisma.orderLine.findMany({
            where: { order: { profileId } },
            orderBy: [{ orderId: 'asc' }, { sortOrder: 'asc' }],
          }),
          this.prisma.orderInstallment.findMany({
            where: { order: { profileId } },
            orderBy: [{ orderId: 'asc' }, { installmentDate: 'asc' }],
          }),
        ]);
        return {
          ...header,
          orders: this.mapOrderRows(orders),
          orderLines: this.mapOrderLineRows(orderLines),
          orderInstallments: this.mapOrderInstallmentRows(orderInstallments),
        };
      }
      case 'warehouse': {
        const [products, warehouseRestocks] = await Promise.all([
          this.prisma.product.findMany({
            where: { profileId },
            orderBy: { createdAt: 'asc' },
          }),
          this.prisma.warehouseRestock.findMany({
            where: { profileId },
            orderBy: { createdAt: 'asc' },
          }),
        ]);
        return {
          ...header,
          products: this.mapProductRows(products),
          warehouseRestocks: this.mapWarehouseRestockRows(warehouseRestocks),
        };
      }
      case 'targets': {
        const [revenueTargetPlans, revenueTargetMonths] = await Promise.all([
          this.prisma.revenueTargetPlan.findMany({
            where: { profileId },
            orderBy: [{ profileId: 'asc' }, { year: 'asc' }],
          }),
          this.prisma.revenueTargetMonth.findMany({
            where: { plan: { profileId } },
            orderBy: [{ planId: 'asc' }, { month: 'asc' }],
          }),
        ]);
        return {
          ...header,
          revenueTargetPlans: this.mapRevenueTargetPlanRows(revenueTargetPlans),
          revenueTargetMonths:
            this.mapRevenueTargetMonthRows(revenueTargetMonths),
        };
      }
    }
  }

  private dumpToSheets(
    dump: DataExportBundle,
    entity?: FeatureExportEntity,
  ): Array<{
    name: string;
    rows: Array<Record<string, unknown>>;
    emptyHeaders?: string[];
  }> {
    const profileHeaders =
      dump.scope === 'all-profiles'
        ? [
            'id',
            'profileName',
            'firstName',
            'lastName',
            'email',
            'emailVerifiedAt',
            'accountVerifiedAt',
            'locationCity',
            'locationCountry',
            'locationSet',
            'locationNeedsReentry',
            'locationSource',
            'password',
            'createdAt',
            'updatedAt',
          ]
        : [
            'id',
            'profileName',
            'firstName',
            'lastName',
            'email',
            'emailVerifiedAt',
            'accountVerifiedAt',
            'locationCity',
            'locationCountry',
            'locationSet',
            'locationNeedsReentry',
            'locationSource',
            'passwordHash',
            'createdAt',
            'updatedAt',
          ];
    const allSheets = [
      {
        name: 'profiles',
        rows: dump.profiles as unknown as Array<Record<string, unknown>>,
        emptyHeaders: profileHeaders,
      },
      { name: 'products', rows: dump.products, emptyHeaders: ['id'] },
      { name: 'customers', rows: dump.customers, emptyHeaders: ['id'] },
      { name: 'orders', rows: dump.orders, emptyHeaders: ['id'] },
      { name: 'order_lines', rows: dump.orderLines, emptyHeaders: ['id'] },
      {
        name: 'order_installments',
        rows: dump.orderInstallments,
        emptyHeaders: ['id'],
      },
      {
        name: 'warehouse_restocks',
        rows: dump.warehouseRestocks,
        emptyHeaders: ['id'],
      },
      {
        name: 'revenue_target_plans',
        rows: dump.revenueTargetPlans,
        emptyHeaders: ['id'],
      },
      {
        name: 'revenue_target_months',
        rows: dump.revenueTargetMonths,
        emptyHeaders: ['id'],
      },
    ];

    if (!entity) return allSheets;
    const allowed = new Set(entitySheetNames(entity));
    return allSheets.filter((sheet) => allowed.has(sheet.name));
  }

  async buildJsonFile(
    user: AuthUser,
    entity?: FeatureExportEntity,
  ): Promise<{
    filename: string;
    body: Buffer;
    contentType: string;
  }> {
    const dump = entity
      ? await this.buildFeatureDump(user, entity)
      : await this.buildDump(user);
    const stamp = dump.exportedAt.slice(0, 10);
    const scopeTag = dump.scope === 'all-profiles' ? 'all' : 'own';
    const filename = entity
      ? `${featureExportFilenamePrefix(entity)}-${stamp}.json`
      : `umkm-hub-export-${scopeTag}-${stamp}.json`;
    return {
      filename,
      body: Buffer.from(JSON.stringify(dump, null, 2), 'utf8'),
      contentType: 'application/json; charset=utf-8',
    };
  }

  async buildCsvZip(
    user: AuthUser,
    entity?: FeatureExportEntity,
  ): Promise<{
    filename: string;
    body: Buffer;
    contentType: string;
  }> {
    const dump = entity
      ? await this.buildFeatureDump(user, entity)
      : await this.buildDump(user);
    const stamp = dump.exportedAt.slice(0, 10);
    const scopeTag = dump.scope === 'all-profiles' ? 'all' : 'own';
    const sheets = this.dumpToSheets(dump, entity);

    const entries = sheets.map(({ name, rows, emptyHeaders }) => {
      const headers =
        rows.length > 0 ? Object.keys(rows[0]!) : (emptyHeaders ?? ['id']);
      return {
        name: `${name}.csv`,
        data: rowsToCsv(headers, rows),
      };
    });

    entries.unshift({
      name: '_readme.txt',
      data: [
        `UMKM Hub data export (CSV ZIP) — scope: ${dump.scope}`,
        `exportedAt: ${dump.exportedAt}`,
        `exporter: ${dump.exporterProfileName} (${dump.exporterProfileId})`,
        `scope: ${dump.scope}`,
        '',
        ...dump.notes.map((n) => `- ${n}`),
        '',
        'Files:',
        ...sheets.map((s) => `- ${s.name}.csv (${s.rows.length} rows)`),
      ].join('\n'),
    });

    const filename = entity
      ? `${featureExportFilenamePrefix(entity)}-${stamp}.zip`
      : `umkm-hub-export-${scopeTag}-${stamp}.zip`;
    return {
      filename,
      body: buildZipStore(entries),
      contentType: 'application/zip',
    };
  }

  /**
   * Single CSV with a leading `table` column and a union of all field columns.
   * Filter by `table` in Excel/Sheets to isolate an entity.
   */
  async buildUnifiedCsv(
    user: AuthUser,
    entity?: FeatureExportEntity,
  ): Promise<{
    filename: string;
    body: Buffer;
    contentType: string;
  }> {
    const dump = entity
      ? await this.buildFeatureDump(user, entity)
      : await this.buildDump(user);
    const stamp = dump.exportedAt.slice(0, 10);
    const scopeTag = dump.scope === 'all-profiles' ? 'all' : 'own';
    const csv = rowsToUnifiedCsv(this.dumpToSheets(dump, entity));

    const filename = entity
      ? `${featureExportFilenamePrefix(entity)}-unified-${stamp}.csv`
      : `umkm-hub-export-${scopeTag}-unified-${stamp}.csv`;
    return {
      filename,
      body: Buffer.from(csv, 'utf8'),
      contentType: 'text/csv; charset=utf-8',
    };
  }
}
