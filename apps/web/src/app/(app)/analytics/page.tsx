'use client';

import dynamic from 'next/dynamic';
import { useTr } from '@/components/Tr';

function AnalyticsLoading() {
  const tr = useTr();
  return (
    <div className="umkm-page umkm-analytics-page">
      <p className="umkm-muted" role="status">
        {tr('Loading analytics…')}
      </p>
    </div>
  );
}

const AnalyticsWorkspace = dynamic(() => import('./AnalyticsWorkspace'), {
  ssr: false,
  loading: () => <AnalyticsLoading />,
});

/** Route shell — Recharts + chart tree load in a separate client chunk. */
export default function AnalyticsPage() {
  return <AnalyticsWorkspace />;
}
