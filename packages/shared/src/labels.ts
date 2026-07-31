export const LABELS = {
  productUnit: {
    PCS: 'Pcs',
    GRAM: 'Gram',
    LITER: 'Liter',
  },
  companyType: {
    RESTAURANT: 'Restaurant',
    HOTEL: 'Hotel',
    STORE: 'Store',
  },
  partnershipStage: {
    WHATSAPP: 'WhatsApp',
    EMAIL: 'Email',
    DIRECT_VISIT: 'Direct visit',
  },
  customerStatus: {
    NOT_INTERESTED: 'Not interested',
    DOUBTFUL: 'Doubtful',
    INTERESTED: 'Interested',
    OTHERS: 'Others',
  },
  relationshipLevel: {
    NEGOTIATION: 'Negotiation',
    REQUEST_SAMPLE: 'Request a sample',
    CLOSING_FIRST_ORDER: 'Closing — first order requested',
    WILL_CONTACT: 'Will contact',
    INITIAL_APPROACH: 'Initial approach',
  },
  discountType: {
    PERCENTAGE: 'Percentage',
    AMOUNT: 'Direct amount',
  },
  paymentStatus: {
    CASH: 'Cash',
    CONSIGNMENT: 'Consignment',
    DELAYED_PAYMENT: 'Delayed payment',
  },
  invoiceStatus: {
    CREATED: 'Not billed yet',
    SENT: 'Awaiting payment',
    PARTIALLY_PAID: 'Partial payment',
    FULLY_PAID: 'Paid in full',
  },
  billStatus: {
    CREATED: 'Draft bill',
    SENT: 'Sent to customer',
  },
  orderStatus: {
    PENDING: 'Pending',
    CONFIRMED: 'Confirmed',
    SHIPPED: 'Shipped',
    DELIVERED: 'Delivered',
    CANCELLED: 'Cancelled',
  },
} as const;
