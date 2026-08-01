'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { confirmClear } from '@/lib/confirm';
import { EmptyState, FieldLabel } from '@/components/PageHeader';
import { useTr } from '@/components/Tr';
import { FeatureStage } from '@/components/FeatureStage';
import {
  FeatureDataTransfer,
  FeatureDataTransferToggle,
} from '@/components/FeatureDataTransfer';
import { OptionChips } from '@/components/OptionChips';
import { YearSelect } from '@/components/YearSelect';
import { appYearOptions } from '@/lib/app-timeline';
import type { RevenueTargetYear } from '@/lib/types';
import {
  formatMoney,
  formatMoneyParts,
  formatMoneyExact,
} from '@/lib/format-money';
import { buildTargetsStageMetrics } from '@/lib/feature-stage-metrics';

type TargetMode = 'MANUAL' | 'SYSTEMATIC';
type PlanView = 'monthly' | 'annual';

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
] as const;

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

function evenSplit(total: number) {
  const per = roundMoney(total / 12);
  const firstEleven = Array.from({ length: 11 }, () => per);
  const rem = roundMoney(total - firstEleven.reduce((s, n) => s + n, 0));
  return [...firstEleven, rem];
}

function monthsAreEven(amounts: number[]) {
  if (amounts.length !== 12) return false;
  const nonzero = amounts.filter((a) => a > 0);
  if (nonzero.length === 0) return false;
  const max = Math.max(...amounts);
  const min = Math.min(...amounts);
  return max - min < 0.02;
}

export default function TargetsPage() {
  const tr = useTr();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [data, setData] = useState<RevenueTargetYear | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [planView, setPlanView] = useState<PlanView>('monthly');
  const [editing, setEditing] = useState(false);
  const [dataSyncOpen, setDataSyncOpen] = useState(false);
  const [saving, setSaving] = useState(false);

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
    setEditing(false);
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
    editing && planView === 'monthly' && monthlyMode === 'SYSTEMATIC'
      ? systematicPreview.map((amount, i) => ({ month: i + 1, amount }))
      : editing && planView === 'monthly'
        ? months
        : (data?.months.map((m) => ({ month: m.month, amount: m.amount })) ??
          emptyMonths());

  const monthlySum = useMemo(
    () => roundMoney(displayMonths.reduce((s, m) => s + m.amount, 0)),
    [displayMonths],
  );

  const annualPreviewAmount = useMemo(() => {
    if (!(editing && planView === 'annual')) return 0;
    const raw =
      annualMode === 'SYSTEMATIC'
        ? Number(baseAnnualAmount)
        : Number(annualAmount);
    return Number.isNaN(raw) || raw < 0 ? 0 : roundMoney(raw);
  }, [editing, planView, annualMode, annualAmount, baseAnnualAmount]);

  const annualMonthPreview = useMemo(
    () => evenSplit(annualPreviewAmount),
    [annualPreviewAmount],
  );

  function startEdit(view: PlanView = planView) {
    setPlanView(view);
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    void load(year);
  }

  function onPlanViewChange(next: PlanView | '') {
    if (!next) return;
    setPlanView(next);
  }

  async function onSaveMonthly(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
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
      setEditing(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Save monthly failed');
    } finally {
      setSaving(false);
    }
  }

  async function onSaveAnnual(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
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
      setEditing(false);
      setPlanView('monthly');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Save annual failed');
    } finally {
      setSaving(false);
    }
  }

  async function onClearPlan() {
    if (!data?.monthlyConfigured && !data?.annualConfigured) return;
    if (
      !(await confirmClear(
        `Clear the ${year} revenue plan?`,
        'Removes monthly and annual targets together. This cannot be undone.',
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
      setEditing(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Clear plan failed');
    }
  }

  function updateMonthAmount(month: number, raw: string) {
    const next = [...months];
    next[month - 1] = {
      month,
      amount: Number(raw) || 0,
    };
    setMonths(next);
  }

  const yearOptions = appYearOptions(currentYear);
  const planConfigured = Boolean(
    data?.monthlyConfigured || data?.annualConfigured,
  );
  const stage = useMemo(() => buildTargetsStageMetrics(data), [data]);
  const pulseTarget = stage ? formatMoneyParts(stage.annualTarget) : null;
  const pulseActual = stage ? formatMoneyParts(stage.annualActual) : null;
  const pulseNext =
    stage?.nextYearProjected != null
      ? formatMoneyParts(stage.nextYearProjected)
      : null;

  const savedMonthAmounts =
    data?.months.map((m) => m.amount) ?? emptyMonths().map((m) => m.amount);
  const evenPlan = monthsAreEven(savedMonthAmounts);
  const maxMonthAmount = Math.max(
    1,
    ...savedMonthAmounts,
    ...displayMonths.map((m) => m.amount),
  );

  const syncCaption = editing
    ? planView === 'monthly'
      ? `Saving months sets the annual target to ${formatMoney(monthlySum)}.`
      : annualPreviewAmount > 0
        ? `Saving splits ${formatMoney(annualPreviewAmount)} evenly across 12 months.`
        : 'Enter a year total to preview the monthly split.'
    : planConfigured
      ? evenPlan
        ? 'Months and annual stay in sync · even monthly split'
        : 'Months and annual stay in sync · custom monthly mix'
      : 'One plan for the year — set by month or from a year total.';

  const previewBars =
    editing && planView === 'annual'
      ? annualMonthPreview
      : displayMonths.map((m) => m.amount);

  return (
    <section className="umkm-targets">
      <FeatureStage
        title="Targets"
        loading={loading && !data}
        subtitle={
          data
            ? `${year} · ${planConfigured ? 'Plan set' : 'No plan yet'}`
            : 'Set a yearly revenue plan and track attainment by month.'
        }
        action={
          <div className="umkm-targets-stage-actions">
            <FeatureDataTransferToggle
              open={dataSyncOpen}
              controlsId="feature-sync-targets"
              onClick={() => setDataSyncOpen((open) => !open)}
            />
            <button
              type="button"
              className="umkm-btn"
              onClick={() => startEdit(planView)}
              disabled={editing}
            >
              {planConfigured ? 'Edit plan' : 'Set plan'}
            </button>
            {planConfigured ? (
              <button
                type="button"
                className="umkm-btn danger"
                onClick={() => void onClearPlan()}
                disabled={editing}
              >
                Clear plan
              </button>
            ) : null}
          </div>
        }
        stats={[
          {
            label: 'Annual target',
            hero: true,
            tip: {
              value: stage ? formatMoneyExact(stage.annualTarget) : undefined,
              description: 'Your planned revenue for the selected year.',
            },
            value: pulseTarget ? (
              <>
                <b>{pulseTarget.figure}</b>
                {pulseTarget.unit ? <small>{pulseTarget.unit}</small> : null}
              </>
            ) : (
              <b>···</b>
            ),
          },
          {
            label: 'Annual actual',
            tip: {
              value: stage ? formatMoneyExact(stage.annualActual) : undefined,
              description:
                'Revenue booked so far against this year’s plan.',
            },
            value: pulseActual ? (
              <>
                <b>{pulseActual.figure}</b>
                {pulseActual.unit ? <small>{pulseActual.unit}</small> : null}
              </>
            ) : (
              <b>···</b>
            ),
          },
          {
            label: 'Next year',
            tip: {
              value:
                stage?.nextYearProjected != null
                  ? formatMoneyExact(stage.nextYearProjected)
                  : undefined,
              description:
                'Projected revenue for next year from the current plan pace.',
            },
            value: pulseNext ? (
              <>
                <b>{pulseNext.figure}</b>
                {pulseNext.unit ? <small>{pulseNext.unit}</small> : null}
              </>
            ) : stage ? (
              '—'
            ) : (
              <b>···</b>
            ),
          },
        ]}
        ratesLabel="Target rates"
        rates={[
          {
            tone: 'tone-paid',
            label: 'Attainment',
            tip: {
              description: 'How close annual actual is to the annual target.',
              detail: 'Annual actual ÷ annual target',
            },
            value: stage?.attainmentRate,
          },
          {
            tone: 'tone-margin',
            label: 'On plan',
            tip: {
              description:
                'Share of months that hit or beat 100% of their target.',
              detail: 'Months ≥ 100% ÷ months with a target',
            },
            value: stage?.monthsOnPlanRate,
          },
          {
            tone: 'tone-discount',
            label: 'Pace',
            tip: {
              description:
                'Year-to-date progress versus the sum of targets for months so far.',
              detail: 'YTD actual ÷ elapsed monthly targets',
            },
            value: stage?.paceRate,
          },
          {
            tone: 'tone-cancel',
            label: 'Coverage',
            tip: {
              description: 'Share of months that already have a target set.',
              detail: 'Months with target ÷ 12',
            },
            value: stage?.monthCoverageRate,
          },
        ]}
      />

      {dataSyncOpen ? (
        <FeatureDataTransfer
          entity="targets"
          label="Targets"
          onImported={() => void load()}
        />
      ) : null}

      {error ? <div className="umkm-error">{error}</div> : null}

      <section
        className={`umkm-targets-plan${editing ? ' is-editing' : ''}${loading ? ' is-loading' : ''}`}
        aria-label="Revenue plan"
        aria-busy={loading || undefined}
      >
        <div className="umkm-targets-plan-toolbar">
          <div className="umkm-targets-plan-controls">
            <YearSelect
              id="target-year"
              className="is-toolbar umkm-targets-plan-year"
              label="Year"
              value={year}
              years={yearOptions}
              disabled={editing}
              onChange={(next) => {
                if (typeof next === 'number') setYear(next);
              }}
            />
            <OptionChips
              aria-label="Plan view"
              className="umkm-targets-plan-chips"
              size="sm"
              value={planView}
              onChange={onPlanViewChange}
              options={[
                { value: 'monthly', label: 'By month' },
                { value: 'annual', label: 'By year' },
              ]}
            />
          </div>
          <p className="umkm-targets-plan-status" role="status">
            <span className="umkm-targets-plan-status-label">
              {planView === 'monthly' ? 'Monthly' : 'Annual'}
            </span>
            <span aria-hidden>·</span>
            <span className="umkm-targets-plan-status-hint">{syncCaption}</span>
          </p>
        </div>

        <div
          className={`umkm-targets-plan-panels is-${planView}${editing ? ' is-editing' : ''}`}
          key={`${planView}-${editing ? 'edit' : 'view'}`}
        >
          {editing && planView === 'monthly' ? (
            <form
              onSubmit={onSaveMonthly}
              className="umkm-targets-plan-panel umkm-targets-edit"
            >
              <header className="umkm-targets-edit-head">
                <div>
                  <h2>{tr('Set monthly targets')}</h2>
                  <p>{tr('Manual entry or January base with month-over-month growth.')}</p>
                </div>
                <OptionChips
                  aria-label="Monthly mode"
                  size="sm"
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
              </header>

              {monthlyMode === 'SYSTEMATIC' ? (
                <div className="umkm-targets-edit-fields">
                  <div className="umkm-field">
                    <FieldLabel htmlFor="base-month">January base</FieldLabel>
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
                    <FieldLabel htmlFor="mom-growth">Monthly growth %</FieldLabel>
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

              <div className="umkm-targets-month-grid is-edit" role="list">
                {displayMonths.map((row) => (
                  <div
                    key={row.month}
                    className="umkm-targets-month-cell"
                    role="listitem"
                  >
                    <span className="umkm-targets-month-label">
                      {MONTH_LABELS[row.month - 1]}
                    </span>
                    {monthlyMode === 'MANUAL' ? (
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        aria-label={`${MONTH_LABELS[row.month - 1]} target`}
                        value={months[row.month - 1]?.amount ?? 0}
                        onChange={(e) =>
                          updateMonthAmount(row.month, e.target.value)
                        }
                      />
                    ) : (
                      <strong className="umkm-num">
                        {formatMoney(row.amount)}
                      </strong>
                    )}
                  </div>
                ))}
              </div>

              <div className="umkm-targets-edit-foot">
                <p className="umkm-targets-edit-sum">
                  Annual target becomes <strong>{formatMoney(monthlySum)}</strong>
                </p>
                <div className="umkm-actions">
                  <button className="umkm-btn" type="submit" disabled={saving}>
                    {saving ? 'Saving…' : 'Save plan'}
                  </button>
                  <button
                    className="umkm-btn secondary"
                    type="button"
                    onClick={cancelEdit}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          ) : null}

          {editing && planView === 'annual' ? (
            <form
              onSubmit={onSaveAnnual}
              className="umkm-targets-plan-panel umkm-targets-edit"
            >
              <header className="umkm-targets-edit-head">
                <div>
                  <h2>{tr('Set from year total')}</h2>
                  <p>{tr('We’ll split the amount evenly across twelve months.')}</p>
                </div>
                <OptionChips
                  aria-label="Annual mode"
                  size="sm"
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
              </header>

              <div className="umkm-targets-edit-fields">
                {annualMode === 'MANUAL' ? (
                  <div className="umkm-field">
                    <FieldLabel htmlFor="annual-amount">Annual target</FieldLabel>
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
                      <FieldLabel htmlFor="base-annual">This year base</FieldLabel>
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
                      <FieldLabel htmlFor="yoy-growth">YoY growth %</FieldLabel>
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

              <div className="umkm-targets-split-preview" aria-live="polite">
                <div className="umkm-targets-split-copy">
                  <span>{tr('Monthly split preview')}</span>
                  <strong>
                    {annualPreviewAmount > 0
                      ? `~${formatMoney(annualMonthPreview[0] ?? 0)} / mo`
                      : '—'}
                  </strong>
                </div>
                <div className="umkm-targets-spark" aria-hidden>
                  {previewBars.map((amount, i) => (
                    <i
                      key={MONTH_LABELS[i]}
                      style={{
                        ['--h' as string]: `${Math.max(
                          8,
                          (amount /
                            Math.max(
                              1,
                              annualPreviewAmount || maxMonthAmount,
                            )) *
                            100,
                        )}%`,
                      }}
                      title={`${tr(MONTH_LABELS[i]!)}: ${formatMoney(amount)}`}
                    />
                  ))}
                </div>
              </div>

              <div className="umkm-targets-edit-foot">
                <p className="umkm-targets-edit-sum">
                  {annualPreviewAmount > 0
                    ? `Replaces months with an even split of ${formatMoney(annualPreviewAmount)}.`
                    : 'Enter an amount to preview the split.'}
                </p>
                <div className="umkm-actions">
                  <button className="umkm-btn" type="submit" disabled={saving}>
                    {saving ? 'Saving…' : 'Save & fill months'}
                  </button>
                  <button
                    className="umkm-btn secondary"
                    type="button"
                    onClick={cancelEdit}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          ) : null}

          {!editing && planView === 'monthly' ? (
            <div className="umkm-targets-plan-panel">
              {!data?.monthlyConfigured ? (
                <EmptyState
                  title="No monthly plan yet"
                  description="Set plan to enter months, or switch to By year to start from a year total."
                >
                  <div className="umkm-targets-empty-actions">
                    <button
                      type="button"
                      className="umkm-btn"
                      onClick={() => startEdit('monthly')}
                    >
                      Set by month
                    </button>
                    <button
                      type="button"
                      className="umkm-btn secondary"
                      onClick={() => startEdit('annual')}
                    >
                      Set by year
                    </button>
                  </div>
                </EmptyState>
              ) : (
                <>
                  <div className="umkm-table-wrap umkm-catalog-table-wrap umkm-targets-month-table">
                    <table className="umkm-table umkm-catalog-table">
                      <thead>
                        <tr>
                          <th>{tr('Month')}</th>
                          <th className="is-num">{tr('Target')}</th>
                          <th className="is-num">{tr('Actual')}</th>
                          <th className="is-num">% of target</th>
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
                                <span className="umkm-num">
                                  {formatMoney(m.amount)}
                                </span>
                              </td>
                              <td className="is-num">
                                <span className="umkm-num">
                                  {formatMoney(m.actual)}
                                </span>
                              </td>
                              <td className="is-num">
                                <span
                                  className={`umkm-margin-pill${pct >= 100 ? ' is-good' : pct >= 70 ? '' : ' is-warn'}`}
                                  title="Actual revenue / monthly target"
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
                                title="Actual revenue / monthly target"
                              >
                                {formatPct(m.attainmentPercent)} of target
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
            </div>
          ) : null}

          {!editing && planView === 'annual' ? (
            <div className="umkm-targets-plan-panel umkm-targets-annual-view">
              {!planConfigured ? (
                <EmptyState
                  title="No year total yet"
                  description="Start from an annual figure and we’ll fill an even monthly plan."
                >
                  <div className="umkm-targets-empty-actions">
                    <button
                      type="button"
                      className="umkm-btn"
                      onClick={() => startEdit('annual')}
                    >
                      Set by year
                    </button>
                    <button
                      type="button"
                      className="umkm-btn secondary"
                      onClick={() => startEdit('monthly')}
                    >
                      Set by month
                    </button>
                  </div>
                </EmptyState>
              ) : (
                <>
                  <div className="umkm-targets-annual-hero">
                    <div className="umkm-targets-annual-figure">
                      <span>Year target</span>
                      <strong title={formatMoney(stage?.annualTarget ?? 0)}>
                        {pulseTarget ? (
                          <>
                            <b>{pulseTarget.figure}</b>
                            {pulseTarget.unit ? (
                              <small>{pulseTarget.unit}</small>
                            ) : null}
                          </>
                        ) : (
                          '—'
                        )}
                      </strong>
                    </div>
                    <div className="umkm-targets-annual-meta">
                      <div>
                        <span>Actual</span>
                        <strong title={formatMoney(stage?.annualActual ?? 0)}>
                          {pulseActual ? (
                            <>
                              <b>{pulseActual.figure}</b>
                              {pulseActual.unit ? (
                                <small>{pulseActual.unit}</small>
                              ) : null}
                            </>
                          ) : (
                            '—'
                          )}
                        </strong>
                      </div>
                      <div>
                        <span>Split</span>
                        <strong>{evenPlan ? 'Even' : 'Custom months'}</strong>
                      </div>
                      <div>
                        <span>Next year</span>
                        <strong
                          title={
                            stage?.nextYearProjected != null
                              ? formatMoneyExact(stage.nextYearProjected)
                              : undefined
                          }
                        >
                          {pulseNext ? (
                            <>
                              <b>{pulseNext.figure}</b>
                              {pulseNext.unit ? (
                                <small>{pulseNext.unit}</small>
                              ) : null}
                            </>
                          ) : (
                            '—'
                          )}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className="umkm-targets-annual-chart">
                    <div className="umkm-targets-annual-chart-head">
                      <span>Monthly shape</span>
                      <button
                        type="button"
                        className="umkm-link-btn"
                        onClick={() => setPlanView('monthly')}
                      >
                        View months
                      </button>
                    </div>
                    <div className="umkm-targets-spark is-tall" aria-hidden>
                      {savedMonthAmounts.map((amount, i) => (
                        <i
                          key={MONTH_LABELS[i]}
                          style={{
                            ['--h' as string]: `${Math.max(10, (amount / maxMonthAmount) * 100)}%`,
                          }}
                          title={`${tr(MONTH_LABELS[i]!)}: ${formatMoney(amount)}`}
                        />
                      ))}
                    </div>
                    <div className="umkm-targets-spark-labels" aria-hidden>
                      {MONTH_LABELS.map((label) => (
                        <span key={label}>{label}</span>
                      ))}
                    </div>
                  </div>

                  <div className="umkm-targets-annual-actions">
                    <button
                      type="button"
                      className="umkm-btn"
                      onClick={() => startEdit('annual')}
                    >
                      Edit year total
                    </button>
                    <button
                      type="button"
                      className="umkm-btn secondary"
                      onClick={() => startEdit('monthly')}
                    >
                      Edit months
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : null}
        </div>
      </section>
    </section>
  );
}
