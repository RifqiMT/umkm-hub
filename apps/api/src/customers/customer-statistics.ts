import {
  CompanyType,
  CustomerStatus,
  PartnershipStage,
  RelationshipLevel,
} from '@prisma/client';
import {
  type CountBucketInput,
  normalizeEnumBuckets,
  normalizeGeoBuckets,
  type StatBucket,
  toStatBuckets,
  toWithWithoutStats,
  type WithWithoutInput,
  type WithWithoutStats,
} from '../common/statistics-buckets';
import { ratePercent } from '../common/summary-rates';

export { normalizeEnumBuckets, normalizeGeoBuckets } from '../common/statistics-buckets';

const COMPANY_TYPE_KEYS = [
  CompanyType.RESTAURANT,
  CompanyType.HOTEL,
  CompanyType.STORE,
] as const;

const PARTNERSHIP_STAGE_KEYS = [
  PartnershipStage.WHATSAPP,
  PartnershipStage.EMAIL,
  PartnershipStage.DIRECT_VISIT,
  'UNSET',
] as const;

const CUSTOMER_STATUS_KEYS = [
  CustomerStatus.NOT_INTERESTED,
  CustomerStatus.DOUBTFUL,
  CustomerStatus.INTERESTED,
  CustomerStatus.OTHERS,
  'UNSET',
] as const;

const RELATIONSHIP_LEVEL_KEYS = [
  RelationshipLevel.NEGOTIATION,
  RelationshipLevel.REQUEST_SAMPLE,
  RelationshipLevel.CLOSING_FIRST_ORDER,
  RelationshipLevel.WILL_CONTACT,
  RelationshipLevel.INITIAL_APPROACH,
  'UNSET',
] as const;

export type CustomerStatisticsInput = {
  customerCount: number;
  companyType: CountBucketInput[];
  partnershipStage: CountBucketInput[];
  status: CountBucketInput[];
  relationshipLevel: CountBucketInput[];
  customerNeeds: WithWithoutInput;
  desiredStandards: WithWithoutInput;
  remarks: WithWithoutInput;
  customerPromise: WithWithoutInput & {
    annualBonus: number;
    onTimeDelivery: number;
    packagingBox: number;
  };
  city: CountBucketInput[];
  province: CountBucketInput[];
  country: CountBucketInput[];
};

type CustomerPromiseStats = WithWithoutStats & {
  annualBonus: number;
  onTimeDelivery: number;
  packagingBox: number;
  annualBonusRate: number | null;
  onTimeDeliveryRate: number | null;
  packagingBoxRate: number | null;
};

export type CustomerStatistics = {
  companyType: StatBucket[];
  partnershipStage: StatBucket[];
  status: StatBucket[];
  relationshipLevel: StatBucket[];
  customerNeeds: WithWithoutStats;
  desiredStandards: WithWithoutStats;
  remarks: WithWithoutStats;
  customerPromise: CustomerPromiseStats;
  city: StatBucket[];
  province: StatBucket[];
  country: StatBucket[];
};

function bucketRate(count: number, total: number): number | null {
  return ratePercent(count, total);
}

export function buildCustomerStatistics(
  input: CustomerStatisticsInput,
): CustomerStatistics {
  const total = Math.max(0, input.customerCount);
  const promiseBase = toWithWithoutStats(input.customerPromise, total);

  return {
    companyType: toStatBuckets(
      normalizeEnumBuckets(COMPANY_TYPE_KEYS, input.companyType),
      total,
    ),
    partnershipStage: toStatBuckets(
      normalizeEnumBuckets(PARTNERSHIP_STAGE_KEYS, input.partnershipStage),
      total,
    ),
    status: toStatBuckets(
      normalizeEnumBuckets(CUSTOMER_STATUS_KEYS, input.status),
      total,
    ),
    relationshipLevel: toStatBuckets(
      normalizeEnumBuckets(RELATIONSHIP_LEVEL_KEYS, input.relationshipLevel),
      total,
    ),
    customerNeeds: toWithWithoutStats(input.customerNeeds, total),
    desiredStandards: toWithWithoutStats(input.desiredStandards, total),
    remarks: toWithWithoutStats(input.remarks, total),
    customerPromise: {
      ...promiseBase,
      annualBonus: input.customerPromise.annualBonus,
      onTimeDelivery: input.customerPromise.onTimeDelivery,
      packagingBox: input.customerPromise.packagingBox,
      annualBonusRate: bucketRate(input.customerPromise.annualBonus, total),
      onTimeDeliveryRate: bucketRate(
        input.customerPromise.onTimeDelivery,
        total,
      ),
      packagingBoxRate: bucketRate(input.customerPromise.packagingBox, total),
    },
    city: toStatBuckets(normalizeGeoBuckets(input.city, total), total),
    province: toStatBuckets(normalizeGeoBuckets(input.province, total), total),
    country: toStatBuckets(normalizeGeoBuckets(input.country, total), total),
  };
}
