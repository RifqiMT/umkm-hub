'use client';

import { useMemo } from 'react';
import { DASHBOARD_PERIOD_LABELS, type DashboardPeriod } from '@/lib/dashboard-period';
import { LABELS } from '@/lib/enums';
import { useTr } from '@/components/Tr';

function mapLabels<T extends Record<string, string>>(
  group: T,
  tr: (text: string) => string,
): T {
  const out = {} as T;
  for (const [key, value] of Object.entries(group)) {
    out[key as keyof T] = tr(value) as T[keyof T];
  }
  return out;
}

/** Translated enum labels for orders, products, customers, analytics, etc. */
export function useLabels() {
  const tr = useTr();

  return useMemo(
    () => ({
      productUnit: mapLabels(LABELS.productUnit, tr),
      companyType: mapLabels(LABELS.companyType, tr),
      partnershipStage: mapLabels(LABELS.partnershipStage, tr),
      customerStatus: mapLabels(LABELS.customerStatus, tr),
      relationshipLevel: mapLabels(LABELS.relationshipLevel, tr),
      discountType: mapLabels(LABELS.discountType, tr),
      paymentStatus: mapLabels(LABELS.paymentStatus, tr),
      invoiceStatus: mapLabels(LABELS.invoiceStatus, tr),
      billStatus: mapLabels(LABELS.billStatus, tr),
      orderStatus: mapLabels(LABELS.orderStatus, tr),
      dashboardPeriod: mapLabels(DASHBOARD_PERIOD_LABELS, tr) as Record<
        DashboardPeriod,
        string
      >,
      tr,
    }),
    [tr],
  );
}
