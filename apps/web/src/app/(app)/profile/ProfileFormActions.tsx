'use client';

import { ReactNode } from 'react';
import { useTr } from '@/components/Tr';

type ProfileFormActionsProps = {
  dirty: boolean;
  loading: boolean;
  booting: boolean;
  saveLabel: string;
  onDiscard?: () => void;
  children?: ReactNode;
};

export function ProfileFormActions({
  dirty,
  loading,
  booting,
  saveLabel,
  onDiscard,
  children,
}: ProfileFormActionsProps) {
  const tr = useTr();

  return (
    <div
      className={`umkm-profile-form-actions${dirty ? ' is-dirty' : ''}`}
      data-dirty={dirty ? 'yes' : 'no'}
    >
      {dirty ? (
        <p className="umkm-profile-form-actions-note">Unsaved changes</p>
      ) : (
        <p className="umkm-profile-form-actions-note is-muted">All changes saved</p>
      )}
      <div className="umkm-actions umkm-profile-actions">
        <button
          className="umkm-btn"
          type="submit"
          disabled={loading || booting || !dirty}
        >
          {loading ? tr('Saving…') : tr(saveLabel)}
        </button>
        {dirty && onDiscard ? (
          <button
            type="button"
            className="umkm-btn secondary"
            disabled={loading}
            onClick={onDiscard}
          >
            Discard
          </button>
        ) : null}
        {children}
      </div>
    </div>
  );
}
