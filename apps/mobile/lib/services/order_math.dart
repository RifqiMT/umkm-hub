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
