'use client';

import { useMemo } from 'react';
import { useLabels } from '@/hooks/useLabels';

export function useOrderLabelHelpers() {
  const labels = useLabels();

  return useMemo(
    () => ({
      unitLabel(unit?: string) {
        if (!unit) return '';
        return (
          labels.productUnit[unit as keyof typeof labels.productUnit] ?? unit
        );
      },
      orderStatusLabel(status?: string | null) {
        if (!status) return '—';
        return (
          labels.orderStatus[status as keyof typeof labels.orderStatus] ??
          status
        );
      },
      paymentStatusLabel(status?: string | null) {
        if (!status) return '—';
        return (
          labels.paymentStatus[status as keyof typeof labels.paymentStatus] ??
          status
        );
      },
      invoiceStatusLabel(status?: string | null) {
        if (!status) return '—';
        return (
          labels.invoiceStatus[status as keyof typeof labels.invoiceStatus] ??
          status
        );
      },
      billStatusLabel(status?: string | null) {
        if (!status) return '—';
        return (
          labels.billStatus[status as keyof typeof labels.billStatus] ?? status
        );
      },
      labels,
    }),
    [labels],
  );
}
