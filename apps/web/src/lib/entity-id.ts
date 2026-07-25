/** First 8 hex chars of a UUID (or any id), for compact list display. */
export function shortEntityId(id: string): string {
  const compact = id.replace(/-/g, '');
  if (compact.length >= 8) return compact.slice(0, 8).toLowerCase();
  return id.slice(0, 8);
}
