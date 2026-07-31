import {
  buildEFakturCsv,
  buildEFakturXml,
  buildInvoiceNumber,
  computeFiscalBreakdown,
  formatInvoiceNumberDisplay,
  formatNpwp,
  isValidInvoiceNumber,
  resolveIncludePpn,
  resolveOrderAmountDue,
} from './fiscal-invoice';

describe('fiscal-invoice', () => {
  it('computes non-PKP breakdown', () => {
    expect(
      computeFiscalBreakdown({
        orderTotal: 1000000,
        isPkp: false,
        ppnPercent: 11,
        taxInclusive: false,
      }),
    ).toEqual({
      dpp: 1000000,
      ppn: 0,
      total: 1000000,
      ppnRate: 0,
      isPkp: false,
    });
  });

  it('computes PKP tax-exclusive breakdown', () => {
    const result = computeFiscalBreakdown({
      orderTotal: 1000000,
      isPkp: true,
      ppnPercent: 11,
      taxInclusive: false,
    });
    expect(result.dpp).toBe(1000000);
    expect(result.ppn).toBe(110000);
    expect(result.total).toBe(1110000);
  });

  it('computes PKP tax-inclusive breakdown', () => {
    const result = computeFiscalBreakdown({
      orderTotal: 1110000,
      isPkp: true,
      ppnPercent: 11,
      taxInclusive: true,
    });
    expect(result.dpp).toBe(1000000);
    expect(result.ppn).toBe(110000);
    expect(result.total).toBe(1110000);
  });

  it('resolves include PPN from order override or profile', () => {
    expect(
      resolveIncludePpn({ includePpn: false }, { isPkp: true }),
    ).toBe(false);
    expect(resolveIncludePpn({ includePpn: null }, { isPkp: true })).toBe(
      true,
    );
  });

  it('resolves order amount due for PKP tax-exclusive invoices', () => {
    expect(
      resolveOrderAmountDue({
        totalOrderValue: 1_000_000,
        includePpn: null,
        profile: {
          isPkp: true,
          ppnPercent: 11,
          taxInclusive: false,
        },
      }),
    ).toBe(1_110_000);
  });

  it('formats NPWP digits', () => {
    expect(formatNpwp('123456789012345')).toBe(
      '12.345.678.9-012.345',
    );
  });

  it('builds invoice number with prefix', () => {
    expect(
      buildInvoiceNumber({
        prefix: 'INV',
        orderId: 'abc-def-123',
        orderDate: '2026-07-31',
      }),
    ).toBe('INV-20260731-ABCDEF12');
  });

  it('builds invoice number from order SKU references', () => {
    expect(
      buildInvoiceNumber({
        prefix: 'INV',
        orderId: '2030_12_30_70969176-3984-431d-a863-c60a1fa738a4',
        orderDate: '2030-12-30',
      }),
    ).toBe('INV-20301230-70969176');
  });

  it('uses fallback id when order reference is malformed', () => {
    expect(
      buildInvoiceNumber({
        prefix: 'INV',
        orderId: '2030_12_',
        orderDate: '2030-12-30',
        fallbackId: '4fbd91dc-c86b-4e1c-a5c8-105028f6ae8a',
      }),
    ).toBe('INV-20301230-4FBD91DC');
  });

  it('rejects invoice numbers with underscores', () => {
    expect(isValidInvoiceNumber('INV-20301230-2030_12_')).toBe(false);
    expect(isValidInvoiceNumber('INV-20301230-4FBD91DC')).toBe(true);
  });

  it('formats invoice numbers for readable display', () => {
    const display = formatInvoiceNumberDisplay('INV-20301230-4FBD91DC');
    expect(display.heading).toBe('INV-2030-12-30 · 4FBD91DC');
    expect(display.canonical).toBe('INV-20301230-4FBD91DC');
  });

  it('salvages messy stored invoice numbers for display', () => {
    const display = formatInvoiceNumberDisplay('INV-20301230-2030_12_');
    expect(display.heading).toContain('INV-2030-12-30');
    expect(display.serial).toMatch(/^[A-F0-9]{8}$/);
  });

  it('builds e-Faktur CSV', () => {
    const csv = buildEFakturCsv([
      {
        invoiceNumber: 'INV-1',
        invoiceDate: '2026-07-31',
        sellerNpwp: '12.345.678.9-012.345',
        sellerName: 'UMKM Seller',
        buyerNpwp: '',
        buyerName: 'Buyer',
        buyerAddress: 'Jakarta',
        dpp: 1000000,
        ppn: 110000,
        total: 1110000,
        orderReference: 'ORD-1',
        paymentTerms: 'Delayed payment',
      },
    ]);
    expect(csv).toContain('Nomor Faktur');
    expect(csv).toContain('INV-1');
    expect(csv).toContain('1110000.00');
  });

  it('builds e-Faktur XML wrapper', () => {
    const xml = buildEFakturXml([
      {
        invoiceNumber: 'INV-1',
        invoiceDate: '2026-07-31',
        sellerNpwp: '12.345.678.9-012.345',
        sellerName: 'UMKM Seller',
        buyerNpwp: '',
        buyerName: 'Buyer',
        buyerAddress: 'Jakarta',
        dpp: 1000000,
        ppn: 110000,
        total: 1110000,
        orderReference: 'ORD-1',
        paymentTerms: 'Cash',
      },
    ]);
    expect(xml).toContain('<FakturPajak');
    expect(xml).toContain('<NomorFaktur>INV-1</NomorFaktur>');
  });
});
