import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationQueryDto } from '../common/dto/pagination.dto';
import {
  decimalToNumber,
  serializeWarehouseRestock,
} from '../common/utils/serialize';
import { CreateWarehouseRestockDto } from './dto/warehouse.dto';
import {
  parseDateOnlyForTest as parseDateOnly,
  todayDateOnlyForTest as todayDateOnly,
} from './warehouse-dates';

@Injectable()
export class WarehouseService {
  private readonly logger = new Logger(WarehouseService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(profileId: string, dto: CreateWarehouseRestockDto) {
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findFirst({
        where: { id: dto.productId, profileId },
      });
      if (!product) {
        throw new NotFoundException('Product not found');
      }

      if (!(dto.qtyAdded > 0)) {
        throw new BadRequestException('Qty added must be greater than 0');
      }

      let restockDate: Date;
      try {
        restockDate = dto.restockDate
          ? parseDateOnly(dto.restockDate)
          : todayDateOnly();
      } catch (err) {
        throw new BadRequestException(
          err instanceof Error ? err.message : 'Invalid restock date',
        );
      }

      const stockBefore = decimalToNumber(product.stockQty);
      const stockAfter = stockBefore + dto.qtyAdded;

      const restock = await tx.warehouseRestock.create({
        data: {
          profileId,
          productId: product.id,
          qtyAdded: dto.qtyAdded,
          restockDate,
          notes: dto.notes?.trim() ?? '',
          unitSnapshot: product.unit,
          stockBefore,
          stockAfter,
        },
      });

      const updatedProduct = await tx.product.update({
        where: { id: product.id },
        data: { stockQty: stockAfter },
      });

      this.logger.log(
        `Warehouse restock ${restock.id}: +${dto.qtyAdded} on product ${product.id}`,
      );
      return serializeWarehouseRestock({
        ...restock,
        product: updatedProduct,
      });
    });
  }

  async findAll(profileId: string, query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.WarehouseRestockWhereInput = { profileId };
    if (query.search?.trim()) {
      where.product = {
        name: { contains: query.search.trim(), mode: 'insensitive' },
      };
    }

    const [total, items] = await this.prisma.$transaction([
      this.prisma.warehouseRestock.count({ where }),
      this.prisma.warehouseRestock.findMany({
        where,
        include: { product: true },
        orderBy: [{ restockDate: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      items: items.map(serializeWarehouseRestock),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  async findOne(profileId: string, id: string) {
    const restock = await this.prisma.warehouseRestock.findFirst({
      where: { id, profileId },
      include: { product: true },
    });
    if (!restock) {
      throw new NotFoundException('Restock not found');
    }
    return serializeWarehouseRestock(restock);
  }
}
