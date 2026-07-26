/** Inclusive YYYY-MM-DD range helpers for order list filters. */

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export function isDateOnlyString(value: string): boolean {
  return DATE_ONLY.test(value);
}

/** Parse YYYY-MM-DD as UTC midnight. Throws if invalid. */
export function parseDateOnlyUtc(value: string): Date {
  const day = value.slice(0, 10);
  if (!DATE_ONLY.test(day)) {
    throw new Error(`Invalid date format: ${value}`);
  }
  const parsed = new Date(`${day}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid date: ${value}`);
  }
  return parsed;
}

export type DateOnlyBounds = {
  gte?: Date;
  lte?: Date;
};

/**
 * Build inclusive Prisma DateTime filter bounds from optional from/to strings.
 * Returns undefined when neither bound is set. Swaps when from > to.
 */
export function dateOnlyBounds(
  from?: string | null,
  to?: string | null,
): DateOnlyBounds | undefined {
  const fromDay = from?.trim() || '';
  const toDay = to?.trim() || '';
  if (!fromDay && !toDay) return undefined;

  let fromDate = fromDay ? parseDateOnlyUtc(fromDay) : undefined;
  let toDate = toDay ? parseDateOnlyUtc(toDay) : undefined;

  if (fromDate && toDate && fromDate.getTime() > toDate.getTime()) {
    const swap = fromDate;
    fromDate = toDate;
    toDate = swap;
  }

  return {
    ...(fromDate ? { gte: fromDate } : {}),
    ...(toDate ? { lte: toDate } : {}),
  };
}
