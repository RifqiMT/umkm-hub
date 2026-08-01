import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { sealLocationValue } from '../profiles/location-privacy.util';
import { resolveImportPasswordHash } from './export-password.util';
import {
  type DataExportScope,
} from './export-allowlist';
import { resolveExporterContext } from './export-exporter.util';
import type { DataExportBundle, ExportedProfile } from './export.service';
import { unifiedCsvToBundle } from './import-csv';
import {
  dedupeImportBundle,
  emptyMergeStats,
  filterBundleForScope,
  type ImportMergeStats,
} from './import-dedupe';
import {
  filterBundleToEntity,
  type FeatureExportEntity,
} from './export-entities';
import {
  readCustomerBusinessId,
  readOrderBusinessId,
  readProductBusinessId,
} from './import-field-aliases';

const BCRYPT_ROUNDS = 12;

type ImportResult = {
  scope: DataExportScope;
  merged: ImportMergeStats;
  notes: string[];
};

function str(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function optStr(value: unknown): string | null {
  const s = str(value);
  return s === '' ? null : s;
}

function parseDate(value: unknown): Date | undefined {
  const s = str(value);
  if (!s) return undefined;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return undefined;
  return d;
}

function parseDateOnly(value: unknown): Date | undefined {
  const s = str(value).slice(0, 10);
  if (!s) return undefined;
  const d = new Date(`${s}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return undefined;
  return d;
}

function dec(value: unknown): Prisma.Decimal | undefined {
  const s = str(value);
  if (!s) return undefined;
  return new Prisma.Decimal(s);
}

function decOrZero(value: unknown): Prisma.Decimal {
  return dec(value) ?? new Prisma.Decimal(0);
}

function bool(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value;
  const s = str(value).toLowerCase();
  if (s === 'true' || s === '1') return true;
  if (s === 'false' || s === '0') return false;
  return fallback;
}

function int(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function importUpdatedAt(row: { updatedAt?: unknown }): Date {
  return parseDate(row.updatedAt) ?? new Date();
}

/** Skip DB updates when the live row is newer than the import row. */
function isImportNewerOrEqual(
  existing: { updatedAt: Date },
  row: { updatedAt?: unknown },
): boolean {
  return importUpdatedAt(row).getTime() >= existing.updatedAt.getTime();
}

type IdMaps = {
  profile: Map<string, string>;
  product: Map<string, string>;
  customer: Map<string, string>;
  order: Map<string, string>;
  orderLine: Map<string, string>;
  plan: Map<string, string>;
};

function emptyIdMaps(): IdMaps {
  return {
    profile: new Map(),
    product: new Map(),
    customer: new Map(),
    order: new Map(),
    orderLine: new Map(),
    plan: new Map(),
  };
}

@Injectable()
export class ImportService {
  private readonly logger = new Logger(ImportService.name);

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

  parseImportFile(
    format: 'json' | 'csv-unified',
    buffer: Buffer,
  ): DataExportBundle {
    const text = buffer.toString('utf8').trim();
    if (!text) {
      throw new BadRequestException('Import file is empty');
    }

    if (format === 'json') {
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new BadRequestException('Invalid JSON import file');
      }
      return this.normalizeBundle(parsed);
    }

    try {
      return this.normalizeBundle(unifiedCsvToBundle(text));
    } catch (err) {
      throw new BadRequestException(
        err instanceof Error ? err.message : 'Invalid unified CSV import file',
      );
    }
  }

  private normalizeBundle(raw: unknown): DataExportBundle {
    if (!raw || typeof raw !== 'object') {
      throw new BadRequestException('Import payload must be a JSON object');
    }
    const obj = raw as Record<string, unknown>;
    const arr = (key: string) =>
      Array.isArray(obj[key])
        ? (obj[key] as Array<Record<string, unknown>>)
        : [];

    return {
      exportedAt: str(obj.exportedAt) || new Date().toISOString(),
      exporterProfileId: str(obj.exporterProfileId),
      exporterProfileName: str(obj.exporterProfileName),
      scope:
        str(obj.scope) === 'all-profiles' ? 'all-profiles' : 'own-profile',
      notes: Array.isArray(obj.notes)
        ? obj.notes.map((n) => String(n))
        : [],
      profiles: Array.isArray(obj.profiles)
        ? (obj.profiles as ExportedProfile[])
        : [],
      products: arr('products'),
      customers: arr('customers'),
      orders: arr('orders'),
      orderLines: arr('orderLines').length
        ? arr('orderLines')
        : arr('order_lines'),
      orderInstallments: arr('orderInstallments').length
        ? arr('orderInstallments')
        : arr('order_installments'),
      warehouseRestocks: arr('warehouseRestocks').length
        ? arr('warehouseRestocks')
        : arr('warehouse_restocks'),
      warehouseSales: arr('warehouseSales').length
        ? arr('warehouseSales')
        : arr('warehouse_sales'),
      revenueTargetPlans: arr('revenueTargetPlans').length
        ? arr('revenueTargetPlans')
        : arr('revenue_target_plans'),
      revenueTargetMonths: arr('revenueTargetMonths').length
        ? arr('revenueTargetMonths')
        : arr('revenue_target_months'),
    };
  }

  async mergeImport(user: AuthUser, rawBundle: DataExportBundle): Promise<ImportResult> {
    const ctx = await resolveExporterContext(
      this.prisma,
      user,
      this.allowlistRaw(),
    );
    const scope = ctx.scope;
    const filtered = filterBundleForScope(rawBundle, user, scope);
    const bundle = dedupeImportBundle(filtered);
    const secret = this.locationSecret();
    const maps = emptyIdMaps();
    const stats = emptyMergeStats();
    const notes: string[] = [
      scope === 'all-profiles'
        ? 'Merged import across all profiles (allowlisted account).'
        : 'Merged import into the authenticated profile only.',
      'Existing rows match by id first, then natural keys (profileName/email, profileId+productId/customerId/orderId, orderId+productId+sortOrder, orderId+date+amount, restock fingerprint, orderLineId for sales, profileId+year, planId+month).',
      'Duplicates within the import file were collapsed before merge.',
      'Password hashes are restored from export (sealed pwd1:… for own-profile files, plaintext for privileged dumps).',
      'locationIpHash and email verification token hashes are never imported.',
    ];

    this.logger.log(
      `Data import by profileId=${user.profileId} profileName=${ctx.profileName} scope=${scope}`,
    );

    await this.prisma.$transaction(
      async (tx) => {
        await this.mergeProfiles(tx, bundle.profiles, user, scope, maps, stats, secret, notes);
        await this.mergeProducts(tx, bundle.products, maps, stats);
        await this.mergeCustomers(tx, bundle.customers, maps, stats);
        await this.mergePlans(tx, bundle.revenueTargetPlans, maps, stats);
        await this.mergePlanMonths(tx, bundle.revenueTargetMonths, maps, stats);
        await this.mergeOrders(tx, bundle.orders, maps, stats);
        await this.mergeOrderLines(tx, bundle.orderLines, maps, stats);
        await this.mergeInstallments(tx, bundle.orderInstallments, maps, stats);
        await this.mergeRestocks(tx, bundle.warehouseRestocks, maps, stats);
        await this.mergeWarehouseSales(tx, bundle.warehouseSales, maps, stats);
      },
      { maxWait: 30_000, timeout: 120_000 },
    );

    return { scope, merged: stats, notes };
  }

  /** Merge-import rows for a single feature (own profile only). */
  async mergeFeatureImport(
    user: AuthUser,
    entity: FeatureExportEntity,
    rawBundle: DataExportBundle,
  ): Promise<ImportResult> {
    const scope: DataExportScope = 'own-profile';
    const scoped = filterBundleForScope(rawBundle, user, scope);
    const filtered = filterBundleToEntity(scoped, entity);
    const bundle = dedupeImportBundle(filtered);
    const maps = emptyIdMaps();
    const stats = emptyMergeStats();
    const notes: string[] = [
      `Feature-scoped import: ${entity} (own profile only).`,
      'Existing rows match by id first, then natural keys (including related products/customers for orders, and warehouse sales by orderLineId).',
      'Duplicates within the import file were collapsed before merge.',
    ];

    if (
      bundle.featureEntity &&
      bundle.featureEntity !== entity
    ) {
      notes.push(
        `Warning: file featureEntity=${bundle.featureEntity} differs from import target ${entity}; only ${entity} tables were merged.`,
      );
    }

    this.logger.log(
      `Feature import entity=${entity} by profileId=${user.profileId} profileName=${user.profileName}`,
    );

    await this.prisma.$transaction(
      async (tx) => {
        switch (entity) {
          case 'products':
            await this.mergeProducts(tx, bundle.products, maps, stats);
            break;
          case 'customers':
            await this.mergeCustomers(tx, bundle.customers, maps, stats);
            break;
          case 'orders':
            await this.mergeProducts(tx, bundle.products, maps, stats);
            await this.mergeCustomers(tx, bundle.customers, maps, stats);
            await this.mergeOrders(tx, bundle.orders, maps, stats);
            await this.mergeOrderLines(tx, bundle.orderLines, maps, stats);
            await this.mergeInstallments(
              tx,
              bundle.orderInstallments,
              maps,
              stats,
            );
            await this.mergeWarehouseSales(
              tx,
              bundle.warehouseSales,
              maps,
              stats,
            );
            break;
          case 'warehouse':
            await this.mergeProducts(tx, bundle.products, maps, stats);
            await this.mergeRestocks(
              tx,
              bundle.warehouseRestocks,
              maps,
              stats,
            );
            await this.mergeWarehouseSales(
              tx,
              bundle.warehouseSales,
              maps,
              stats,
            );
            break;
          case 'targets':
            await this.mergePlans(tx, bundle.revenueTargetPlans, maps, stats);
            await this.mergePlanMonths(
              tx,
              bundle.revenueTargetMonths,
              maps,
              stats,
            );
            break;
        }
      },
      { maxWait: 30_000, timeout: 120_000 },
    );

    return { scope, merged: stats, notes };
  }

  private async mergeProfiles(
    tx: Prisma.TransactionClient,
    rows: ExportedProfile[],
    user: AuthUser,
    scope: DataExportScope,
    maps: IdMaps,
    stats: ImportMergeStats,
    secret: string,
    notes: string[],
  ) {
    for (const row of rows) {
      const importId = str(row.id);
      if (!importId) {
        stats.profiles.skipped++;
        continue;
      }

      let existing =
        (await tx.profile.findUnique({ where: { id: importId } })) ??
        (await tx.profile.findUnique({
          where: { profileName: row.profileName.trim() },
        })) ??
        (await tx.profile.findUnique({
          where: { email: row.email.trim().toLowerCase() },
        }));

      if (scope === 'own-profile' && existing && existing.id !== user.profileId) {
        existing = await tx.profile.findUnique({ where: { id: user.profileId } });
      }

      if (existing) {
        maps.profile.set(importId, existing.id);
        if (!isImportNewerOrEqual(existing, row)) {
          stats.profiles.skipped++;
          continue;
        }
        const locationCity = optStr(row.locationCity);
        const locationCountry = optStr(row.locationCountry);
        const importedPassword = await resolveImportPasswordHash(row, secret);
        await tx.profile.update({
          where: { id: existing.id },
          data: {
            firstName: row.firstName ?? existing.firstName,
            lastName: row.lastName ?? existing.lastName,
            emailVerifiedAt:
              parseDate(row.emailVerifiedAt) ?? existing.emailVerifiedAt,
            accountVerifiedAt:
              parseDate(row.accountVerifiedAt) ?? existing.accountVerifiedAt,
            ...(importedPassword ? { passwordHash: importedPassword } : {}),
            locationCity:
              locationCity != null
                ? sealLocationValue(locationCity, secret)
                : existing.locationCity,
            locationCountry:
              locationCountry != null
                ? sealLocationValue(locationCountry, secret)
                : existing.locationCountry,
            locationSource:
              (row.locationSource as Prisma.ProfileUpdateInput['locationSource']) ??
              existing.locationSource,
            updatedAt: new Date(),
          },
        });
        stats.profiles.updated++;
        continue;
      }

      if (scope !== 'all-profiles') {
        maps.profile.set(importId, user.profileId);
        stats.profiles.skipped++;
        continue;
      }

      const importedPassword = await resolveImportPasswordHash(row, secret);
      const bootstrapPassword =
        this.config.get<string>('IMPORT_BOOTSTRAP_PASSWORD') ||
        'umkm-import-change-me';
      const passwordHash =
        importedPassword ??
        (await bcrypt.hash(bootstrapPassword, BCRYPT_ROUNDS));

      await tx.profile.create({
        data: {
          id: importId,
          profileName: row.profileName.trim(),
          email: row.email.trim().toLowerCase(),
          passwordHash,
          firstName: row.firstName,
          lastName: row.lastName,
          emailVerifiedAt: parseDate(row.emailVerifiedAt) ?? null,
          accountVerifiedAt: parseDate(row.accountVerifiedAt) ?? null,
          locationCity: optStr(row.locationCity)
            ? sealLocationValue(optStr(row.locationCity)!, secret)
            : null,
          locationCountry: optStr(row.locationCountry)
            ? sealLocationValue(optStr(row.locationCountry)!, secret)
            : null,
          locationSource:
            (row.locationSource as Prisma.ProfileCreateInput['locationSource']) ??
            null,
          createdAt: parseDate(row.createdAt) ?? new Date(),
          updatedAt: parseDate(row.updatedAt) ?? new Date(),
        },
      });
      maps.profile.set(importId, importId);
      stats.profiles.created++;
    }

    if (stats.profiles.created > 0) {
      notes.push(
        `${stats.profiles.created} new profile(s) created — password from import when present, otherwise IMPORT_BOOTSTRAP_PASSWORD.`,
      );
    }
  }

  private resolveProfileId(maps: IdMaps, value: unknown): string | null {
    const id = str(value);
    if (!id) return null;
    return maps.profile.get(id) ?? id;
  }

  private async resolveCanonicalId(
    tx: Prisma.TransactionClient,
    importId: string,
    findById: () => Promise<{ id: string } | null>,
    findNatural: () => Promise<{ id: string } | null>,
    map: Map<string, string>,
  ): Promise<string | null> {
    if (map.has(importId)) return map.get(importId)!;

    const byId = await findById();
    if (byId) {
      map.set(importId, byId.id);
      return byId.id;
    }

    const byNatural = await findNatural();
    if (byNatural) {
      map.set(importId, byNatural.id);
      return byNatural.id;
    }

    return importId;
  }

  private async mergeProducts(
    tx: Prisma.TransactionClient,
    rows: Array<Record<string, unknown>>,
    maps: IdMaps,
    stats: ImportMergeStats,
  ) {
    for (const row of rows) {
      const importId = str(row.id);
      const profileId = this.resolveProfileId(maps, row.profileId);
      if (!importId || !profileId) {
        stats.products.skipped++;
        continue;
      }

      const productId = readProductBusinessId(row);
      const canonicalId = await this.resolveCanonicalId(
        tx,
        importId,
        () => tx.product.findUnique({ where: { id: importId } }),
        () =>
          productId
            ? tx.product.findUnique({
                where: { profileId_productId: { profileId, productId } },
              })
            : Promise.resolve(null),
        maps.product,
      );

      const data = {
        profileId,
        name: str(row.name) || 'Imported product',
        productId,
        unit: (str(row.unit) || 'PCS') as Prisma.ProductCreateInput['unit'],
        stockQty: decOrZero(row.stockQty),
        pricePerUnit: decOrZero(row.pricePerUnit),
        price1: dec(row.price1) ?? null,
        price5: dec(row.price5) ?? null,
        price10: dec(row.price10) ?? null,
        price25: dec(row.price25) ?? null,
        price50: dec(row.price50) ?? null,
        price100: dec(row.price100) ?? null,
        price250: dec(row.price250) ?? null,
        price500: dec(row.price500) ?? null,
        price1000: dec(row.price1000) ?? null,
        priceCustom: dec(row.priceCustom) ?? null,
        costPerUnit: dec(row.costPerUnit) ?? null,
        cost1: dec(row.cost1) ?? null,
        cost5: dec(row.cost5) ?? null,
        cost10: dec(row.cost10) ?? null,
        cost25: dec(row.cost25) ?? null,
        cost50: dec(row.cost50) ?? null,
        cost100: dec(row.cost100) ?? null,
        cost250: dec(row.cost250) ?? null,
        cost500: dec(row.cost500) ?? null,
        cost1000: dec(row.cost1000) ?? null,
        costCustom: dec(row.costCustom) ?? null,
        customSize: dec(row.customSize) ?? null,
        details: str(row.details),
        updatedAt: parseDate(row.updatedAt) ?? new Date(),
      };

      const existing = await tx.product.findUnique({
        where: { id: canonicalId! },
      });
      if (existing) {
        if (!isImportNewerOrEqual(existing, row)) {
          stats.products.skipped++;
          continue;
        }
        await tx.product.update({ where: { id: canonicalId! }, data });
        stats.products.updated++;
      } else {
        await tx.product.create({
          data: {
            id: canonicalId!,
            ...data,
            createdAt: parseDate(row.createdAt) ?? new Date(),
          },
        });
        stats.products.created++;
      }
    }
  }

  private async mergeCustomers(
    tx: Prisma.TransactionClient,
    rows: Array<Record<string, unknown>>,
    maps: IdMaps,
    stats: ImportMergeStats,
  ) {
    for (const row of rows) {
      const importId = str(row.id);
      const profileId = this.resolveProfileId(maps, row.profileId);
      if (!importId || !profileId) {
        stats.customers.skipped++;
        continue;
      }

      const customerId = readCustomerBusinessId(row);
      const canonicalId = await this.resolveCanonicalId(
        tx,
        importId,
        () => tx.customer.findUnique({ where: { id: importId } }),
        () =>
          customerId
            ? tx.customer.findUnique({
                where: { profileId_customerId: { profileId, customerId } },
              })
            : Promise.resolve(null),
        maps.customer,
      );

      const data = {
        profileId,
        name: str(row.name) || 'Imported customer',
        customerId,
        title: str(row.title),
        companyName: str(row.companyName) || 'Imported company',
        companyType: (str(row.companyType) ||
          'STORE') as Prisma.CustomerCreateInput['companyType'],
        email: str(row.email),
        phone: str(row.phone),
        address: str(row.address),
        additionalAddress: str(row.additionalAddress),
        postalCode: str(row.postalCode),
        city: str(row.city),
        province: str(row.province),
        country: str(row.country),
        partnershipStage:
          (optStr(row.partnershipStage) as Prisma.CustomerCreateInput['partnershipStage']) ??
          null,
        status:
          (optStr(row.status) as Prisma.CustomerCreateInput['status']) ?? null,
        customerNeeds: str(row.customerNeeds),
        desiredStandards: str(row.desiredStandards),
        promiseAnnualBonus: bool(row.promiseAnnualBonus),
        promiseOnTimeDelivery: bool(row.promiseOnTimeDelivery),
        promisePackagingBox: bool(row.promisePackagingBox),
        relationshipLevel:
          (optStr(row.relationshipLevel) as Prisma.CustomerCreateInput['relationshipLevel']) ??
          null,
        approvalPercentage: int(row.approvalPercentage),
        remarks: str(row.remarks),
        updatedAt: parseDate(row.updatedAt) ?? new Date(),
      };

      const existing = await tx.customer.findUnique({
        where: { id: canonicalId! },
      });
      if (existing) {
        if (!isImportNewerOrEqual(existing, row)) {
          stats.customers.skipped++;
          continue;
        }
        await tx.customer.update({ where: { id: canonicalId! }, data });
        stats.customers.updated++;
      } else {
        await tx.customer.create({
          data: {
            id: canonicalId!,
            ...data,
            createdAt: parseDate(row.createdAt) ?? new Date(),
          },
        });
        stats.customers.created++;
      }
    }
  }

  private async mergePlans(
    tx: Prisma.TransactionClient,
    rows: Array<Record<string, unknown>>,
    maps: IdMaps,
    stats: ImportMergeStats,
  ) {
    for (const row of rows) {
      const importId = str(row.id);
      const profileId = this.resolveProfileId(maps, row.profileId);
      const year = int(row.year, NaN);
      if (!importId || !profileId || !Number.isFinite(year)) {
        stats.revenueTargetPlans.skipped++;
        continue;
      }

      const canonicalId = await this.resolveCanonicalId(
        tx,
        importId,
        () => tx.revenueTargetPlan.findUnique({ where: { id: importId } }),
        () =>
          tx.revenueTargetPlan.findUnique({
            where: { profileId_year: { profileId, year } },
          }),
        maps.plan,
      );

      const data = {
        profileId,
        year,
        monthlyMode: (str(row.monthlyMode) ||
          'MANUAL') as Prisma.RevenueTargetPlanCreateInput['monthlyMode'],
        annualMode: (str(row.annualMode) ||
          'MANUAL') as Prisma.RevenueTargetPlanCreateInput['annualMode'],
        baseMonthAmount: dec(row.baseMonthAmount) ?? null,
        monthlyGrowthPercent: dec(row.monthlyGrowthPercent) ?? null,
        annualAmount: dec(row.annualAmount) ?? null,
        baseAnnualAmount: dec(row.baseAnnualAmount) ?? null,
        annualGrowthPercent: dec(row.annualGrowthPercent) ?? null,
        updatedAt: parseDate(row.updatedAt) ?? new Date(),
      };

      const existing = await tx.revenueTargetPlan.findUnique({
        where: { id: canonicalId! },
      });
      if (existing) {
        if (!isImportNewerOrEqual(existing, row)) {
          stats.revenueTargetPlans.skipped++;
          continue;
        }
        await tx.revenueTargetPlan.update({
          where: { id: canonicalId! },
          data,
        });
        stats.revenueTargetPlans.updated++;
      } else {
        await tx.revenueTargetPlan.create({
          data: {
            id: canonicalId!,
            ...data,
            createdAt: parseDate(row.createdAt) ?? new Date(),
          },
        });
        stats.revenueTargetPlans.created++;
      }
    }
  }

  private async mergePlanMonths(
    tx: Prisma.TransactionClient,
    rows: Array<Record<string, unknown>>,
    maps: IdMaps,
    stats: ImportMergeStats,
  ) {
    for (const row of rows) {
      const importId = str(row.id);
      const importPlanId = str(row.planId);
      const planId = maps.plan.get(importPlanId) ?? importPlanId;
      const month = int(row.month, NaN);
      if (!importId || !planId || !Number.isFinite(month)) {
        stats.revenueTargetMonths.skipped++;
        continue;
      }

      const plan = await tx.revenueTargetPlan.findUnique({
        where: { id: planId },
      });
      if (!plan) {
        stats.revenueTargetMonths.skipped++;
        continue;
      }

      const existingById = await tx.revenueTargetMonth.findUnique({
        where: { id: importId },
      });
      const existingByNatural = await tx.revenueTargetMonth.findUnique({
        where: { planId_month: { planId, month } },
      });
      const canonicalId = existingById?.id ?? existingByNatural?.id ?? importId;

      const data = {
        planId,
        month,
        amount: decOrZero(row.amount),
        source: (str(row.source) ||
          'MANUAL') as Prisma.RevenueTargetMonthCreateInput['source'],
        updatedAt: parseDate(row.updatedAt) ?? new Date(),
      };

      const existing = await tx.revenueTargetMonth.findUnique({
        where: { id: canonicalId },
      });
      if (existing) {
        if (!isImportNewerOrEqual(existing, row)) {
          stats.revenueTargetMonths.skipped++;
          continue;
        }
        await tx.revenueTargetMonth.update({
          where: { id: canonicalId },
          data,
        });
        stats.revenueTargetMonths.updated++;
      } else {
        await tx.revenueTargetMonth.create({
          data: {
            id: canonicalId,
            ...data,
            createdAt: parseDate(row.createdAt) ?? new Date(),
          },
        });
        stats.revenueTargetMonths.created++;
      }
    }
  }

  private async mergeOrders(
    tx: Prisma.TransactionClient,
    rows: Array<Record<string, unknown>>,
    maps: IdMaps,
    stats: ImportMergeStats,
  ) {
    for (const row of rows) {
      const importId = str(row.id);
      const profileId = this.resolveProfileId(maps, row.profileId);
      const productImportId = str(row.productId);
      const productId =
        maps.product.get(productImportId) ?? productImportId;
      if (!importId || !profileId || !productId) {
        stats.orders.skipped++;
        continue;
      }

      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product) {
        stats.orders.skipped++;
        continue;
      }

      const orderId = readOrderBusinessId(row);
      const canonicalId = await this.resolveCanonicalId(
        tx,
        importId,
        () => tx.order.findUnique({ where: { id: importId } }),
        () =>
          orderId
            ? tx.order.findUnique({
                where: { profileId_orderId: { profileId, orderId } },
              })
            : Promise.resolve(null),
        maps.order,
      );

      const customerImportId = optStr(row.customerId);
      const customerId = customerImportId
        ? maps.customer.get(customerImportId) ?? customerImportId
        : null;
      if (customerId) {
        const customer = await tx.customer.findUnique({
          where: { id: customerId },
        });
        if (!customer) {
          stats.orders.skipped++;
          continue;
        }
      }

      const data = {
        profileId,
        orderId,
        customerId,
        productId,
        orderDate: parseDateOnly(row.orderDate) ?? new Date(),
        shipmentDate: parseDateOnly(row.shipmentDate) ?? null,
        productQty: decOrZero(row.productQty),
        packSizeSnapshot: decOrZero(row.packSizeSnapshot ?? 1),
        packPriceSnapshot: decOrZero(row.packPriceSnapshot),
        packCount: decOrZero(row.packCount ?? 1),
        unitSnapshot: (str(row.unitSnapshot) ||
          'PCS') as Prisma.OrderCreateInput['unitSnapshot'],
        unitPriceSnapshot: decOrZero(row.unitPriceSnapshot),
        stockQtySnapshot: decOrZero(row.stockQtySnapshot),
        lineTotal: decOrZero(row.lineTotal),
        discountType: (str(row.discountType) ||
          'PERCENTAGE') as Prisma.OrderCreateInput['discountType'],
        discountValue: decOrZero(row.discountValue),
        totalOrderValue: decOrZero(row.totalOrderValue),
        status: (str(row.status) ||
          'PENDING') as Prisma.OrderCreateInput['status'],
        paymentStatus: (str(row.paymentStatus) ||
          'CASH') as Prisma.OrderCreateInput['paymentStatus'],
        billStatus: (str(row.billStatus) ||
          'CREATED') as Prisma.OrderCreateInput['billStatus'],
        billDate: parseDateOnly(row.billDate) ?? null,
        invoiceStatus: (str(row.invoiceStatus) ||
          'CREATED') as Prisma.OrderCreateInput['invoiceStatus'],
        invoiceDate: parseDateOnly(row.invoiceDate) ?? null,
        paymentDueDate: parseDateOnly(row.paymentDueDate) ?? null,
        updatedAt: parseDate(row.updatedAt) ?? new Date(),
      };

      const existing = await tx.order.findUnique({
        where: { id: canonicalId! },
      });
      if (existing) {
        if (!isImportNewerOrEqual(existing, row)) {
          stats.orders.skipped++;
          continue;
        }
        await tx.order.update({ where: { id: canonicalId! }, data });
        stats.orders.updated++;
      } else {
        await tx.order.create({
          data: {
            id: canonicalId!,
            ...data,
            createdAt: parseDate(row.createdAt) ?? new Date(),
          },
        });
        stats.orders.created++;
      }
    }
  }

  private async mergeOrderLines(
    tx: Prisma.TransactionClient,
    rows: Array<Record<string, unknown>>,
    maps: IdMaps,
    stats: ImportMergeStats,
  ) {
    for (const row of rows) {
      const importId = str(row.id);
      const orderImportId = str(row.orderId);
      const orderId = maps.order.get(orderImportId) ?? orderImportId;
      const productImportId = str(row.productId);
      const productId =
        maps.product.get(productImportId) ?? productImportId;
      if (!importId || !orderId || !productId) {
        stats.orderLines.skipped++;
        continue;
      }

      const order = await tx.order.findUnique({ where: { id: orderId } });
      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!order || !product) {
        stats.orderLines.skipped++;
        continue;
      }

      const sortOrder = int(row.sortOrder);
      const canonicalId = await this.resolveCanonicalId(
        tx,
        importId,
        () => tx.orderLine.findUnique({ where: { id: importId } }),
        () =>
          tx.orderLine.findFirst({
            where: { orderId, productId, sortOrder },
          }),
        maps.orderLine,
      );

      const data = {
        orderId,
        productId,
        sortOrder,
        productQty: decOrZero(row.productQty),
        packSizeSnapshot: decOrZero(row.packSizeSnapshot ?? 1),
        packPriceSnapshot: decOrZero(row.packPriceSnapshot),
        packCount: decOrZero(row.packCount ?? 1),
        unitSnapshot: (str(row.unitSnapshot) ||
          'PCS') as Prisma.OrderLineCreateInput['unitSnapshot'],
        unitPriceSnapshot: decOrZero(row.unitPriceSnapshot),
        stockQtySnapshot: decOrZero(row.stockQtySnapshot),
        lineTotal: decOrZero(row.lineTotal),
        updatedAt: parseDate(row.updatedAt) ?? new Date(),
      };

      const existing = await tx.orderLine.findUnique({
        where: { id: canonicalId! },
      });
      if (existing) {
        if (!isImportNewerOrEqual(existing, row)) {
          stats.orderLines.skipped++;
          continue;
        }
        await tx.orderLine.update({ where: { id: canonicalId! }, data });
        stats.orderLines.updated++;
      } else {
        await tx.orderLine.create({
          data: {
            id: canonicalId!,
            ...data,
            createdAt: parseDate(row.createdAt) ?? new Date(),
          },
        });
        maps.orderLine.set(importId, canonicalId!);
        stats.orderLines.created++;
      }
    }
  }

  private async mergeInstallments(
    tx: Prisma.TransactionClient,
    rows: Array<Record<string, unknown>>,
    maps: IdMaps,
    stats: ImportMergeStats,
  ) {
    for (const row of rows) {
      const importId = str(row.id);
      const orderImportId = str(row.orderId);
      const orderId = maps.order.get(orderImportId) ?? orderImportId;
      if (!importId || !orderId) {
        stats.orderInstallments.skipped++;
        continue;
      }

      const order = await tx.order.findUnique({ where: { id: orderId } });
      if (!order) {
        stats.orderInstallments.skipped++;
        continue;
      }

      const amount = decOrZero(row.amount);
      const installmentDate =
        parseDateOnly(row.installmentDate) ?? new Date();
      const canonicalId = await this.resolveCanonicalId(
        tx,
        importId,
        () => tx.orderInstallment.findUnique({ where: { id: importId } }),
        () =>
          tx.orderInstallment.findFirst({
            where: { orderId, installmentDate, amount },
          }),
        new Map(),
      );

      const data = {
        orderId,
        amount,
        installmentDate,
        updatedAt: parseDate(row.updatedAt) ?? new Date(),
      };

      const existing = await tx.orderInstallment.findUnique({
        where: { id: canonicalId! },
      });
      if (existing) {
        if (!isImportNewerOrEqual(existing, row)) {
          stats.orderInstallments.skipped++;
          continue;
        }
        await tx.orderInstallment.update({
          where: { id: canonicalId! },
          data,
        });
        stats.orderInstallments.updated++;
      } else {
        await tx.orderInstallment.create({
          data: {
            id: canonicalId!,
            ...data,
            createdAt: parseDate(row.createdAt) ?? new Date(),
          },
        });
        stats.orderInstallments.created++;
      }
    }
  }

  private async mergeRestocks(
    tx: Prisma.TransactionClient,
    rows: Array<Record<string, unknown>>,
    maps: IdMaps,
    stats: ImportMergeStats,
  ) {
    for (const row of rows) {
      const importId = str(row.id);
      const profileId = this.resolveProfileId(maps, row.profileId);
      const productImportId = str(row.productId);
      const productId =
        maps.product.get(productImportId) ?? productImportId;
      if (!importId || !profileId || !productId) {
        stats.warehouseRestocks.skipped++;
        continue;
      }

      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product) {
        stats.warehouseRestocks.skipped++;
        continue;
      }

      const qtyAdded = decOrZero(row.qtyAdded);
      const restockDate = parseDateOnly(row.restockDate) ?? new Date();
      const stockBefore = decOrZero(row.stockBefore);
      const stockAfter = decOrZero(row.stockAfter);
      const canonicalId = await this.resolveCanonicalId(
        tx,
        importId,
        () => tx.warehouseRestock.findUnique({ where: { id: importId } }),
        () =>
          tx.warehouseRestock.findFirst({
            where: {
              profileId,
              productId,
              restockDate,
              qtyAdded,
              stockBefore,
              stockAfter,
            },
          }),
        new Map(),
      );

      const data = {
        profileId,
        productId,
        qtyAdded,
        restockDate,
        notes: str(row.notes),
        unitSnapshot: (str(row.unitSnapshot) ||
          'PCS') as Prisma.WarehouseRestockCreateInput['unitSnapshot'],
        stockBefore,
        stockAfter,
        updatedAt: parseDate(row.updatedAt) ?? new Date(),
      };

      const existing = await tx.warehouseRestock.findUnique({
        where: { id: canonicalId! },
      });
      if (existing) {
        if (!isImportNewerOrEqual(existing, row)) {
          stats.warehouseRestocks.skipped++;
          continue;
        }
        await tx.warehouseRestock.update({
          where: { id: canonicalId! },
          data,
        });
        stats.warehouseRestocks.updated++;
      } else {
        await tx.warehouseRestock.create({
          data: {
            id: canonicalId!,
            ...data,
            createdAt: parseDate(row.createdAt) ?? new Date(),
          },
        });
        stats.warehouseRestocks.created++;
      }
    }
  }

  private async mergeWarehouseSales(
    tx: Prisma.TransactionClient,
    rows: Array<Record<string, unknown>>,
    maps: IdMaps,
    stats: ImportMergeStats,
  ) {
    for (const row of rows) {
      const importId = str(row.id);
      const profileId = this.resolveProfileId(maps, row.profileId);
      const productImportId = str(row.productId);
      const productId =
        maps.product.get(productImportId) ?? productImportId;
      const orderImportId = str(row.orderId);
      const orderId = maps.order.get(orderImportId) ?? orderImportId;
      const orderLineImportId = str(row.orderLineId);
      const orderLineId =
        maps.orderLine.get(orderLineImportId) ?? orderLineImportId;
      if (
        !importId ||
        !profileId ||
        !productId ||
        !orderId ||
        !orderLineId
      ) {
        stats.warehouseSales.skipped++;
        continue;
      }

      const [product, order, orderLine] = await Promise.all([
        tx.product.findUnique({ where: { id: productId } }),
        tx.order.findUnique({ where: { id: orderId } }),
        tx.orderLine.findUnique({ where: { id: orderLineId } }),
      ]);
      if (!product || !order || !orderLine) {
        stats.warehouseSales.skipped++;
        continue;
      }

      const canonicalId = await this.resolveCanonicalId(
        tx,
        importId,
        () => tx.warehouseSale.findUnique({ where: { id: importId } }),
        () =>
          tx.warehouseSale.findUnique({
            where: { orderLineId },
          }),
        new Map(),
      );

      const data = {
        profileId,
        productId,
        orderId,
        orderLineId,
        qtySold: decOrZero(row.qtySold),
        soldDate: parseDateOnly(row.soldDate) ?? new Date(),
        notes: str(row.notes),
        unitSnapshot: (str(row.unitSnapshot) ||
          'PCS') as Prisma.WarehouseSaleCreateInput['unitSnapshot'],
        packSizeSnapshot: decOrZero(row.packSizeSnapshot ?? 1),
        packCount: decOrZero(row.packCount ?? 1),
        stockBefore: decOrZero(row.stockBefore),
        stockAfter: decOrZero(row.stockAfter),
        updatedAt: parseDate(row.updatedAt) ?? new Date(),
      };

      const existing = await tx.warehouseSale.findUnique({
        where: { id: canonicalId! },
      });
      if (existing) {
        if (!isImportNewerOrEqual(existing, row)) {
          stats.warehouseSales.skipped++;
          continue;
        }
        await tx.warehouseSale.update({
          where: { id: canonicalId! },
          data,
        });
        stats.warehouseSales.updated++;
      } else {
        await tx.warehouseSale.create({
          data: {
            id: canonicalId!,
            ...data,
            createdAt: parseDate(row.createdAt) ?? new Date(),
          },
        });
        stats.warehouseSales.created++;
      }
    }
  }
}
