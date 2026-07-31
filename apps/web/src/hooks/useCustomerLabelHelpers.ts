'use client';

import { useMemo } from 'react';
import { useLabels } from '@/hooks/useLabels';

export function useCustomerLabelHelpers() {
  const labels = useLabels();

  return useMemo(
    () => ({
      statusLabel(status?: string | null) {
        if (!status) return '—';
        return (
          labels.customerStatus[status as keyof typeof labels.customerStatus] ??
          status
        );
      },
      relationshipLabel(level?: string | null) {
        if (!level) return '—';
        return (
          labels.relationshipLevel[
            level as keyof typeof labels.relationshipLevel
          ] ?? level
        );
      },
      companyTypeLabel(type?: string | null) {
        if (!type) return '—';
        return (
          labels.companyType[type as keyof typeof labels.companyType] ?? type
        );
      },
      partnershipStageLabel(stage?: string | null) {
        if (!stage) return '—';
        return (
          labels.partnershipStage[
            stage as keyof typeof labels.partnershipStage
          ] ?? stage
        );
      },
      labels,
    }),
    [labels],
  );
}
