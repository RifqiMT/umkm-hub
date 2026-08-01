import { todayDateInput } from '@/lib/enums';

function addDaysToDateInput(dateInput: string, days: number): string {
  const d = new Date(`${dateInput.slice(0, 10)}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Default NET-30 style due date from order date. */
export function defaultPaymentDueDate(orderDate: string, days = 30): string {
  return addDaysToDateInput(orderDate, days);
}

export function isOrderPaymentOverdue(order: {
  paymentDueDate?: string | null;
  invoiceStatus?: string;
}): boolean {
  if (!order.paymentDueDate) return false;
  if (order.invoiceStatus === 'FULLY_PAID') return false;
  return order.paymentDueDate.slice(0, 10) < todayDateInput();
}

/** Format NPWP digits for display (15 or 16 digit Indonesian tax ID). */
export function formatNpwpDisplay(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 15) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}.${digits.slice(8, 9)}-${digits.slice(9, 12)}.${digits.slice(12, 15)}`;
  }
  if (digits.length === 16) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}.${digits.slice(8, 9)}-${digits.slice(9, 12)}.${digits.slice(12, 16)}`;
  }
  return raw.trim();
}

export function previewInvoiceNumber(prefix: string): string {
  const p = prefix.trim() || 'INV';
  const date = todayDateInput().replace(/-/g, '');
  return `${p}-${date}-····`;
}

type InvoicingReadiness = {
  businessName: boolean;
  address: boolean;
  npwp: boolean;
  pkpReady: boolean;
};

export function invoicingReadiness(input: {
  businessName: string;
  businessAddress: string;
  npwp: string;
  isPkp: boolean;
}): InvoicingReadiness {
  const name = input.businessName.trim().length > 0;
  const address = input.businessAddress.trim().length > 0;
  const npwp = input.npwp.replace(/\D/g, '').length >= 15;
  return {
    businessName: name,
    address,
    npwp,
    pkpReady: input.isPkp ? npwp && name : name,
  };
}
