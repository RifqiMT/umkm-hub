/**
 * Order ID prefix from order date: `YYYY_MM_DD_`
 * Full Order ID: `{YYYY_MM_DD_}{uuid}` e.g. `2026_07_25_00000000-0000-4000-8000-000000000001`
 */

/** Normalize a date / ISO / YYYY-MM-DD string to calendar parts in UTC. */
export function orderDateParts(
  orderDate: Date | string,
): { year: string; month: string; day: string } {
  const day =
    typeof orderDate === 'string'
      ? orderDate.slice(0, 10)
      : orderDate.toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    throw new Error('Invalid order date for Order ID. Use YYYY-MM-DD.');
  }
  const [year, month, dayNum] = day.split('-');
  return { year: year!, month: month!, day: dayNum! };
}

/**
 * Prefix only: `YYYY_MM_DD_`
 * e.g. 2026-07-25 → 2026_07_25_
 */
export function buildOrderSkuPrefix(orderDate: Date | string): string {
  const { year, month, day } = orderDateParts(orderDate);
  return `${year}_${month}_${day}_`;
}

/**
 * Full Order ID: `{YYYY_MM_DD_}{systemUuid}`
 */
export function buildOrderSku(
  orderDate: Date | string,
  orderId: string,
): string {
  return `${buildOrderSkuPrefix(orderDate)}${orderId}`;
}
