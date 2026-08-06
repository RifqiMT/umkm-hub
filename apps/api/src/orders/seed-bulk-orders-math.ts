/** Pure helpers for one-time bulk order seeding. */

export const PACKS_PER_PRODUCT = 1_000_000_000_000n;
/** Soft cap so multi-line order money stays within Decimal(18,4). */
const SOFT_MAX_PACKS_PER_LINE = 80_000_000n;
/** ~14 integer digits — leave headroom under Decimal(18,4). */
export const MAX_LINE_MONEY = 20_000_000_000_000; // 2e13
export const MAX_ORDER_MONEY = 80_000_000_000_000; // 8e13

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 10000) / 10000;
}

export function randInt(min: number, max: number): number {
  if (max < min) return min;
  return min + Math.floor(Math.random() * (max - min + 1));
}

export function randFloat(min: number, max: number, decimals = 4): number {
  const n = min + Math.random() * (max - min);
  const f = 10 ** decimals;
  return Math.round((n + Number.EPSILON) * f) / f;
}

export function pickOne<T>(items: T[]): T {
  return items[randInt(0, items.length - 1)]!;
}

export function shuffleInPlace<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = randInt(0, i);
    const tmp = items[i]!;
    items[i] = items[j]!;
    items[j] = tmp;
  }
  return items;
}

export function addDaysUtc(date: Date, days: number): Date {
  const out = new Date(date.getTime());
  out.setUTCDate(out.getUTCDate() + days);
  return out;
}

export function toDateOnlyString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function parseDateOnlyUtc(value: string): Date {
  const day = value.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    throw new Error(`Invalid date: ${value}`);
  }
  return new Date(`${day}T00:00:00.000Z`);
}

/** Inclusive random calendar day between start and end (UTC date-only). */
export function randomDateBetween(start: Date, end: Date): Date {
  const a = start.getTime();
  const b = end.getTime();
  const t = a + Math.floor(Math.random() * (b - a + 1));
  const d = new Date(t);
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
}

/**
 * Max packs for a line given pack price and remaining packs,
 * constrained by money + soft cap.
 */
export function maxPacksForLine(input: {
  packPrice: number;
  remainingPacks: bigint;
  orderMoneyBudget: number;
}): bigint {
  if (input.remainingPacks <= 0n) return 0n;
  if (!(input.packPrice > 0)) return 0n;

  const moneyCapLine = Math.floor(MAX_LINE_MONEY / input.packPrice);
  const moneyCapOrder = Math.floor(input.orderMoneyBudget / input.packPrice);
  const moneyCap = BigInt(Math.max(0, Math.min(moneyCapLine, moneyCapOrder)));
  if (moneyCap <= 0n) return 0n;

  let cap = moneyCap;
  if (cap > SOFT_MAX_PACKS_PER_LINE) cap = SOFT_MAX_PACKS_PER_LINE;
  if (cap > input.remainingPacks) cap = input.remainingPacks;
  return cap;
}

/** Random pack count in [1, max] favoring larger chunks to finish faster. */
export function randomPackCount(maxPacks: bigint): bigint {
  if (maxPacks <= 0n) return 0n;
  if (maxPacks === 1n) return 1n;
  // Bias toward upper half so we don't create millions of tiny orders.
  const half = maxPacks / 2n;
  const lo = half > 0n ? half : 1n;
  const span = maxPacks - lo + 1n;
  const offset = BigInt(Math.floor(Math.random() * Number(span)));
  return lo + offset;
}

/**
 * Split total across k installments (sum exact). Dates non-decreasing
 * starting at baseDate, spaced by gapDays (default 7–14 style via caller).
 */
export function splitInstallments(input: {
  totalOrderValue: number;
  count: number;
  baseDate: Date;
  gapDaysMin?: number;
  gapDaysMax?: number;
}): Array<{ amount: number; installmentDate: string }> {
  const k = Math.max(1, Math.min(10, Math.floor(input.count)));
  const total = roundMoney(Math.max(0, input.totalOrderValue));
  if (total <= 0) {
    return [
      {
        amount: 0.0001,
        installmentDate: toDateOnlyString(input.baseDate),
      },
    ];
  }

  const gapMin = input.gapDaysMin ?? 7;
  const gapMax = input.gapDaysMax ?? 14;
  const weights = Array.from({ length: k }, () => Math.random() + 0.15);
  const weightSum = weights.reduce((a, b) => a + b, 0);
  const amounts: number[] = [];
  let allocated = 0;
  for (let i = 0; i < k - 1; i += 1) {
    const share = roundMoney((weights[i]! / weightSum) * total);
    amounts.push(Math.max(0.0001, share));
    allocated = roundMoney(allocated + amounts[i]!);
  }
  const last = roundMoney(total - allocated);
  amounts.push(Math.max(0.0001, last));
  // Fix drift if last clamp changed sum
  const sum = roundMoney(amounts.reduce((a, b) => a + b, 0));
  const drift = roundMoney(total - sum);
  if (drift !== 0) {
    amounts[amounts.length - 1] = roundMoney(
      amounts[amounts.length - 1]! + drift,
    );
  }

  let cursor = input.baseDate;
  return amounts.map((amount) => {
    const row = {
      amount: roundMoney(amount),
      installmentDate: toDateOnlyString(cursor),
    };
    cursor = addDaysUtc(cursor, randInt(gapMin, gapMax));
    return row;
  });
}

export function pickOrderStatus(orderDate: Date, today: Date): string {
  if (orderDate.getTime() <= addDaysUtc(today, -60).getTime()) {
    return Math.random() < 0.85 ? 'DELIVERED' : 'SHIPPED';
  }
  if (orderDate.getTime() <= today.getTime()) {
    return pickOne(['DELIVERED', 'SHIPPED', 'CONFIRMED']);
  }
  return pickOne(['CONFIRMED', 'PENDING']);
}

export function pickPaymentStatus(): string {
  return pickOne(['CASH', 'CONSIGNMENT', 'DELAYED_PAYMENT', 'KONTRA_BON']);
}
