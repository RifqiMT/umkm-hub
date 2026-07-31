class OrderLineAmount {
  const OrderLineAmount({
    required this.unitPrice,
    required this.productQty,
  });

  final double unitPrice;
  final double productQty;
}

class OrderTotals {
  const OrderTotals({
    required this.lineTotal,
    required this.totalOrderValue,
  });

  final double lineTotal;
  final double totalOrderValue;
}

/// Single-line totals (legacy helper).
double calculateOrderTotal({
  required double unitPrice,
  required double productQty,
  required String discountType,
  required double discountValue,
}) {
  return calculateMultiLineOrderTotals(
    lines: [OrderLineAmount(unitPrice: unitPrice, productQty: productQty)],
    discountType: discountType,
    discountValue: discountValue,
  ).totalOrderValue;
}

/// Multi-line order totals: sum of line subtotals, then one order-level discount.
OrderTotals calculateMultiLineOrderTotals({
  required List<OrderLineAmount> lines,
  required String discountType,
  required double discountValue,
}) {
  if (lines.isEmpty) {
    throw ArgumentError('Order requires at least one line');
  }

  final lineTotal = _round(
    lines.fold<double>(
      0,
      (sum, line) => sum + _round(line.unitPrice * line.productQty),
    ),
  );

  if (discountType.toUpperCase() == 'PERCENTAGE') {
    return OrderTotals(
      lineTotal: lineTotal,
      totalOrderValue: _round(lineTotal * (1 - discountValue / 100)),
    );
  }

  return OrderTotals(
    lineTotal: lineTotal,
    totalOrderValue: _round((lineTotal - discountValue).clamp(0, double.infinity)),
  );
}

double _round(double value) => double.parse(value.toStringAsFixed(4));

const _paymentEpsilon = 0.00005;

/// Derive invoice collection status from paid amount vs amount due.
String deriveInvoiceStatusFromPayments({
  required double amountDue,
  required double paidAmount,
  required String billStatus,
}) {
  final total = amountDue;
  final paid = paidAmount;
  if (paid <= _paymentEpsilon) {
    return billStatus == 'SENT' ? 'SENT' : 'CREATED';
  }
  if (paid + _paymentEpsilon >= total) {
    return 'FULLY_PAID';
  }
  return 'PARTIALLY_PAID';
}
