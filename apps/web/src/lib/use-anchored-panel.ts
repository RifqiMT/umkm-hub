'use client';

import {
  useLayoutEffect,
  useState,
  type CSSProperties,
  type RefObject,
} from 'react';

const SHEET_MQ = '(max-width: 900px)';

export type AnchoredPanelState = {
  style: CSSProperties | undefined;
  /** True when the panel should render as a bottom sheet (≤900px). */
  isSheet: boolean;
};

/** Position a fixed panel under an anchor, or as a bottom sheet on narrow viewports. */
export function useAnchoredPanel(
  open: boolean,
  anchorRef: RefObject<HTMLElement | null>,
  minWidth = 15 * 16,
): AnchoredPanelState {
  const [state, setState] = useState<AnchoredPanelState>({
    style: undefined,
    isSheet: false,
  });

  useLayoutEffect(() => {
    if (!open) {
      setState({ style: undefined, isSheet: false });
      return;
    }

    function place() {
      const sheet =
        typeof window !== 'undefined' &&
        window.matchMedia(SHEET_MQ).matches;

      if (sheet) {
        setState({
          isSheet: true,
          style: {
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 0,
            top: 'auto',
            width: '100%',
            minWidth: '100%',
            maxWidth: '100%',
            maxHeight: 'min(72dvh, 32rem)',
            zIndex: 1200,
          },
        });
        return;
      }

      const el = anchorRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const width = Math.max(rect.width, minWidth);
      let left = rect.left;
      const maxLeft = window.innerWidth - width - 8;
      if (left > maxLeft) left = Math.max(8, maxLeft);
      if (left < 8) left = 8;

      const gap = 6;
      const estimatedHeight = 280;
      const spaceBelow = window.innerHeight - rect.bottom - gap;
      const openUp = spaceBelow < 160 && rect.top > spaceBelow;

      setState({
        isSheet: false,
        style: {
          position: 'fixed',
          top: openUp ? undefined : rect.bottom + gap,
          bottom: openUp
            ? window.innerHeight - rect.top + gap
            : undefined,
          left,
          minWidth: width,
          maxWidth: `min(22rem, calc(100vw - 1rem))`,
          maxHeight: openUp
            ? Math.min(estimatedHeight, rect.top - 16)
            : Math.min(estimatedHeight, spaceBelow - 8),
          zIndex: 1200,
        },
      });
    }

    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    const mq = window.matchMedia(SHEET_MQ);
    const onMq = () => place();
    mq.addEventListener('change', onMq);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
      mq.removeEventListener('change', onMq);
    };
  }, [open, anchorRef, minWidth]);

  return state;
}
