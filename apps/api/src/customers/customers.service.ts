import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { CompanyType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';
import { CustomerQueryDto } from './dto/customer-query.dto';
import { buildCustomerSku } from './customer-sku';

@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);

  constructor(private readonly prisma: PrismaService) {}

  private skuFor(name: string, companyType: CompanyType, id: string) {
    return buildCustomerSku(name, companyType, id);
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

  async findAll(profileId: string, query: CustomerQueryDto) {
    await this.backfillMissingSkus(profileId);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.CustomerWhereInput = {
      profileId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.companyType ? { companyType: query.companyType } : {}),
      ...(query.relationshipLevel
        ? { relationshipLevel: query.relationshipLevel }
        : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { companyName: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
              { city: { contains: query.search, mode: 'insensitive' } },
              { province: { contains: query.search, mode: 'insensitive' } },
              { country: { contains: query.search, mode: 'insensitive' } },
              { postalCode: { contains: query.search, mode: 'insensitive' } },
              { sku: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

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
