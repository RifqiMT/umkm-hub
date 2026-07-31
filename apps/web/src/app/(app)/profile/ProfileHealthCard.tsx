'use client';

import {
  computeProfileHealth,
  profileHealthHref,
  type ProfileHealth,
} from '@/app/(app)/profile/profile-health';

type ProfileHealthCardProps = {
  compact?: boolean;
  booting: boolean;
  firstName: string;
  lastName: string;
  email?: string | null;
  emailVerified: boolean;
  locationCity: string;
  locationCountry: string;
  businessName: string;
};

function HealthRing({ percent }: { percent: number }) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div
      className="umkm-profile-health-ring"
      style={{ ['--health-pct' as string]: `${clamped}%` }}
      aria-hidden
    >
      <span>{clamped}%</span>
    </div>
  );
}

export function ProfileHealthCard(props: ProfileHealthCardProps) {
  const { booting, compact = false } = props;
  const health: ProfileHealth = computeProfileHealth({
    firstName: props.firstName,
    lastName: props.lastName,
    email: props.email,
    emailVerified: props.emailVerified,
    locationCity: props.locationCity,
    locationCountry: props.locationCountry,
    businessName: props.businessName,
  });

  if (booting) {
    return (
      <div
        className={`umkm-profile-health is-loading${compact ? ' is-compact' : ''}`}
        aria-busy="true"
      >
        <span className="umkm-profile-health-skel-ring" aria-hidden />
        <span className="umkm-profile-health-skel-lines" aria-hidden>
          <i />
          <i />
        </span>
      </div>
    );
  }

  const complete = health.percent >= 100;

  if (!booting && complete) {
    return null;
  }

  return (
    <section
      className={`umkm-profile-health${complete ? ' is-complete' : ''}${compact ? ' is-compact' : ''}`}
      aria-label="Profile setup progress"
    >
      <HealthRing percent={health.percent} />
      <div className="umkm-profile-health-copy">
        <h3>{complete ? 'Profile is ready' : 'Complete your profile'}</h3>
        <p>
          {complete
            ? 'Identity, location, and invoicing basics are in place.'
            : `${health.done} of ${health.total} setup steps done — finish the rest for smoother invoices and account recovery.`}
        </p>
        {!complete && health.incomplete.length > 0 ? (
          <ul className="umkm-profile-health-actions">
            {health.incomplete.map((item) => (
              <li key={item.id}>
                <a href={profileHealthHref(item.section)} className="umkm-profile-health-link">
                  <span>{item.cta}</span>
                  <em>{item.label}</em>
                </a>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
