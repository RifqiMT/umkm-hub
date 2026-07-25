import 'package:intl/intl.dart';

final _fullDigits = NumberFormat.decimalPattern('en_US');

/// Full digit quantity / non-currency amounts (no Mn/Bn abbreviation).
String formatQty(num value) {
  final n = value.toDouble();
  if (n == n.roundToDouble()) {
    return _fullDigits.format(n.round());
  }
  return NumberFormat('#,##0.####', 'en_US').format(n);
}

/// Full digit money without abbreviation.
String formatFullMoney(num value) => _fullDigits.format(value.round());

/// Display money for tables, KPIs, and charts.
/// e.g. 1532000 → "1.53 Mn", 1532000000 → "1.53 Bn"
String formatMoney(num value) {
  final sign = value < 0 ? '-' : '';
  final abs = value.abs().toDouble();

  String scaled(double divisor) => (abs / divisor).toStringAsFixed(2);

  if (abs >= 1e18) return '$sign${scaled(1e18)} Qn';
  if (abs >= 1e15) return '$sign${scaled(1e15)} Qd';
  if (abs >= 1e12) return '$sign${scaled(1e12)} Tn';
  if (abs >= 1e9) return '$sign${scaled(1e9)} Bn';
  if (abs >= 1e6) return '$sign${scaled(1e6)} Mn';
  return formatFullMoney(value);
}
