'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { confirmClear } from '@/lib/confirm';
import {
  ContentSection,
  EmptyState,
  FormSection,
  PageHeader,
} from '@/components/PageHeader';
import { OptionChips } from '@/components/OptionChips';
import { YearSelect } from '@/components/YearSelect';
import type { RevenueTargetYear } from '@/lib/types';
import { formatMoney } from '@/lib/format-money';

type TargetMode = 'MANUAL' | 'SYSTEMATIC';

const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];


function formatPct(value: number | null | undefined) {
  if (value == null) return '—';
  return `${value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  })}%`;
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 10000) / 10000;
}

function previewSystematic(base: number, growth: number) {
  const factor = 1 + growth / 100;
  return Array.from({ length: 12 }, (_, i) =>
    roundMoney(base * factor ** i),
  );
}

function emptyMonths() {
  return Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    amount: 0,
  }));
}

export default function TargetsPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [data, setData] = useState<RevenueTargetYear | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [editingMonthly, setEditingMonthly] = useState(false);
  const [editingAnnual, setEditingAnnual] = useState(false);
  const [savingMonthly, setSavingMonthly] = useState(false);
  const [savingAnnual, setSavingAnnual] = useState(false);

  const [monthlyMode, setMonthlyMode] = useState<TargetMode>('MANUAL');
  const [baseMonthAmount, setBaseMonthAmount] = useState('0');
  const [monthlyGrowthPercent, setMonthlyGrowthPercent] = useState('0');
  const [months, setMonths] = useState(emptyMonths());

  const [annualMode, setAnnualMode] = useState<TargetMode>('MANUAL');
  const [annualAmount, setAnnualAmount] = useState('0');
  const [baseAnnualAmount, setBaseAnnualAmount] = useState('0');
  const [annualGrowthPercent, setAnnualGrowthPercent] = useState('0');

  function syncFromData(res: RevenueTargetYear) {
    setData(res);
    if (res.plan && res.monthlyConfigured) {
      setMonthlyMode(res.plan.monthlyMode);
      setBaseMonthAmount(String(res.plan.baseMonthAmount ?? 0));
      setMonthlyGrowthPercent(String(res.plan.monthlyGrowthPercent ?? 0));
      setMonths(res.months.map((m) => ({ month: m.month, amount: m.amount })));
    } else {
      setMonthlyMode('MANUAL');
      setBaseMonthAmount('0');
      setMonthlyGrowthPercent('0');
      setMonths(emptyMonths());
    }

    if (res.plan && res.annualConfigured) {
      setAnnualMode(res.plan.annualMode);
      setAnnualAmount(String(res.plan.annualAmount ?? 0));
      setBaseAnnualAmount(String(res.plan.baseAnnualAmount ?? 0));
      setAnnualGrowthPercent(String(res.plan.annualGrowthPercent ?? 0));
    } else {
      setAnnualMode('MANUAL');
      setAnnualAmount('0');
      setBaseAnnualAmount('0');
      setAnnualGrowthPercent('0');
    }
  }

  async function load(y = year) {
    setLoading(true);
    setError('');
    try {
      const res = await api<RevenueTargetYear>(`/revenue-targets/${y}`);
      syncFromData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load targets');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(year);
    setEditingMonthly(false);
    setEditingAnnual(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);

  const systematicPreview = useMemo(() => {
    const base = Number(baseMonthAmount);
    const growth = Number(monthlyGrowthPercent);
    if (Number.isNaN(base) || Number.isNaN(growth) || base < 0) {
      return emptyMonths().map((m) => m.amount);
    }
    return previewSystematic(base, growth);
  }, [baseMonthAmount, monthlyGrowthPercent]);

  const displayMonths =
    editingMonthly && monthlyMode === 'SYSTEMATIC'
      ? systematicPreview.map((amount, i) => ({ month: i + 1, amount }))
      : editingMonthly
        ? months
        : (data?.months.map((m) => ({ month: m.month, amount: m.amount })) ??
          emptyMonths());

  const monthlySum = useMemo(
    () => roundMoney(displayMonths.reduce((s, m) => s + m.amount, 0)),
    [displayMonths],
  );

  function startEditMonthly() {
    setEditingAnnual(false);
    setEditingMonthly(true);
  }

  function startEditAnnual() {
    setEditingMonthly(false);
    setEditingAnnual(true);
  }

  function cancelMonthly() {
    setEditingMonthly(false);
    void load(year);
  }

  function cancelAnnual() {
    setEditingAnnual(false);
    void load(year);
  }

  async function onSaveMonthly(e: FormEvent) {
    e.preventDefault();
    setSavingMonthly(true);
    setError('');
    try {
      const body =
        monthlyMode === 'SYSTEMATIC'
          ? {
              monthlyMode,
              baseMonthAmount: Number(baseMonthAmount),
              monthlyGrowthPercent: Number(monthlyGrowthPercent),
            }
          : {
              monthlyMode,
              months: months.map((m) => ({
                month: m.month,
                amount: Number(m.amount) || 0,
              })),
            };

      const res = await api<RevenueTargetYear>(
        `/revenue-targets/${year}/monthly`,
        { method: 'PUT', body },
      );
      syncFromData(res);
      setEditingMonthly(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Save monthly failed');
    } finally {
      setSavingMonthly(false);
    }
  }

  async function onSaveAnnual(e: FormEvent) {
    e.preventDefault();
    setSavingAnnual(true);
    setError('');
    try {
      const body =
        annualMode === 'SYSTEMATIC'
          ? {
              annualMode,
              baseAnnualAmount: Number(baseAnnualAmount),
              annualGrowthPercent: Number(annualGrowthPercent) || 0,
            }
          : {
              annualMode,
              annualAmount: Number(annualAmount),
              annualGrowthPercent: Number(annualGrowthPercent) || 0,
            };

      const res = await api<RevenueTargetYear>(
        `/revenue-targets/${year}/annual`,
        { method: 'PUT', body },
      );
      syncFromData(res);
      setEditingAnnual(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Save annual failed');
    } finally {
      setSavingAnnual(false);
    }
  }

  async function onClearMonthly() {
    if (!data?.monthlyConfigured) return;
    if (
      !(await confirmClear(
        `Clear monthly targets for ${year}?`,
        'This also clears the annual target so both stay in sync. This cannot be undone.',
      ))
    )
      return;
    setError('');
    try {
      const res = await api<RevenueTargetYear>(
        `/revenue-targets/${year}/monthly`,
        { method: 'DELETE' },
      );
      syncFromData(res);
      setEditingMonthly(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Clear monthly failed');
    }
  }

  async function onClearAnnual() {
    if (!data?.annualConfigured) return;
    if (
      !(await confirmClear(
        `Clear annual target for ${year}?`,
        'This also clears the monthly breakdown. This cannot be undone.',
      ))
    )
      return;
    setError('');
    try {
      const res = await api<RevenueTargetYear>(
        `/revenue-targets/${year}/annual`,
        { method: 'DELETE' },
      );
      syncFromData(res);
      setEditingAnnual(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Clear annual failed');
    }
  }

  const annualPreviewAmount = useMemo(() => {
    if (!editingAnnual) return 0;
    const raw =
      annualMode === 'SYSTEMATIC'
        ? Number(baseAnnualAmount)
        : Number(annualAmount);
    return Number.isNaN(raw) || raw < 0 ? 0 : roundMoney(raw);
  }, [editingAnnual, annualMode, annualAmount, baseAnnualAmount]);

  const annualMonthPreview = useMemo(() => {
    if (!editingAnnual) return emptyMonths().map((m) => m.amount);
    const per = roundMoney(annualPreviewAmount / 12);
    const firstEleven = Array.from({ length: 11 }, () => per);
    const rem = roundMoney(
      annualPreviewAmount - firstEleven.reduce((s, n) => s + n, 0),
    );
    return [...firstEleven, rem];
  }, [editingAnnual, annualPreviewAmount]);

  const yearOptions = Array.from({ length: 7 }, (_, i) => currentYear - 2 + i);
  const busy = editingMonthly || editingAnnual;

  return (
    <section>
      <PageHeader
        title="Revenue targets"
        description="Monthly and annual goals stay in sync: annual is the sum of months; saving annual redistributes an even 12-month split."
      />
      {error ? <div className="umkm-error">{error}</div> : null}

      <div className="umkm-catalog-toolbar" style={{ marginBottom: '1rem' }}>
        <YearSelect
          id="target-year"
          className="is-toolbar"
          label="Year"
          value={year}
          years={yearOptions}
          disabled={busy}
          onChange={setYear}
        />
        {loading ? (
          <p className="umkm-catalog-count">Loading…</p>
        ) : (
          <p className="umkm-catalog-count">
            Monthly {data?.monthlyConfigured ? 'set' : 'not set'} · Annual{' '}
            {data?.annualConfigured ? 'set' : 'not set'}
          </p>
        )}
      </div>

      {/* ——— Monthly ——— */}
      <ContentSection
        className={`umkm-product-sheet${editingMonthly ? ' umkm-form-panel' : ''}`}
        eyebrow="Monthly"
        title={`${year} monthly targets`}
        description="Edit months directly. The annual target updates to match their sum. An annual save can also create an even 12-month split."
        actions={
          !editingMonthly ? (
            <>
              <button
                type="button"
                className="umkm-btn"
                onClick={startEditMonthly}
                disabled={editingAnnual}
              >
                {data?.monthlyConfigured ? 'Edit monthly' : 'Set monthly'}
              </button>
              {data?.monthlyConfigured ? (
                <button
                  type="button"
                  className="umkm-btn danger"
                  onClick={() => void onClearMonthly()}
                  disabled={editingAnnual}
                >
                  Clear monthly
                </button>
              ) : null}
            </>
          ) : null
        }
      >
        {editingMonthly ? (
          <form onSubmit={onSaveMonthly} className="umkm-product-sheet-body">
            <FormSection
              title="How to set months"
              description="Manual: enter each month. Systematic: January base + month-over-month growth %."
            >
              <OptionChips
                aria-label="Monthly mode"
                value={monthlyMode}
                onChange={(mode) => {
                  if (!mode) return;
                  setMonthlyMode(mode);
                }}
                options={[
                  { value: 'MANUAL', label: 'Manual' },
                  { value: 'SYSTEMATIC', label: 'Systematic' },
                ]}
              />

              {monthlyMode === 'SYSTEMATIC' ? (
                <div className="umkm-grid two" style={{ marginTop: '0.85rem' }}>
                  <div className="umkm-field">
                    <label htmlFor="base-month">January base</label>
                    <input
                      id="base-month"
                      type="number"
                      min={0}
                      step="0.01"
                      value={baseMonthAmount}
                      onChange={(e) => setBaseMonthAmount(e.target.value)}
                      required
                    />
                  </div>
                  <div className="umkm-field">
                    <label htmlFor="mom-growth">Monthly growth %</label>
                    <input
                      id="mom-growth"
                      type="number"
                      step="0.01"
                      value={monthlyGrowthPercent}
                      onChange={(e) => setMonthlyGrowthPercent(e.target.value)}
                      required
                    />
                  </div>
                </div>
              ) : null}

              <div
                className="umkm-table-wrap umkm-catalog-table-wrap"
                style={{ marginTop: '0.85rem' }}
              >
                <table className="umkm-table umkm-catalog-table">
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th className="is-num">Target</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayMonths.map((row) => (
                      <tr key={row.month}>
                        <td>{MONTH_LABELS[row.month - 1]}</td>
                        <td className="is-num">
                          {monthlyMode === 'MANUAL' ? (
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              value={months[row.month - 1]?.amount ?? 0}
                              onChange={(e) => {
                                const next = [...months];
                                next[row.month - 1] = {
                                  month: row.month,
                                  amount: Number(e.target.value) || 0,
                                };
                                setMonths(next);
                              }}
                              style={{
                                width: '8rem',
                                textAlign: 'right',
                                marginLeft: 'auto',
                                display: 'block',
                              }}
                            />
                          ) : (
                            <span className="umkm-num">
                              {formatMoney(row.amount)}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <ul
                className="umkm-catalog-cards umkm-target-month-cards"
                style={{ marginTop: '0.85rem' }}
              >
                {displayMonths.map((row) => (
                  <li key={row.month} className="umkm-catalog-card">
                    <div className="umkm-target-month-card-row">
                      <strong>{MONTH_LABELS[row.month - 1]}</strong>
                      {monthlyMode === 'MANUAL' ? (
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          aria-label={`${MONTH_LABELS[row.month - 1]} target`}
                          value={months[row.month - 1]?.amount ?? 0}
                          onChange={(e) => {
                            const next = [...months];
                            next[row.month - 1] = {
                              month: row.month,
                              amount: Number(e.target.value) || 0,
                            };
                            setMonths(next);
                          }}
                        />
                      ) : (
                        <span className="umkm-num">
                          {formatMoney(row.amount)}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              <p className="umkm-sub" style={{ marginTop: '0.65rem' }}>
                Monthly sum (becomes annual target):{' '}
                <strong>{formatMoney(monthlySum)}</strong>
              </p>
            </FormSection>

            <div className="umkm-actions">
              <button
                className="umkm-btn"
                type="submit"
                disabled={savingMonthly}
              >
                {savingMonthly ? 'Saving…' : 'Save monthly & sync annual'}
              </button>
              <button
                className="umkm-btn secondary"
                type="button"
                onClick={cancelMonthly}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : !data?.monthlyConfigured ? (
          <EmptyState
            title="No monthly targets"
            description="Set a manual 12-month plan or generate months from January with growth."
          />
        ) : (
          <>
          <div className="umkm-table-wrap umkm-catalog-table-wrap">
            <table className="umkm-table umkm-catalog-table">
              <thead>
                <tr>
                  <th>Month</th>
                  <th className="is-num">Target</th>
                  <th className="is-num">Actual</th>
                  <th className="is-num">Attainment</th>
                  <th>Progress</th>
                </tr>
              </thead>
              <tbody>
                {data.months.map((m) => {
                  const pct = m.attainmentPercent ?? 0;
                  const bar = Math.max(0, Math.min(100, pct));
                  return (
                    <tr key={m.month}>
                      <td>{MONTH_LABELS[m.month - 1]}</td>
                      <td className="is-num">
                        <span className="umkm-num">{formatMoney(m.amount)}</span>
                      </td>
                      <td className="is-num">
                        <span className="umkm-num">{formatMoney(m.actual)}</span>
                      </td>
                      <td className="is-num">
                        <span
                          className={`umkm-margin-pill${pct >= 100 ? ' is-good' : pct >= 70 ? '' : ' is-warn'}`}
                        >
                          {formatPct(m.attainmentPercent)}
                        </span>
                      </td>
                      <td>
                        <div className="umkm-progress" aria-hidden>
                          <div
                            className="umkm-progress-bar"
                            style={{ width: `${bar}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <ul className="umkm-catalog-cards umkm-target-month-cards">
            {data.months.map((m) => {
              const pct = m.attainmentPercent ?? 0;
              const bar = Math.max(0, Math.min(100, pct));
              return (
                <li key={m.month} className="umkm-catalog-card">
                  <div className="umkm-catalog-card-main">
                    <div className="umkm-target-month-card-row">
                      <strong>{MONTH_LABELS[m.month - 1]}</strong>
                      <span
                        className={`umkm-margin-pill${pct >= 100 ? ' is-good' : pct >= 70 ? '' : ' is-warn'}`}
                      >
                        {formatPct(m.attainmentPercent)}
                      </span>
                    </div>
                    <div className="umkm-catalog-card-metrics">
                      <div>
                        <span>Target</span>
                        <strong className="umkm-num">
                          {formatMoney(m.amount)}
                        </strong>
                      </div>
                      <div>
                        <span>Actual</span>
                        <strong className="umkm-num">
                          {formatMoney(m.actual)}
                        </strong>
                      </div>
                    </div>
                    <div className="umkm-progress" aria-hidden>
                      <div
                        className="umkm-progress-bar"
                        style={{ width: `${bar}%` }}
                      />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          </>
        )}
      </ContentSection>

      {/* ——— Annual (synced with months) ——— */}
      <ContentSection
        className={`umkm-product-sheet${editingAnnual ? ' umkm-form-panel' : ''}`}
        eyebrow="Annual"
        title={`${year} annual target`}
        description="Equals the sum of monthly targets. Saving a year total redistributes an even split across all 12 months."
        actions={
          !editingAnnual ? (
            <>
              <button
                type="button"
                className="umkm-btn"
                onClick={startEditAnnual}
                disabled={editingMonthly}
              >
                {data?.annualConfigured ? 'Edit annual' : 'Set annual'}
              </button>
              {data?.annualConfigured ? (
                <button
                  type="button"
                  className="umkm-btn danger"
                  onClick={() => void onClearAnnual()}
                  disabled={editingMonthly}
                >
                  Clear annual
                </button>
              ) : null}
            </>
          ) : null
        }
      >
        {editingAnnual ? (
          <form onSubmit={onSaveAnnual} className="umkm-product-sheet-body">
            <FormSection
              title="How to set the year"
              description="Manual: one annual amount. Systematic: this year’s base (+ optional YoY % for next-year projection). Saving replaces months with an even split (Jan–Nov equal; Dec gets any remainder) so the year total stays exact."
            >
              <OptionChips
                aria-label="Annual mode"
                value={annualMode}
                onChange={(mode) => {
                  if (!mode) return;
                  setAnnualMode(mode);
                }}
                options={[
                  { value: 'MANUAL', label: 'Manual' },
                  { value: 'SYSTEMATIC', label: 'Systematic' },
                ]}
              />

              <div className="umkm-grid two" style={{ marginTop: '0.85rem' }}>
                {annualMode === 'MANUAL' ? (
                  <div className="umkm-field">
                    <label htmlFor="annual-amount">Annual target</label>
                    <input
                      id="annual-amount"
                      type="number"
                      min={0}
                      step="0.01"
                      value={annualAmount}
                      onChange={(e) => setAnnualAmount(e.target.value)}
                      required
                    />
                  </div>
                ) : (
                  <>
                    <div className="umkm-field">
                      <label htmlFor="base-annual">This year base</label>
                      <input
                        id="base-annual"
                        type="number"
                        min={0}
                        step="0.01"
                        value={baseAnnualAmount}
                        onChange={(e) => setBaseAnnualAmount(e.target.value)}
                        required
                      />
                    </div>
                    <div className="umkm-field">
                      <label htmlFor="yoy-growth">Annual growth %</label>
                      <input
                        id="yoy-growth"
                        type="number"
                        step="0.01"
                        value={annualGrowthPercent}
                        onChange={(e) =>
                          setAnnualGrowthPercent(e.target.value)
                        }
                      />
                    </div>
                  </>
                )}
              </div>
              {annualPreviewAmount > 0 ? (
                <p className="umkm-sub" style={{ marginTop: '0.85rem' }}>
                  Monthly breakdown preview:{' '}
                  <strong>
                    ~{formatMoney(annualMonthPreview[0] ?? 0)}
                  </strong>{' '}
                  × 11 months, December{' '}
                  <strong>
                    {formatMoney(annualMonthPreview[11] ?? 0)}
                  </strong>{' '}
                  (sum {formatMoney(annualPreviewAmount)}). Saving replaces
                  current monthly targets.
                </p>
              ) : null}
            </FormSection>

            <div className="umkm-actions">
              <button className="umkm-btn" type="submit" disabled={savingAnnual}>
                {savingAnnual ? 'Saving…' : 'Save annual & fill months'}
              </button>
              <button
                className="umkm-btn secondary"
                type="button"
                onClick={cancelAnnual}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : !data?.annualConfigured ? (
          <EmptyState
            title="No annual target"
            description="Set a manual year total or a systematic annual base. Months will be filled evenly automatically."
          />
        ) : (
          <div className="umkm-wh-kpis">
            <div className="umkm-wh-kpi">
              <span>Annual target</span>
              <strong>{formatMoney(data.annual?.target ?? 0)}</strong>
            </div>
            <div className="umkm-wh-kpi">
              <span>Annual actual</span>
              <strong>{formatMoney(data.annual?.actual ?? 0)}</strong>
            </div>
            <div className="umkm-wh-kpi">
              <span>Attainment</span>
              <strong>{formatPct(data.annual?.attainmentPercent)}</strong>
            </div>
            <div className="umkm-wh-kpi">
              <span>Next year (proj.)</span>
              <strong>
                {data.annual?.nextYearProjected != null
                  ? formatMoney(data.annual.nextYearProjected)
                  : '—'}
              </strong>
            </div>
          </div>
        )}
      </ContentSection>
    </section>
  );
}
