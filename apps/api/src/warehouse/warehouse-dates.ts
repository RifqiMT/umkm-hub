/** Shared date helpers for warehouse restocks (exported for unit tests). */

export function parseDateOnlyForTest(value: string): Date {
  const day = value.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    throw new Error('Invalid date format. Use YYYY-MM-DD.');
  }
  return new Date(`${day}T00:00:00.000Z`);
}

export function todayDateOnlyForTest(now = new Date()): Date {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return new Date(`${y}-${m}-${d}T00:00:00.000Z`);
}
