import { Decimal } from '@prisma/client/runtime/library';
import { ProductUnit } from '@prisma/client';
import { serializeWarehouseSale } from './serialize';

describe('serializeWarehouseSale', () => {
  it('exposes numeric stock movement and orderRef', () => {
    const soldDate = new Date('2026-08-01T00:00:00.000Z');
    const orderDate = new Date('2026-08-01T00:00:00.000Z');
    const result = serializeWarehouseSale({
      id: 'sale-1',
      profileId: 'p1',
      productId: 'prod-1',
      orderId: 'ord-uuid',
      orderLineId: 'line-1',
      qtySold: new Decimal('2.5'),
      soldDate,
      notes: 'Order ORD-99',
      unitSnapshot: ProductUnit.PCS,
      packSizeSnapshot: new Decimal(1),
      packCount: new Decimal(2.5),
      stockBefore: new Decimal(10),
      stockAfter: new Decimal(7.5),
      createdAt: soldDate,
      updatedAt: soldDate,
      order: {
        id: 'ord-uuid',
        orderId: 'ORD-99',
        orderDate,
      },
      product: null,
    });

    expect(result.qtySold).toBe(2.5);
    expect(result.stockBefore).toBe(10);
    expect(result.stockAfter).toBe(7.5);
    expect(result.soldDate).toBe('2026-08-01');
    expect(result.unit).toBe(ProductUnit.PCS);
    expect(result.orderRef).toBe('ORD-99');
    expect(result.order).toEqual({
      id: 'ord-uuid',
      orderId: 'ORD-99',
      orderDate: '2026-08-01',
    });
  });
});
