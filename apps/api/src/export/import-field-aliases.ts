/** Read business IDs from import rows (supports legacy `sku` column). */
export function readProductBusinessId(row: Record<string, unknown>): string {
  return String(row.productId ?? row.sku ?? '').trim();
}

export function readCustomerBusinessId(row: Record<string, unknown>): string {
  return String(row.customerId ?? row.sku ?? '').trim();
}

export function readOrderBusinessId(row: Record<string, unknown>): string {
  return String(row.orderId ?? row.sku ?? '').trim();
}
