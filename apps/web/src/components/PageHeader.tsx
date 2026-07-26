import type { ReactNode } from 'react';

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className={`umkm-page-header${actions ? '' : ' is-solo'}`}>
      <div className="umkm-page-header-text">
        <h1 className="umkm-title">{title}</h1>
        {description ? <p className="umkm-sub">{description}</p> : null}
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
  return (
    <div className="umkm-empty">
      <strong>{title}</strong>
      <p>{description}</p>
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
  const hasHead = Boolean(title || description || eyebrow || actions);
  const soloHead = hasHead && !actions;
  return (
    <section
      className={`umkm-panel${quiet ? ' quiet' : ''} umkm-content-section${soloHead ? ' is-head-solo' : ''} ${className}`.trim()}
    >
      {hasHead ? (
        <div className="umkm-panel-head">
          <div className="umkm-panel-head-text">
            {eyebrow ? <span className="umkm-eyebrow">{eyebrow}</span> : null}
            {title ? <h2 className="umkm-panel-title">{title}</h2> : null}
            {description ? (
              <p className="umkm-panel-desc">{description}</p>
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
  return (
    <div className={`umkm-form-section ${className}`.trim()}>
      <div className="umkm-form-section-head">
        <h3>{title}</h3>
        {description ? <p>{description}</p> : null}
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
  return (
    <div className={`umkm-detail-item${wide ? ' is-wide' : ''}`}>
      <dt>{label}</dt>
      <dd>{children ?? '—'}</dd>
    </div>
  );
}
