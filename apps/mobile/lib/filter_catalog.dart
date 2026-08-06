/// Shared filter option catalogs — mirrors web `enums.ts` / `product-readiness.ts`.

class FilterOption {
  const FilterOption(this.value, this.label);
  final String value;
  final String label;
}

const productUnitOptions = [
  FilterOption('PCS', 'Pcs'),
  FilterOption('GRAM', 'Gram'),
  FilterOption('LITER', 'Liter'),
];

const costSetOptions = [
  FilterOption('set', 'Cost set'),
  FilterOption('unset', 'No cost'),
];

const packReadyOptions = [
  FilterOption('ready', 'Pack ready'),
  FilterOption('not_ready', 'Not ready'),
];

const stockStatusOptions = [
  FilterOption('in_stock', 'In stock'),
  FilterOption('out_of_stock', 'Out of stock'),
];

const customerStatusOptions = [
  FilterOption('NOT_INTERESTED', 'Not interested'),
  FilterOption('DOUBTFUL', 'Doubtful'),
  FilterOption('INTERESTED', 'Interested'),
  FilterOption('OTHERS', 'Others'),
];

const companyTypeOptions = [
  FilterOption('RESTAURANT', 'Restaurant'),
  FilterOption('HOTEL', 'Hotel'),
  FilterOption('STORE', 'Store'),
];

const relationshipLevelOptions = [
  FilterOption('NEGOTIATION', 'Negotiation'),
  FilterOption('REQUEST_SAMPLE', 'Request a sample'),
  FilterOption('CLOSING_FIRST_ORDER', 'Closing — first order'),
  FilterOption('WILL_CONTACT', 'Will contact'),
  FilterOption('INITIAL_APPROACH', 'Initial approach'),
];

const partnershipStageOptions = [
  FilterOption('WHATSAPP', 'WhatsApp'),
  FilterOption('EMAIL', 'Email'),
  FilterOption('DIRECT_VISIT', 'Direct visit'),
];

const orderStatusOptions = [
  FilterOption('PENDING', 'Pending'),
  FilterOption('CONFIRMED', 'Confirmed'),
  FilterOption('SHIPPED', 'Shipped'),
  FilterOption('DELIVERED', 'Delivered'),
  FilterOption('CANCELLED', 'Cancelled'),
];

const paymentStatusOptions = [
  FilterOption('CASH', 'Cash'),
  FilterOption('CONSIGNMENT', 'Consignment'),
  FilterOption('DELAYED_PAYMENT', 'Delayed payment'),
];

const billStatusOptions = [
  FilterOption('CREATED', 'Created'),
  FilterOption('SENT', 'Sent'),
];

const invoiceStatusOptions = [
  FilterOption('CREATED', 'Created'),
  FilterOption('SENT', 'Sent'),
  FilterOption('PARTIALLY_PAID', 'Partially paid'),
  FilterOption('FULLY_PAID', 'Fully paid'),
];
