import {
  assertInstallmentsChronological,
  assertInstallmentsWithinTotal,
  calculateRemainingAmount,
  sumInstallmentAmounts,
} from './order-installments';

describe('order-installments', () => {
  it('sums installment amounts', () => {
    expect(
      sumInstallmentAmounts([{ amount: 10 }, { amount: 15.5 }, { amount: 0 }]),
    ).toBe(25.5);
  });

  it('computes remaining amount and clamps at zero', () => {
    expect(
      calculateRemainingAmount(100, [{ amount: 40 }, { amount: 25 }]),
    ).toBe(35);
    expect(calculateRemainingAmount(50, [{ amount: 50 }])).toBe(0);
    expect(calculateRemainingAmount(50, [{ amount: 60 }])).toBe(0);
  });

  it('rejects installments above total', () => {
    expect(() =>
      assertInstallmentsWithinTotal(100, [{ amount: 60 }, { amount: 50 }]),
    ).toThrow(/exceed order total/);
  });

  it('rejects installment dates that go backwards', () => {
    expect(() =>
      assertInstallmentsChronological([
        { installmentDate: '2026-08-01' },
        { installmentDate: '2026-07-25' },
      ]),
    ).toThrow(/cannot be before/);
  });

  it('allows equal or increasing installment dates', () => {
    expect(() =>
      assertInstallmentsChronological([
        { installmentDate: '2026-07-25' },
        { installmentDate: '2026-07-25' },
        { installmentDate: '2026-08-01' },
      ]),
    ).not.toThrow();
  });
});
