import {
  buildCustomerSku,
  buildCustomerSkuPrefix,
  companyTypeLetter,
  customerNameSegment,
} from './customer-sku';

describe('customerNameSegment', () => {
  it('takes two letters in Title case', () => {
    expect(customerNameSegment('Budi')).toBe('Bu');
    expect(customerNameSegment('Santoso')).toBe('Sa');
    expect(customerNameSegment('Tjahyono')).toBe('Tj');
    expect(customerNameSegment('Muhammad')).toBe('Mu');
  });
});

describe('companyTypeLetter', () => {
  it('maps company types', () => {
    expect(companyTypeLetter('RESTAURANT')).toBe('R');
    expect(companyTypeLetter('HOTEL')).toBe('H');
    expect(companyTypeLetter('STORE')).toBe('S');
  });
});

describe('buildCustomerSkuPrefix', () => {
  it('matches the catalog examples', () => {
    expect(buildCustomerSkuPrefix('Budi Santoso', 'RESTAURANT')).toBe('BuSaR_');
    expect(buildCustomerSkuPrefix('Rifqi Muhammad Tjahyono', 'HOTEL')).toBe(
      'RiMuTjH_',
    );
    expect(
      buildCustomerSkuPrefix('Afif Rizaldi Muhammad Tjahyono', 'STORE'),
    ).toBe('AfRiMuTjS_');
    expect(buildCustomerSkuPrefix('Siti Aminah', 'RESTAURANT')).toBe('SiAmR_');
  });
});

describe('buildCustomerSku', () => {
  it('merges prefix with system id', () => {
    const id = '00000000-0000-4000-8000-000000000001';
    expect(buildCustomerSku('Budi Santoso', 'RESTAURANT', id)).toBe(
      `BuSaR_${id}`,
    );
  });
});
