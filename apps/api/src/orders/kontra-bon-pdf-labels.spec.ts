import { buildKontraBonLabels } from './kontra-bon-pdf-labels';

describe('kontra-bon-pdf-labels', () => {
  it('keeps acknowledgment short and amount-aware', () => {
    const labels = buildKontraBonLabels();
    expect(labels.documentTitle).toBe('Kontra bon');
    expect(labels.acknowledgmentBody('Rp 100.000', '26 Aug 2026')).toContain(
      'Rp 100.000',
    );
    expect(labels.colProducts).toBe('Products');
    expect(labels.colStocks).toBe('Product stocks');
    expect(labels.colAmount).toBe('Amount');
    expect(labels.detailsTitle).toBe('Product list');
    expect(labels.calculationTitle).toBe('Order calculation');
  });

  it('exposes compact chrome labels', () => {
    const labels = buildKontraBonLabels();
    expect(labels.pageOf(1, 2)).toBe('1 / 2');
    expect(labels.productsCount(2)).toBe('2 products');
  });
});
