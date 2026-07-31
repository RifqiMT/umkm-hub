'use client';

import { useEffect, type ReactNode } from 'react';
import { useTr } from '@/components/Tr';

/** Animated body for read-only View panels. Escape closes when onClose is set. */
export function ViewSheetBody({
  children,
  className = '',
  onClose,
}: {
  children: ReactNode;
  className?: string;
  onClose?: () => void;
}) {
  useEffect(() => {
    if (!onClose) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose?.();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className={`umkm-view-sheet-body ${className}`.trim()}>{children}</div>
  );
}

/** Hero strip: context chips + primary metric panel (no empty middle gap). */
export function ViewIdentity({
  chips,
  contextLabel,
  metricLabel,
  metricValue,
  metricHint,
  children,
}: {
  chips?: ReactNode;
  contextLabel?: string;
  metricLabel?: string;
  metricValue?: ReactNode;
  metricHint?: ReactNode;
  children?: ReactNode;
}) {
  const tr = useTr();
  const hasMetric = metricLabel != null || metricValue != null;
  return (
    <div className="umkm-view-identity">
      <div className="umkm-view-identity-main">
        {contextLabel ? (
          <span className="umkm-view-identity-label">{tr(contextLabel)}</span>
        ) : null}
        {chips ? <div className="umkm-view-chips">{chips}</div> : null}
        {children}
      </div>
      {hasMetric ? (
        <div className="umkm-view-metric">
          {metricLabel ? (
            <span className="umkm-view-metric-label">{tr(metricLabel)}</span>
          ) : null}
          {metricValue != null ? <strong>{metricValue}</strong> : null}
          {metricHint ? (
            <span className="umkm-view-metric-hint">{metricHint}</span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function ViewChip({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'accent' | 'good' | 'warn' | 'added';
}) {
  return (
    <span className={`umkm-view-chip is-${tone}`}>{children}</span>
  );
}

/** One purpose block inside a View sheet. */
export function ViewBlock({
  title,
  description,
  children,
  className = '',
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  const tr = useTr();
  return (
    <div className={`umkm-view-block ${className}`.trim()}>
      <div className="umkm-view-block-head">
        <h3>{tr(title)}</h3>
        {description ? <p>{tr(description)}</p> : null}
      </div>
      {children}
    </div>
  );
}

/** Compact fact tiles for pack/qty/totals snapshots. */
export function ViewFacts({
  items,
  columns = 3,
  variant = 'tiles',
}: {
  items: Array<{
    key: string;
    label: string;
    value: ReactNode;
    sub?: ReactNode;
    tone?: 'default' | 'accent' | 'muted';
  }>;
  columns?: 2 | 3 | 4;
  variant?: 'tiles' | 'strip';
}) {
  const tr = useTr();
  return (
    <div
      className={`umkm-view-facts is-cols-${columns}${variant === 'strip' ? ' is-strip' : ''}`}
      role="list"
    >
      {items.map((item) => (
        <div
          key={item.key}
          className={`umkm-view-fact${item.tone && item.tone !== 'default' ? ` is-${item.tone}` : ''}`}
          role="listitem"
        >
          <span className="umkm-view-fact-label">{tr(item.label)}</span>
          <strong className="umkm-view-fact-value">{item.value}</strong>
          {item.sub ? (
            <em className="umkm-view-fact-sub">{item.sub}</em>
          ) : null}
        </div>
      ))}
    </div>
  );
}

/** Soft promise / tag chips row. */
export function ViewTagRow({ tags }: { tags: string[] }) {
  const tr = useTr();
  if (tags.length === 0) {
    return <span className="umkm-num is-empty">—</span>;
  }
  return (
    <div className="umkm-view-tags">
      {tags.map((tag) => (
        <span key={tag} className="umkm-view-tag">
          {tr(tag)}
        </span>
      ))}
    </div>
  );
}
