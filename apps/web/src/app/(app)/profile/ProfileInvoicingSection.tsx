'use client';

import { FormEvent, useMemo } from 'react';
import { ContentSection, FieldLabel, FormSection } from '@/components/PageHeader';
import { ProfileFormActions } from '@/app/(app)/profile/ProfileFormActions';
import {
  formatNpwpDisplay,
  invoicingReadiness,
  previewInvoiceNumber,
} from '@/lib/order-billing';
import { formatMoney } from '@/lib/format-money';

type InvoicingFormValues = {
  businessName: string;
  businessPhone: string;
  businessAddress: string;
  npwp: string;
  isPkp: boolean;
  defaultPpnPercent: number;
  taxInclusive: boolean;
  invoicePrefix: string;
};

type ProfileInvoicingSectionProps = {
  values: InvoicingFormValues;
  onChange: (patch: Partial<InvoicingFormValues>) => void;
  onSubmit: (e: FormEvent) => void;
  onDiscard: () => void;
  loading: boolean;
  booting: boolean;
  dirty: boolean;
  ownerEmail?: string | null;
  loginName?: string;
};

function ReadinessItem({
  ok,
  label,
}: {
  ok: boolean;
  label: string;
}) {
  return (
    <li className={ok ? 'is-done' : undefined} data-ready={ok ? 'yes' : 'no'}>
      <span className="umkm-invoice-ready-mark" aria-hidden />
      {label}
    </li>
  );
}

export function ProfileInvoicingSection({
  values,
  onChange,
  onSubmit,
  onDiscard,
  loading,
  booting,
  dirty,
  ownerEmail,
  loginName,
}: ProfileInvoicingSectionProps) {
  const {
    businessName,
    businessPhone,
    businessAddress,
    npwp,
    isPkp,
    defaultPpnPercent,
    taxInclusive,
    invoicePrefix,
  } = values;

  const displayName =
    businessName.trim() || loginName?.replace(/_/g, ' ') || 'Your business';
  const formattedNpwp = npwp.trim() ? formatNpwpDisplay(npwp) : '';
  const sampleNumber = previewInvoiceNumber(invoicePrefix);
  const readiness = useMemo(
    () =>
      invoicingReadiness({
        businessName,
        businessAddress,
        npwp,
        isPkp,
      }),
    [businessName, businessAddress, npwp, isPkp],
  );

  const sampleDpp = 1_000_000;
  const samplePpn = isPkp
    ? Math.round(sampleDpp * (defaultPpnPercent / 100))
    : 0;
  const sampleTotal = taxInclusive && isPkp ? sampleDpp : sampleDpp + samplePpn;

  return (
    <ContentSection
      className="umkm-profile-invoicing"
      eyebrow="Invoicing"
      title="Invoice & tax profile"
      description="Set how your business appears on PDF invoices and e-Faktur exports. Most UMKM stay on Non-PKP; switch to PKP only when VAT-registered."
    >
      <form className="umkm-invoice-form" onSubmit={onSubmit}>
        <div className="umkm-invoice-stack">
          <div className="umkm-invoice-main">
            <div
              className="umkm-invoice-mode"
              role="radiogroup"
              aria-label="Business tax mode"
            >
              <button
                type="button"
                role="radio"
                aria-checked={!isPkp}
                className={`umkm-invoice-mode-card${!isPkp ? ' is-active' : ''}`}
                disabled={booting}
                onClick={() =>
                  onChange({ isPkp: false, taxInclusive: false })
                }
              >
                <span className="umkm-invoice-mode-kicker">Recommended</span>
                <strong>Non-PKP (UMKM)</strong>
                <em>Tagihan / commercial invoice — no PPN line</em>
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={isPkp}
                className={`umkm-invoice-mode-card${isPkp ? ' is-active' : ''}`}
                disabled={booting}
                onClick={() => onChange({ isPkp: true })}
              >
                <span className="umkm-invoice-mode-kicker">VAT registered</span>
                <strong>PKP</strong>
                <em>DPP + PPN on PDF and e-Faktur prep export</em>
              </button>
            </div>

            <div className="umkm-invoice-panel">
              <FormSection
                title="On your invoices"
                description="Printed at the top of every PDF invoice."
              >
                <div className="umkm-invoice-field-grid">
                  <div className="umkm-field umkm-field-span-2">
                    <FieldLabel htmlFor="business-name">
                      Business name
                    </FieldLabel>
                    <input
                      id="business-name"
                      value={businessName}
                      onChange={(e) =>
                        onChange({ businessName: e.target.value })
                      }
                      maxLength={200}
                      placeholder="e.g. Toko Sumber Rejeki"
                      disabled={booting}
                      autoComplete="organization"
                    />
                  </div>
                  <div className="umkm-field">
                    <FieldLabel htmlFor="business-phone">Phone</FieldLabel>
                    <input
                      id="business-phone"
                      type="tel"
                      value={businessPhone}
                      onChange={(e) =>
                        onChange({ businessPhone: e.target.value })
                      }
                      maxLength={40}
                      placeholder="+62 …"
                      disabled={booting}
                      autoComplete="tel"
                    />
                  </div>
                  <div className="umkm-field">
                    <FieldLabel htmlFor="invoice-prefix">
                      Invoice number prefix
                    </FieldLabel>
                    <input
                      id="invoice-prefix"
                      value={invoicePrefix}
                      onChange={(e) =>
                        onChange({ invoicePrefix: e.target.value.toUpperCase() })
                      }
                      maxLength={20}
                      placeholder="INV"
                      disabled={booting}
                      spellCheck={false}
                    />
                    <p className="umkm-invoice-field-hint">
                      Next auto number: <code>{sampleNumber}</code>
                    </p>
                  </div>
                  <div className="umkm-field umkm-field-span-2">
                    <FieldLabel htmlFor="business-address">
                      Business address
                    </FieldLabel>
                    <textarea
                      id="business-address"
                      value={businessAddress}
                      onChange={(e) =>
                        onChange({ businessAddress: e.target.value })
                      }
                      maxLength={500}
                      rows={2}
                      placeholder="Street, city — shown on invoices"
                      disabled={booting}
                      autoComplete="street-address"
                    />
                  </div>
                  <div className="umkm-field umkm-field-span-2">
                    <FieldLabel htmlFor="business-npwp">
                      NPWP {isPkp ? '(required for PKP)' : '(optional)'}
                    </FieldLabel>
                    <input
                      id="business-npwp"
                      value={npwp}
                      onChange={(e) => onChange({ npwp: e.target.value })}
                      onBlur={() => {
                        if (npwp.trim()) {
                          onChange({ npwp: formatNpwpDisplay(npwp) });
                        }
                      }}
                      maxLength={20}
                      placeholder="15 or 16 digits"
                      disabled={booting}
                      inputMode="numeric"
                      autoComplete="off"
                    />
                    {formattedNpwp ? (
                      <p className="umkm-invoice-field-hint">
                        Formatted: {formattedNpwp}
                      </p>
                    ) : (
                      <p className="umkm-invoice-field-hint">
                        Needed for e-Faktur CSV/XML export when PKP is on.
                      </p>
                    )}
                  </div>
                </div>
              </FormSection>
            </div>

            {isPkp ? (
              <div className="umkm-invoice-panel is-tax">
                <FormSection
                  title="PPN settings"
                  description="Applied when generating PKP invoices from order totals."
                >
                  <div className="umkm-invoice-tax-grid">
                    <label className="umkm-invoice-toggle">
                      <input
                        type="checkbox"
                        checked={taxInclusive}
                        onChange={(e) =>
                          onChange({ taxInclusive: e.target.checked })
                        }
                        disabled={booting}
                      />
                      <span className="umkm-invoice-toggle-ui" aria-hidden />
                      <span className="umkm-invoice-toggle-copy">
                        <strong>Prices include PPN</strong>
                        <em>Order totals already contain VAT</em>
                      </span>
                    </label>
                    <div className="umkm-field">
                      <FieldLabel htmlFor="ppn-rate">PPN rate (%)</FieldLabel>
                      <div className="umkm-invoice-ppn-input">
                        <input
                          id="ppn-rate"
                          type="number"
                          min={0}
                          max={100}
                          step={0.01}
                          value={defaultPpnPercent}
                          onChange={(e) =>
                            onChange({
                              defaultPpnPercent:
                                Number(e.target.value) || 0,
                            })
                          }
                          disabled={booting}
                        />
                        <span className="umkm-invoice-ppn-suffix">%</span>
                      </div>
                    </div>
                  </div>
                </FormSection>
              </div>
            ) : null}
          </div>

          <aside className="umkm-invoice-preview-col" aria-live="polite">
            <div className="umkm-invoice-preview-card">
              <header className="umkm-invoice-preview-head">
                <span className="umkm-invoice-preview-type">
                  {isPkp ? 'Faktur pajak / Invoice' : 'Invoice / Tagihan'}
                </span>
                <strong>{displayName}</strong>
                {businessAddress.trim() ? (
                  <p>{businessAddress.trim()}</p>
                ) : (
                  <p className="is-muted">Add address for a complete header</p>
                )}
                {businessPhone.trim() ? <p>{businessPhone.trim()}</p> : null}
                {ownerEmail ? <p>{ownerEmail}</p> : null}
                {formattedNpwp ? (
                  <p className="umkm-invoice-preview-npwp">NPWP {formattedNpwp}</p>
                ) : null}
              </header>

              <div className="umkm-invoice-preview-meta">
                <div>
                  <span>No.</span>
                  <strong>{sampleNumber}</strong>
                </div>
                <div>
                  <span>Mode</span>
                  <strong>{isPkp ? `PKP · ${defaultPpnPercent}% PPN` : 'Non-PKP'}</strong>
                </div>
              </div>

              <div className="umkm-invoice-preview-sample">
                <span className="umkm-invoice-preview-sample-label">
                  Sample total (Rp 1,000,000 base)
                </span>
                <dl>
                  <div>
                    <dt>DPP</dt>
                    <dd>{formatMoney(sampleDpp)}</dd>
                  </div>
                  {isPkp ? (
                    <div>
                      <dt>PPN</dt>
                      <dd>{formatMoney(samplePpn)}</dd>
                    </div>
                  ) : null}
                  <div className="is-total">
                    <dt>Total</dt>
                    <dd>{formatMoney(sampleTotal)}</dd>
                  </div>
                </dl>
              </div>

              <ul className="umkm-invoice-readiness">
                <ReadinessItem ok={readiness.businessName} label="Business name" />
                <ReadinessItem ok={readiness.address} label="Address on invoice" />
                <ReadinessItem
                  ok={!isPkp || readiness.npwp}
                  label={isPkp ? 'Seller NPWP for e-Faktur' : 'NPWP (optional)'}
                />
                <ReadinessItem
                  ok={!isPkp || readiness.pkpReady}
                  label="PKP export ready"
                />
              </ul>
            </div>
          </aside>
        </div>

        <ProfileFormActions
          dirty={dirty}
          loading={loading}
          booting={booting}
          saveLabel="Save invoice profile"
          onDiscard={onDiscard}
        />
      </form>
    </ContentSection>
  );
}
