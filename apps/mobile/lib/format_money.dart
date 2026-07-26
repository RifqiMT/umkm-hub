import 'package:intl/intl.dart';

final _fullDigits = NumberFormat.decimalPattern('en_US');

class CompactParts {
  const CompactParts({required this.figure, this.unit, this.unitShort});

  final String figure;
  /// Plain-English magnitude for KPI chips (e.g. "million").
  final String? unit;
  /// Short axis/table label (e.g. "Mn").
  final String? unitShort;

  String get label => unit == null ? figure : '$figure $unit';

  String get shortLabel => unitShort == null ? figure : '$figure $unitShort';
}

/// Full digit quantity / non-currency amounts (no magnitude abbreviation).
String formatQty(num value) {
  final n = value.toDouble();
  if (n == n.roundToDouble()) {
    return _fullDigits.format(n.round());
  }
  return NumberFormat('#,##0.####', 'en_US').format(n);
}

/// Full digit money without abbreviation.
String formatFullMoney(num value) => _fullDigits.format(value.round());

CompactParts _formatCompactParts(num value, {required bool money}) {
  final sign = value < 0 ? '-' : '';
  final abs = value.abs().toDouble();

  String scaled(double divisor) => (abs / divisor).toStringAsFixed(2);

  if (abs >= 1e18) {
    return CompactParts(
      figure: '$sign${scaled(1e18)}',
      unit: 'quintillion',
      unitShort: 'Qn',
    );
  }
  if (abs >= 1e15) {
    return CompactParts(
      figure: '$sign${scaled(1e15)}',
      unit: 'quadrillion',
      unitShort: 'Qd',
    );
  }
  if (abs >= 1e12) {
    return CompactParts(
      figure: '$sign${scaled(1e12)}',
      unit: 'trillion',
      unitShort: 'Tn',
    );
  }
  if (abs >= 1e9) {
    return CompactParts(
      figure: '$sign${scaled(1e9)}',
      unit: 'billion',
      unitShort: 'Bn',
    );
  }
  if (abs >= 1e6) {
    return CompactParts(
      figure: '$sign${scaled(1e6)}',
      unit: 'million',
      unitShort: 'Mn',
    );
  }
  return CompactParts(
    figure: money ? formatFullMoney(value) : formatQty(value),
  );
}

/// Display money for tables, KPIs, and tooltips.
/// e.g. 1532000 → "1.53 million"
String formatMoney(num value) => formatMoneyParts(value).label;

CompactParts formatMoneyParts(num value) =>
    _formatCompactParts(value, money: true);

String formatCompactQty(num value) => formatCompactQtyParts(value).label;

CompactParts formatCompactQtyParts(num value) =>
    _formatCompactParts(value, money: false);

/// Short compact label for tight chart axes.
String formatCompactAxis(num value) => formatMoneyParts(value).shortLabel;

String formatDateLabel(String? iso) {
  if (iso == null || iso.isEmpty) return '—';
  final day = iso.length >= 10 ? iso.substring(0, 10) : iso;
  final parts = day.split('-');
  if (parts.length != 3) return iso;
  final year = int.tryParse(parts[0]);
  final month = int.tryParse(parts[1]);
  final d = int.tryParse(parts[2]);
  if (year == null || month == null || d == null) return iso;
  final date = DateTime.utc(year, month, d);
  return DateFormat('MMM d, y', 'en_US').format(date);
}

String formatRatePercent(num? value) {
  if (value == null || !value.isFinite) return '—';
  final n = value.toDouble();
  if (n == n.roundToDouble()) {
    return '${n.round()}%';
  }
  return '${n.toStringAsFixed(2)}%';
}
