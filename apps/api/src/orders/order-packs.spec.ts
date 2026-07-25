import { listProductPacks, resolveOrderPack } from './order-packs';
import { ProductUnit } from '@prisma/client';

describe('order packs', () => {
  const gramProduct = {
    unit: ProductUnit.GRAM,
    pricePerUnit: 200,
    price50: null,
    price100: 20000,
    price250: null,
    price500: null,
    price1000: null,
    priceCustom: 9000,
    customSize: 75,
  } as never;

  it('lists configured packs for gram products', () => {
    const packs = listProductPacks(gramProduct);
    expect(packs).toEqual([
      { key: '100', size: 100, price: 20000 },
      { key: 'CUSTOM', size: 75, price: 9000 },
    ]);
  });

  it('resolves pack price and stock qty from pack selection', () => {
    const resolved = resolveOrderPack({
      product: gramProduct,
      packSize: 100,
      packCount: 2,
    });
    expect(resolved.packPrice).toBe(20000);
    expect(resolved.productQty).toBe(200);
    expect(resolved.unitPrice).toBe(200);
    expect(resolved.packCount).toBe(2);
  });

  it('uses pcs price for PCS products without pack size', () => {
    const resolved = resolveOrderPack({
      product: {
        unit: ProductUnit.PCS,
        pricePerUnit: 15000,
        price50: null,
        price100: null,
        price250: null,
        price500: null,
        price1000: null,
        priceCustom: null,
        customSize: null,
      } as never,
      packCount: 3,
    });
    expect(resolved.packSize).toBe(1);
    expect(resolved.packPrice).toBe(15000);
    expect(resolved.productQty).toBe(3);
    expect(resolved.unitPrice).toBe(15000);
  });

  it('rejects unknown pack size', () => {
    expect(() =>
      resolveOrderPack({
        product: gramProduct,
        packSize: 250,
        packCount: 1,
      }),
    ).toThrow(/not available/);
  });
});
