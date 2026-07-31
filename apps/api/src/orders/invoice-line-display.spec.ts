import {
  compactQty,
  formatDiscountLabel,
  formatInvoiceQuantity,
  formatInvoiceQuantityLines,
  formatQtyFull,
} from './invoice-line-display';

describe('invoice-line-display', () => {
  it('formats PCS quantity', () => {
    expect(
      formatInvoiceQuantity({
        packCount: 2,
        packSizeSnapshot: 1,
        unit: 'PCS',
      }),
    ).toBe('2 pcs');
  });

  it('formats gram pack quantity with compact large pack counts', () => {
    expect(
      formatInvoiceQuantity({
        packCount: 51_792_787,
        packSizeSnapshot: 500,
        unit: 'GRAM',
      }),
    ).toBe('51.79M × 500 g');
  });

  it('formats full-number quantity lines for PDF export', () => {
    expect(
      formatInvoiceQuantityLines({
        packCount: 62_720_000,
        packSizeSnapshot: 500,
        unit: 'GRAM',
      }),
    ).toEqual({
      packs: '62.720.000 packs',
      packSize: '500 g each',
    });
  });

  it('formats single-piece PCS without a pack-size line', () => {
    expect(
      formatInvoiceQuantityLines({
        packCount: 12,
        packSizeSnapshot: 1,
        unit: 'PCS',
      }),
    ).toEqual({
      packs: '12 pcs',
      packSize: '',
    });
  });

  it('formatQtyFull uses Indonesian grouping', () => {
    expect(formatQtyFull(2_820_000_000_000)).toBe('2.820.000.000.000');
  });

  it('rounds discount percent labels', () => {
    expect(formatDiscountLabel('PERCENTAGE', 2.8858)).toBe('Discount (2.89%)');
    expect(formatDiscountLabel('AMOUNT', 5000)).toBe('Discount');
  });

  it('compactQty handles billions', () => {
    expect(compactQty(31_359_757_500)).toBe('31.36B');
  });
});
