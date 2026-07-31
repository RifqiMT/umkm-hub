/** Shared list page-size presets for paginated tables. */
export const LIST_PAGE_SIZE_OPTIONS = [20, 50, 100, 250, 500, 1000] as const;

export type ListPageSize = (typeof LIST_PAGE_SIZE_OPTIONS)[number];

export function pageSizeLabel(pageSize: ListPageSize): string {
  return String(pageSize);
}
