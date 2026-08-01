'use client';

import {
  useEffect,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { formatRatePercent } from '@/lib/format-money';
import { AppTooltip, type AppTooltipContent } from '@/components/AppTooltip';
import { useTr } from '@/components/Tr';

type FeatureStageTip = AppTooltipContent;

type FeatureStageStat = {
  label: string;
  value: ReactNode;
  hero?: boolean;
  tip?: FeatureStageTip;
};

type FeatureStageRate = {
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

function usePhoneStage() {
  const [isPhone, setIsPhone] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 600px)');
    const sync = () => setIsPhone(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);
  return isPhone;
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
  const isPhone = usePhoneStage();
  const ratesLabelText = tr(ratesLabel);

  const ratesList = (
    <dl className="umkm-stage-rates" aria-label={ratesLabelText}>
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
  );

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

        {rates.length > 0 ? (
          <details
            key={isPhone ? 'phone-rates' : 'desktop-rates'}
            className="umkm-stage-rates-disclosure"
            {...(!isPhone ? { open: true } : {})}
          >
            <summary className="umkm-stage-rates-summary">
              <span>{ratesLabelText}</span>
            </summary>
            {ratesList}
          </details>
        ) : null}
      </div>
    </header>
  );
}
