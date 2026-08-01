type DiscountType = 'PERCENTAGE' | 'AMOUNT';

type OrderTotalsInput = {
  unitPrice: number;
  productQty: number;
  discountType: DiscountType;
  discountValue: number;
};

type OrderLineAmountInput = {
  unitPrice: number;
  productQty: number;
};

type OrderTotals = {
  lineTotal: number;
  totalOrderValue: number;
};

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 10000) / 10000;
}

export function lineSubtotal(unitPrice: number, productQty: number): number {
  if (unitPrice < 0 || productQty < 0) {
    throw new Error('Unit price and product qty must be non-negative');
  }
  return roundMoney(unitPrice * productQty);
}

/** Single-line totals (legacy helper). */
export function calculateOrderTotals(input: OrderTotalsInput): OrderTotals {
  return calculateMultiLineOrderTotals({
    lines: [{ unitPrice: input.unitPrice, productQty: input.productQty }],
    discountType: input.discountType,
    discountValue: input.discountValue,
  });
}

/**
 * Multi-line order totals: sum of line subtotals, then one order-level discount.
 */
export function calculateMultiLineOrderTotals(input: {
  lines: OrderLineAmountInput[];
  discountType: DiscountType;
  discountValue: number;
}): OrderTotals {
  if (!input.lines.length) {
    throw new Error('Order requires at least one line');
  }
  if (input.discountValue < 0) {
    throw new Error('Discount value must be non-negative');
  }

  const lineTotal = roundMoney(
    input.lines.reduce(
      (sum, line) => sum + lineSubtotal(line.unitPrice, line.productQty),
      0,
    ),
  );

  if (input.discountType === 'PERCENTAGE') {
    if (input.discountValue > 100) {
      throw new Error('Percentage discount cannot exceed 100');
    }
    const totalOrderValue = roundMoney(
      lineTotal * (1 - input.discountValue / 100),
    );
    return { lineTotal, totalOrderValue };
  }

  if (input.discountValue > lineTotal) {
    throw new Error('Discount amount cannot exceed line total');
  }
  const totalOrderValue = roundMoney(lineTotal - input.discountValue);
  return { lineTotal, totalOrderValue };
}

/**
 * Allocate order total across lines by pre-discount share
 * so product revenue sums to totalOrderValue.
 */
export function allocateLineRevenue(
  lineTotals: number[],
  totalOrderValue: number,
): number[] {
  const sum = roundMoney(lineTotals.reduce((a, b) => a + b, 0));
  if (lineTotals.length === 0) return [];
  if (sum <= 0) {
    return lineTotals.map(() => 0);
  }
  const allocated = lineTotals.map((lt) =>
    roundMoney((lt / sum) * totalOrderValue),
  );
  const allocatedSum = roundMoney(allocated.reduce((a, b) => a + b, 0));
  const drift = roundMoney(totalOrderValue - allocatedSum);
  if (drift !== 0 && allocated.length > 0) {
    allocated[allocated.length - 1] = roundMoney(
      allocated[allocated.length - 1] + drift,
    );
  }
  return allocated;
}
