export type KontraBonPdfLabels = {
  brandTagline: string;
  documentTitle: string;
  documentSubtitle: string;
  headerDocNo: string;
  issued: string;
  paymentDue: string;
  paymentDueFallback: string;
  orderReference: string;
  statusOpen: string;
  statusDue: string;
  statusOverdue: string;
  seller: string;
  buyer: string;
  summarySection: string;
  summaryHint: string;
  colProducts: string;
  colStocks: string;
  colAmount: string;
  productsCount: (count: number) => string;
  detailsTitle: string;
  detailsSubtitle: string;
  continued: string;
  colIndex: string;
  colItem: string;
  colQty: string;
  colUnitPrice: string;
  colLineAmount: string;
  calculationTitle: string;
  subtotal: string;
  discount: string;
  amountDue: string;
  acknowledgment: string;
  acknowledgmentBody: (amount: string, due: string) => string;
  sellerSign: string;
  buyerSign: string;
  signHint: string;
  seeDetails: string;
  footerNote: string;
  pageOf: (page: number, total: number) => string;
};

export function buildKontraBonLabels(): KontraBonPdfLabels {
  return {
    brandTagline: 'Goods & payment acknowledgment',
    documentTitle: 'Kontra bon',
    documentSubtitle: 'Confirm goods received and the amount payable.',
    headerDocNo: 'No.',
    issued: 'Issued',
    paymentDue: 'Due',
    paymentDueFallback: 'As agreed',
    orderReference: 'Order',
    statusOpen: 'Open',
    statusDue: 'Due soon',
    statusOverdue: 'Overdue',
    seller: 'Seller',
    buyer: 'Buyer',
    summarySection: 'Order summary',
    summaryHint: 'Details on the next page',
    colProducts: 'Products',
    colStocks: 'Product stocks',
    colAmount: 'Amount',
    productsCount: (count) => (count === 1 ? '1 product' : `${count} products`),
    detailsTitle: 'Product list',
    detailsSubtitle: 'Line items and order calculation',
    continued: 'Continued',
    colIndex: '#',
    colItem: 'Product',
    colQty: 'Stock qty',
    colUnitPrice: 'Unit price',
    colLineAmount: 'Line amount',
    calculationTitle: 'Order calculation',
    subtotal: 'Subtotal',
    discount: 'Discount',
    amountDue: 'Amount due',
    acknowledgment: 'Acknowledgment',
    acknowledgmentBody: (amount, due) =>
      due
        ? `Buyer confirms goods received and agrees to pay ${amount} by ${due}.`
        : `Buyer confirms goods received and agrees to pay ${amount}.`,
    sellerSign: 'Seller',
    buyerSign: 'Buyer',
    signHint: 'Signature / name',
    seeDetails: 'Full product list & calculation → next page',
    footerNote: 'Not a tax invoice (faktur pajak)',
    pageOf: (page, total) => `${page} / ${total}`,
  };
}
