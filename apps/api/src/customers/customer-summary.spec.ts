import { buildCustomerSummary } from './customer-summary';

describe('customer-summary', () => {
  it('builds pipeline snapshot', () => {
    const summary = buildCustomerSummary({
      customerCount: 10,
      approvalSum: 700,
      interestedCount: 4,
      closingCount: 2,
      promiseCount: 5,
      contactCount: 8,
    });
    expect(summary.customerCount).toBe(10);
    expect(summary.avgApproval).toBe(70);
    expect(summary.interestedCount).toBe(4);
    expect(summary.interestedRate).toBe(40);
    expect(summary.closingRate).toBe(20);
    expect(summary.promiseRate).toBe(50);
    expect(summary.contactRate).toBe(80);
  });

  it('null avg when empty', () => {
    expect(
      buildCustomerSummary({
        customerCount: 0,
        approvalSum: 0,
        interestedCount: 0,
        closingCount: 0,
        promiseCount: 0,
        contactCount: 0,
      }).avgApproval,
    ).toBeNull();
  });
});
