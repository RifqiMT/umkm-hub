/** Keep the last occurrence when a list contains duplicate ids (defensive UI guard). */
export function dedupeById<T extends { id: string }>(items: T[]): T[] {
  if (items.length < 2) return items;
  const map = new Map<string, T>();
  for (const item of items) {
    map.set(item.id, item);
  }
  return map.size === items.length ? items : [...map.values()];
}
