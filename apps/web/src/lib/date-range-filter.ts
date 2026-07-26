export type DateRangeValue = {
  from: string;
  to: string;
};

export const EMPTY_DATE_RANGE: DateRangeValue = { from: '', to: '' };

export function isDateRangeActive(value: DateRangeValue): boolean {
  return Boolean(value.from || value.to);
}

/** Short display for filter trigger: All / From … / Until … / A — B */
export function dateRangeSummary(
  value: DateRangeValue,
  allLabel = 'All dates',
): string {
  const { from, to } = value;
  if (!from && !to) return allLabel;
  const fromLabel = from ? formatDateShort(from) : '';
  const toLabel = to ? formatDateShort(to) : '';
  if (from && to) {
    if (from === to) return fromLabel;
    return `${fromLabel} — ${toLabel}`;
  }
  if (from) return `From ${fromLabel}`;
  return `Until ${toLabel}`;
}

function formatDateShort(isoDay: string): string {
  const day = isoDay.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return day;
  const [y, m, d] = day.split('-').map(Number);
  const date = new Date(Date.UTC(y!, m! - 1, d!));
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
