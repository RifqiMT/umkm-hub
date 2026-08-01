import type { GlossaryFeature } from './types';

/** Plain-English overview for each Dictionary feature section. */
export const GLOSSARY_SECTION_INTROS: Record<GlossaryFeature, string> = {
  dashboard:
    'Dashboard is your home snapshot. Order numbers follow the period you pick (for example This month). Product and customer numbers stay workspace-wide so you always see catalog and CRM health beside period sales.',
  products:
    'Products is your sellable catalog. Stage metrics describe how many SKUs you have, what stock would sell for, and how ready the catalog is. The Stock & sales table adds per-product stocks, revenue (gross + net), discount, cost, profit, STR, ITR, SSR, orders, AOV, and UPT. Filters on the page also scope these numbers.',
  warehouse:
    'Warehouse tracks stock on hand, restocks, and sold history. Valuation metrics estimate sell value, cost, and profit if you sold current inventory. Restock and sold ledgers show quantity before and after each movement, with pack equivalents when a pack is set.',
  customers:
    'Customers is your B2B CRM pipeline. Stage metrics summarize contacts, approval, interest, closing, promises, and reachability. The Order totals table adds per-customer revenue (gross + net), discounts, volume, cancellations, AOV, and UPT for buyers tied to orders.',
  orders:
    'Orders is where sales are recorded. Volume metrics count money, orders, and packs from non-cancelled orders. Health rates show cancellations, discounts, payment progress, and estimated margin when product costs exist. List filters also scope the stage summary.',
  targets:
    'Targets is your revenue plan for a calendar year. You set monthly or annual goals; UMKM Hub compares them with real order revenue (by order date, cancellations excluded). Pace and coverage tell you if the year is on track and whether every month has a plan.',
  analytics:
    'Analytics is the deep trend view. Choose Weekly, Monthly, Quarterly, or Annual and a timeline of years. Charts cover revenue versus target, basket size, purchase frequency, lead times, product and customer performance, and growth, using the same non-cancelled order rules as Targets.',
};

export const GLOSSARY_PAGE_INTRO =
  'Plain-English meanings and formulas for every number in UMKM Hub, so the whole team shares the same vocabulary.';
