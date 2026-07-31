'use client';

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { useTr } from '@/components/Tr';

export type AppTooltipContent = {
  /** Short metric name shown at the top of the bubble. */
  label?: string;
  /** Exact / full-precision value (e.g. uncompacted money). */
  value?: ReactNode;
  /** One plain-English sentence explaining the metric. */
  description?: string;
  /** Optional formula or technical note. */
  detail?: string;
};

export type AppTooltipProps = AppTooltipContent & {
  children: ReactNode;
  /** Preferred side; flips automatically near viewport edges. */
  placement?: 'top' | 'bottom';
  disabled?: boolean;
  className?: string;
  /**
   * When true (e.g. inside a Link/button), avoid nested focus targets —
   * hover only, with an accessible label on the trigger.
   */
  embedded?: boolean;
  /** Optional accent for rate meters (paid / margin / …). */
  tone?: 'paid' | 'margin' | 'discount' | 'cancel';
};

type Coords = {
  top: number;
  left: number;
  side: 'top' | 'bottom';
  arrow: number;
};

/** Only one metric tip open at a time — keeps the UI calm. */
let dismissActiveTip: (() => void) | null = null;

function hasContent({
  label,
  value,
  description,
  detail,
}: AppTooltipContent): boolean {
  if (description || detail) return true;
  if (label && value != null && value !== false && value !== '') return true;
  if (value != null && value !== false) {
    if (typeof value === 'string') return value.trim() !== '';
    return true;
  }
  return false;
}

function buildAriaLabel(
  {
    label,
    value,
    description,
    detail,
  }: AppTooltipContent,
  tr: (text: string) => string,
): string | undefined {
  const parts: string[] = [];
  if (label) parts.push(tr(label));
  if (value != null && (typeof value === 'string' || typeof value === 'number')) {
    parts.push(String(value));
  }
  if (description) parts.push(tr(description));
  if (detail) parts.push(tr(detail));
  return parts.length ? parts.join('. ') : undefined;
}

export function AppTooltip({
  children,
  label,
  value,
  description,
  detail,
  placement = 'top',
  disabled = false,
  className,
  embedded = false,
  tone,
}: AppTooltipProps) {
  const tr = useTr();
  const tipId = useId();
  const rootRef = useRef<HTMLSpanElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const showTimer = useRef<number | null>(null);
  const hideTimer = useRef<number | null>(null);
  const enabledRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<Coords | null>(null);
  const [ready, setReady] = useState(false);

  const content: AppTooltipContent = { label, value, description, detail };
  const enabled = !disabled && hasContent(content);
  enabledRef.current = enabled;

  useEffect(() => {
    setMounted(true);
  }, []);

  const clearTimers = useCallback(() => {
    if (showTimer.current != null) window.clearTimeout(showTimer.current);
    if (hideTimer.current != null) window.clearTimeout(hideTimer.current);
    showTimer.current = null;
    hideTimer.current = null;
  }, []);

  const hideNow = useCallback(() => {
    clearTimers();
    setOpen(false);
    setReady(false);
    setCoords(null);
    if (dismissActiveTip === hideNow) dismissActiveTip = null;
  }, [clearTimers]);

  const showNow = useCallback(() => {
    if (!enabledRef.current) return;
    clearTimers();
    if (dismissActiveTip && dismissActiveTip !== hideNow) {
      dismissActiveTip();
    }
    dismissActiveTip = hideNow;
    setReady(false);
    setOpen(true);
  }, [clearTimers, hideNow]);

  const scheduleShow = useCallback(() => {
    if (!enabledRef.current) return;
    clearTimers();
    showTimer.current = window.setTimeout(() => {
      if (!enabledRef.current) return;
      showNow();
    }, 220);
  }, [clearTimers, showNow]);

  const scheduleHide = useCallback(() => {
    clearTimers();
    // Longer grace so the pointer can cross the gap to the bubble.
    hideTimer.current = window.setTimeout(hideNow, 160);
  }, [clearTimers, hideNow]);

  useEffect(
    () => () => {
      clearTimers();
      if (dismissActiveTip === hideNow) dismissActiveTip = null;
    },
    [clearTimers, hideNow],
  );

  useEffect(() => {
    if (!enabled) {
      clearTimers();
      if (open) hideNow();
    }
  }, [clearTimers, enabled, hideNow, open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') hideNow();
    }
    function onPointerDown(e: PointerEvent) {
      const root = rootRef.current;
      const bubble = bubbleRef.current;
      const target = e.target;
      if (!(target instanceof Node)) return;
      if (root?.contains(target) || bubble?.contains(target)) return;
      hideNow();
    }
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onPointerDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onPointerDown);
    };
  }, [hideNow, open]);

  useLayoutEffect(() => {
    if (!open || !mounted) return;

    function place() {
      const trigger = rootRef.current;
      const bubble = bubbleRef.current;
      if (!trigger || !bubble) return;

      const gap = 12;
      const pad = 12;
      const rect = trigger.getBoundingClientRect();
      const tip = bubble.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const triggerMidX = rect.left + rect.width / 2;

      let side: 'top' | 'bottom' = placement;
      let top =
        side === 'top' ? rect.top - tip.height - gap : rect.bottom + gap;

      if (side === 'top' && top < pad) {
        side = 'bottom';
        top = rect.bottom + gap;
      } else if (side === 'bottom' && top + tip.height > vh - pad) {
        side = 'top';
        top = Math.max(pad, rect.top - tip.height - gap);
      }

      let left = triggerMidX - tip.width / 2;
      left = Math.max(pad, Math.min(left, vw - tip.width - pad));

      const arrow = Math.max(
        16,
        Math.min(tip.width - 16, triggerMidX - left),
      );

      setCoords({ top, left, side, arrow });
      setReady(true);
    }

    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [mounted, open, placement, label, value, description, detail]);

  if (!enabled) {
    return <>{children}</>;
  }

  const aria = buildAriaLabel(content, tr);
  const showValue = value != null && value !== '';
  const bubbleStyle: CSSProperties = coords
    ? {
        top: coords.top,
        left: coords.left,
        ['--tip-arrow' as string]: `${coords.arrow}px`,
        opacity: ready ? 1 : 0,
      }
    : { top: 0, left: 0, opacity: 0, visibility: 'hidden' };

  const toneClass = tone ? ` tone-${tone}` : '';

  return (
    <span
      ref={rootRef}
      className={`umkm-tip${className ? ` ${className}` : ''}${open ? ' is-open' : ''}${embedded ? ' is-embedded' : ''}`}
      onMouseEnter={scheduleShow}
      onMouseLeave={scheduleHide}
      onFocus={embedded ? undefined : showNow}
      onBlur={embedded ? undefined : scheduleHide}
      onPointerUp={(e) => {
        if (embedded) return;
        if (e.pointerType === 'touch' || e.pointerType === 'pen') {
          if (open) hideNow();
          else showNow();
        }
      }}
    >
      <span
        className="umkm-tip-trigger"
        tabIndex={embedded ? undefined : 0}
        aria-label={aria}
        aria-describedby={open ? tipId : undefined}
      >
        {children}
      </span>

      {mounted && open
        ? createPortal(
            <div
              ref={bubbleRef}
              id={tipId}
              role="tooltip"
              className={`umkm-tip-bubble is-${coords?.side ?? placement}${toneClass}${ready ? ' is-ready' : ''}`}
              style={bubbleStyle}
              onMouseEnter={clearTimers}
              onMouseLeave={scheduleHide}
            >
              <div className="umkm-tip-inner">
                {label ? <p className="umkm-tip-label">{tr(label)}</p> : null}
                {showValue ? (
                  <p className="umkm-tip-value">{value}</p>
                ) : null}
                {description ? (
                  <p className="umkm-tip-desc">{tr(description)}</p>
                ) : null}
                {detail ? (
                  <p className="umkm-tip-detail">
                    <span>{tr(detail)}</span>
                  </p>
                ) : null}
              </div>
            </div>,
            document.body,
          )
        : null}
    </span>
  );
}
