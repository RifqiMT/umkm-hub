import { ProductUnit } from '@prisma/client';
import {
  buildProductFilterSql,
  mapInventoryValueRow,
} from './product-inventory-sql';

describe('product-inventory-sql', () => {
  it('always scopes by profileId', () => {
    const sql = buildProductFilterSql({ profileId: 'prof-1' });
    expect(sql.strings.join('?')).toContain('profileId');
  });

  it('applies unit + stock filters', () => {
    const sql = buildProductFilterSql({
      profileId: 'prof-1',
      unit: [ProductUnit.PCS, ProductUnit.GRAM],
      stockStatus: ['in_stock'],
    });
    const text = sql.strings.join(' ');
    expect(text).toContain('unit IN');
    expect(text).toContain('stockQty');
  });

  it('maps raw aggregate row', () => {
    expect(
      mapInventoryValueRow({
        sellValue: 100,
        costedSellValue: 80,
        costValue: 40,
        profitValue: 40,
        hasCost: true,
      }),
    ).toEqual({
      sellValue: 100,
      costedSellValue: 80,
      costValue: 40,
      profitValue: 40,
      hasCost: true,
    });
  });
});
