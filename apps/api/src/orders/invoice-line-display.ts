/** Human-readable pack/qty label for invoice PDF rows. */
export function formatInvoiceQuantity(input: {
  packCount?: number | null;
  packSizeSnapshot?: number | null;
  productQty?: number | null;
  unit?: string | null;
}): string {
  const unit = (input.unit ?? 'PCS').toUpperCase();
  const packCount = Number(input.packCount) || 1;
  const packSize = Number(input.packSizeSnapshot) || 1;
  const suffix =
    unit === 'LITER' ? 'L' : unit === 'GRAM' ? 'g' : 'pcs';

  if (unit === 'PCS' && packSize <= 1) {
    return `${compactQty(packCount)} pcs`;
  }

  return `${compactQty(packCount)} × ${compactQty(packSize)} ${suffix}`;
}

/** Full-number quantity lines for invoice PDF (no M/B/T abbreviations). */
export function formatQtyFull(value: number): string {
  const n = Number(value) || 0;
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(
    Math.round(n),
  );
}

export function formatInvoiceQuantityLines(input: {
  packCount?: number | null;
  packSizeSnapshot?: number | null;
  productQty?: number | null;
  unit?: string | null;
}): { packs: string; packSize: string } {
  const unit = (input.unit ?? 'PCS').toUpperCase();
  const packCount = Number(input.packCount) || 1;
  const packSize = Number(input.packSizeSnapshot) || 1;
  const suffix =
    unit === 'LITER' ? 'L' : unit === 'GRAM' ? 'g' : 'pcs';

  if (unit === 'PCS' && packSize <= 1) {
    return { packs: `${formatQtyFull(packCount)} pcs`, packSize: '' };
  }

  const packLabel = packCount === 1 ? 'pack' : 'packs';
  return {
    packs: `${formatQtyFull(packCount)} ${packLabel}`,
    packSize: `${formatQtyFull(packSize)} ${suffix} each`,
  };
}

export function compactQty(value: number): string {
  const n = Number(value) || 0;
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) {
    const scaled = n / 1_000_000_000;
    return `${trimTrailingZeros(scaled.toFixed(2))}B`;
  }
  if (abs >= 1_000_000) {
    const scaled = n / 1_000_000;
    return `${trimTrailingZeros(scaled.toFixed(2))}M`;
  }
  if (abs >= 10_000) {
    return new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 0,
    }).format(Math.round(n));
  }
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: n % 1 === 0 ? 0 : 2,
  }).format(n);
}

export function formatDiscountLabel(
  discountType: string,
  discountValue: number,
): string {
  if (discountType === 'PERCENTAGE') {
    const pct =
      discountValue % 1 === 0
        ? discountValue.toFixed(0)
        : discountValue.toFixed(2);
    return `Discount (${pct}%)`;
  }
  return 'Discount';
}

function trimTrailingZeros(raw: string): string {
  return raw.replace(/\.?0+$/, '');
}
