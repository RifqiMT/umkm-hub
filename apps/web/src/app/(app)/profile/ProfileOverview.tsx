'use client';

import { ProfileHealthCard } from '@/app/(app)/profile/ProfileHealthCard';
import { ProfileHero } from '@/app/(app)/profile/ProfileHero';
import { ProfileSnapshot } from '@/app/(app)/profile/ProfileSnapshot';
import type {
  CustomerSummary,
  OrderSummary,
  ProductSummary,
  Profile,
} from '@/lib/types';

type WorkspaceSnapshot = {
  products: ProductSummary | null;
  customers: CustomerSummary | null;
  orders: OrderSummary | null;
};

type ProfileOverviewProps = {
  booting: boolean;
  profile: Profile | null;
  personName: string;
  loginName: string;
  avatarLabel: string;
  copied: boolean;
  businessName: string;
  firstName: string;
  lastName: string;
  snapshotLoading: boolean;
  snapshot: WorkspaceSnapshot;
  onCopyProfileId: () => void;
};

export function ProfileOverview({
  booting,
  profile,
  personName,
  loginName,
  avatarLabel,
  copied,
  businessName,
  firstName,
  lastName,
  snapshotLoading,
  snapshot,
  onCopyProfileId,
}: ProfileOverviewProps) {
  return (
    <div className="umkm-profile-overview">
      <div className="umkm-profile-overview-top">
        <ProfileHero
          embedded
          booting={booting}
          profile={profile}
          personName={personName}
          loginName={loginName}
          avatarLabel={avatarLabel}
          copied={copied}
          businessName={businessName}
          onCopyProfileId={onCopyProfileId}
        />
        <ProfileHealthCard
          compact
          booting={booting}
          firstName={firstName}
          lastName={lastName}
          email={profile?.email}
          emailVerified={Boolean(profile?.emailVerified)}
          locationCity={profile?.locationCity ?? ''}
          locationCountry={profile?.locationCountry ?? ''}
          businessName={businessName}
        />
      </div>

      <div className="umkm-profile-overview-workspace">
        <header className="umkm-profile-overview-workspace-head">
          <span className="umkm-profile-side-kicker">Workspace</span>
          <h3>At a glance</h3>
          <p>Live counts — tap a card to open that area.</p>
        </header>
        <ProfileSnapshot loading={snapshotLoading} snapshot={snapshot} />
      </div>
    </div>
  );
}
