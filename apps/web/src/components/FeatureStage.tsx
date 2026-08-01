'use client';

import type { CSSProperties, ReactNode } from 'react';
import { formatRatePercent } from '@/lib/format-money';
import { AppTooltip, type AppTooltipContent } from '@/components/AppTooltip';
import { useTr } from '@/components/Tr';

export type FeatureStageTip = AppTooltipContent;

export type FeatureStageStat = {
  label: string;
  value: ReactNode;
  hero?: boolean;
  tip?: FeatureStageTip;
};

export type FeatureStageRate = {
  tone: 'tone-cancel' | 'tone-margin' | 'tone-discount' | 'tone-paid';
  label: string;
  tip?: FeatureStageTip;
  value: number | null | undefined;
};

type FeatureStageProps = {
  title: string;
  subtitle: ReactNode;
  action: ReactNode;
  loading?: boolean;
  stats: FeatureStageStat[];
  rates: FeatureStageRate[];
  ratesLabel: string;
};

function rateMeterStyle(
  value: number | null | undefined,
  loading = false,
): CSSProperties | undefined {
  if (loading || value == null || !Number.isFinite(value)) {
    return { ['--rate' as string]: '0%' };
  }
  // Negative rates (e.g. margin) still show a thin presence bar so the
  // meter doesn't look like a quiet 0% while the label is negative.
  if (value < 0) {
    return { ['--rate' as string]: '8%' };
  }
  const clamped = Math.max(0, Math.min(100, value));
  return { ['--rate' as string]: `${clamped}%` };
}

export function FeatureStage({
  title,
  subtitle,
  action,
  loading = false,
  stats,
  rates,
  ratesLabel,
}: FeatureStageProps) {
  const tr = useTr();
  return (
    <header
      className={`umkm-stage${loading ? ' is-loading' : ''}`}
      aria-busy={loading || undefined}
    >
      <div className="umkm-stage-top">
        <div className="umkm-stage-copy">
          <h1>{tr(title)}</h1>
          <p>{typeof subtitle === 'string' ? tr(subtitle) : subtitle}</p>
        </div>
        <div className="umkm-stage-actions">{action}</div>
      </div>

      <div className="umkm-stage-body">
        <dl className="umkm-stage-volume">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className={`umkm-stage-stat${stat.hero ? ' is-hero' : ''}`}
            >
              <dt>{tr(stat.label)}</dt>
              <dd>
                {stat.tip ? (
                  <AppTooltip
                    {...stat.tip}
                    label={stat.tip.label ?? stat.label}
                    disabled={loading}
                  >
                    {loading ? <b>···</b> : stat.value}
                  </AppTooltip>
                ) : loading ? (
                  <b>···</b>
                ) : (
                  stat.value
                )}
              </dd>
            </div>
          ))}
        </dl>

        <dl className="umkm-stage-rates" aria-label={tr(ratesLabel)}>
          {rates.map((rate) => {
            const shown = loading ? '···' : formatRatePercent(rate.value);
            return (
              <AppTooltip
                key={rate.label}
                className="umkm-tip-block"
                disabled={loading}
                tone={
                  rate.tone === 'tone-paid'
                    ? 'paid'
                    : rate.tone === 'tone-margin'
                      ? 'margin'
                      : rate.tone === 'tone-discount'
                        ? 'discount'
                        : 'cancel'
                }
                label={rate.tip?.label ?? rate.label}
                value={
                  rate.tip?.value ??
                  (loading ? undefined : formatRatePercent(rate.value))
                }
                description={rate.tip?.description}
                detail={rate.tip?.detail}
              >
                <div
                  className={`umkm-stage-rate ${rate.tone}`}
                  style={rateMeterStyle(rate.value, loading)}
                >
                  <div className="umkm-stage-rate-row">
                    <dt>{tr(rate.label)}</dt>
                    <dd>{shown}</dd>
                  </div>
                  <span className="umkm-stage-meter" aria-hidden>
                    <i />
                  </span>
                </div>
              </AppTooltip>
            );
          })}
        </dl>
      </div>
    </header>
  );
}
