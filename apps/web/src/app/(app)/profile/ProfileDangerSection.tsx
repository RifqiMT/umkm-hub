'use client';

import { useState } from 'react';
import { ContentSection } from '@/components/PageHeader';

type ProfileDangerSectionProps = {
  booting: boolean;
  disabled: boolean;
  onDelete: () => void;
};

export function ProfileDangerSection({
  booting,
  disabled,
  onDelete,
}: ProfileDangerSectionProps) {
  const [open, setOpen] = useState(false);

  return (
    <ContentSection
      className={`umkm-profile-danger${open ? ' is-open' : ''}`}
      eyebrow="Danger zone"
      title="Delete profile"
      description="Permanently removes this login and all related business data."
    >
      {!open ? (
        <div className="umkm-profile-danger-collapsed">
          <p>
            Deleting your profile removes products, customers, orders, targets, and
            warehouse history. This cannot be undone.
          </p>
          <button
            type="button"
            className="umkm-btn secondary umkm-profile-danger-reveal"
            disabled={booting || disabled}
            onClick={() => setOpen(true)}
          >
            I want to delete this profile…
          </button>
        </div>
      ) : (
        <div className="umkm-profile-danger-body">
          <div className="umkm-profile-danger-warning" role="alert">
            <strong>Last chance</strong>
            <p>
              Export anything you need first. Once deleted, this login and all
              workspace data are gone permanently.
            </p>
          </div>
          <div className="umkm-profile-danger-actions">
            <button
              className="umkm-btn danger"
              type="button"
              onClick={onDelete}
              disabled={booting || disabled}
            >
              Yes, delete my profile
            </button>
            <button
              type="button"
              className="umkm-btn secondary"
              disabled={booting}
              onClick={() => setOpen(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </ContentSection>
  );
}
