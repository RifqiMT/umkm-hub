export const GLOSSARY_FEATURES = [
  'dashboard',
  'products',
  'warehouse',
  'customers',
  'orders',
  'targets',
  'analytics',
] as const;

export type GlossaryFeature = (typeof GLOSSARY_FEATURES)[number];

export const GLOSSARY_FEATURE_LABELS: Record<GlossaryFeature, string> = {
  dashboard: 'Dashboard',
  products: 'Products',
  warehouse: 'Warehouse',
  customers: 'Customers',
  orders: 'Orders',
  targets: 'Targets',
  analytics: 'Analytics',
};

export type GlossaryEntry = {
  /** Stable id, e.g. orders.cancellationRate */
  id: string;
  /** User-facing name */
  label: string;
  /** Plain-English meaning */
  description: string;
  /** Plain-English or simple arithmetic formula */
  formula?: string;
  /** Features where this metric appears */
  features: GlossaryFeature[];
  /** Extra search terms */
  aliases?: string[];
};
