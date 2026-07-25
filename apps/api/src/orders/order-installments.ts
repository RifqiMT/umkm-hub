/** Round money to 4 decimal places (matches order totals). */
function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 10000) / 10000;
}

export function sumInstallmentAmounts(
  installments: Array<{ amount: number }>,
): number {
  return roundMoney(
    installments.reduce((sum, row) => sum + (Number(row.amount) || 0), 0),
  );
}

export function calculateRemainingAmount(
  totalOrderValue: number,
  installments: Array<{ amount: number }>,
): number {
  return roundMoney(
    Math.max(0, totalOrderValue - sumInstallmentAmounts(installments)),
  );
}

export function assertInstallmentsWithinTotal(
  totalOrderValue: number,
  installments: Array<{ amount: number }>,
): void {
  const paid = sumInstallmentAmounts(installments);
  if (paid > totalOrderValue + 0.00005) {
    throw new Error(
      `Installments (${paid}) exceed order total (${totalOrderValue})`,
    );
  }
}

/** Dates must be non-decreasing in submitted list order. */
export function assertInstallmentsChronological(
  installments: Array<{ installmentDate: string }>,
): void {
  for (let i = 1; i < installments.length; i++) {
    const prev = installments[i - 1].installmentDate.slice(0, 10);
    const curr = installments[i].installmentDate.slice(0, 10);
    if (curr < prev) {
      throw new Error(
        `Installment ${i + 1} date (${curr}) cannot be before installment ${i} (${prev})`,
      );
    }
  }
}
