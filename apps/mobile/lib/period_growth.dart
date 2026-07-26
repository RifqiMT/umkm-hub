/// Period-over-period growth helpers for Analytics chart tooltips.
/// Keep formulas aligned with `apps/web/src/lib/period-growth.ts`.

enum GrowthMode { pct, bps }

double? periodGrowthValue(
  double? current,
  double? previous,
  GrowthMode mode,
) {
  if (current == null || previous == null) return null;
  if (!current.isFinite || !previous.isFinite) return null;
  if (mode == GrowthMode.bps) {
    return (current - previous) * 100;
  }
  if (previous == 0) return null;
  return ((current - previous) / previous.abs()) * 100;
}

String? formatPeriodGrowth(double? value, GrowthMode mode) {
  if (value == null || !value.isFinite) return null;
  if (mode == GrowthMode.bps) {
    final rounded = value.round();
    final sign = rounded > 0 ? '+' : '';
    return '$sign$rounded bps';
  }
  final sign = value > 0 ? '+' : '';
  final digits = value % 1 == 0 ? 0 : 1;
  return '$sign${value.toStringAsFixed(digits)}%';
}

/// Growth of `values[index]` vs the prior non-null? We use prior index (i-1).
String? growthLabelAt(
  List<double?> values,
  int index, {
  GrowthMode mode = GrowthMode.pct,
}) {
  if (index <= 0 || index >= values.length) return null;
  return formatPeriodGrowth(
    periodGrowthValue(values[index], values[index - 1], mode),
    mode,
  );
}

String? growthLabelAtDoubles(
  List<double> values,
  int index, {
  GrowthMode mode = GrowthMode.pct,
}) {
  if (index <= 0 || index >= values.length) return null;
  return formatPeriodGrowth(
    periodGrowthValue(values[index], values[index - 1], mode),
    mode,
  );
}
