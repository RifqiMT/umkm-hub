'use client';

import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react';

type LazyMountProps = {
  children: ReactNode;
  /** Keep layout stable before the child mounts. */
  minHeight?: number | string;
  className?: string;
  style?: CSSProperties;
  /** Root margin for early mount ahead of scroll (default ~½ viewport). */
  rootMargin?: string;
  /** Force mount (e.g. fullscreen chart). */
  force?: boolean;
  /** Accessible busy label while deferred. */
  placeholderLabel?: string;
};

/**
 * Mounts children only when near the viewport (or when `force`).
 * Keeps Recharts / heavy chart trees off the initial analytics paint.
 */
export function LazyMount({
  children,
  minHeight = 220,
  className,
  style,
  rootMargin = '50% 0px',
  force = false,
  placeholderLabel = 'Loading chart',
}: LazyMountProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(force);

  useEffect(() => {
    if (force) {
      setMounted(true);
      return;
    }
    if (mounted) return;
    const el = ref.current;
    if (!el) return;

    if (typeof IntersectionObserver === 'undefined') {
      setMounted(true);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setMounted(true);
          io.disconnect();
        }
      },
      { root: null, rootMargin, threshold: 0.01 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [force, mounted, rootMargin]);

  return (
    <div
      ref={ref}
      className={className}
      style={{ minHeight, ...style }}
      aria-busy={!mounted || undefined}
    >
      {mounted ? (
        children
      ) : (
        <div
          className="umkm-analytics-chart-placeholder"
          role="status"
          aria-label={placeholderLabel}
        />
      )}
    </div>
  );
}
