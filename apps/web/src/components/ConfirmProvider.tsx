'use client';

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  registerConfirmHandler,
  type ConfirmOptions,
  type ConfirmTone,
} from '@/lib/confirm';

type PendingConfirm = ConfirmOptions & {
  resolve: (value: boolean) => void;
};

function toneDefaults(tone: ConfirmTone) {
  switch (tone) {
    case 'danger':
      return {
        confirmLabel: 'Delete',
        icon: '!',
        confirmClass: 'umkm-btn danger',
      };
    case 'warn':
      return {
        confirmLabel: 'Clear',
        icon: '!',
        confirmClass: 'umkm-btn',
      };
    default:
      return {
        confirmLabel: 'Confirm',
        icon: 'i',
        confirmClass: 'umkm-btn',
      };
  }
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descId = useId();

  const openConfirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setPending({ ...options, resolve });
    });
  }, []);

  useEffect(() => {
    registerConfirmHandler(openConfirm);
    return () => registerConfirmHandler(null);
  }, [openConfirm]);

  useEffect(() => {
    if (!pending) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const t = window.setTimeout(() => {
      (pending.tone === 'danger' ? cancelRef : confirmRef).current?.focus();
    }, 20);
    return () => {
      document.body.style.overflow = prev;
      window.clearTimeout(t);
    };
  }, [pending]);

  function close(result: boolean) {
    if (!pending) return;
    pending.resolve(result);
    setPending(null);
  }

  useEffect(() => {
    if (!pending) return;
    const active = pending;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        active.resolve(false);
        setPending(null);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pending]);

  const tone = pending?.tone ?? 'danger';
  const defaults = toneDefaults(tone);

  return (
    <>
      {children}
      {pending ? (
        <div
          className="umkm-confirm-root"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) close(false);
          }}
        >
          <div
            className={`umkm-confirm-dialog is-${tone}`}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descId}
          >
            <div className="umkm-confirm-icon" aria-hidden>
              <span>{defaults.icon}</span>
            </div>
            <div className="umkm-confirm-copy">
              <h2 id={titleId} className="umkm-confirm-title">
                {pending.title}
              </h2>
              <p id={descId} className="umkm-confirm-message">
                {pending.message}
              </p>
              {pending.detail ? (
                <p className="umkm-confirm-detail">{pending.detail}</p>
              ) : null}
            </div>
            <div className="umkm-confirm-actions">
              <button
                ref={cancelRef}
                type="button"
                className="umkm-btn secondary"
                onClick={() => close(false)}
              >
                {pending.cancelLabel ?? 'Cancel'}
              </button>
              <button
                ref={confirmRef}
                type="button"
                className={defaults.confirmClass}
                onClick={() => close(true)}
              >
                {pending.confirmLabel ?? defaults.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
