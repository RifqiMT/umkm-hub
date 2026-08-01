// GENERATED FILE. Do not edit by hand.
// Source: apps/web/src/lib/glossary/{catalog,sections,types}.ts
// Regenerate: npx tsx scripts/sync-glossary-mobile.ts

enum GlossaryFeature {
  dashboard,
  products,
  warehouse,
  customers,
  orders,
  targets,
  analytics,
}

extension GlossaryFeatureLabel on GlossaryFeature {
  String get label {
    switch (this) {
      case GlossaryFeature.dashboard:
        return 'Dashboard';
      case GlossaryFeature.products:
        return 'Products';
      case GlossaryFeature.warehouse:
        return 'Warehouse';
      case GlossaryFeature.customers:
        return 'Customers';
      case GlossaryFeature.orders:
        return 'Orders';
      case GlossaryFeature.targets:
        return 'Targets';
      case GlossaryFeature.analytics:
        return 'Analytics';
    }
  }

  String get intro {
    switch (this) {
      case GlossaryFeature.dashboard:
        return 'Dashboard is your home snapshot. Order numbers follow the period you pick (for example This month). Product and customer numbers stay workspace-wide so you always see catalog and CRM health beside period sales.';
      case GlossaryFeature.products:
        return 'Products is your sellable catalog. Stage metrics describe how many SKUs you have, what stock would sell for, and how ready the catalog is. The Stock & sales table adds per-product stocks, revenue, discount, cost, profit, STR, ITR, SSR, orders, AOV, and UPT. Filters on the page also scope these numbers.';
      case GlossaryFeature.warehouse:
        return 'Warehouse tracks stock on hand, restocks, and sold history. Valuation metrics estimate sell value, cost, and profit if you sold current inventory. Restock and sold ledgers show quantity before and after each movement, with pack equivalents when a pack is set.';
      case GlossaryFeature.customers:
        return 'Customers is your B2B CRM pipeline. Stage metrics summarize contacts, approval, interest, closing, promises, and reachability. The Order totals table adds per-customer linked revenue, discounts, volume, cancellations, AOV, and UPT for buyers tied to orders.';
      case GlossaryFeature.orders:
        return 'Orders is where sales are recorded. Volume metrics count money, orders, and packs from non-cancelled orders. Health rates show cancellations, discounts, payment progress, and estimated margin when product costs exist. List filters also scope the stage summary.';
      case GlossaryFeature.targets:
        return 'Targets is your revenue plan for a calendar year. You set monthly or annual goals; UMKM Hub compares them with real order revenue (by order date, cancellations excluded). Pace and coverage tell you if the year is on track and whether every month has a plan.';
      case GlossaryFeature.analytics:
        return 'Analytics is the deep trend view. Choose Weekly, Monthly, Quarterly, or Annual and a timeline of years. Charts cover revenue versus target, basket size, purchase frequency, lead times, product and customer performance, and growth, using the same non-cancelled order rules as Targets.';
    }
  }
}

const glossaryPageIntro =
    'Plain-English meanings and formulas for every number in UMKM Hub, so the whole team shares the same vocabulary.';

class GlossaryEntry {
  const GlossaryEntry({
    required this.id,
    required this.label,
    required this.description,
    this.formula,
    required this.features,
    this.aliases = const [],
  });

  final String id;
  final String label;
  final String description;
  final String? formula;
  final List<GlossaryFeature> features;
  final List<String> aliases;
}

const glossaryEntries = <GlossaryEntry>[
  GlossaryEntry(
    id: 'orders.revenue',
    label: 'Revenue',
    description:
        'The sales money you earned from orders that still count as real business. UMKM Hub adds up each order’s final total after discounts, and leaves out cancelled orders so a cancelled sale never inflates the number. On Dashboard this follows the period you pick; on Orders and Analytics it follows the filters or timeline you set.',
    formula: 'Add up every non-cancelled order’s final total',
    features: [GlossaryFeature.dashboard, GlossaryFeature.orders, GlossaryFeature.analytics, GlossaryFeature.targets],
    aliases: ['sales', 'total order value', 'TOTAL REVENUE'],
  ),
  GlossaryEntry(
    id: 'orders.orderCount',
    label: 'Orders',
    description:
        'How many active orders are in the current period or filter. Cancelled orders are left out of this count so it reflects work that still counts as volume. You may still see cancelled rows in the Orders list, and they still feed the cancel rate separately.',
    formula: 'Count orders that are not cancelled',
    features: [GlossaryFeature.dashboard, GlossaryFeature.orders, GlossaryFeature.analytics],
    aliases: ['order count', 'volume'],
  ),
  GlossaryEntry(
    id: 'orders.packsSold',
    label: 'Packs sold',
    description:
        'How much product quantity left the warehouse through sales, measured in packs (or pack-equivalent units). Only non-cancelled orders are included. This helps you see fulfillment volume separately from money, which is useful when pack sizes and prices differ.',
    formula: 'Add pack counts from order lines (and any older header-only pack fields)',
    features: [GlossaryFeature.dashboard, GlossaryFeature.orders],
    aliases: ['Packs', 'products sold', 'quantity sold', 'pack quantity'],
  ),
  GlossaryEntry(
    id: 'orders.cancellationRate',
    label: 'Cancel rate',
    description:
        'Of all orders in the current filter or period, what share were cancelled. A higher rate means more orders never completed. This rate uses every matching order in the denominator, including cancelled ones, so you can see how often deals fall through.',
    formula: 'Cancelled orders ÷ all matching orders × 100',
    features: [GlossaryFeature.dashboard, GlossaryFeature.orders],
    aliases: ['cancellation rate', 'cancel', 'Cancelled', 'Cancellation', 'Cancel'],
  ),
  GlossaryEntry(
    id: 'orders.profitMarginRate',
    label: 'Margin',
    description:
        'How much of your post-discount sales money remains after estimated product cost. Used on Dashboard, Orders, Warehouse, Products stage rates, and Analytics charts. UMKM Hub uses catalog unit costs when they are filled in. This is different from Analytics table “% margin”, which divides profit by the pre-discount total (see Product margin %).',
    formula: '(Revenue − estimated cost) ÷ revenue × 100',
    features: [GlossaryFeature.dashboard, GlossaryFeature.orders, GlossaryFeature.warehouse, GlossaryFeature.products, GlossaryFeature.analytics],
    aliases: ['profit margin', 'margin percent', 'margin %', 'Profit margin', 'Profit margin rate'],
  ),
  GlossaryEntry(
    id: 'orders.discountRate',
    label: 'Discount rate',
    description:
        'How deep discounts are relative to the pre-discount line totals on non-cancelled orders. It answers: of the full list price before order discounts, what share did customers not pay? Useful for spotting heavy discounting habits.',
    formula: '(Pre-discount total − final total) ÷ pre-discount total × 100',
    features: [GlossaryFeature.dashboard, GlossaryFeature.orders],
    aliases: ['Discount', 'discount %', 'discount rate'],
  ),
  GlossaryEntry(
    id: 'orders.fullPaymentRate',
    label: 'Paid in full',
    description:
        'Share of active (non-cancelled) orders whose recorded installments already cover the full order total. An order counts as fully paid when paid amount is at least the total (tiny rounding differences are allowed). Cancelled orders are left out of this rate.',
    formula: 'Fully paid orders ÷ non-cancelled orders × 100',
    features: [GlossaryFeature.dashboard, GlossaryFeature.orders],
    aliases: ['full payment rate', 'fully paid', 'Full payment'],
  ),
  GlossaryEntry(
    id: 'order.paymentRate',
    label: 'Paid %',
    description:
        'For a single order, how far collection has progressed (also shown as Payment progress). It compares money already logged as installments with the order’s final total. 100% means the customer has fully paid; lower values mean cash is still outstanding.',
    formula: 'Amount paid ÷ order total × 100',
    features: [GlossaryFeature.orders],
    aliases: ['payment progress', 'paid percent', 'Paid', 'Payment progress'],
  ),
  GlossaryEntry(
    id: 'order.paidAmount',
    label: 'Paid amount',
    description:
        'Cash already collected on one order. Every installment you record adds to this total. It never includes cancelled-order logic by itself. It simply sums the payment rows attached to that order.',
    formula: 'Add up all installment amounts on the order',
    features: [GlossaryFeature.orders],
    aliases: ['collected', 'Paid'],
  ),
  GlossaryEntry(
    id: 'order.remainingAmount',
    label: 'Remaining amount',
    description:
        'How much is still owed on one order after subtracting what has already been paid. If payments somehow exceed the total, remaining is shown as zero rather than a negative balance.',
    formula: 'Order total − paid amount (never below zero)',
    features: [GlossaryFeature.orders],
    aliases: ['balance due', 'unpaid', 'Remaining', 'Remaining to pay'],
  ),
  GlossaryEntry(
    id: 'avgOrderValue',
    label: 'Average order value (AOV)',
    description:
        'The typical ticket size: average revenue per non-cancelled order. On Analytics and Dashboard it uses period or timeline revenue. On Products Stock & sales it is that product’s allocated net revenue divided by orders that include the SKU. On Customers Order totals it is the customer’s post-discount order total divided by their active linked orders.',
    formula: 'Revenue ÷ order count (scope depends on the page)',
    features: [GlossaryFeature.analytics, GlossaryFeature.dashboard, GlossaryFeature.products, GlossaryFeature.customers],
    aliases: ['AOV', 'ticket size', 'avg order', 'Avg order'],
  ),
  GlossaryEntry(
    id: 'products.inventorySellValue',
    label: 'Inventory value',
    description:
        'What your current stock would be worth if you sold every unit at today’s catalog unit prices. Only products in the current view or filter are included. This is a sell-side valuation, not what you paid for the goods.',
    formula: 'For each product: stock on hand × unit sell price; then add them up',
    features: [GlossaryFeature.products, GlossaryFeature.warehouse, GlossaryFeature.dashboard],
    aliases: ['catalog value', 'sell value', 'inventory sell value', 'Sell value', 'Inventory'],
  ),
  GlossaryEntry(
    id: 'products.productCount',
    label: 'SKU count',
    description:
        'How many distinct products (SKUs) appear in the current catalog view. Search and chip filters shrink this number so the stage matches what you are looking at, not only the first page of the table.',
    formula: 'Count of products in the filtered set',
    features: [GlossaryFeature.products, GlossaryFeature.dashboard],
    aliases: ['products', 'SKUs', 'Products'],
  ),
  GlossaryEntry(
    id: 'products.totalStockQty',
    label: 'Stock on hand',
    description:
        'Total quantity available across the products in view, measured in each product’s stock units (not packs). It answers how much inventory you can still sell before restocking, regardless of sell price.',
    formula: 'Add stock quantities for every product in view',
    features: [GlossaryFeature.products, GlossaryFeature.dashboard],
    aliases: ['on-hand', 'stock qty', 'On hand'],
  ),
  GlossaryEntry(
    id: 'products.outOfStockRate',
    label: 'Out of stock rate',
    description:
        'Share of products in the current view that have zero stock left. A high rate means many SKUs cannot fulfill new orders until you restock. Products with any positive stock do not count here.',
    formula: 'Out-of-stock SKUs ÷ products in view × 100',
    features: [GlossaryFeature.products, GlossaryFeature.warehouse],
    aliases: ['OOS', 'zero stock', 'Out of stock'],
  ),
  GlossaryEntry(
    id: 'products.inStockRate',
    label: 'In stock rate',
    description:
        'Share of products that still have at least some stock on hand. This is the mirror of out-of-stock rate and is a quick health check for catalog availability.',
    formula: 'In-stock SKUs ÷ products in view × 100',
    features: [GlossaryFeature.warehouse, GlossaryFeature.products, GlossaryFeature.dashboard],
    aliases: ['stocked', 'In stock'],
  ),
  GlossaryEntry(
    id: 'products.costCoverageRate',
    label: 'Cost set rate',
    description:
        'Share of products that have a unit cost filled in. Without cost, UMKM Hub cannot estimate profit or margin for that SKU. Raising this rate makes warehouse and order margin figures more trustworthy.',
    formula: 'SKUs with a unit cost ÷ products in view × 100',
    features: [GlossaryFeature.products, GlossaryFeature.warehouse],
    aliases: ['cost coverage', 'cost set', 'Cost set'],
  ),
  GlossaryEntry(
    id: 'products.packReadyRate',
    label: 'Pack-ready rate',
    description:
        'Share of products you can sell in the pack-based order flow. Piece (PCS) items always count as ready. Other units need at least one pack sell price (for example 50g, 100g, or a custom pack) so orders can pick a pack size.',
    formula: 'Pack-ready SKUs ÷ products in view × 100',
    features: [GlossaryFeature.products],
    aliases: ['pack ready', 'Pack ready'],
  ),
  GlossaryEntry(
    id: 'products.potentialProfit',
    label: 'Inventory profit',
    description:
        'Estimated profit if you sold all current stock at catalog prices, using only SKUs that have a unit cost. Shown as Profit on the Warehouse stage. It is a planning figure for warehouse value, not booked accounting profit from past orders.',
    formula: 'Inventory sell value − inventory cost (only on SKUs with cost)',
    features: [GlossaryFeature.warehouse, GlossaryFeature.products],
    aliases: ['potential profit', 'Profit value'],
  ),
  GlossaryEntry(
    id: 'products.potentialCost',
    label: 'Inventory cost',
    description:
        'Estimated cost of goods sitting in stock right now, for products where you have entered a unit cost. Shown as Cost value on Warehouse. SKUs without cost are skipped so the total is not invented.',
    formula: 'For each costed product: stock × unit cost; then add them up',
    features: [GlossaryFeature.warehouse],
    aliases: ['stock cost', 'COGS on hand', 'Cost value'],
  ),
  GlossaryEntry(
    id: 'products.stockSales.totalStocks',
    label: 'Stocks (total)',
    description:
        'On the Products Stock & sales table, the primary stock figure for one SKU: current on-hand units plus units already sold on non-cancelled orders. It approximates lifetime units that have been available for that product in this workspace. The secondary line under Stocks breaks out Current and Sold.',
    formula: 'Current stocks + sold stocks',
    features: [GlossaryFeature.products],
    aliases: ['Total stocks', 'Stocks', 'total stocks', 'lifetime stocks'],
  ),
  GlossaryEntry(
    id: 'products.stockSales.currentStocks',
    label: 'Current stocks',
    description:
        'On-hand warehouse quantity for one product right now (never shown below zero). Appears under Stocks on the Stock & sales table and is the ending inventory used in STR, ITR, and SSR.',
    formula: 'On-hand stock quantity, floored at zero',
    features: [GlossaryFeature.products, GlossaryFeature.warehouse],
    aliases: ['Current', 'current stocks', 'on-hand stocks'],
  ),
  GlossaryEntry(
    id: 'products.stockSales.soldStocks',
    label: 'Sold stocks',
    description:
        'How many stock units of this product have been sold on non-cancelled orders (sum of order line quantities). Cancelled orders do not count. Shown under Stocks on Stock & sales and used in STR, ITR, SSR, and cost.',
    formula: 'Add product quantities from non-cancelled order lines for this SKU',
    features: [GlossaryFeature.products],
    aliases: ['Sold', 'sold stocks', 'units sold', 'qty sold'],
  ),
  GlossaryEntry(
    id: 'products.stockSales.revenue',
    label: 'Product revenue (Stock & sales)',
    description:
        'Net sales money attributed to this product across all non-cancelled orders, after sharing each order’s discount across its lines. Same allocation idea as Analytics product revenue, but Stock & sales covers the full catalog history in view rather than an Analytics timeline.',
    formula: 'For each line: line total × (order total ÷ order subtotal); then add those shares',
    features: [GlossaryFeature.products],
    aliases: ['Revenue', 'stock sales revenue', 'allocated revenue'],
  ),
  GlossaryEntry(
    id: 'products.stockSales.discount',
    label: 'Product discount (Stock & sales)',
    description:
        'How much order-level discount was allocated to this product’s lines on non-cancelled orders. The Stock & sales Discount column also shows discount as a percent of gross (revenue + discount).',
    formula: 'For each line: line total × (order subtotal − order total) ÷ order subtotal; then add. Discount % = discount ÷ (revenue + discount) × 100',
    features: [GlossaryFeature.products],
    aliases: ['Discount', 'stock sales discount', 'allocated discount'],
  ),
  GlossaryEntry(
    id: 'products.stockSales.cost',
    label: 'Product cost (Stock & sales)',
    description:
        'Estimated cost of goods sold for this product: units sold times the current catalog unit cost. If the product has no unit cost, Cost and Profit show as empty. This uses today’s catalog cost, not a historical cost snapshot.',
    formula: 'Sold stocks × unit cost (blank when unit cost is unset)',
    features: [GlossaryFeature.products],
    aliases: ['Cost', 'stock sales cost', 'COGS', 'product COGS'],
  ),
  GlossaryEntry(
    id: 'products.stockSales.profit',
    label: 'Product profit (Stock & sales)',
    description:
        'Estimated profit for this product on Stock & sales: allocated net revenue minus estimated cost of units sold. Blank when unit cost is unset so profit is not invented.',
    formula: 'Revenue − cost (blank when cost is unset)',
    features: [GlossaryFeature.products],
    aliases: ['Profit', 'stock sales profit'],
  ),
  GlossaryEntry(
    id: 'products.stockSales.sellThroughRate',
    label: 'Sell-through rate (STR)',
    description:
        'Of the units that have been available for this product (sold plus still on hand), what share has already sold. 100% means nothing is left on hand; 0% means you have stock but no sales yet. Blank when both sold and current are zero.',
    formula: 'Sold stocks ÷ (sold stocks + current stocks) × 100',
    features: [GlossaryFeature.products],
    aliases: ['STR', 'sell through', 'sell-through', 'Sell-through'],
  ),
  GlossaryEntry(
    id: 'products.stockSales.inventoryTurnover',
    label: 'Inventory turnover (ITR)',
    description:
        'How many times this product’s average inventory has turned over through sales. Beginning inventory is approximated as current plus sold; ending is current on hand; average is halfway between them. Using average inventory keeps the ratio stable when on-hand stock is very low (unlike sold ÷ current alone).',
    formula: 'Sold ÷ average inventory, where average = (beginning + ending) ÷ 2, beginning ≈ current + sold, ending = current',
    features: [GlossaryFeature.products],
    aliases: ['ITR', 'inventory turnover', 'turnover ratio', 'Inventory turnover ratio'],
  ),
  GlossaryEntry(
    id: 'products.stockSales.stockToSalesRatio',
    label: 'Stock-to-sales ratio (SSR)',
    description:
        'How many units you still hold for each unit already sold. A value above 1 means more stock on hand than has been sold; below 1 means sales have outpaced remaining stock. Blank when nothing has been sold yet.',
    formula: 'Current stocks ÷ sold stocks',
    features: [GlossaryFeature.products],
    aliases: ['SSR', 'stock to sales', 'stock-to-sales', 'Stock-to-sales'],
  ),
  GlossaryEntry(
    id: 'products.stockSales.orderCount',
    label: 'Product orders',
    description:
        'How many distinct non-cancelled orders include this product. Used as the denominator for product AOV and UPT on Stock & sales.',
    formula: 'Count distinct non-cancelled orders that contain this SKU',
    features: [GlossaryFeature.products],
    aliases: ['Orders', 'product order count', 'SKU orders'],
  ),
  GlossaryEntry(
    id: 'customers.customerCount',
    label: 'Customers',
    description:
        'How many people or companies are in your CRM view after search and status filters. This is your active pipeline size for the current screen, not necessarily every contact you have ever stored if filters are on.',
    formula: 'Count of customers in the filtered set',
    features: [GlossaryFeature.customers, GlossaryFeature.dashboard],
    aliases: ['contacts', 'CRM count'],
  ),
  GlossaryEntry(
    id: 'customers.avgApproval',
    label: 'Avg approval',
    description:
        'Average approval score (0–100) across contacts in view. You set approval on each customer to reflect how warm or committed they feel. A higher average suggests a healthier overall pipeline.',
    formula: 'Add approval scores ÷ number of customers in view',
    features: [GlossaryFeature.customers, GlossaryFeature.dashboard],
    aliases: ['Approval', 'average approval', 'approval score'],
  ),
  GlossaryEntry(
    id: 'customers.interestedCount',
    label: 'Interested',
    description:
        'How many contacts are marked with status Interested (a count, not a percent). These are leads that have shown clear positive signal and usually deserve follow-up before colder statuses. For the share of the pipeline that is Interested, see Interested rate.',
    formula: 'Count customers whose status is Interested',
    features: [GlossaryFeature.customers, GlossaryFeature.dashboard],
    aliases: ['interested contacts', 'interested count'],
  ),
  GlossaryEntry(
    id: 'customers.interestedRate',
    label: 'Interested rate',
    description:
        'Share of the current customer view that is marked Interested. Use it to see whether your pipeline is mostly warm leads or mostly cold or undecided contacts. Different from the Interested count tile.',
    formula: 'Interested contacts ÷ customers in view × 100',
    features: [GlossaryFeature.customers],
    aliases: ['interest rate'],
  ),
  GlossaryEntry(
    id: 'customers.closingRate',
    label: 'Closing rate',
    description:
        'Share of contacts whose relationship stage is Closing first order: people you believe are near signing or placing a first purchase. A higher rate means more of the CRM is in late-stage conversation.',
    formula: 'Closing-first-order contacts ÷ customers in view × 100',
    features: [GlossaryFeature.customers, GlossaryFeature.dashboard],
    aliases: ['Closing', 'pipeline close'],
  ),
  GlossaryEntry(
    id: 'customers.promiseRate',
    label: 'Promise rate',
    description:
        'Share of contacts that have at least one commercial promise flagged, such as annual bonus, on-time delivery, or packaging box. Promises help you remember commitments you made during negotiation.',
    formula: 'Contacts with any promise ÷ customers in view × 100',
    features: [GlossaryFeature.customers],
    aliases: ['Promises'],
  ),
  GlossaryEntry(
    id: 'customers.contactRate',
    label: 'Contact rate',
    description:
        'Share of customers you can actually reach because an email or phone number is on file. A low rate means many CRM cards are incomplete and hard to follow up.',
    formula: 'Contacts with email or phone ÷ customers in view × 100',
    features: [GlossaryFeature.customers],
    aliases: ['Contact', 'reachable', 'reachability'],
  ),
  GlossaryEntry(
    id: 'customers.orderTotals.totals',
    label: 'Customer totals (pre-discount)',
    description:
        'On the Customers Order totals table, the sum of linked order subtotals before order-level discounts. Only non-cancelled orders that name this customer are included. Compare with Order total to see how much discount was given.',
    formula: 'Add line totals (subtotals) of linked non-cancelled orders',
    features: [GlossaryFeature.customers],
    aliases: ['Totals', 'customer totals', 'pre-discount totals'],
  ),
  GlossaryEntry(
    id: 'customers.orderTotals.discount',
    label: 'Customer discount',
    description:
        'Absolute discount money taken off this customer’s linked non-cancelled orders (subtotal minus final total on each order). The column may also show discount as a percent of Totals.',
    formula: 'Add (order subtotal − order total) for linked non-cancelled orders; Discount % = discount ÷ totals × 100',
    features: [GlossaryFeature.customers],
    aliases: ['Discount', 'customer discount amount'],
  ),
  GlossaryEntry(
    id: 'customers.orderTotals.orderTotal',
    label: 'Customer order total',
    description:
        'Post-discount commercial value of this customer’s linked non-cancelled orders. This is the money side of Order totals and the numerator for customer AOV.',
    formula: 'Add final order totals of linked non-cancelled orders',
    features: [GlossaryFeature.customers],
    aliases: ['Order total', 'customer order total', 'linked revenue'],
  ),
  GlossaryEntry(
    id: 'customers.orderTotals.orderCount',
    label: 'Customer orders',
    description:
        'How many linked non-cancelled orders this customer has. Cancelled linked orders are counted separately under Cancelled. Used for customer AOV and UPT.',
    formula: 'Count linked orders that are not cancelled',
    features: [GlossaryFeature.customers],
    aliases: ['Orders', 'active orders', 'customer order count'],
  ),
  GlossaryEntry(
    id: 'customers.orderTotals.packsSold',
    label: 'Customer packs',
    description:
        'Total packs sold to this customer on linked non-cancelled orders. Used with Orders to compute customer units per transaction (UPT).',
    formula: 'Add pack counts from lines on linked non-cancelled orders',
    features: [GlossaryFeature.customers],
    aliases: ['Packs', 'customer packs sold'],
  ),
  GlossaryEntry(
    id: 'customers.orderTotals.cancelledCount',
    label: 'Customer cancelled orders',
    description:
        'How many linked orders for this customer were cancelled. Shown with cancel rate on Order totals so you can see deal fall-through beside active volume.',
    formula: 'Count linked orders with status Cancelled',
    features: [GlossaryFeature.customers],
    aliases: ['Cancelled', 'cancelled count', 'customer cancellations'],
  ),
  GlossaryEntry(
    id: 'customers.orderTotals.cancelRate',
    label: 'Customer cancel rate',
    description:
        'Of this customer’s linked orders (active plus cancelled), what share were cancelled. Blank when the customer has no linked orders at all.',
    formula: 'Cancelled ÷ (active + cancelled) × 100',
    features: [GlossaryFeature.customers],
    aliases: ['Cancel rate', 'customer cancellation rate'],
  ),
  GlossaryEntry(
    id: 'targets.annualTarget',
    label: 'Annual target',
    description:
        'The revenue goal you set for a calendar year. When all twelve months have amounts, the year target is their sum. Otherwise UMKM Hub uses the annual amount you saved (manual or systematic). This is the plan line you compare against real sales.',
    formula: 'Sum of the twelve monthly targets when they exist; otherwise the saved annual amount',
    features: [GlossaryFeature.targets, GlossaryFeature.analytics],
    aliases: ['year target', 'sales target'],
  ),
  GlossaryEntry(
    id: 'targets.annualActual',
    label: 'Annual actual',
    description:
        'Real revenue already booked in that year from non-cancelled orders, based on each order’s order date. Cancelled orders never add to actuals. This is the “what really happened” number next to your plan.',
    formula: 'Add order totals for the year (cancelled orders left out)',
    features: [GlossaryFeature.targets, GlossaryFeature.analytics],
    aliases: ['actual revenue', 'year actual'],
  ),
  GlossaryEntry(
    id: 'targets.attainmentPercent',
    label: 'Sales target rate',
    description:
        'How close actual revenue is to the target for the same scope (month, year, or week in Analytics). 100% means you met the plan; above 100% means you beat it; below means you are behind.',
    formula: 'Actual revenue ÷ target × 100',
    features: [GlossaryFeature.targets, GlossaryFeature.analytics, GlossaryFeature.dashboard],
    aliases: ['% of target', 'attainment', 'Attainment', 'target rate', '% of revenue target', 'Sales target rate'],
  ),
  GlossaryEntry(
    id: 'targets.monthsOnPlanRate',
    label: 'Months on plan',
    description:
        'Of the months that already have a monthly target, how many have reached or beaten that month’s goal (actual at least 100% of target). Months with no target are ignored so empty plan slots do not punish the score.',
    formula: 'Months at ≥ 100% of target ÷ months that have a target × 100',
    features: [GlossaryFeature.targets],
    aliases: ['On plan', 'on plan'],
  ),
  GlossaryEntry(
    id: 'targets.paceRate',
    label: 'Pace',
    description:
        'Whether year-to-date sales are keeping up with the sum of targets for months that have already started. It answers: if the year ended today relative to the plan so far, would you be on track? Future months are not counted in the denominator yet.',
    formula: 'Year-to-date actual ÷ sum of elapsed monthly targets × 100',
    features: [GlossaryFeature.targets, GlossaryFeature.analytics],
    aliases: ['ytd pace', 'run rate'],
  ),
  GlossaryEntry(
    id: 'targets.monthCoverageRate',
    label: 'Month coverage',
    description:
        'How completely you have filled the year’s plan. It is the share of the twelve calendar months that already have a non-zero (or saved) monthly target amount.',
    formula: 'Months with a target ÷ 12 × 100',
    features: [GlossaryFeature.targets],
    aliases: ['Coverage', 'coverage'],
  ),
  GlossaryEntry(
    id: 'targets.monthlyAmount',
    label: 'Monthly target',
    description:
        'The revenue goal for one calendar month inside the year plan. You can type amounts by hand or generate them from January with systematic growth. Analytics and Targets both read these month rows when a full twelve-month plan exists.',
    formula: 'The amount saved for that month (manual entry or systematic growth from January)',
    features: [GlossaryFeature.targets],
    aliases: ['month target', 'Target'],
  ),
  GlossaryEntry(
    id: 'targets.systematicMonthly',
    label: 'Systematic monthly growth',
    description:
        'A planning shortcut: enter a January base and a month-over-month growth percent, and UMKM Hub builds all twelve monthly targets by compounding that growth. Useful when you expect steady expansion rather than typing each month.',
    formula: 'Each month = January base × (1 + growth percent / 100)^(month number − 1)',
    features: [GlossaryFeature.targets],
    aliases: ['MoM growth', 'compound monthly', 'Monthly growth %'],
  ),
  GlossaryEntry(
    id: 'targets.weeklyTarget',
    label: 'Weekly target',
    description:
        'In Analytics Weekly view, each ISO week gets a fair slice of your monthly targets. Days that fall in January use January’s daily share; days that spill into February use February’s, so weeks that cross months are split correctly instead of dumping a whole month into one week.',
    formula: 'For each month the week touches: month target × (days of that week in the month ÷ days in that month), then add those pieces',
    features: [GlossaryFeature.analytics, GlossaryFeature.targets],
    aliases: ['week target', 'day-weighted target'],
  ),
  GlossaryEntry(
    id: 'targets.nextYearProjected',
    label: 'Next year',
    description:
        'Projected revenue for the following calendar year from your annual plan’s year-over-year growth setting when annual mode is Systematic. This is a planning projection from the Targets page, not actual sales booked next year.',
    formula: 'This year’s annual base × (1 + annual growth percent / 100)',
    features: [GlossaryFeature.targets],
    aliases: ['next year projected', 'projected annual', 'Next year'],
  ),
  GlossaryEntry(
    id: 'targets.annualGrowthPercent',
    label: 'Annual growth %',
    description:
        'Planning input on Targets: how much next year’s annual target should grow versus this year’s annual base when annual mode is Systematic. Different from Analytics Year-over-year growth, which compares real sales years.',
    formula: 'Next year = base annual × (1 + growth / 100)',
    features: [GlossaryFeature.targets],
    aliases: ['YoY growth %', 'year growth', 'annual YoY'],
  ),
  GlossaryEntry(
    id: 'analytics.avgBasketSize',
    label: 'Units per transaction (UPT)',
    description:
        'How large a typical order is in packs: average packs sold per non-cancelled order. On Analytics it uses the selected timeline. On Products Stock & sales it is packs of that SKU divided by orders that include it. On Customers Order totals it is the customer’s packs divided by their active linked orders.',
    formula: 'Total packs sold ÷ order count (scope depends on the page)',
    features: [GlossaryFeature.analytics, GlossaryFeature.products, GlossaryFeature.customers],
    aliases: ['UPT', 'basket size', 'avg basket', 'Units Per Transaction'],
  ),
  GlossaryEntry(
    id: 'analytics.avgPurchaseFrequency',
    label: 'Average purchase frequency (APF)',
    description:
        'How often your linked customers buy, on average. Only orders tied to a customer count. It is linked orders divided by distinct customers, so repeat buyers raise the number, while many one-time buyers keep it closer to one.',
    formula: 'Linked orders ÷ distinct customers with linked orders',
    features: [GlossaryFeature.analytics],
    aliases: ['APF', 'purchase frequency', 'order frequency'],
  ),
  GlossaryEntry(
    id: 'analytics.firstRepeatOrderDays',
    label: 'First repeat order duration',
    description:
        'How long it took from the first order to the second for a product or customer. Only the gap between the earliest two order dates counts. One-time buyers show a dash because there is no second order yet.',
    formula: 'Second order date − first order date in UTC days; null if fewer than 2 orders',
    features: [GlossaryFeature.analytics],
    aliases: ['1st repeat', 'first reorder', 'time to second order'],
  ),
  GlossaryEntry(
    id: 'analytics.avgRepeatOrderDays',
    label: 'Average repeat order duration',
    description:
        'How long it usually takes before the next order for a product or customer. UMKM Hub sorts that product’s or customer’s order dates, measures the days between each consecutive pair, and averages those gaps. One-time buyers show a dash because there is no repeat yet.',
    formula: 'Average of (next order date − previous order date) in UTC days; null if fewer than 2 orders',
    features: [GlossaryFeature.analytics],
    aliases: ['avg repeat', 'repeat duration', 'reorder interval'],
  ),
  GlossaryEntry(
    id: 'analytics.avgLtv',
    label: 'Average LTV',
    description:
        'Average lifetime value of customers who have at least one linked order: mean net revenue per active buyer in the selected timeline. Orders without a customer link are left out, because LTV is about people and companies you can identify.',
    formula: 'Revenue from linked customers ÷ number of distinct linked customers',
    features: [GlossaryFeature.analytics],
    aliases: ['LTV', 'lifetime value', 'customer LTV'],
  ),
  GlossaryEntry(
    id: 'analytics.avgProductRevenue',
    label: 'Average product revenue',
    description:
        'Average net sales per product that actually sold in the period. Products with no sales are left out so the average is not pulled down by idle SKUs. Useful for seeing how strong a “typical” selling product is.',
    formula: 'Product revenue ÷ products that had sales',
    features: [GlossaryFeature.analytics],
    aliases: ['avg product sales', 'Avg product'],
  ),
  GlossaryEntry(
    id: 'analytics.ltvCustomerCount',
    label: 'LTV buyers',
    description:
        'How many distinct customers have at least one linked order in the Analytics scope. Used as the denominator for Average LTV. Orders without a customer assigned do not create an LTV buyer.',
    formula: 'Count distinct customer IDs on non-cancelled linked orders',
    features: [GlossaryFeature.analytics],
    aliases: ['buyers', 'active buyers', 'linked customers', 'LTV buyers'],
  ),
  GlossaryEntry(
    id: 'analytics.productSaleCount',
    label: 'Products sold',
    description:
        'How many distinct catalog products had any sales in the Analytics scope. Idle SKUs are left out. This is the denominator for Average product revenue, not the same as Packs sold.',
    formula: 'Count distinct products that appear on non-cancelled order lines',
    features: [GlossaryFeature.analytics],
    aliases: ['SKUs sold', 'products with sales', 'productSaleCount'],
  ),
  GlossaryEntry(
    id: 'analytics.avgShipmentDays',
    label: 'Shipment lead time',
    description:
        'Average number of days between placing an order and marking it shipped, for orders that have both dates. Longer times mean slower fulfillment; shorter times mean faster warehouse and logistics turnaround.',
    formula: 'Average of (shipment date − order date) in whole days',
    features: [GlossaryFeature.analytics],
    aliases: ['shipment days', 'fulfillment lead time', 'Ship', 'Avg ship', 'Shipment duration'],
  ),
  GlossaryEntry(
    id: 'analytics.avgInvoiceDays',
    label: 'Invoice lead time',
    description:
        'Average number of days between placing an order and issuing its invoice, for orders that have an invoice date. Shows how quickly billing follows the sale.',
    formula: 'Average of (invoice date − order date) in whole days',
    features: [GlossaryFeature.analytics],
    aliases: ['invoice days', 'invoice duration', 'billing lead time', 'Invoice', 'Avg invoice'],
  ),
  GlossaryEntry(
    id: 'analytics.statusShares',
    label: 'Order status mix',
    description:
        'Percent of orders in each fulfillment status for the selected period: Pending, Confirmed, Shipped, Delivered, and Cancelled. Unlike most Analytics charts, cancelled orders are included so cancel share is visible in the mix.',
    formula: '(Orders in status ÷ all orders in period including cancelled) × 100',
    features: [GlossaryFeature.analytics],
    aliases: ['status distribution', 'status mix'],
  ),
  GlossaryEntry(
    id: 'analytics.paymentShares',
    label: 'Payment mode mix',
    description:
        'Percent of active (non-cancelled) orders paid as Cash, Consignment, or Delayed payment for the selected period. Shows how sales are financed over the timeline.',
    formula: '(Orders with payment mode ÷ non-cancelled orders in period) × 100',
    features: [GlossaryFeature.analytics],
    aliases: ['payment distribution', 'payment mix', 'payment mode'],
  ),
  GlossaryEntry(
    id: 'analytics.avgFirstPaymentDays',
    label: 'First payment lead time',
    description:
        'Average days from order date until the first installment is recorded. This shows how quickly cash starts coming in after a sale, which is important for credit and delayed-payment customers.',
    formula: 'Average of (first installment date − order date) in days',
    features: [GlossaryFeature.analytics],
    aliases: ['first payment days', 'First pay', 'First payment duration'],
  ),
  GlossaryEntry(
    id: 'analytics.avgPaymentDays',
    label: 'Last payment lead time',
    description:
        'Average days from order date until the latest installment on that order. Compared with first payment lead time, this shows how long it takes to finish collecting the full balance.',
    formula: 'Average of (last installment date − order date) in days',
    features: [GlossaryFeature.analytics],
    aliases: ['payment days', 'collection lead time', 'Last pay', 'Last payment duration'],
  ),
  GlossaryEntry(
    id: 'analytics.yoyGrowth',
    label: 'Year-over-year growth',
    description:
        'How this year’s actual revenue compares with the previous year, as a percent change. Positive growth means you sold more than last year; negative means you sold less. Needs a prior year with revenue to calculate. Different from Targets Annual growth %, which is a planning input.',
    formula: '(This year revenue − prior year revenue) ÷ prior year revenue × 100',
    features: [GlossaryFeature.analytics],
    aliases: ['YoY', 'growth rate'],
  ),
  GlossaryEntry(
    id: 'analytics.periodGrowth',
    label: 'Period-over-period growth',
    description:
        'On Analytics chart tooltips, how this period compares with the previous one on the same timeline. Levels such as revenue use percent change; rates already shown as % (margin, attainment, status mix) use basis points (bps), where 100 bps = 1 percentage point.',
    formula: 'Levels: (current − previous) ÷ |previous| × 100. Rates: (current − previous) × 100 bps',
    features: [GlossaryFeature.analytics],
    aliases: ['PoP growth', 'bps', 'vs prior period'],
  ),
  GlossaryEntry(
    id: 'analytics.profit',
    label: 'Profit',
    description:
        'Estimated money left after subtracting catalog-based cost of goods from non-cancelled revenue. It is an operational estimate for decision-making, not a full accounting P&L with overheads or taxes.',
    formula: 'Revenue − estimated cost of goods',
    features: [GlossaryFeature.analytics, GlossaryFeature.orders],
    aliases: ['gross profit estimate'],
  ),
  GlossaryEntry(
    id: 'analytics.productDiscountPercent',
    label: 'Product discount %',
    description:
        'For a product’s (or customer’s) sales, how large discounts were relative to the pre-discount total. Shown as “% off” in Analytics tables and under Discount on Products Stock & sales and Customers Order totals.',
    formula: 'Discount given ÷ (net revenue + discount) × 100',
    features: [GlossaryFeature.analytics, GlossaryFeature.products, GlossaryFeature.customers],
    aliases: ['line discount', '% off', 'Discount %'],
  ),
  GlossaryEntry(
    id: 'analytics.productCostPercent',
    label: 'Product cost %',
    description:
        'Estimated product cost as a share of that product’s (or customer’s) pre-discount sales total. Shown as “% COGS” in Analytics tables. Higher values mean more of the sale is eaten by COGS; lower values leave more room for margin.',
    formula: 'Estimated cost ÷ (net revenue + discount) × 100',
    features: [GlossaryFeature.analytics],
    aliases: ['COGS %', '% COGS'],
  ),
  GlossaryEntry(
    id: 'analytics.productMarginPercent',
    label: 'Product margin %',
    description:
        'For a product’s or customer’s sales in Analytics tables, profit as a share of the pre-discount total so Discount % + Cost % + Margin % add up to about 100%. Different from stage/chart Margin, which uses post-discount revenue.',
    formula: 'Profit ÷ (net revenue + discount) × 100',
    features: [GlossaryFeature.analytics],
    aliases: ['% margin', 'margin of gross', 'table margin'],
  ),
  GlossaryEntry(
    id: 'analytics.productRevenue',
    label: 'Product revenue',
    description:
        'Net sales attributed to one product (or one linked customer) after order discounts are allocated across lines. Cancelled orders are left out. Analytics follows the selected timeline; Products Stock & sales uses the same allocation over catalog history in view (see also Product revenue (Stock & sales)).',
    formula: 'Sum of discount-allocated line revenue for that product or customer',
    features: [GlossaryFeature.analytics, GlossaryFeature.products],
    aliases: ['customer revenue', 'line revenue', 'Revenue'],
  ),
  GlossaryEntry(
    id: 'analytics.productDiscount',
    label: 'Product discount',
    description:
        'Order-level discount money allocated to one product’s (or customer’s) lines. Comparing this with product revenue shows how much list price was given away. Appears in Analytics and on Products Stock & sales.',
    formula: 'Pre-discount line total − allocated net revenue',
    features: [GlossaryFeature.analytics, GlossaryFeature.products],
    aliases: ['allocated discount', 'Discount amount', 'Discount'],
  ),
  GlossaryEntry(
    id: 'analytics.productCost',
    label: 'Product cost',
    description:
        'Estimated cost of goods for one product’s (or customer’s) sales, using catalog unit costs × quantities sold. Blank when cost is not set on the catalog. Analytics scopes by timeline; Stock & sales uses lifetime sold quantity for the SKU.',
    formula: 'Unit cost × quantity sold (null if unit cost is missing)',
    features: [GlossaryFeature.analytics, GlossaryFeature.products],
    aliases: ['estimated COGS', 'Cost'],
  ),
  GlossaryEntry(
    id: 'analytics.productProfit',
    label: 'Product profit',
    description:
        'Estimated profit for one product’s (or customer’s) sales: net revenue minus estimated cost. Appears in Analytics product performance and Products Stock & sales. Pair with Product margin % for the pre-discount share view in Analytics.',
    formula: 'Product revenue − product cost',
    features: [GlossaryFeature.analytics, GlossaryFeature.products],
    aliases: ['line profit', 'product profit', 'Profit'],
  ),
  GlossaryEntry(
    id: 'product.pricePerUnit',
    label: 'Unit sell price',
    description:
        'The catalog selling price for one stock unit of a product. Pack prices are stored separately; when needed, UMKM Hub can imply a unit price by dividing a pack price by pack size. Orders and inventory value both rely on this pricing.',
    formula: 'Saved on the product, or pack price ÷ pack size when derived',
    features: [GlossaryFeature.products, GlossaryFeature.warehouse, GlossaryFeature.orders],
    aliases: ['sell price', 'unit price', 'Unit sell', 'Sell'],
  ),
  GlossaryEntry(
    id: 'product.costPerUnit',
    label: 'Unit cost',
    description:
        'Optional cost of one stock unit. Fill this in when you know what the goods cost you. Margin, inventory profit, and many Analytics cost figures only work well when unit cost is set.',
    formula: 'Saved on the product when you enter it',
    features: [GlossaryFeature.products, GlossaryFeature.warehouse, GlossaryFeature.orders, GlossaryFeature.analytics],
    aliases: ['COGS', 'unit COGS', 'Unit cost', 'Cost'],
  ),
  GlossaryEntry(
    id: 'product.unitProfit',
    label: 'Unit profit',
    description:
        'Estimated gross profit on one stock unit when both unit sell price and unit cost are set. Shown on product and warehouse economics strips.',
    formula: 'Unit sell price − unit cost',
    features: [GlossaryFeature.products, GlossaryFeature.warehouse],
    aliases: ['unit margin amount', 'Unit profit'],
  ),
  GlossaryEntry(
    id: 'product.unitMarginPercent',
    label: 'Unit margin %',
    description:
        'Catalog margin on one stock unit: how much of the unit sell price remains after unit cost. Different from order/stage Margin (which uses order revenue) and from Analytics Product margin % (pre-discount table base).',
    formula: '(Unit sell price − unit cost) ÷ unit sell price × 100',
    features: [GlossaryFeature.products, GlossaryFeature.warehouse],
    aliases: ['catalog margin', 'pack margin %'],
  ),
  GlossaryEntry(
    id: 'product.packSellPrice',
    label: 'Pack sell price',
    description:
        'Selling price for one catalog pack size (for example 100g or a custom pack). Orders lock this price onto the line when you sell that pack.',
    formula: 'Saved pack price for the chosen pack size',
    features: [GlossaryFeature.products, GlossaryFeature.warehouse, GlossaryFeature.orders],
    aliases: ['Pack sell', 'pack price'],
  ),
  GlossaryEntry(
    id: 'product.packCost',
    label: 'Pack cost',
    description:
        'Optional purchase/COGS amount for one catalog pack size. Used with pack sell price to show pack profit on product and warehouse screens.',
    formula: 'Saved pack cost for the chosen pack size',
    features: [GlossaryFeature.products, GlossaryFeature.warehouse],
    aliases: ['Pack cost'],
  ),
  GlossaryEntry(
    id: 'product.packProfit',
    label: 'Pack profit',
    description:
        'Estimated gross profit on one pack when both pack sell price and pack cost are set.',
    formula: 'Pack sell price − pack cost',
    features: [GlossaryFeature.products, GlossaryFeature.warehouse],
    aliases: ['Pack profit'],
  ),
  GlossaryEntry(
    id: 'product.stockQty',
    label: 'Stock quantity',
    description:
        'How many units of this product are currently on hand. Restocks increase it; fulfilling non-cancelled orders decreases it. Orders that would oversell are blocked so stock cannot go negative through normal saves.',
    formula: 'Updated automatically by restocks and order stock draws',
    features: [GlossaryFeature.products, GlossaryFeature.warehouse, GlossaryFeature.orders],
    aliases: ['on hand', 'inventory qty', 'On hand now', 'Stock'],
  ),
  GlossaryEntry(
    id: 'warehouse.packsOnHand',
    label: 'Packs on hand',
    description:
        'How many catalog packs of the active pack size you could make from current stock. Useful when you think in packs rather than raw stock units.',
    formula: 'Stock quantity ÷ active pack size',
    features: [GlossaryFeature.warehouse],
    aliases: ['Packs in stock', 'packs available'],
  ),
  GlossaryEntry(
    id: 'warehouse.qtyAdded',
    label: 'Restock quantity',
    description:
        'How many units you added in a single restock event. You can enter units directly or enter packs and let UMKM Hub multiply by the active pack size. The restock history keeps before/after stock snapshots.',
    formula: 'Units entered, or packs × pack size',
    features: [GlossaryFeature.warehouse],
    aliases: ['qty added', 'incoming stock', 'Added', 'Adding', 'Qty added'],
  ),
  GlossaryEntry(
    id: 'warehouse.stockBeforeAfter',
    label: 'Stock before / after',
    description:
        'Snapshots of on-hand quantity immediately before and after a restock or sale. For restocks, after equals before plus quantity added. For sold history, after equals before minus quantity sold (floored at zero).',
    formula: 'Restock: stockAfter = stockBefore + qtyAdded; Sale: stockAfter = max(0, stockBefore − qtySold)',
    features: [GlossaryFeature.warehouse],
    aliases: ['Before', 'After', 'Stock after', 'On hand now'],
  ),
  GlossaryEntry(
    id: 'warehouse.qtySold',
    label: 'Sold quantity',
    description:
        'How many units were drawn from stock by an order line. Sold history is written automatically when an active order saves; editing or cancelling the order rewrites or clears those rows. Warehouse shows sold history read-only.',
    formula: 'Equals the order line quantity at stock draw time',
    features: [GlossaryFeature.warehouse, GlossaryFeature.orders],
    aliases: ['qty sold', 'units sold', 'Sold', 'Sold history'],
  ),
  GlossaryEntry(
    id: 'warehouse.soldDate',
    label: 'Sold date',
    description:
        'The business date recorded on a Warehouse sold-history row. It is copied from the order’s order date when stock is drawn so the ledger lines up with when the sale was booked.',
    formula: 'Copied from the related order’s order date',
    features: [GlossaryFeature.warehouse],
    aliases: ['sale date', 'Sold date'],
  ),
  GlossaryEntry(
    id: 'warehouse.orderRef',
    label: 'Order reference',
    description:
        'The human order code shown on a sold-history row so you can jump back to the order that drew the stock. Open order uses the underlying order id.',
    formula: 'Taken from the related order’s order id / display code',
    features: [GlossaryFeature.warehouse, GlossaryFeature.orders],
    aliases: ['order ref', 'Order', 'Open order'],
  ),
  GlossaryEntry(
    id: 'order.totalOrderValue',
    label: 'Order total',
    description:
        'The final amount the customer owes for one order after line amounts and order-level discounts are applied. Installments and paid % are measured against this total. Customers Order totals sums these for linked non-cancelled orders.',
    formula: 'If percent discount: line total × (1 − discount%/100); if amount discount: line total − discount amount',
    features: [GlossaryFeature.orders, GlossaryFeature.customers],
    aliases: ['total order value', 'invoice total', 'Total', 'Order total'],
  ),
  GlossaryEntry(
    id: 'order.lineTotal',
    label: 'Line total (pre-discount)',
    description:
        'Sum of the order’s line amounts before the order-level discount is applied. On the order sheet this is labeled Subtotal. Comparing this with the final order total shows how large the discount was on that order. Each line itself is pack price × pack count. Customers Order totals sums these as Totals.',
    formula: 'Order: sum of every line’s (pack price × pack count). Line: pack price × pack count',
    features: [GlossaryFeature.orders, GlossaryFeature.customers],
    aliases: ['Subtotal', 'gross lines', 'pre-discount', 'line total', 'Line total', 'Totals'],
  ),
  GlossaryEntry(
    id: 'order.discountValue',
    label: 'Order discount',
    description:
        'The order-level discount you apply on top of line subtotals, either a percent of the pre-discount total or a fixed amount. It reduces Subtotal down to Order total. Customers Order totals sums these absolute offs per linked customer.',
    formula: 'Percent: line total × discount%/100; Amount: the discount amount you enter (capped at line total)',
    features: [GlossaryFeature.orders, GlossaryFeature.customers],
    aliases: ['Discount amount', 'Discount %', 'discount value'],
  ),
  GlossaryEntry(
    id: 'dashboard.period',
    label: 'Dashboard period',
    description:
        'The time window that scopes order metrics on the Dashboard, such as Today, This week, or This month, using each order’s order date. Product and customer summary bands stay workspace-wide so catalog and CRM health remain visible beside period sales.',
    formula: 'Include orders whose order date falls in the selected from/to window',
    features: [GlossaryFeature.dashboard],
    aliases: ['period filter', 'date preset'],
  ),
  GlossaryEntry(
    id: 'analytics.timeline',
    label: 'Analytics timeline',
    description:
        'Which calendar years Analytics should cover. You can pick one year, several years, or All timelines. Weekly, Monthly, and Quarterly charts then show every ISO week, calendar month, or calendar quarter inside that selection, not only a short trailing window.',
    formula: 'One year, several years, or the full app year range (2020–2035)',
    features: [GlossaryFeature.analytics],
    aliases: ['years filter', 'all timelines'],
  ),
  GlossaryEntry(
    id: 'analytics.isoWeek',
    label: 'ISO week',
    description:
        'The weekly bucket used in Analytics Weekly charts. Weeks start on Monday (UTC) and are labeled like W12. An order lands in the week that contains its order date, so trends match international week numbering rather than Sunday-start calendars.',
    formula: 'ISO-8601 week of the order’s order date',
    features: [GlossaryFeature.analytics],
    aliases: ['week', 'weekly'],
  ),
  GlossaryEntry(
    id: 'analytics.quarter',
    label: 'Calendar quarter',
    description:
        'The three-month bucket used in Analytics Quarterly charts (Q1–Q4, UTC). An order lands in the quarter that contains its order date. When a 12-month revenue plan exists, the quarter target is the sum of those three monthly amounts.',
    formula: 'Q = floor(UTC month / 3) + 1; target = sum of monthly targets in Q',
    features: [GlossaryFeature.analytics],
    aliases: ['quarter', 'quarterly', 'Q1'],
  ),
];

List<GlossaryEntry> searchGlossary(
  String query, {
  GlossaryFeature? feature,
}) {
  final q = query.trim().toLowerCase();
  return glossaryEntries.where((entry) {
    if (feature != null && !entry.features.contains(feature)) return false;
    if (q.isEmpty) return true;
    final haystack = [
      entry.id,
      entry.label,
      entry.description,
      entry.formula ?? '',
      ...entry.aliases,
      ...entry.features.map((f) => f.label),
      if (feature != null) feature.intro,
    ].join(' ').toLowerCase();
    return haystack.contains(q);
  }).toList();
}

List<({GlossaryFeature feature, List<GlossaryEntry> entries})>
    groupGlossaryByFeature(List<GlossaryEntry> entries) {
  return GlossaryFeature.values
      .map(
        (feature) => (
          feature: feature,
          entries: entries
              .where((entry) => entry.features.contains(feature))
              .toList(),
        ),
      )
      .where((group) => group.entries.isNotEmpty)
      .toList();
}
