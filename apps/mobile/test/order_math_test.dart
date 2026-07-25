import 'package:flutter_test/flutter_test.dart';
import 'package:umkm_hub/services/order_math.dart';

void main() {
  test('percentage discount', () {
    final total = calculateOrderTotal(
      unitPrice: 100,
      productQty: 2,
      discountType: 'PERCENTAGE',
      discountValue: 10,
    );
    expect(total, 180);
  });

  test('amount discount', () {
    final total = calculateOrderTotal(
      unitPrice: 50,
      productQty: 3,
      discountType: 'AMOUNT',
      discountValue: 25,
    );
    expect(total, 125);
  });

  test('multi-line sums then applies percentage discount', () {
    final result = calculateMultiLineOrderTotals(
      lines: const [
        OrderLineAmount(unitPrice: 100, productQty: 2),
        OrderLineAmount(unitPrice: 50, productQty: 4),
      ],
      discountType: 'PERCENTAGE',
      discountValue: 10,
    );
    expect(result.lineTotal, 400);
    expect(result.totalOrderValue, 360);
  });

  test('multi-line amount discount', () {
    final result = calculateMultiLineOrderTotals(
      lines: const [
        OrderLineAmount(unitPrice: 10, productQty: 10),
        OrderLineAmount(unitPrice: 20, productQty: 5),
      ],
      discountType: 'AMOUNT',
      discountValue: 50,
    );
    expect(result.lineTotal, 200);
    expect(result.totalOrderValue, 150);
  });

  test('multi-line rejects empty lines', () {
    expect(
      () => calculateMultiLineOrderTotals(
        lines: const [],
        discountType: 'PERCENTAGE',
        discountValue: 0,
      ),
      throwsArgumentError,
    );
  });
}
