import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { CompanyType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';
import { CustomerQueryDto, CustomerSummaryQueryDto } from './dto/customer-query.dto';
import { buildCustomerSku } from './customer-sku';
import { buildCustomerSummary } from './customer-summary';
import { buildCustomerStatistics } from './customer-statistics';

/** Lean list row — long text loads on GET /customers/:id. */
const customerListSelect = {
  id: true,
  customerId: true,
  name: true,
  title: true,
  companyName: true,
  companyType: true,
  email: true,
  phone: true,
  city: true,
  province: true,
  country: true,
  partnershipStage: true,
  status: true,
  promiseAnnualBonus: true,
  promiseOnTimeDelivery: true,
  promisePackagingBox: true,
  relationshipLevel: true,
  approvalPercentage: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.CustomerSelect;

@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);

  constructor(private readonly prisma: PrismaService) {}

  private skuFor(name: string, companyType: CompanyType, id: string) {
    return buildCustomerSku(name, companyType, id);
  }

  private buildCustomerWhere(
    profileId: string,
    query: Pick<
      CustomerQueryDto,
      | 'search'
      | 'status'
      | 'companyType'
      | 'relationshipLevel'
      | 'partnershipStage'
    > = {},
  ): Prisma.CustomerWhereInput {
    return {
      profileId,
      ...(query.status && query.status.length > 0
        ? { status: { in: query.status } }
        : {}),
      ...(query.companyType && query.companyType.length > 0
        ? { companyType: { in: query.companyType } }
        : {}),
      ...(query.relationshipLevel && query.relationshipLevel.length > 0
        ? { relationshipLevel: { in: query.relationshipLevel } }
        : {}),
      ...(query.partnershipStage && query.partnershipStage.length > 0
        ? { partnershipStage: { in: query.partnershipStage } }
        : {}),
      ...(query.search?.trim()
        ? {
            OR: [
              { name: { contains: query.search.trim(), mode: 'insensitive' } },
              {
                companyName: {
                  contains: query.search.trim(),
                  mode: 'insensitive',
                },
              },
              { email: { contains: query.search.trim(), mode: 'insensitive' } },
              { city: { contains: query.search.trim(), mode: 'insensitive' } },
              {
                province: {
                  contains: query.search.trim(),
                  mode: 'insensitive',
                },
              },
              {
                country: {
                  contains: query.search.trim(),
                  mode: 'insensitive',
                },
              },
              {
                postalCode: {
                  contains: query.search.trim(),
                  mode: 'insensitive',
                },
              },
              { customerId: { contains: query.search.trim(), mode: 'insensitive' } },
            ],
          }
        : {}),
    };
  }

  /** Align skus to `{NameSegments}{Type}_{uuid}` (safe to call repeatedly). */
  async backfillMissingSkus(profileId?: string) {
    const customers = await this.prisma.customer.findMany({
      where: profileId ? { profileId } : undefined,
      orderBy: { createdAt: 'asc' },
    });
    let updated = 0;
    for (const customer of customers) {
      const expected = this.skuFor(
        customer.name,
        customer.companyType,
        customer.id,
      );
      if (customer.customerId === expected) continue;
      await this.prisma.customer.update({
        where: { id: customer.id },
        data: { customerId: expected },
      });
      updated += 1;
    }
    if (updated > 0) {
      this.logger.log(`Customer SKU backfill updated ${updated} rows`);
    }
    return { updated };
  }

  async create(profileId: string, dto: CreateCustomerDto) {
    const id = randomUUID();
    const sku = this.skuFor(dto.name, dto.companyType, id);
    const customer = await this.prisma.customer.create({
      data: {
        id,
        profileId,
        name: dto.name,
        customerId: sku,
        title: dto.title,
        companyName: dto.companyName,
        companyType: dto.companyType,
        email: dto.email ?? '',
        phone: dto.phone ?? '',
        address: dto.address ?? '',
        additionalAddress: dto.additionalAddress ?? '',
        postalCode: dto.postalCode ?? '',
        city: dto.city ?? '',
        province: dto.province ?? '',
        country: dto.country ?? '',
        partnershipStage: dto.partnershipStage ?? null,
        status: dto.status ?? null,
        customerNeeds: dto.customerNeeds ?? '',
        desiredStandards: dto.desiredStandards ?? '',
        promiseAnnualBonus: dto.promiseAnnualBonus ?? false,
        promiseOnTimeDelivery: dto.promiseOnTimeDelivery ?? false,
        promisePackagingBox: dto.promisePackagingBox ?? false,
        relationshipLevel: dto.relationshipLevel ?? null,
        approvalPercentage: dto.approvalPercentage ?? 0,
        remarks: dto.remarks ?? '',
      },
    });
    this.logger.log(
      `Customer created: ${customer.id} customerId=${sku} by ${profileId}`,
    );
    return customer;
  }

  async getSummary(profileId: string, query: CustomerSummaryQueryDto = {}) {
    const where = this.buildCustomerWhere(profileId, query);
    const and = (extra: Prisma.CustomerWhereInput): Prisma.CustomerWhereInput => ({
      AND: [where, extra],
    });

    // SQL-side counts/aggregates — avoid hydrating every CRM row into Node.
    const [
      agg,
      interestedCount,
      closingCount,
      promiseCount,
      contactCount,
      companyTypeRows,
      partnershipStageRows,
      statusRows,
      relationshipLevelRows,
      cityRows,
      provinceRows,
      countryRows,
      customerNeedsWith,
      desiredStandardsWith,
      remarksWith,
      promiseAnnualBonus,
      promiseOnTimeDelivery,
      promisePackagingBox,
    ] = await Promise.all([
      this.prisma.customer.aggregate({
        where,
        _count: true,
        _sum: { approvalPercentage: true },
      }),
      this.prisma.customer.count({
        where: and({ status: 'INTERESTED' }),
      }),
      this.prisma.customer.count({
        where: and({ relationshipLevel: 'CLOSING_FIRST_ORDER' }),
      }),
      this.prisma.customer.count({
        where: and({
          OR: [
            { promiseAnnualBonus: true },
            { promiseOnTimeDelivery: true },
            { promisePackagingBox: true },
          ],
        }),
      }),
      this.prisma.customer.count({
        where: and({
          OR: [{ email: { not: '' } }, { phone: { not: '' } }],
        }),
      }),
      this.prisma.customer.groupBy({
        by: ['companyType'],
        where,
        _count: true,
      }),
      this.prisma.customer.groupBy({
        by: ['partnershipStage'],
        where,
        _count: true,
      }),
      this.prisma.customer.groupBy({
        by: ['status'],
        where,
        _count: true,
      }),
      this.prisma.customer.groupBy({
        by: ['relationshipLevel'],
        where,
        _count: true,
      }),
      this.prisma.customer.groupBy({
        by: ['city'],
        where,
        _count: true,
      }),
      this.prisma.customer.groupBy({
        by: ['province'],
        where,
        _count: true,
      }),
      this.prisma.customer.groupBy({
        by: ['country'],
        where,
        _count: true,
      }),
      this.prisma.customer.count({
        where: and({ NOT: { customerNeeds: '' } }),
      }),
      this.prisma.customer.count({
        where: and({ NOT: { desiredStandards: '' } }),
      }),
      this.prisma.customer.count({
        where: and({ NOT: { remarks: '' } }),
      }),
      this.prisma.customer.count({
        where: and({ promiseAnnualBonus: true }),
      }),
      this.prisma.customer.count({
        where: and({ promiseOnTimeDelivery: true }),
      }),
      this.prisma.customer.count({
        where: and({ promisePackagingBox: true }),
      }),
    ]);

    const customerCount = agg._count;

    return {
      ...buildCustomerSummary({
        customerCount,
        approvalSum: agg._sum.approvalPercentage ?? 0,
        interestedCount,
        closingCount,
        promiseCount,
        contactCount,
      }),
      statistics: buildCustomerStatistics({
        customerCount,
        companyType: companyTypeRows.map((row) => ({
          key: row.companyType,
          count: row._count,
        })),
        partnershipStage: partnershipStageRows.map((row) => ({
          key: row.partnershipStage ?? 'UNSET',
          count: row._count,
        })),
        status: statusRows.map((row) => ({
          key: row.status ?? 'UNSET',
          count: row._count,
        })),
        relationshipLevel: relationshipLevelRows.map((row) => ({
          key: row.relationshipLevel ?? 'UNSET',
          count: row._count,
        })),
        customerNeeds: {
          withCount: customerNeedsWith,
          withoutCount: customerCount - customerNeedsWith,
        },
        desiredStandards: {
          withCount: desiredStandardsWith,
          withoutCount: customerCount - desiredStandardsWith,
        },
        remarks: {
          withCount: remarksWith,
          withoutCount: customerCount - remarksWith,
        },
        customerPromise: {
          withCount: promiseCount,
          withoutCount: customerCount - promiseCount,
          annualBonus: promiseAnnualBonus,
          onTimeDelivery: promiseOnTimeDelivery,
          packagingBox: promisePackagingBox,
        },
        city: cityRows.map((row) => ({
          key: row.city,
          count: row._count,
        })),
        province: provinceRows.map((row) => ({
          key: row.province,
          count: row._count,
        })),
        country: countryRows.map((row) => ({
          key: row.country,
          count: row._count,
        })),
      }),
    };
  }

  async findAll(profileId: string, query: CustomerQueryDto) {
    // SKU backfill is offline/CLI only — never on the list hot path.
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = this.buildCustomerWhere(profileId, query);

    const [total, items] = await this.prisma.$transaction([
      this.prisma.customer.count({ where }),
      this.prisma.customer.findMany({
        where,
        select: customerListSelect,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  async findOne(profileId: string, id: string) {
    let customer = await this.prisma.customer.findFirst({
      where: { id, profileId },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }
    const expected = this.skuFor(
      customer.name,
      customer.companyType,
      customer.id,
    );
    if (customer.customerId !== expected) {
      customer = await this.prisma.customer.update({
        where: { id: customer.id },
        data: { customerId: expected },
      });
    }
    return customer;
  }

  async update(profileId: string, id: string, dto: UpdateCustomerDto) {
    const existing = await this.findOne(profileId, id);
    const name = dto.name ?? existing.name;
    const companyType = dto.companyType ?? existing.companyType;
    const sku = this.skuFor(name, companyType, id);
    const customer = await this.prisma.customer.update({
      where: { id },
      data: { ...dto, customerId: sku },
    });
    this.logger.log(`Customer updated: ${id} customerId=${sku}`);
    return customer;
  }

  async remove(profileId: string, id: string) {
    await this.findOne(profileId, id);
    await this.prisma.customer.delete({ where: { id } });
    this.logger.log(`Customer deleted: ${id}`);
    return { deleted: true };
  }
}
