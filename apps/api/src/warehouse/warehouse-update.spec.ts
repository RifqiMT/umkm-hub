import { BadRequestException } from '@nestjs/common';
import { WarehouseService } from './warehouse.service';

describe('WarehouseService.update', () => {
  const profileId = 'profile-1';
  const restockId = 'restock-1';
  const productId = 'product-1';

  function productStub(stockQty = 15) {
    return {
      id: productId,
      profileId,
      name: 'Coffee',
      productId: 'CF_1',
      unit: 'PCS',
      stockQty,
      pricePerUnit: 1000,
      costPerUnit: 500,
      price50: null,
      price100: null,
      price250: null,
      price500: null,
      price1000: null,
      priceCustom: null,
      cost50: null,
      cost100: null,
      cost250: null,
      cost500: null,
      cost1000: null,
      costCustom: null,
      customSize: null,
      details: '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  function buildService(overrides: {
    existing?: Record<string, unknown> | null;
    productStock?: number;
    subsequent?: Array<Record<string, unknown>>;
  }) {
    const productUpdate = jest.fn();
    const restockUpdate = jest.fn().mockImplementation(({ where, data }) => ({
      id: where.id,
      profileId,
      productId,
      qtyAdded: data.qtyAdded ?? 10,
      restockDate: data.restockDate ?? new Date('2026-01-15'),
      notes: data.notes ?? '',
      unitSnapshot: 'PCS',
      stockBefore: 5,
      stockAfter: data.stockAfter ?? 15,
      createdAt: new Date('2026-01-15T10:00:00Z'),
      updatedAt: new Date(),
      product: productStub(overrides.productStock ?? 15),
    }));

    const tx = {
      warehouseRestock: {
        findFirst: jest.fn().mockResolvedValue(overrides.existing ?? null),
        findMany: jest.fn().mockResolvedValue(overrides.subsequent ?? []),
        update: restockUpdate,
      },
      product: {
        update: productUpdate,
      },
    };

    const prisma = {
      $transaction: jest
        .fn()
        .mockImplementation((fn: (client: typeof tx) => unknown) => fn(tx)),
    };

    const service = new WarehouseService(prisma as never);
    return { service, productUpdate, restockUpdate };
  }

  it('rejects qty changes that would make stock negative', async () => {
    const { service } = buildService({
      existing: {
        id: restockId,
        profileId,
        productId,
        qtyAdded: 10,
        stockBefore: 5,
        stockAfter: 15,
        restockDate: new Date('2026-01-15'),
        createdAt: new Date('2026-01-15T10:00:00Z'),
        product: productStub(8),
      },
      productStock: 8,
    });

    await expect(
      service.update(profileId, restockId, { qtyAdded: 1 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('shifts later restocks when qty changes', async () => {
    const subsequent = [
      {
        id: 'restock-2',
        stockBefore: 15,
        stockAfter: 20,
      },
    ];
    const { service, productUpdate, restockUpdate } = buildService({
      existing: {
        id: restockId,
        profileId,
        productId,
        qtyAdded: 10,
        stockBefore: 5,
        stockAfter: 15,
        restockDate: new Date('2026-01-15'),
        createdAt: new Date('2026-01-15T10:00:00Z'),
        product: productStub(20),
      },
      productStock: 20,
      subsequent,
    });

    await service.update(profileId, restockId, { qtyAdded: 12 });

    expect(productUpdate).toHaveBeenCalledWith({
      where: { id: productId },
      data: { stockQty: 22 },
    });
    expect(restockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'restock-2' },
        data: { stockBefore: 17, stockAfter: 22 },
      }),
    );
  });
});
