import type { GlossaryFeature } from './types';

/** Plain-English overview for each Dictionary feature section. */
export const GLOSSARY_SECTION_INTROS: Record<GlossaryFeature, string> = {
  dashboard:
    'Dashboard is your home snapshot. Order numbers follow the period you pick (for example This month). Product and customer numbers stay workspace-wide so you always see catalog and CRM health beside period sales.',
  products:
    'Products is your sellable catalog. Metrics here describe how many SKUs you have, what that stock would sell for, and how ready the catalog is (stock levels, costs filled in, and pack pricing). Filters on the page also scope these summary numbers.',
  warehouse:
    'Warehouse tracks stock on hand and restocks. Valuation metrics estimate sell value, cost, and profit if you sold current inventory. Rates show how much of the catalog is in stock, out of stock, or has cost data so margins can be calculated.',
  customers:
    'Customers is your B2B CRM pipeline. Metrics summarize how many contacts you have, how warm they look (approval and Interested status), how close they are to a first order, and whether you can reach them by email or phone.',
  orders:
    'Orders is where sales are recorded. Volume metrics count money, orders, and packs from non-cancelled orders. Health rates show cancellations, discounts, payment progress, and estimated margin when product costs exist. List filters also scope the stage summary.',
  targets:
    'Targets is your revenue plan for a calendar year. You set monthly or annual goals; UMKM Hub compares them with real order revenue (by order date, cancellations excluded). Pace and coverage tell you if the year is on track and whether every month has a plan.',
  analytics:
    'Analytics is the deep trend view. Choose Weekly, Monthly, Quarterly, or Annual and a timeline of years. Charts cover revenue versus target, basket size, purchase frequency, lead times, product and customer performance, and growth—using the same non-cancelled order rules as Targets.',
};

export const GLOSSARY_PAGE_INTRO =
  'Plain-English meanings and formulas for every number in UMKM Hub—so the whole team shares the same vocabulary.';
