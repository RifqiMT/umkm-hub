import { ratePercent } from '../common/summary-rates';
import { roundMoney } from '../revenue-targets/revenue-target-math';

export type CustomerPipelineAgg = {
  customerCount: number;
  approvalSum: number;
  interestedCount: number;
  closingCount: number;
  promiseCount: number;
  contactCount: number;
};

export function buildCustomerSummary(agg: CustomerPipelineAgg) {
  const count = Math.max(0, agg.customerCount);
  return {
    customerCount: count,
    avgApproval:
      count > 0 ? roundMoney(agg.approvalSum / count) : null,
    interestedCount: Math.max(0, agg.interestedCount),
    interestedRate: ratePercent(agg.interestedCount, count),
    closingRate: ratePercent(agg.closingCount, count),
    promiseRate: ratePercent(agg.promiseCount, count),
    contactRate: ratePercent(agg.contactCount, count),
  };
}
