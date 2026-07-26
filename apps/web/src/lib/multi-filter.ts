export type MultiSelectOption = {
  value: string;
  label: string;
};

/** Empty selection means no filter (show everything). */
export function multiFilterSummary(
  selected: string[],
  options: MultiSelectOption[],
  allLabel = 'All',
): string {
  if (selected.length === 0) return allLabel;
  if (selected.length === 1) {
    const only = selected[0];
    return options.find((o) => o.value === only)?.label ?? only ?? allLabel;
  }
  return `${selected.length} selected`;
}

export function isMultiFilterActive(selected: string[]): boolean {
  return selected.length > 0;
}

/** Keep selection normalized: never store a “select every option” set. */
export function normalizeMultiFilterSelection(
  selected: string[],
  optionCount: number,
): string[] {
  if (selected.length === 0) return [];
  if (selected.length >= optionCount) return [];
  return selected;
}
