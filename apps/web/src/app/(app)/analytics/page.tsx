'use client';

import dynamic from 'next/dynamic';

const AnalyticsWorkspace = dynamic(() => import('./AnalyticsWorkspace'), {
  ssr: false,
  loading: () => (
    <div className="umkm-page umkm-analytics-page">
      <p className="umkm-muted" role="status">
        Loading analytics…
      </p>
    </div>
  ),
});

/** Route shell — Recharts + chart tree load in a separate client chunk. */
export default function AnalyticsPage() {
  return <AnalyticsWorkspace />;
}
