'use client';

import type { ReactNode } from 'react';
import { useTr } from '@/components/Tr';

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  const tr = useTr();
  return (
    <header className={`umkm-page-header${actions ? '' : ' is-solo'}`}>
      <div className="umkm-page-header-text">
        <h1 className="umkm-title">{tr(title)}</h1>
        {description ? <p className="umkm-sub">{tr(description)}</p> : null}
      </div>
      {actions ? <div className="umkm-page-actions">{actions}</div> : null}
    </header>
  );
}

export function EmptyState({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  const tr = useTr();
  return (
    <div className="umkm-empty">
      <strong>{tr(title)}</strong>
      <p>{tr(description)}</p>
      {children}
    </div>
  );
}

/** Top-level content panel with optional header (lists, forms, metric groups). */
export function ContentSection({
  title,
  description,
  eyebrow,
  actions,
  children,
  className = '',
  quiet = false,
}: {
  title?: string;
  description?: string;
  eyebrow?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  quiet?: boolean;
}) {
  const tr = useTr();
  const hasHead = Boolean(title || description || eyebrow || actions);
  const soloHead = hasHead && !actions;
  return (
    <section
      className={`umkm-panel${quiet ? ' quiet' : ''} umkm-content-section${soloHead ? ' is-head-solo' : ''} ${className}`.trim()}
    >
      {hasHead ? (
        <div className="umkm-panel-head">
          <div className="umkm-panel-head-text">
            {eyebrow ? (
              <span className="umkm-eyebrow">{tr(eyebrow)}</span>
            ) : null}
            {title ? (
              <h2 className="umkm-panel-title">{tr(title)}</h2>
            ) : null}
            {description ? (
              <p className="umkm-panel-desc">{tr(description)}</p>
            ) : null}
          </div>
          {actions ? (
            <div className="umkm-page-actions">{actions}</div>
          ) : null}
        </div>
      ) : null}
      <div className="umkm-panel-body">{children}</div>
    </section>
  );
}

/** Nested subsection inside a form (Identity, Pack, Pricing, …). */
export function FormSection({
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
    <div className={`umkm-form-section ${className}`.trim()}>
      <div className="umkm-form-section-head">
        <h3>{tr(title)}</h3>
        {description ? <p>{tr(description)}</p> : null}
      </div>
      {children}
    </div>
  );
}

/** Read-only key/value grid for View panels. */
export function DetailGrid({ children }: { children: ReactNode }) {
  return <dl className="umkm-detail-grid">{children}</dl>;
}

export function DetailItem({
  label,
  children,
  wide = false,
}: {
  label: string;
  children: ReactNode;
  wide?: boolean;
}) {
  const tr = useTr();
  return (
    <div className={`umkm-detail-item${wide ? ' is-wide' : ''}`}>
      <dt>{tr(label)}</dt>
      <dd>{children ?? '—'}</dd>
    </div>
  );
}

/** Form field label — auto-translated like DetailItem. */
export function FieldLabel({
  children,
  htmlFor,
}: {
  children: ReactNode;
  htmlFor?: string;
}) {
  const tr = useTr();
  return (
    <label htmlFor={htmlFor}>
      {typeof children === 'string' ? tr(children) : children}
    </label>
  );
}
