import {
  buildProductSku,
  buildProductSkuFromProduct,
  buildProductSkuPrefix,
  compactProductSku,
  formatSkuPackSize,
  productNameInitials,
} from './product-sku';

describe('productNameInitials', () => {
  it('skips color words then uses consonants (Cabai Merah → CB)', () => {
    expect(productNameInitials('Cabai Merah')).toBe('CB');
    expect(productNameInitials('Cabai Merah (100)')).toBe('CB');
    expect(productNameInitials('Cabai')).toBe('CB');
  });

  it('uses first letters of remaining words (Kaki Ayam → KA)', () => {
    expect(productNameInitials('Kaki Ayam')).toBe('KA');
    expect(productNameInitials('Kaki Ayam (1250)')).toBe('KA');
  });
});

describe('buildProductSku', () => {
  const systemId = '00000000-0000-4000-8000-000000000001';

  it('merges prefix with system id', () => {
    expect(buildProductSku('Cabai Merah', 100, systemId)).toBe(
      `CB_100_${systemId}`,
    );
    expect(buildProductSku('Cabai Merah (1000)', 1000, systemId)).toBe(
      `CB_1000_${systemId}`,
    );
    expect(buildProductSku('Kaki Ayam (500)', 500, systemId)).toBe(
      `KA_500_${systemId}`,
    );
    expect(buildProductSku('Kaki Ayam (1250)', 1250, systemId)).toBe(
      `KA_1250_${systemId}`,
    );
  });

  it('keeps prefix helper without system id', () => {
    expect(buildProductSkuPrefix('Cabai Merah', 100)).toBe('CB_100_');
  });

  it('formats fractional pack sizes cleanly', () => {
    expect(formatSkuPackSize(12.5)).toBe('12.5');
    expect(formatSkuPackSize(100.0)).toBe('100');
  });
});

describe('buildProductSkuFromProduct', () => {
  it('uses active pack size for gram products', () => {
    expect(
      buildProductSkuFromProduct(
        'Cabai Merah',
        {
          unit: 'GRAM',
          pricePerUnit: 10,
          costPerUnit: null,
          price50: null,
          price100: 2000,
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
        },
        '00000000-0000-4000-8000-000000000001',
      ),
    ).toBe('CB_100_00000000-0000-4000-8000-000000000001');
  });
});

describe('compactProductSku', () => {
  it('shortens long system tails for list badges', () => {
    expect(
      compactProductSku('CB_100_00000000-0000-4000-8000-000000000001'),
    ).toMatch(/^CB_100_/);
  });
});
