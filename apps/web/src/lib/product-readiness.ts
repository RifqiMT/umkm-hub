export const COST_SET_FILTER_OPTIONS = [
  { value: 'set', label: 'Cost set' },
  { value: 'unset', label: 'No cost' },
] as const;

export const PACK_READY_FILTER_OPTIONS = [
  { value: 'ready', label: 'Pack ready' },
  { value: 'not_ready', label: 'Not ready' },
] as const;

export const STOCK_STATUS_FILTER_OPTIONS = [
  { value: 'in_stock', label: 'In stock' },
  { value: 'out_of_stock', label: 'Out of stock' },
] as const;
