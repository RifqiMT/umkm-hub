import 'dart:math' as math;

/// Value-axis domain from product rule:
/// - lower = minimum − 20% of |minimum|
/// - upper = maximum + 20% of |maximum|
/// Empty / all-zero → (0, 1).
(double, double) paddedDomain(
  Iterable<double?> values, {
  bool nonNegative = false,
}) {
  final nums = values.whereType<double>().where((v) => v.isFinite).toList();
  if (nums.isEmpty) return (0, 1);

  final min = nums.reduce(math.min);
  final max = nums.reduce(math.max);
  if (min == 0 && max == 0) return (0, 1);

  var lo = min - min.abs() * 0.2;
  var hi = max + max.abs() * 0.2;

  if (nonNegative && min >= 0) {
    lo = math.max(0, lo);
  }

  if (!(hi > lo)) {
    final pad = math.max((max != 0 ? max : min).abs() * 0.2, 1.0);
    lo = min - pad;
    hi = max + pad;
    if (nonNegative && min >= 0) {
      lo = math.max(0, lo);
    }
  }

  if (lo == -0.0) lo = 0;
  if (hi == -0.0) hi = 0;
  return (lo, hi);
}
