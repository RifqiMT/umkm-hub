import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { CompanyType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';
import { CustomerQueryDto, CustomerSummaryQueryDto } from './dto/customer-query.dto';
import { buildCustomerSku } from './customer-sku';
import { buildCustomerSummary } from './customer-summary';

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
      'search' | 'status' | 'companyType' | 'relationshipLevel'
    > = {},
  ): Prisma.CustomerWhereInput {
    return {
      profileId,
      ...(query.status && query.status.length > 0
        ? { status: { in: query.status } }
        : {}),
      ...(query.companyType ? { companyType: query.companyType } : {}),
      ...(query.relationshipLevel
        ? { relationshipLevel: query.relationshipLevel }
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
              { sku: { contains: query.search.trim(), mode: 'insensitive' } },
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
      if (customer.sku === expected) continue;
      await this.prisma.customer.update({
        where: { id: customer.id },
        data: { sku: expected },
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
        sku,
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
      `Customer created: ${customer.id} sku=${sku} by ${profileId}`,
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
          OR: [
            { email: { not: '' } },
            { phone: { not: '' } },
          ],
        }),
      }),
    ]);

    return buildCustomerSummary({
      customerCount: agg._count,
      approvalSum: agg._sum.approvalPercentage ?? 0,
      interestedCount,
      closingCount,
      promiseCount,
      contactCount,
    });
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
    if (customer.sku !== expected) {
      customer = await this.prisma.customer.update({
        where: { id: customer.id },
        data: { sku: expected },
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
      data: { ...dto, sku },
    });
    this.logger.log(`Customer updated: ${id} sku=${sku}`);
    return customer;
  }

  async remove(profileId: string, id: string) {
    await this.findOne(profileId, id);
    await this.prisma.customer.delete({ where: { id } });
    this.logger.log(`Customer deleted: ${id}`);
    return { deleted: true };
  }
}
