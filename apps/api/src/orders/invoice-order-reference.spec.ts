import {
  formatOrderReferenceForInvoice,
  splitOrderReferenceLines,
  formatOrderReferenceBrief,
} from './invoice-order-reference';

describe('invoice-order-reference', () => {
  it('parses standard order SKU references', () => {
    const ref = formatOrderReferenceForInvoice(
      '2030_12_30_70969176-3984-431d-a863-c60a1fa738a4',
    );
    expect(ref.prefix).toBe('2030_12_30');
    expect(ref.entityId).toBe('70969176-3984-431d-a863-c60a1fa738a4');
    expect(ref.dateLabel).toBe('30 Dec 2030');
    expect(ref.shortId).toBe('1FA738A4');
    expect(ref.summary).toContain('30 Dec 2030');
    expect(ref.summary).toContain('1FA738A4');
  });

  it('falls back for non-standard references', () => {
    const ref = formatOrderReferenceForInvoice('2026_07_31_ABCD1234');
    expect(ref.full).toBe('2026_07_31_ABCD1234');
    expect(ref.summary).toBeTruthy();
  });

  it('formats brief order reference for invoice headers', () => {
    expect(
      formatOrderReferenceBrief('2030_12_30_70969176-3984-431d-a863-c60a1fa738a4'),
    ).toBe('30 Dec 2030 · Ref 1FA738A4');
  });

  it('splits long references on prefix boundary', () => {
    const display = formatOrderReferenceForInvoice(
      '2030_12_30_70969176-3984-431d-a863-c60a1fa738a4',
    );
    expect(splitOrderReferenceLines(display)).toEqual([
      '30 Dec 2030',
      '70969176-3984-431d-a863-c60a1fa738a4',
    ]);
  });

  it('compact literal shortens UUID tail', () => {
    const display = formatOrderReferenceForInvoice(
      '2030_12_30_70969176-3984-431d-a863-c60a1fa738a4',
    );
    expect(display.summary).toBe('30 Dec 2030 · …1FA738A4');
  });
});
