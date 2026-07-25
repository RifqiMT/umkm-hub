import {
  buildOrderSku,
  buildOrderSkuPrefix,
  orderDateParts,
} from './order-sku';

describe('orderDateParts', () => {
  it('parses ISO date strings', () => {
    expect(orderDateParts('2026-07-25')).toEqual({
      year: '2026',
      month: '07',
      day: '25',
    });
  });

  it('parses Date at UTC midnight', () => {
    expect(orderDateParts(new Date('2026-03-01T00:00:00.000Z'))).toEqual({
      year: '2026',
      month: '03',
      day: '01',
    });
  });
});

describe('buildOrderSkuPrefix', () => {
  it('matches YYYY_MM_DD_', () => {
    expect(buildOrderSkuPrefix('2026-07-25')).toBe('2026_07_25_');
    expect(buildOrderSkuPrefix('2025-01-09')).toBe('2025_01_09_');
  });
});

describe('buildOrderSku', () => {
  it('merges prefix with system id', () => {
    const id = '00000000-0000-4000-8000-000000000001';
    expect(buildOrderSku('2026-07-25', id)).toBe(`2026_07_25_${id}`);
  });
});
